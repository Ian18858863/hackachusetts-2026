// POST /api/rank (docs/CONTRACT.md section 7.4).
//
// Observed and excluded HPO ids -> ranked candidate diseases with evidence.
//   1. Validate: `observed` 1-50 HPO ids, `excluded` 0-50, no id in both,
//      `limit` 1-10 (default 5). Ids are deduplicated and sorted first, so the
//      result and the cache key do not depend on input order.
//   2. Workers Cache API, key rank:v0.1:<path mode>:<engine status>|<observed>|<excluded>|<limit>,
//      24 h. Path mode and engine status are in the key so engine and fallback
//      results never mix. Degraded responses (an annotation or Orphadata call
//      lost data) are not cached and are sent with Cache-Control: no-store
//      (R11.4; X-RDD-Enrichment: complete | incomplete for QA).
//   3. RDD_ENGINE_PATH / RDD_ENGINE_PATH_RANK (see _lib/fallback/engineFirst.ts):
//      "fallback" (default) runs functions/_lib/fallback/rank.ts directly;
//      "engine" runs rankCandidatesWithReport (enrichment.complete decides
//      caching) and falls back only on NotImplementedError (X-RDD-Path).
//   4. Monarch failed or timed out -> the recorded demo ranking for this exact
//      term set if there is one (source "demo"), else 502/504 retryable.

import { ENGINE_STATUS, demoRankKey, getDemoRanking, rankCandidatesWithReport } from "../../engine/index";
import type { RankResponse } from "../../engine/index";
import { engineFirst, enginePathMode, PATH_HEADER } from "../_lib/fallback/engineFirst";
import { getFallbackDemoRanking } from "../_lib/fallback/demoRecorded";
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
  const mode = enginePathMode(context.env, "rank");
  const key = cacheKey(
    "rank",
    `${mode}:${ENGINE_STATUS.rankCandidates}|${req.observed.join(",")}|${req.excluded.join(",")}|${req.limit}`,
  );

  const deps: FallbackDeps = { fetch: globalThis.fetch.bind(globalThis), waitUntil: (p) => context.waitUntil(p) };
  const cache = defaultCache();
  if (cache) deps.cache = cache;

  const cached = await cacheGetJson<CachedRank>(cache, key);
  if (cached) return json(cached.body, 200, { [PATH_HEADER]: cached.path, "X-RDD-Cache": "hit" });

  const result = await engineFirst(
    mode,
    // The engine reports whether any annotation or Orphadata call lost data
    // (enrichment.complete). Incomplete evidence is served as is, never cached.
    async () => {
      const { response, enrichment } = await rankCandidatesWithReport({ ...req }, deps);
      return { body: response, complete: enrichment.complete };
    },
    () => fallbackRank(req, deps),
  );

  if (!result.ok) {
    if (isUpstreamFailure(result.error)) {
      // Engine demo cache first; the T18e recorded demo-npc1 entry only while the engine has none.
      const demo =
        getDemoRanking(demoRankKey(req.observed, req.excluded, req.limit)) ??
        getFallbackDemoRanking(demoRankKey(req.observed, req.excluded, req.limit));
      if (demo) {
        logError("rank", result.error, "demo-fallback");
        return json(asDemoPayload(demo), 200, { [PATH_HEADER]: result.path });
      }
    }
    logError(`rank.${result.path}`, result.error);
    return withHeader(engineErrorResponse(result.error, KEPT), PATH_HEADER, result.path);
  }

  const out: RankResponse = { ...result.value.body, version: CONTRACT_VERSION };
  const complete = result.value.complete;
  if (out.source === "live" && complete) cachePutJson(deps, key, { path: result.path, body: out } satisfies CachedRank, RANK_TTL_S);
  // json() always sends Cache-Control: no-store, so an incomplete response is
  // cached nowhere. X-RDD-Enrichment is for QA only, not part of the contract.
  return json(out, 200, {
    [PATH_HEADER]: result.path,
    "X-RDD-Cache": "miss",
    "X-RDD-Enrichment": complete ? "complete" : "incomplete",
  });
}
