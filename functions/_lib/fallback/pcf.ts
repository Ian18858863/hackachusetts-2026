// Optional PubCaseFinder ranking source for POST /api/rank (T36).
//
// Switch: RDD_RANK_SOURCE = "pcf" (Pages variable or `--binding` locally).
// Unset or any other value: /api/rank behaves exactly as before.
//
// With "pcf", PubCaseFinder gives the candidate ORDER; everything shown as
// evidence still comes from HPO annotations and Monarch, as on the Monarch
// path (contract 7.4):
//
//   1. GET https://pubcasefinder.dbcls.jp/api/pcf_get_ranked_list
//        ?target=omim&format=tsv&hpo_id=<sorted observed ids>
//      Excluded terms are not sent. target=omim, not orphanet: the
//      coordinator's 14-case check (handoff/pcf_benchmark.md) used omim, and
//      OMIM rows map to our diseaseId rule the same way Monarch rows do.
//      format=tsv, not json: the json body was 10.9 MB for a 4-term query on
//      2026-10-24, the tsv 0.84 MB with the columns we need (Rank, Score,
//      OMIM_ID, Disease_Name). We read only the first PCF_MAX_ROWS lines of
//      the stream and cancel the rest, so CPU and memory stay small.
//      Timeout PCF_TIMEOUT_MS (20 s): measured time to first byte 8.6 s
//      (4 terms) and 10.3 s (14 terms, demo-kabuki) for tsv on 2026-10-24;
//      PCF computes the whole list before the first byte, so the ~8 s first
//      proposed, and 12 s, failed cold calls. A cold PCF answer then takes
//      about 11-15 s in total, which is over the app's 14 s client timeout
//      for /api/rank (app/src/shared/api.ts); cached answers are fast. No retry: DBCLS asks API users to stay
//      under 10 requests per minute, 100 per hour, 1,000 per day
//      (swagger-pubcasefinder.json, info.description). The parsed list is
//      cached 24 h by sorted observed ids, and an approximate per-data-centre
//      counter (Cache API) stops live PCF calls at PCF_PER_MINUTE /
//      PCF_PER_HOUR; over the limit, /api/rank uses the Monarch path.
//   2. Each PCF OMIM row -> diseaseId with the fallback rule (ORPHA > OMIM):
//      JAX annotation of the OMIM id gives the MONDO id, the Monarch entity
//      record of that MONDO id gives the Orphanet xref (as Monarch semsim
//      rows carry). Rows that map to the same diseaseId are merged, keeping
//      the better PCF rank.
//   3. Name: the same rule as /api/next-questions (questions.ts
//      displayName), so the ranking, the why-lines and the brief agree:
//      ORPHA -> JAX ORPHA set name (Orphanet-sourced), else the Orphadata
//      preferred name, else the Monarch name; OMIM -> Monarch name, else JAX
//      OMIM set name, else the PCF English name. The resolved ids and name
//      are written to the xref cache that next-questions reads first.
//   4. Matches: exact = observed term annotated to the disease. Broader =
//      Monarch semsim compare (one GET per candidate, ~0.6 s measured) of the
//      observed ids against the candidate's merged annotated ids; its
//      subject_best_matches go through buildCandidate in rank.ts, so the
//      HP-only shared-ancestor rule, the organ-system cut-off and the overlap
//      weighting (exact + 0.5 x broader, floored) are the same code as the
//      Monarch path. Chosen over JAX ancestors because ancestors would cost
//      one call per observed term AND per annotated term (well over the
//      50-subrequest limit), while compare costs one call per candidate.
//   5. Score: the PCF score is passed through as the raw service score
//      (0-1, never shown as a percentage). Order: PCF rank, then diseaseId.
//
// Any PCF failure (timeout, HTTP error, unreadable or empty list, no row
// mappable, rate guard) throws, and /api/rank runs the Monarch path in the
// same request. A failed annotation, entity or compare call keeps the
// candidate with evidenceComplete false and marks the response incomplete
// (not cached), as on the Monarch path.

import { HPO_VERSION, UpstreamError, UpstreamTimeout } from "../../../engine/index";
import type { CandidateSource, DataVersions, DiseaseId, HpoId, RankResponse } from "../../../engine/index";
import { fetchAnnotation, mergeAnnotations } from "./annotations";
import type { AnnotationSet, MergedAnnotations } from "./annotations";
import { cacheGetJson, cacheKey, cachePutJson, getJson } from "./http";
import type { FallbackDeps } from "./http";
import { buildCandidate, orphadataName } from "./rank";
import type { BestMatch, FallbackRankResult, MonarchRow, NormalizedRankRequest, RankedCandidate } from "./rank";
import { monarchXrefs } from "./xrefs";
import type { DiseaseXrefs } from "./xrefs";

/** Same lifetime as XREF_TTL_S in xrefs.ts. */
const XREF_TTL_S = 24 * 60 * 60;

export const RANK_SOURCE_ENV = "RDD_RANK_SOURCE";

const PCF_URL = "https://pubcasefinder.dbcls.jp/api/pcf_get_ranked_list";
const PCF_TIMEOUT_MS = 20000;
const PCF_MAX_ROWS = 40;
const PCF_LIST_TTL_S = 24 * 60 * 60;
/** Below DBCLS's published guideline of 10 / minute and 100 / hour. */
const PCF_PER_MINUTE = 8;
const PCF_PER_HOUR = 90;

const MONARCH_COMPARE = "https://api.monarchinitiative.org/v3/api/semsim/compare/";
const COMPARE_TIMEOUT_MS = 5000;
const ANNOTATION_EDGE_TTL_S = 24 * 60 * 60;
/**
 * Upstream fetches this module may make in one invocation (PCF, JAX,
 * Monarch, Orphadata). The handler's own rank-cache read and write, the
 * PCF-list cache and rate-guard reads/writes and the xref cache writes are
 * counted separately (cacheOps); together they stay under the Workers limit
 * of 50 subrequests. Calls beyond the cap fail fast, which only degrades
 * that candidate's evidence (evidenceComplete false).
 */
const FETCH_CAP = 34;
const CACHE_OP_CAP = 12;

const HPO_ID = /^HP:\d{7}$/;
const OMIM_ID = /^OMIM:\d+$/;

/** True when RDD_RANK_SOURCE asks for PubCaseFinder ordering. */
export function pcfEnabled(env: Record<string, unknown> | undefined): boolean {
  const v = env?.[RANK_SOURCE_ENV];
  return typeof v === "string" && v.trim().toLowerCase() === "pcf";
}

/** PCF could not be used for this request (rate guard, empty or unmappable list). */
export class PcfUnavailable extends Error {
  constructor(reason: string) {
    super(`PubCaseFinder unavailable: ${reason}`);
    this.name = "PcfUnavailable";
  }
}

interface PcfRow {
  rank: number;
  score: number;
  omim: DiseaseId;
  name: string;
}

interface PcfList {
  rows: PcfRow[];
  fetchedAt: string;
}

// ------------------------------------------------------------ budget

interface Budget {
  fetches: number;
  cacheOps: number;
  /** Subrequests the rest of the invocation has used (T36c: the parallel Monarch path). */
  external: () => number;
}

/** T36c: PCF and the Monarch path run in the same invocation; together they stay under the 50-subrequest limit. */
const INVOCATION_CAP = 48;

function totalUsed(budget: Budget): number {
  return budget.fetches + budget.cacheOps + budget.external();
}

function meteredFetch(deps: FallbackDeps, budget: Budget): FallbackDeps["fetch"] {
  const inner = deps.fetch;
  return (input, init) => {
    if (budget.fetches >= FETCH_CAP || totalUsed(budget) >= INVOCATION_CAP) {
      return Promise.reject(new TypeError("subrequest budget spent"));
    }
    budget.fetches++;
    return inner(input, init);
  };
}

function takeCacheOp(budget: Budget): boolean {
  if (budget.cacheOps >= CACHE_OP_CAP || totalUsed(budget) >= INVOCATION_CAP) return false;
  budget.cacheOps++;
  return true;
}

/** Upstream deps without the Cache API (so no hidden cache subrequests); JAX reads use the edge cache for 2xx only. */
function upstreamDeps(deps: FallbackDeps, budget: Budget, edgeTtlS?: number): FallbackDeps {
  const fetch = meteredFetch(deps, budget);
  const out: FallbackDeps = { fetch };
  if (deps.now) out.now = deps.now;
  if (deps.timeoutsMs) out.timeoutsMs = deps.timeoutsMs;
  if (edgeTtlS !== undefined) {
    const cf = { cacheTtlByStatus: { "200-299": edgeTtlS, "300-599": 0 } };
    out.fetch = (input, init) => fetch(input, { ...init, cf } as RequestInit);
  }
  return out;
}

// ------------------------------------------------------- rate guard

/** Approximate fixed-window counter in the Cache API; fails open on cache errors. */
async function rateGuard(deps: FallbackDeps, budget: Budget, nowMs: number): Promise<boolean> {
  const cache = deps.cache;
  if (!cache) return true;
  const windows: Array<{ name: string; sizeS: number; max: number }> = [
    { name: "m", sizeS: 60, max: PCF_PER_MINUTE },
    { name: "h", sizeS: 3600, max: PCF_PER_HOUR },
  ];
  const keys = windows.map((w) => ({ ...w, key: cacheKey("pcf-rate", `${w.name}:${Math.floor(nowMs / 1000 / w.sizeS)}`) }));
  const counts: number[] = [];
  for (const w of keys) {
    if (!takeCacheOp(budget)) return true;
    const v = await cacheGetJson<{ n: number }>(cache, w.key);
    const n = typeof v?.n === "number" ? v.n : 0;
    if (n >= w.max) return false;
    counts.push(n);
  }
  keys.forEach((w, i) => {
    if (takeCacheOp(budget)) cachePutJson(deps, w.key, { n: (counts[i] ?? 0) + 1 }, w.sizeS + 5);
  });
  return true;
}

// ------------------------------------------------------------ PCF list

function parseTsvLine(line: string, header: string[]): PcfRow | null {
  const cells = line.split("\t");
  const at = (name: string): string => cells[header.indexOf(name)] ?? "";
  const rank = Number(at("Rank"));
  const score = Number(at("Score"));
  const omim = at("OMIM_ID").trim();
  if (!Number.isFinite(rank) || !Number.isFinite(score) || !OMIM_ID.test(omim)) return null;
  return { rank, score, omim, name: at("Disease_Name").trim() || omim };
}

/** First PCF_MAX_ROWS rows of the TSV stream; the rest of the body is cancelled. */
async function fetchPcfRows(observed: readonly HpoId[], deps: FallbackDeps, timeoutMs: number): Promise<PcfRow[]> {
  const url = `${PCF_URL}?target=omim&format=tsv&hpo_id=${observed.join(",")}`;
  const doFetch = deps.fetch;
  let res: Response;
  try {
    res = await doFetch(url, {
      method: "GET",
      headers: { Accept: "text/tab-separated-values, text/plain" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new UpstreamTimeout("pubCaseFinder");
    }
    throw new UpstreamError("pubCaseFinder", null);
  }
  if (!res.ok || !res.body) throw new UpstreamError("pubCaseFinder", res.status);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let header: string[] | null = null;
  const rows: PcfRow[] = [];
  let done = false;
  try {
    while (!done && rows.length < PCF_MAX_ROWS) {
      const chunk = await reader.read();
      if (chunk.done) {
        buf += decoder.decode();
        done = true;
      } else {
        buf += decoder.decode(chunk.value, { stream: true });
      }
      let nl = buf.indexOf("\n");
      while ((nl >= 0 || (done && buf.length > 0)) && rows.length < PCF_MAX_ROWS) {
        const line = (nl >= 0 ? buf.slice(0, nl) : buf).replace(/\r$/, "");
        buf = nl >= 0 ? buf.slice(nl + 1) : "";
        if (header === null) {
          header = line.split("\t").map((h) => h.trim());
          if (!header.includes("OMIM_ID") || !header.includes("Rank")) throw new UpstreamError("pubCaseFinder", res.status);
        } else if (line.trim()) {
          const row = parseTsvLine(line, header);
          if (row) rows.push(row);
        }
        nl = buf.indexOf("\n");
      }
    }
  } catch (err) {
    if (err instanceof UpstreamError) throw err;
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new UpstreamTimeout("pubCaseFinder");
    }
    throw new UpstreamError("pubCaseFinder", res.status);
  } finally {
    reader.cancel().catch(() => undefined);
  }
  return rows;
}

async function pcfList(req: NormalizedRankRequest, deps: FallbackDeps, budget: Budget, timeoutMs: number): Promise<PcfList> {
  const key = cacheKey("pcf-list", req.observed.join(","));
  if (deps.cache && takeCacheOp(budget)) {
    const hit = await cacheGetJson<PcfList>(deps.cache, key);
    if (hit && Array.isArray(hit.rows) && hit.rows.length > 0) return hit;
  }
  const now = deps.now ?? (() => new Date());
  if (!(await rateGuard(deps, budget, now().getTime()))) throw new PcfUnavailable("rate guard");
  const rows = await fetchPcfRows(req.observed, upstreamDeps(deps, budget), timeoutMs);
  if (rows.length === 0) throw new PcfUnavailable("empty list");
  const list: PcfList = { rows, fetchedAt: now().toISOString() };
  if (takeCacheOp(budget)) cachePutJson(deps, key, list, PCF_LIST_TTL_S);
  return list;
}

// -------------------------------------------------------- per candidate

interface Resolved {
  row: PcfRow;
  diseaseId: DiseaseId;
  mondoId: string;
  orpha: DiseaseId | null;
  name: string;
  merged: MergedAnnotations | null;
  /** False when an annotation, entity or name lookup failed. */
  complete: boolean;
}

async function settle<T>(p: Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: await p };
  } catch {
    return { ok: false };
  }
}

async function resolveRow(row: PcfRow, deps: FallbackDeps, budget: Budget): Promise<Resolved> {
  const jax = upstreamDeps(deps, budget, ANNOTATION_EDGE_TTL_S);
  const plain = upstreamDeps(deps, budget);
  let complete = true;

  const omimRes = await settle(fetchAnnotation(row.omim, jax));
  if (!omimRes.ok) complete = false;
  const omimAnn: AnnotationSet | null = omimRes.ok ? omimRes.value : null;

  const mondo = omimAnn?.mondoId ?? null;
  // monarchXrefs returns null on failure; a known MONDO id with no record is a failure for us too.
  const x = mondo ? await monarchXrefs(mondo, plain) : null;
  if (mondo && !x) complete = false;

  const orpha = x?.orpha ?? null;
  let orphaAnn: AnnotationSet | null = null;
  if (orpha) {
    const r = await settle(fetchAnnotation(orpha, jax));
    if (r.ok) orphaAnn = r.value;
    else complete = false;
  }

  let name: string;
  if (orpha) {
    name = orphaAnn?.name ?? (await orphadataName(orpha, plain)).value?.name ?? x?.name ?? row.name;
  } else {
    name = x?.name ?? omimAnn?.name ?? row.name;
  }

  const sets = [orphaAnn, omimAnn].filter((s): s is AnnotationSet => s !== null);
  return {
    row,
    diseaseId: orpha ?? row.omim,
    mondoId: mondo ?? row.omim,
    orpha,
    name,
    merged: sets.length > 0 ? mergeAnnotations(sets) : null,
    complete,
  };
}

interface CompareMatches {
  best: Map<HpoId, BestMatch>;
  ok: boolean;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Monarch semsim compare of the observed ids against the disease's annotated clinical ids. */
async function compareMatches(
  observed: readonly HpoId[],
  merged: MergedAnnotations,
  deps: FallbackDeps,
  budget: Budget,
): Promise<CompareMatches> {
  const best = new Map<HpoId, BestMatch>();
  const annotated = [...merged.features.values()].filter((f) => f.clinical && HPO_ID.test(f.id));
  // Exact matches never depend on Monarch.
  for (const id of observed) {
    const f = merged.features.get(id);
    if (f && f.clinical) {
      best.set(id, { source: id, sourceLabel: f.label, target: id, targetLabel: f.label, subsumer: id, subsumerLabel: f.label });
    }
  }
  const rest = observed.filter((id) => !best.has(id));
  if (rest.length === 0 || annotated.length === 0) return { best, ok: true };
  try {
    const url = `${MONARCH_COMPARE}${rest.join(",")}/${annotated.map((f) => f.id).join(",")}`;
    const body = (await getJson("monarchSemsim", url, upstreamDeps(deps, budget), {
      timeoutMs: COMPARE_TIMEOUT_MS,
      notFound: "error",
    })) as { subject_best_matches?: Record<string, unknown> } | null;
    const sbm = body?.subject_best_matches;
    if (typeof sbm !== "object" || sbm === null) return { best, ok: false };
    for (const m of Object.values(sbm)) {
      const mm = (m ?? {}) as Record<string, unknown>;
      const source = str(mm.match_source);
      const target = str(mm.match_target);
      if (!HPO_ID.test(source) || !HPO_ID.test(target) || best.has(source)) continue;
      best.set(source, {
        source,
        sourceLabel: str(mm.match_source_label),
        target,
        targetLabel: str(mm.match_target_label),
        subsumer: str(mm.match_subsumer) || null,
        subsumerLabel: str(mm.match_subsumer_label),
      });
    }
    return { best, ok: true };
  } catch {
    return { best, ok: false };
  }
}

// ------------------------------------------------------------- ranking

export interface PcfRankResult extends FallbackRankResult {
  /** Date PubCaseFinder's list was fetched (YYYY-MM-DD), for dataVersions.pubCaseFinder. */
  pcfDate: string;
}

/**
 * Rank with PubCaseFinder ordering. Throws (UpstreamTimeout, UpstreamError,
 * PcfUnavailable) when PCF cannot be used; the handler then runs the Monarch path.
 */
export interface PcfRankOptions {
  /** Called once the mappable PCF list is in hand (cache hit or live), before evidence is built. */
  onList?: () => void;
  /** Subrequests used elsewhere in this invocation (T36c parallel Monarch path). */
  external?: () => number;
  /** Timeout of the PCF list call itself; default PCF_TIMEOUT_MS. */
  listTimeoutMs?: number;
}

export async function pcfRank(req: NormalizedRankRequest, deps: FallbackDeps, opts: PcfRankOptions = {}): Promise<PcfRankResult> {
  const budget: Budget = { fetches: 0, cacheOps: 0, external: opts.external ?? (() => 0) };
  const now = deps.now ?? (() => new Date());
  const list = await pcfList(req, deps, budget, opts.listTimeoutMs ?? PCF_TIMEOUT_MS);
  opts.onList?.();

  // Resolve rows in order, one batch of `limit`, plus one more batch if merging left gaps.
  const chosen = new Map<DiseaseId, Resolved>();
  let next = 0;
  for (let round = 0; round < 2 && chosen.size < req.limit && next < list.rows.length; round++) {
    const batch = list.rows.slice(next, next + (req.limit - chosen.size));
    next += batch.length;
    const resolved = await Promise.all(batch.map((row) => resolveRow(row, deps, budget)));
    for (const r of resolved) if (!chosen.has(r.diseaseId) && chosen.size < req.limit) chosen.set(r.diseaseId, r);
  }
  if (chosen.size === 0) throw new PcfUnavailable("no mappable rows");

  const top = [...chosen.values()].sort(
    (a, b) => a.row.rank - b.row.rank || b.row.score - a.row.score || (a.diseaseId < b.diseaseId ? -1 : a.diseaseId > b.diseaseId ? 1 : 0),
  );
  const compares = await Promise.all(
    top.map((r) => (r.merged ? compareMatches(req.observed, r.merged, deps, budget) : Promise.resolve({ best: new Map(), ok: true }))),
  );

  // Patient term labels from every compare answer (as patientLabels in rank.ts).
  const labels = new Map<HpoId, string>();
  for (const c of compares) for (const m of c.best.values()) if (m.sourceLabel && !labels.has(m.source)) labels.set(m.source, m.sourceLabel);

  const candidates: RankedCandidate[] = top.map((r, i) => {
    const cmp = compares[i] ?? { best: new Map<HpoId, BestMatch>(), ok: false };
    const row: MonarchRow = {
      mondoId: r.mondoId,
      name: r.name,
      score: r.row.score,
      orpha: r.orpha,
      omim: r.row.omim,
      best: cmp.best,
    };
    const base = buildCandidate(row, i + 1, req, labels, r.merged, null);
    if (!r.mondoId.startsWith("MONDO:")) base.links.monarch = `https://monarchinitiative.org/${r.row.omim}`;
    const sources: CandidateSource[] = ["pubcasefinder"];
    if (r.merged && cmp.best.size > 0) sources.push("monarch-semsim");
    if (r.merged) sources.push("hpo-annotations");
    return {
      ...base,
      diseaseId: r.diseaseId,
      sources,
      pubCaseFinderRank: r.row.rank,
      evidenceComplete: r.complete && r.merged !== null && cmp.ok,
    };
  });

  // Let /api/next-questions read the same annotation sets and names (one key per candidate).
  top.forEach((r, i) => {
    const c = candidates[i];
    if (c && deps.cache && takeCacheOp(budget)) {
      const x: DiseaseXrefs = { mondo: r.mondoId.startsWith("MONDO:") ? r.mondoId : null, orpha: r.orpha, omim: r.row.omim, name: c.name };
      // Same key and shape as rememberXrefs in xrefs.ts, but only the diseaseId key (one Cache API write).
      cachePutJson(deps, cacheKey("xref", c.diseaseId), x, XREF_TTL_S);
    }
  });

  const fetchedAt = now().toISOString();
  const pcfDate = list.fetchedAt.slice(0, 10);
  // rankingSource (T36c, additive): which service ordered this list; the footer and brief credit it.
  const dataVersions = { hpo: HPO_VERSION, monarch: "v3 API", pubCaseFinder: pcfDate, fetchedAt, rankingSource: "pubcasefinder" } as DataVersions;
  const body: RankResponse = { version: "0.1", source: "live", candidates, dataVersions };
  return { body, complete: candidates.every((c) => c.evidenceComplete === true), pcfDate };
}
