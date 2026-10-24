// GET /api/trials?condition=&ids= (docs/CONTRACT.md section 7.6).
//
// Recruiting ClinicalTrials.gov studies for one candidate condition.
//   1. Validate: `condition` 2-200 characters; `ids` optional, comma-separated
//      ORPHA / OMIM / MONDO ids (at most 10), echoed in `query` only.
//   2. Workers Cache API, 6 h, key = path mode + engine status + normalised
//      condition (plus the echoed ids, so the echo stays correct).
//   3. RDD_ENGINE_PATH / RDD_ENGINE_PATH_TRIALS (see _lib/fallback/engineFirst.ts):
//      "fallback" (default) runs functions/_lib/fallback/trials.ts directly;
//      "engine" runs searchTrials first and falls back while it is a
//      placeholder (X-RDD-Path: engine | fallback).
//   4. Upstream failed -> recorded demo trials for this condition if any
//      (source "demo"), else 502/504 retryable.

import { ENGINE_STATUS, getDemoTrials, searchTrials } from "../../engine/index";
import type { TrialsResponse } from "../../engine/index";
import { engineFirst, enginePathMode, PATH_HEADER } from "../_lib/fallback/engineFirst";
import { getFallbackDemoTrials } from "../_lib/fallback/demoRecorded";
import { cacheGetJson, cacheKey, cachePutJson } from "../_lib/fallback/http";
import type { FallbackDeps } from "../_lib/fallback/http";
import { fallbackSearchTrials } from "../_lib/fallback/trials";
import { DISEASE_ID_RE } from "../_lib/fallback/validate";
import {
  CONTRACT_VERSION,
  asDemoPayload,
  defaultCache,
  engineErrorResponse,
  invalid,
  isUpstreamFailure,
  json,
  logError,
  methodNotAllowed,
  withHeader,
} from "../_lib/respond";
import type { PagesContext } from "../_lib/respond";

const CONDITION_MIN = 2;
const CONDITION_MAX = 200;
const IDS_MAX = 10;
const TRIALS_TTL_S = 6 * 60 * 60;
const KEPT = "Your case is kept";

interface CachedTrials {
  path: "engine" | "fallback";
  body: TrialsResponse;
}

export const onRequest = async (context: PagesContext<Record<string, unknown>>): Promise<Response> => {
  if (context.request.method !== "GET") return methodNotAllowed(["GET"]);
  try {
    return await handleGet(context);
  } catch (err) {
    logError("trials", err);
    return engineErrorResponse(err, KEPT);
  }
};

async function handleGet(context: PagesContext<Record<string, unknown>>): Promise<Response> {
  const params = new URL(context.request.url).searchParams;
  const rawCondition = params.get("condition");
  if (rawCondition === null) return invalid("`condition` is required: the name of the condition to search for.");
  const condition = rawCondition.trim().replace(/\s+/g, " ");
  if (condition.length < CONDITION_MIN || condition.length > CONDITION_MAX) {
    return invalid(`\`condition\` needs ${CONDITION_MIN} to ${CONDITION_MAX} characters.`);
  }

  const rawIds = params.get("ids");
  const ids = rawIds === null || rawIds.trim() === "" ? [] : [...new Set(rawIds.split(",").map((s) => s.trim()))];
  if (ids.length > IDS_MAX || ids.some((id) => !DISEASE_ID_RE.test(id))) {
    return invalid(`\`ids\` must be up to ${IDS_MAX} comma-separated ORPHA, OMIM or MONDO ids.`);
  }

  const mode = enginePathMode(context.env, "trials");
  const key = cacheKey(
    "trials-v2",
    `${mode}:${ENGINE_STATUS.searchTrials}|${condition.toLowerCase()}|${[...ids].sort().join(",")}`,
  );
  const deps: FallbackDeps = { fetch: globalThis.fetch.bind(globalThis), waitUntil: (p) => context.waitUntil(p) };
  const cache = defaultCache();
  if (cache) deps.cache = cache;

  const cached = await cacheGetJson<CachedTrials>(cache, key);
  if (cached) return json(cached.body, 200, { [PATH_HEADER]: cached.path, "X-RDD-Cache": "hit" });

  const result = await engineFirst(
    mode,
    () => searchTrials({ condition, ids: [...ids] }, deps),
    () => fallbackSearchTrials({ condition, ids }, deps),
  );

  if (!result.ok) {
    if (isUpstreamFailure(result.error)) {
      // Engine demo cache first; the T18e recorded demo-npc1 entry only while the engine has none.
      const demo = getDemoTrials(condition) ?? getFallbackDemoTrials(condition, ids);
      if (demo) {
        logError("trials", result.error, "demo-fallback");
        return json(asDemoPayload(demo), 200, { [PATH_HEADER]: result.path });
      }
    }
    logError(`trials.${result.path}`, result.error);
    return withHeader(engineErrorResponse(result.error, KEPT), PATH_HEADER, result.path);
  }

  const out: TrialsResponse = { ...result.value, version: CONTRACT_VERSION };
  if (out.source === "live") cachePutJson(deps, key, { path: result.path, body: out } satisfies CachedTrials, TRIALS_TTL_S);
  return json(out, 200, { [PATH_HEADER]: result.path, "X-RDD-Cache": "miss" });
}
