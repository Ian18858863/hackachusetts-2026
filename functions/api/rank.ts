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
//      One deadline (RANK_TIMING.deadlineMs, 17 s from request start) bounds
//      everything under the switch: the 12 s PCF wait, PCF evidence after a
//      late list (calls end 1.5 s before the deadline, then the Monarch
//      answer is used, X-RDD-Path "pcf-late->engine"), and the Monarch path
//      (engine Monarch timeout 13 s, rank budget 16 s, every call aborted
//      0.3 s before the deadline; no answer by the deadline -> 504 or the
//      recorded demo ranking). One counter (budget.ts) keeps all fetches and
//      Cache API calls of the request at 46 or fewer.
//   7. dataVersions.rankingSource (T36c, additive): "pubcasefinder" or
//      "monarch", whichever ordered the list. The footer and the brief credit
//      it. Older cached bodies have no field (read as Monarch).

import { ENGINE_STATUS, UpstreamTimeout, demoRankKey, getDemoRanking, rankCandidatesWithReport } from "../../engine/index";
import type { DataVersions, RankResponse } from "../../engine/index";
import { engineFirst, enginePathMode, PATH_HEADER } from "../_lib/fallback/engineFirst";
import { getFallbackDemoRanking } from "../_lib/fallback/demoRecorded";
import { cacheGetJson, cacheKey, cachePutJson } from "../_lib/fallback/http";
import type { FallbackDeps } from "../_lib/fallback/http";
import { after, countedCache, countedFetch, deadlineFetch, REQUEST_SUBREQUEST_CAP } from "../_lib/fallback/budget";
import type { RequestBudget } from "../_lib/fallback/budget";
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
/**
 * T36c timing under the pcf switch, all from request start. Mutable only so
 * the unit test can scale it down (rankDeadline.test.ts); production never
 * changes it.
 *   deadlineMs: the handler answers by then (app client timeout is 20 s).
 *   pcfWaitMs: longest wait for PubCaseFinder's list.
 *   evidenceReserveMs: PCF evidence calls end this long before the deadline,
 *     leaving time to fall back to the Monarch answer.
 */
export const RANK_TIMING = { deadlineMs: 17000, pcfWaitMs: 12000, evidenceReserveMs: 1500 };
/** Engine Monarch semsim timeout under the switch: deadline minus this (17 s -> 13 s). */
const PCF_MONARCH_TIMEOUT_RESERVE_MS = 4000;
/** Engine rank budget under the switch: deadline minus this (17 s -> 16 s). */
const PCF_ENGINE_BUDGET_RESERVE_MS = 1000;
/** Monarch-path fetches are aborted this long before the deadline. */
const FETCH_END_MARGIN_MS = 300;
/**
 * Subrequests the Monarch path may use under the switch (of the shared 46).
 * Enough for semsim plus ORPHA and OMIM annotations and Orphadata at limit 5;
 * beyond it the Monarch answer's evidence degrades (not cached), and the rest
 * stays for PubCaseFinder's evidence.
 */
const MONARCH_SHARE = 16;
/** Extra wait for PCF evidence past its deadline before using the Monarch answer. */
const EVIDENCE_GRACE_MS = 200;
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

  // T36c: under the pcf switch the whole request has one deadline from its
  // start and one subrequest counter (fetches and Cache API calls of both
  // paths and of this handler). With the switch off nothing changes.
  const t0 = Date.now();
  const deadline = t0 + RANK_TIMING.deadlineMs;
  const budget: RequestBudget = { used: 0, cap: REQUEST_SUBREQUEST_CAP };
  const rawFetch = globalThis.fetch.bind(globalThis);
  const deps: FallbackDeps = {
    fetch: usePcf ? countedFetch(rawFetch, budget) : rawFetch,
    waitUntil: (p) => context.waitUntil(p),
  };
  const cache = usePcf ? countedCache(defaultCache(), budget) : defaultCache();
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

  // T36c: PubCaseFinder and the Monarch path start together.
  //   - PCF orders the list only if its mappable list arrives within
  //     pcfWaitMs AND its evidence is built by the evidence deadline
  //     (deadline - EVIDENCE_RESERVE_MS); evidence calls are aborted then.
  //   - Otherwise the Monarch answer is used. Its calls are aborted at the
  //     deadline, and the engine gets a Monarch timeout and a rank budget
  //     that end before it. If it still has no answer at the deadline, the
  //     request ends with 504 (or the recorded demo ranking).
  //   - The PCF list call may finish in the background (waitUntil) so a
  //     later request finds its list in the cache.
  const left = () => deadline - Date.now();
  // Under the switch the Monarch path gets no Cache API (fewer subrequests),
  // and once PubCaseFinder's list is in hand it may make no new calls, so the
  // rest of the shared budget goes to PubCaseFinder's evidence. Its answer is
  // then needed only if that evidence fails.
  let monarchOpen = true;
  let monarchUsed = 0;
  const gated: FallbackDeps["fetch"] = (input, init) => {
    if (!monarchOpen || monarchUsed >= MONARCH_SHARE) {
      return Promise.reject(new TypeError("subrequest budget reserved for PubCaseFinder evidence"));
    }
    monarchUsed++;
    return deps.fetch(input, init);
  };
  const monarchDeps: FallbackDeps = { fetch: deadlineFetch(gated, () => deadline - FETCH_END_MARGIN_MS) };
  if (deps.waitUntil) monarchDeps.waitUntil = deps.waitUntil;
  const monarchP = monarchPath(mode, req, monarchDeps, {
    monarchTimeoutMs: Math.max(1000, RANK_TIMING.deadlineMs - PCF_MONARCH_TIMEOUT_RESERVE_MS),
    rankBudgetMs: Math.max(1000, RANK_TIMING.deadlineMs - PCF_ENGINE_BUDGET_RESERVE_MS),
  });
  let listArrived!: () => void;
  const listP = new Promise<"list">((resolve) => {
    listArrived = () => resolve("list");
  });
  const evidenceDeadline = deadline - RANK_TIMING.evidenceReserveMs;
  const pcfP = pcfRank(req, deps, {
    onList: () => {
      monarchOpen = false;
      listArrived();
    },
    evidenceDeadline,
  });
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
  context.waitUntil(pcfCacheWrite.then(() => undefined));

  const wait = after(Math.min(RANK_TIMING.pcfWaitMs, left()), "timeout" as const);
  const first = await Promise.race([listP, pcfSettled.then(() => "settled" as const), wait.promise]);
  wait.cancel();

  let prefix = "pcf->";
  if (first !== "timeout") {
    // Evidence after the list is bounded too: a little after its own deadline we stop waiting.
    const evWait = after(evidenceDeadline + EVIDENCE_GRACE_MS - Date.now(), "late" as const);
    const r = await Promise.race([pcfSettled, evWait.promise]);
    evWait.cancel();
    // Evidence cut off by the deadline (incomplete at the deadline): prefer a
    // complete Monarch answer if one is ready. Evidence that is incomplete for
    // other reasons (a failed call, the subrequest cap) keeps PCF's order,
    // marked evidenceComplete false, as on the Monarch path.
    if (r !== "late" && r.ok && !r.value.complete && Date.now() >= evidenceDeadline) {
      const ready = await Promise.race([monarchP, after(0, "pending" as const).promise]);
      if (ready !== "pending" && ready.ok && ready.value.complete) {
        return monarchResponse(ready, req, "pcf-late->", (out, complete) => {
          if (out.source === "live" && complete) cachePutJson(deps, monKey, { path: "pcf-late->" + ready.path, body: out } satisfies CachedRank, PCF_MONARCH_TTL_S);
        });
      }
    }
    if (r !== "late" && r.ok) {
      // Let the Monarch path finish in the background; its answer is not used.
      context.waitUntil(monarchP.then(() => undefined, () => undefined));
      const out: RankResponse = { ...r.value.body, version: CONTRACT_VERSION };
      return json(out, 200, {
        [PATH_HEADER]: "pcf",
        "X-RDD-Cache": "miss",
        "X-RDD-Enrichment": r.value.complete ? "complete" : "incomplete",
      });
    }
    if (r === "late") prefix = "pcf-late->";
    else logError("rank.pcf", r.error, "monarch-fallback");
  } else {
    prefix = "pcf-timeout->";
  }

  const mWait = after(left(), "deadline" as const);
  const raced = await Promise.race([monarchP, mWait.promise]);
  mWait.cancel();
  const result: MonarchResult =
    raced === "deadline" ? { ok: false, path: mode, error: new UpstreamTimeout("monarchSemsim") } : raced;
  return monarchResponse(result, req, prefix, (out, complete) => {
    // A Monarch answer under the pcf switch is cached briefly so a PCF list can replace it.
    if (out.source === "live" && complete) cachePutJson(deps, monKey, { path: prefix + result.path, body: out } satisfies CachedRank, PCF_MONARCH_TTL_S);
  });
}

type MonarchResult = Awaited<ReturnType<typeof monarchPath>>;

function monarchPath(
  mode: ReturnType<typeof enginePathMode>,
  req: NormalizedRankRequest,
  deps: FallbackDeps,
  limits: { monarchTimeoutMs: number; rankBudgetMs: number } = {
    monarchTimeoutMs: ENGINE_MONARCH_TIMEOUT_MS,
    rankBudgetMs: ENGINE_RANK_BUDGET_MS,
  },
) {
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
        timeoutsMs: { ...deps.timeoutsMs, monarchSemsim: limits.monarchTimeoutMs },
        rankBudgetMs: limits.rankBudgetMs,
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
