// POST /api/rank (docs/CONTRACT.md section 7.4).
//
// Observed and excluded HPO ids -> ranked candidate diseases with evidence.
//   1. Validate: `observed` 1-50 HPO ids, `excluded` 0-50, no id in both,
//      `limit` 1-10 (default 5). Ids are deduplicated and sorted first, so the
//      result and the cache key do not depend on input order.
//   2. Workers Cache API, key rank:v0.1:<path mode>:<engine status>|<observed>|<excluded>|<limit>,
//      24 h. Path mode and engine status are in the key so engine and fallback
//      results never mix. Degraded responses are not cached and are sent with
//      Cache-Control: no-store (R11.4; X-RDD-Enrichment: complete | incomplete
//      for QA). Degraded means an annotation call or an Orphadata lookup
//      failed (error, timeout or no budget left); an answer with no data is
//      not a failure. Both paths report it: the engine as enrichment.complete,
//      the fallback as complete.
//   3. RDD_ENGINE_PATH / RDD_ENGINE_PATH_RANK (see _lib/fallback/engineFirst.ts):
//      "fallback" (default) runs functions/_lib/fallback/rank.ts directly;
//      "engine" runs rankCandidatesWithReport (enrichment.complete decides
//      caching) and falls back only on NotImplementedError (X-RDD-Path).
//   4. Monarch failed or timed out -> the recorded demo ranking for this exact
//      term set if there is one (source "demo"), else 502/504 retryable.
//   5. Live responses carry candidate.evidenceComplete (additive, T32a): false
//      when an HPO annotation call for that candidate failed, was unusable or
//      ran out of budget, so `frequency: null` means "could not be read", not
//      "not listed". Recorded demo responses have no field (absent = unknown).
//   6. RDD_RANK_SOURCE = "pcf" (T36, T36c): PubCaseFinder and the Monarch
//      path (steps 3-4) start at the same time. If PCF's mappable list arrives
//      within 12 s, PCF gives the order and HPO annotations plus Monarch
//      semsim compare give the evidence (_lib/fallback/pcf.ts; X-RDD-Path
//      "pcf"; cached 24 h under "pcf:"). Otherwise the Monarch answer is
//      returned in the same request (X-RDD-Path "pcf-timeout->engine" after
//      12 s, "pcf->engine" when PCF failed, was rate-guarded or mapped to
//      nothing; ASCII because header values must be), cached only 10 min
//      under "pcfmon:", and the PCF call keeps running in the background so
//      its list is cached for the next request.
//   7. dataVersions.rankingSource (T36c, additive): "pubcasefinder" or
//      "monarch", whichever ordered the list. The footer and the brief credit
//      it. Older cached bodies have no field (read as Monarch).

import { ENGINE_STATUS, demoRankKey, getDemoRanking, rankCandidatesWithReport } from "../../engine/index";
import type { DataVersions, RankResponse } from "../../engine/index";
import { engineFirst, enginePathMode, PATH_HEADER } from "../_lib/fallback/engineFirst";
import { getFallbackDemoRanking } from "../_lib/fallback/demoRecorded";
import { cacheGetJson, cacheKey, cachePutJson } from "../_lib/fallback/http";
import type { FallbackDeps } from "../_lib/fallback/http";
import { pcfEnabled, pcfRank } from "../_lib/fallback/pcf";
import { fallbackRank } from "../_lib/fallback/rank";
import type { NormalizedRankRequest, RankedCandidate } from "../_lib/fallback/rank";
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
const ENGINE_MONARCH_TIMEOUT_MS = 20000;
const ENGINE_RANK_BUDGET_MS = 25000;
/** T36c: longest wait for PubCaseFinder's list before the Monarch answer is used. */
const PCF_WAIT_MS = 12000;
/** T36c: a Monarch answer given under the pcf switch is cached this long (s), so a PCF list can replace it. */
const PCF_MONARCH_TTL_S = 10 * 60;

interface CachedRank {
  path: string;
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
  const usePcf = pcfEnabled(context.env);
  const ids = `${mode}:${ENGINE_STATUS.rankCandidates}|${req.observed.join(",")}|${req.excluded.join(",")}|${req.limit}`;
  // The effective ranking source is part of the key (T36c): "pcf:" for a
  // PubCaseFinder-ordered list, "pcfmon:" for a Monarch answer given under
  // the pcf switch, plain for the Monarch path with the switch off.
  const key = cacheKey("rank", usePcf ? `pcf:${ids}` : ids);
  const monKey = cacheKey("rank", `pcfmon:${ids}`);

  const deps: FallbackDeps = { fetch: globalThis.fetch.bind(globalThis), waitUntil: (p) => context.waitUntil(p) };
  const cache = defaultCache();
  if (cache) deps.cache = cache;

  const cached = await cacheGetJson<CachedRank>(cache, key);
  if (cached) return json(cached.body, 200, { [PATH_HEADER]: cached.path, "X-RDD-Cache": "hit" });
  if (usePcf) {
    const mon = await cacheGetJson<CachedRank>(cache, monKey);
    if (mon) return json(mon.body, 200, { [PATH_HEADER]: mon.path, "X-RDD-Cache": "hit" });
  }

  if (!usePcf) {
    const result = await monarchPath(mode, req, deps);
    return monarchResponse(result, req, "", (out, complete) => {
      if (out.source === "live" && complete) cachePutJson(deps, key, { path: result.path, body: out } satisfies CachedRank, RANK_TTL_S);
    });
  }

  // T36c: PubCaseFinder and the Monarch path start together. PCF orders the
  // list only if its mappable list arrives within PCF_WAIT_MS; otherwise the
  // Monarch answer is used and the PCF call keeps running in the background
  // (waitUntil) so a later request finds its list in the cache.
  let monarchUsed = 0;
  const monarchDeps: FallbackDeps = {
    ...deps,
    fetch: (input, init) => {
      monarchUsed++;
      return deps.fetch(input, init);
    },
  };
  const monarchP = monarchPath(mode, req, monarchDeps);
  let listArrived!: () => void;
  const listP = new Promise<"list">((resolve) => {
    listArrived = () => resolve("list");
  });
  const pcfP = pcfRank(req, deps, { onList: () => listArrived(), external: () => monarchUsed + 2 });
  const pcfSettled = pcfP.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  const pcfCacheWrite = pcfSettled.then((r) => {
    if (r.ok && r.value.complete) {
      cachePutJson(deps, key, { path: "pcf", body: { ...r.value.body, version: CONTRACT_VERSION } } satisfies CachedRank, RANK_TTL_S);
    }
    return r;
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const wait = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), PCF_WAIT_MS);
  });
  const first = await Promise.race([listP, pcfSettled.then(() => "settled" as const), wait]);
  if (timer !== undefined) clearTimeout(timer);

  let prefix = "pcf->";
  if (first !== "timeout") {
    const r = await pcfCacheWrite;
    if (r.ok) {
      // Let the Monarch path finish in the background; its answer is not used.
      context.waitUntil(monarchP.then(() => undefined, () => undefined));
      const out: RankResponse = { ...r.value.body, version: CONTRACT_VERSION };
      return json(out, 200, {
        [PATH_HEADER]: "pcf",
        "X-RDD-Cache": "miss",
        "X-RDD-Enrichment": r.value.complete ? "complete" : "incomplete",
      });
    }
    logError("rank.pcf", r.error, "monarch-fallback");
  } else {
    prefix = "pcf-timeout->";
    context.waitUntil(pcfCacheWrite.then(() => undefined));
  }

  const result = await monarchP;
  return monarchResponse(result, req, prefix, (out, complete) => {
    // A Monarch answer under the pcf switch is cached briefly so a PCF list can replace it.
    if (out.source === "live" && complete) cachePutJson(deps, monKey, { path: prefix + result.path, body: out } satisfies CachedRank, PCF_MONARCH_TTL_S);
  });
}

type MonarchResult = Awaited<ReturnType<typeof monarchPath>>;

function monarchPath(mode: ReturnType<typeof enginePathMode>, req: NormalizedRankRequest, deps: FallbackDeps) {
  return engineFirst(
    mode,
    // The engine reports whether any annotation or Orphadata call lost data
    // (enrichment.complete). Incomplete evidence is served as is, never cached.
    async () => {
      // R6.1 (contract 7.4 proposal): Monarch semsim gets 20 s inside a 25 s
      // rank budget on the engine path. Pages Functions have no wall-clock
      // limit while awaiting I/O, so the longer wait only costs latency.
      const engineDeps: FallbackDeps = {
        ...deps,
        timeoutsMs: { ...deps.timeoutsMs, monarchSemsim: ENGINE_MONARCH_TIMEOUT_MS },
        rankBudgetMs: ENGINE_RANK_BUDGET_MS,
      };
      const { response, enrichment } = await rankCandidatesWithReport({ ...req }, engineDeps);
      // Additive field (T32a): evidenceComplete per candidate, from the
      // engine's report matched by diseaseId. A candidate missing from the
      // report counts as incomplete, never as "not listed".
      const byId = new Map(enrichment.candidates.map((c) => [c.diseaseId, c.evidenceComplete]));
      const candidates: RankedCandidate[] = response.candidates.map((c) => ({
        ...c,
        evidenceComplete: byId.get(c.diseaseId) ?? false,
      }));
      return { body: { ...response, candidates }, complete: enrichment.complete };
    },
    () => fallbackRank(req, deps),
  );
}

function monarchResponse(
  result: MonarchResult,
  req: NormalizedRankRequest,
  pathPrefix: string,
  store: (out: RankResponse, complete: boolean) => void,
): Response {
  if (!result.ok) {
    if (isUpstreamFailure(result.error)) {
      // Engine demo cache first; the T18e recorded demo-npc1 entry only while the engine has none.
      const demo =
        getDemoRanking(demoRankKey(req.observed, req.excluded, req.limit)) ??
        getFallbackDemoRanking(demoRankKey(req.observed, req.excluded, req.limit));
      if (demo) {
        logError("rank", result.error, "demo-fallback");
        return json(asDemoPayload(demo), 200, { [PATH_HEADER]: pathPrefix + result.path });
      }
    }
    logError(`rank.${result.path}`, result.error);
    return withHeader(engineErrorResponse(result.error, KEPT), PATH_HEADER, pathPrefix + result.path);
  }

  const body = result.value.body;
  // rankingSource (T36c, additive): Monarch ordered this list.
  const dataVersions = { ...body.dataVersions, rankingSource: "monarch" } as DataVersions;
  const out: RankResponse = { ...body, dataVersions, version: CONTRACT_VERSION };
  const complete = result.value.complete;
  store(out, complete);
  // json() always sends Cache-Control: no-store, so an incomplete response is
  // cached nowhere. X-RDD-Enrichment is for QA only, not part of the contract.
  return json(out, 200, {
    [PATH_HEADER]: pathPrefix + result.path,
    "X-RDD-Cache": "miss",
    "X-RDD-Enrichment": complete ? "complete" : "incomplete",
  });
}
