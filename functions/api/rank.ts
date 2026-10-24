// POST /api/rank (docs/CONTRACT.md section 7.4).
//
// Observed and excluded HPO ids -> ranked candidate diseases with evidence.
//   1. Validate: `observed` 1-50 HPO ids, `excluded` 0-50, no id in both,
//      `limit` 1-10 (default 5). Ids are deduplicated and sorted first, so the
//      result and the cache key do not depend on input order.
//   2. Workers Cache API, key rank:v0.1:<engine status>|<observed>|<excluded>|<limit>,
//      24 h. The engine status is in the key so a fallback result is not served
//      after the engine implementation lands. Degraded responses (an
//      annotation call failed) are not cached (R11.4).
//   3. Engine rankCandidates first; while it is a placeholder, the fallback in
//      functions/_lib/fallback/rank.ts (X-RDD-Path: engine | fallback).
//   4. Monarch failed or timed out -> the recorded demo ranking for this exact
//      term set if there is one (source "demo"), else 502/504 retryable.

import { ENGINE_STATUS, demoRankKey, getDemoRanking, rankCandidates } from "../../engine/index";
import type { RankResponse } from "../../engine/index";
import { engineFirst, PATH_HEADER } from "../_lib/fallback/engineFirst";
import { cacheGetJson, cacheKey, cachePutJson } from "../_lib/fallback/http";
import type { FallbackDeps } from "../_lib/fallback/http";
import { fallbackRank } from "../_lib/fallback/rank";
import { hpoIdList, intInRange, overlapId } from "../_lib/fallback/validate";
import {
  CONTRACT_VERSION,
  asDemoPayload,
  defaultCache,
  engineErrorResponse,
  invalid,
  isRecord,
  isUpstreamFailure,
  json,
  logError,
  methodNotAllowed,
  readJsonBody,
  withHeader,
} from "../_lib/respond";
import type { PagesContext } from "../_lib/respond";

const MAX_BODY_BYTES = 16 * 1024;
const RANK_TTL_S = 24 * 60 * 60;
const KEPT = "Your terms are kept";

interface CachedRank {
  path: "engine" | "fallback";
  body: RankResponse;
}

export const onRequest = async (context: PagesContext<Record<string, unknown>>): Promise<Response> => {
  if (context.request.method !== "POST") return methodNotAllowed(["POST"]);
  try {
    return await handlePost(context);
  } catch (err) {
    logError("rank", err);
    return engineErrorResponse(err, KEPT);
  }
};

async function handlePost(context: PagesContext<Record<string, unknown>>): Promise<Response> {
  const body = await readJsonBody(
    context.request,
    MAX_BODY_BYTES,
    { code: "INVALID_REQUEST", message: "The request is too large. Send at most 50 observed and 50 excluded HPO ids." },
  );
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return invalid("The request body must be a JSON object with an `observed` list.");

  const observed = hpoIdList(body.value.observed, "observed", 1, 50);
  if (!observed.ok) return invalid(observed.message);
  const excluded = hpoIdList(body.value.excluded, "excluded", 0, 50);
  if (!excluded.ok) return invalid(excluded.message);
  const both = overlapId(observed.value, excluded.value);
  if (both) return invalid(`${both} is in both \`observed\` and \`excluded\`. Mark it as present or absent, not both.`);
  const limit = intInRange(body.value.limit, "limit", 1, 10, 5);
  if (!limit.ok) return invalid(limit.message);

  const req = { observed: observed.value, excluded: excluded.value, limit: limit.value };
  const key = cacheKey(
    "rank",
    `${ENGINE_STATUS.rankCandidates}|${req.observed.join(",")}|${req.excluded.join(",")}|${req.limit}`,
  );

  const deps: FallbackDeps = { fetch: globalThis.fetch.bind(globalThis), waitUntil: (p) => context.waitUntil(p) };
  const cache = defaultCache();
  if (cache) deps.cache = cache;

  const cached = await cacheGetJson<CachedRank>(cache, key);
  if (cached) return json(cached.body, 200, { [PATH_HEADER]: cached.path, "X-RDD-Cache": "hit" });

  const result = await engineFirst(
    // The engine owns its own degradation rules; its live responses are cached as is.
    async () => ({ body: await rankCandidates({ ...req }, deps), complete: true }),
    () => fallbackRank(req, deps),
  );

  if (!result.ok) {
    if (isUpstreamFailure(result.error)) {
      const demo = getDemoRanking(demoRankKey(req.observed, req.excluded, req.limit));
      if (demo) {
        logError("rank", result.error, "demo-fallback");
        return json(asDemoPayload(demo), 200, { [PATH_HEADER]: result.path });
      }
    }
    logError(`rank.${result.path}`, result.error);
    return withHeader(engineErrorResponse(result.error, KEPT), PATH_HEADER, result.path);
  }

  const out: RankResponse = { ...result.value.body, version: CONTRACT_VERSION };
  if (out.source === "live" && result.value.complete) cachePutJson(deps, key, { path: result.path, body: out } satisfies CachedRank, RANK_TTL_S);
  return json(out, 200, { [PATH_HEADER]: result.path, "X-RDD-Cache": "miss" });
}
