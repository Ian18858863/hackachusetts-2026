// Ranking (CONTRACT.md 7.4): Monarch semsim ranks; the engine only adds
// evidence from JAX HPO annotations and the Orphadata name check. No secondary
// ranking here (Ian owns re-ranking in functions/_lib/rerank.ts): candidates
// keep Monarch's score order; exact score ties are broken by diseaseId so the
// output is deterministic (7.4 step 9, property P4).

import { fetchAnnotations, fetchOrphadata, type DiseaseAnnotations, type FetchStatus } from "./annotations";
import { InvalidInput, UpstreamError } from "./errors";
import { DEFAULT_TIMEOUTS_MS, getJson } from "./http";
import { HPO_ID_RE, HPO_VERSION } from "./hpo";
import type {
  Candidate,
  CandidateSource,
  DataVersions,
  DiseaseFeature,
  DiseaseId,
  EngineDeps,
  Evidence,
  FrequencyInfo,
  FrequencyLabel,
  Gene,
  HpoId,
  OverlapLabel,
  RankRequest,
  RankResponse,
  TermRef,
} from "./types";

/** Coverage thresholds (CONTRACT.md 7.4 step 8; open question 8, draft values). */
export const OVERLAP_STRONG_MIN_COVERAGE = 0.6;
export const OVERLAP_PARTIAL_MIN_COVERAGE = 0.3;

const LADDER: readonly OverlapLabel[] = ["weak", "partial", "strong"];

/** Non-negative integer count; NaN, negative or non-finite input counts as 0. */
function count(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Plain-language overlap label (CONTRACT.md 7.4 step 8).
 * coverage = matched / observed; strong if >= 0.6, partial if >= 0.3, else weak;
 * each contradicted feature lowers the label one step, floor weak.
 * Total function: observedCount <= 0 gives "weak"; matchedCount is clamped to
 * [0, observedCount]. Never shown as a percentage.
 */
export function overlapLabel(
  matchedCount: number,
  observedCount: number,
  contradictedCount: number,
): OverlapLabel {
  const observed = count(observedCount);
  if (observed === 0) return "weak";
  const matched = Math.min(count(matchedCount), observed);
  const coverage = matched / observed;
  const base =
    coverage >= OVERLAP_STRONG_MIN_COVERAGE ? 2 : coverage >= OVERLAP_PARTIAL_MIN_COVERAGE ? 1 : 0;
  const step = Math.max(0, base - count(contradictedCount));
  return LADDER[step] ?? "weak";
}

/**
 * Matched count passed to overlapLabel (contract v0.1.2, 7.4 step 8):
 * floor(exact matches + 0.5 x ancestor matches). `matched` itself still lists
 * every match; only the count used for the label is weighted.
 */
export function weightedMatchCount(matched: readonly Evidence[]): number {
  let exact = 0;
  let ancestor = 0;
  for (const e of matched) {
    if (e.via === "exact") exact++;
    else ancestor++;
  }
  return Math.floor(exact + 0.5 * ancestor);
}

/** Default total /api/rank budget (contract 7.4): later calls are capped by what is left. */
export const RANK_BUDGET_MS = 12000;

/**
 * Network work stops this long before the rank budget so aborting late calls
 * and building the response still finish inside it. Without it, hung
 * enrichment calls aborted exactly at the budget and the call returned 1-2 ms
 * late (measured 2026-10-24 16:15 ET: 1002 ms and 1001 ms for a 1000 ms budget).
 */
export const RANK_FINISH_MARGIN_MS = 100;

/** deps.rankBudgetMs if it is a positive finite number, else the 12 s default. */
export function rankBudgetOf(deps: EngineDeps): number {
  const b = deps.rankBudgetMs;
  return typeof b === "number" && Number.isFinite(b) && b > 0 ? b : RANK_BUDGET_MS;
}

/**
 * Obsolete disease records never become candidates. Authoritative signal:
 * Monarch's `deprecated: true` on the semsim subject (present on every
 * subject, checked 2026-10-24 16:05 ET). Fallback for records without it: a
 * name that starts with the word "obsolete" (MONDO's label convention for
 * obsoleted classes, e.g. "obsolete chorea"); names that merely contain the
 * word elsewhere are kept.
 */
export function isObsoleteSubject(subject: { deprecated?: unknown; name?: unknown }): boolean {
  if (subject.deprecated === true) return true;
  return typeof subject.name === "string" && /^\s*obsolete\b/i.test(subject.name);
}

// ------------------------------------------------------------------ constants

const MONARCH_SEMSIM = "https://api.monarchinitiative.org/v3/api/semsim/search";
export const MONARCH_VERSION = "v3 API";

/**
 * HP:0000118 "Phenotypic abnormality" and its 23 direct children (organ-system
 * level), read from GET https://ontology.jax.org/api/hp/terms/HP:0000118/children
 * on 2026-10-24. A Monarch match whose shared ancestor is one of these is too
 * general to count as evidence (7.4 step 5).
 */
export const TOO_GENERAL_SUBSUMERS: ReadonlySet<string> = new Set([
  "HP:0000001", // All (root)
  "HP:0000118",
  "HP:0000119", "HP:0000152", "HP:0000478", "HP:0000598", "HP:0000707", "HP:0000769",
  "HP:0000818", "HP:0001197", "HP:0001507", "HP:0001574", "HP:0001608", "HP:0001626",
  "HP:0001871", "HP:0001939", "HP:0002086", "HP:0002664", "HP:0002715", "HP:0025031",
  "HP:0025142", "HP:0025354", "HP:0033127", "HP:0040064", "HP:0045027",
]);

const FREQUENT_BANDS: readonly FrequencyLabel[] = ["Obligate", "Very frequent", "Frequent"];
const BAND_ORDER: Readonly<Record<FrequencyLabel, number>> = {
  Obligate: 0,
  "Very frequent": 1,
  Frequent: 2,
  Occasional: 3,
  "Very rare": 4,
  Excluded: 5,
};
const MAX_NOT_REPORTED = 8;

// -------------------------------------------------------------- validation

function cleanIds(field: string, raw: unknown, min: number, max: number): HpoId[] {
  if (raw === undefined && min === 0) return [];
  if (!Array.isArray(raw)) throw new InvalidInput(field, "must be an array of HPO ids");
  const ids = new Set<HpoId>();
  for (const v of raw) {
    if (typeof v !== "string" || !HPO_ID_RE.test(v)) throw new InvalidInput(field, "HPO ids must match ^HP:\\d{7}$");
    ids.add(v);
  }
  if (ids.size < min || ids.size > max) throw new InvalidInput(field, `${min}-${max} ids`);
  return [...ids].sort();
}

/** Deduplicated, sorted, validated request (7.4 step 1). Throws InvalidInput. */
export function normalizeRankRequest(req: RankRequest): { observed: HpoId[]; excluded: HpoId[]; limit: number } {
  if (typeof req !== "object" || req === null) throw new InvalidInput("body");
  const observed = cleanIds("observed", req.observed, 1, 50);
  const excluded = cleanIds("excluded", req.excluded, 0, 50);
  const both = observed.filter((id) => excluded.includes(id));
  if (both.length > 0) throw new InvalidInput("excluded", `${both[0]} is also in observed`);
  const limit = req.limit ?? 5;
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new InvalidInput("limit", "1-10");
  return { observed, excluded, limit };
}

// ----------------------------------------------------------- Monarch parsing

interface MonarchMatch {
  source: TermRef; // patient term
  target: TermRef; // disease term
  subsumer: TermRef | null;
}

interface MonarchResult {
  mondoId: string;
  name: string;
  score: number;
  orpha: string | null; // "ORPHA:558"
  omim: string | null; // "OMIM:154700"
  matches: Map<HpoId, MonarchMatch>; // by patient term id
  termLabels: Map<HpoId, string>; // labels of the query terms, from object_termset
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function obj(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

function parseMonarch(body: unknown): MonarchResult[] {
  let obsoleteSkipped = 0;
  if (!Array.isArray(body)) throw new UpstreamError("monarchSemsim", null);
  const out: MonarchResult[] = [];
  for (const row of body) {
    const r = obj(row);
    const subject = obj(r.subject);
    const mondoId = str(subject.id);
    const score = typeof r.score === "number" && Number.isFinite(r.score) ? r.score : null;
    if (!mondoId.startsWith("MONDO:") || score === null) continue;
    if (isObsoleteSubject(subject)) {
      obsoleteSkipped++;
      continue;
    }

    let orpha: string | null = null;
    let omim: string | null = null;
    const xrefs = Array.isArray(subject.xref) ? subject.xref : [];
    for (const x of xrefs) {
      const s = str(x);
      const o = /^(?:Orphanet|ORPHA):(\d+)$/.exec(s);
      if (o && !orpha) orpha = `ORPHA:${o[1]}`;
      const m = /^OMIM:(\d+)$/.exec(s);
      if (m && !omim) omim = `OMIM:${m[1]}`;
    }

    const sim = obj(r.similarity);
    const termLabels = new Map<HpoId, string>();
    for (const [id, t] of Object.entries(obj(sim.object_termset))) {
      const label = str(obj(t).label);
      if (label !== "") termLabels.set(id, label);
    }
    const matches = new Map<HpoId, MonarchMatch>();
    for (const m of Object.values(obj(sim.object_best_matches))) {
      const mm = obj(m);
      const sourceId = str(mm.match_source);
      const targetId = str(mm.match_target);
      if (!HPO_ID_RE.test(sourceId) || !HPO_ID_RE.test(targetId)) continue;
      const subsumerId = str(mm.match_subsumer);
      matches.set(sourceId, {
        source: { id: sourceId, label: str(mm.match_source_label) },
        target: { id: targetId, label: str(mm.match_target_label) },
        subsumer: subsumerId !== "" ? { id: subsumerId, label: str(mm.match_subsumer_label) } : null,
      });
    }
    out.push({ mondoId, name: str(subject.name), score, orpha, omim, matches, termLabels });
  }
  // Rows came back but none was usable: that is a broken response, not "no
  // matching diseases", so it must not look like an empty live ranking.
  // (Rows that were all obsolete are a real answer, not a broken response.)
  if (body.length > 0 && out.length === 0 && obsoleteSkipped === 0) throw new UpstreamError("monarchSemsim", null);
  return out;
}

/** ORPHA > OMIM > MONDO (7.4 step 3). */
function chooseDiseaseId(r: MonarchResult): DiseaseId {
  return r.orpha ?? r.omim ?? r.mondoId;
}

/** Merge results with the same diseaseId (keep the higher score), then order and cut (7.4 steps 3 and 9). */
function topResults(results: MonarchResult[], limit: number): Array<MonarchResult & { diseaseId: DiseaseId }> {
  const byId = new Map<DiseaseId, MonarchResult>();
  for (const r of results) {
    const id = chooseDiseaseId(r);
    const prev = byId.get(id);
    if (!prev || r.score > prev.score) byId.set(id, r);
  }
  return [...byId.entries()]
    .map(([diseaseId, r]) => ({ ...r, diseaseId }))
    .sort((a, b) => b.score - a.score || (a.diseaseId < b.diseaseId ? -1 : a.diseaseId > b.diseaseId ? 1 : 0))
    .slice(0, limit);
}

// ------------------------------------------------------- evidence assembly

/** Merged feature view across the ORPHA and OMIM annotation sets. */
interface FeatureView {
  label: string;
  frequency: FrequencyInfo;
}

/** Prefer a banded ORPHA frequency, else a banded OMIM one, else the first annotated set (label null). */
function mergeFeatures(sets: DiseaseAnnotations[]): Map<HpoId, FeatureView> {
  const merged = new Map<HpoId, FeatureView>();
  for (const set of sets) {
    for (const f of set.features) {
      const prev = merged.get(f.id);
      if (!prev || (prev.frequency.label === null && f.frequency.label !== null)) {
        merged.set(f.id, { label: f.label, frequency: f.frequency });
      }
    }
  }
  return merged;
}

function isFrequent(f: FrequencyInfo): boolean {
  return f.label !== null && FREQUENT_BANDS.includes(f.label);
}

function byBandThenId(a: DiseaseFeature, b: DiseaseFeature): number {
  const ba = a.frequency.label === null ? 9 : BAND_ORDER[a.frequency.label];
  const bb = b.frequency.label === null ? 9 : BAND_ORDER[b.frequency.label];
  return ba - bb || (a.term.id < b.term.id ? -1 : a.term.id > b.term.id ? 1 : 0);
}

function idNumber(id: string): string {
  return id.slice(id.indexOf(":") + 1);
}

// --------------------------------------------------------- enrichment report

/**
 * Per-candidate record of what the enrichment calls actually returned.
 * Not part of the contract response (RankResponse is unchanged); returned next
 * to it by rankCandidatesWithReport so callers can tell complete evidence from
 * incomplete evidence. "not-applicable" means no call was made (no such id).
 */
export interface CandidateEnrichment {
  diseaseId: DiseaseId;
  annotations: Array<{ id: DiseaseId; status: FetchStatus; error?: string }>; // [] when no ORPHA or OMIM id
  orphadata: { id: DiseaseId; status: FetchStatus; error?: string } | { status: "not-applicable" };
  /**
   * true when every HPO annotation call for this candidate answered (ok or a
   * real 404). Only then does `frequency: null` mean "not listed"; when false
   * it means "could not be read" (failed, unusable or out of budget) and must
   * not be shown as "Frequency not listed".
   */
  evidenceComplete: boolean;
}

export interface EnrichmentReport {
  /**
   * true when no enrichment call failed or returned an unusable body.
   * "not-found" (the service has no record) and "not-applicable" count as
   * complete: nothing was lost, there was nothing to get.
   */
  complete: boolean;
  candidates: CandidateEnrichment[];
  /** Plain-English summary, one line per lost piece of evidence; [] when complete. */
  warnings: string[];
}

export interface RankWithReport {
  response: RankResponse;
  enrichment: EnrichmentReport;
}

interface Enrichment {
  annotations: DiseaseAnnotations[]; // only sets whose call returned "ok"
  orphaName: string | null;
  orphaDate: string | null;
  report: CandidateEnrichment;
}

function lost(status: FetchStatus): boolean {
  return status === "failed" || status === "unusable";
}

async function enrich(
  r: { diseaseId: DiseaseId; orpha: string | null; omim: string | null },
  deps: EngineDeps,
): Promise<Enrichment> {
  const ids = [r.orpha, r.omim].filter((x): x is string => x !== null);
  const [outcomes, orpha] = await Promise.all([
    Promise.all(ids.map((id) => fetchAnnotations(id, deps))),
    r.orpha ? fetchOrphadata(idNumber(r.orpha), deps) : Promise.resolve(null),
  ]);
  const annotations = outcomes.flatMap((o) => (o.status === "ok" && o.data ? [o.data] : []));
  const report: CandidateEnrichment = {
    diseaseId: r.diseaseId,
    annotations: outcomes.map((o) => (o.error ? { id: o.id, status: o.status, error: o.error } : { id: o.id, status: o.status })),
    orphadata:
      r.orpha && orpha
        ? orpha.error
          ? { id: r.orpha, status: orpha.status, error: orpha.error }
          : { id: r.orpha, status: orpha.status }
        : { status: "not-applicable" },
    evidenceComplete: outcomes.every((o) => o.status === "ok" || o.status === "not-found"),
  };
  const record = orpha?.status === "ok" ? orpha.data : null;
  return { annotations, orphaName: record?.preferredTerm ?? null, orphaDate: record?.date || null, report };
}

function enrichmentWarnings(c: CandidateEnrichment): string[] {
  const out: string[] = [];
  for (const a of c.annotations) {
    if (lost(a.status)) out.push(`${c.diseaseId}: HPO annotations for ${a.id} ${a.status === "failed" ? "could not be fetched" : "were unusable"}; frequencies from that set are missing`);
  }
  if ("id" in c.orphadata && lost(c.orphadata.status)) {
    out.push(`${c.diseaseId}: Orphadata name check ${c.orphadata.status === "failed" ? "could not be fetched" : "returned an unusable record"}; the Monarch name is shown`);
  }
  return out;
}

function buildCandidate(
  r: MonarchResult & { diseaseId: DiseaseId },
  e: Enrichment,
  observed: HpoId[],
  excluded: HpoId[],
): Omit<Candidate, "rank"> {
  const features = mergeFeatures(e.annotations);
  const observedSet = new Set(observed);
  const excludedSet = new Set(excluded);

  const matched: Evidence[] = [];
  const unmatched: TermRef[] = [];
  for (const id of observed) {
    const m = r.matches.get(id);
    const patientTerm: TermRef = { id, label: r.termLabels.get(id) ?? m?.source.label ?? id };
    const exact = m !== undefined && m.target.id === id;
    const subsumerOk =
      m !== undefined && m.subsumer !== null && HPO_ID_RE.test(m.subsumer.id) && !TOO_GENERAL_SUBSUMERS.has(m.subsumer.id);
    if (!m || (!exact && !subsumerOk)) {
      unmatched.push(patientTerm);
      continue;
    }
    const ev: Evidence = {
      patientTerm,
      diseaseTerm: { id: m.target.id, label: m.target.label },
      via: exact ? "exact" : "ancestor",
      frequency: features.get(m.target.id)?.frequency ?? null,
    };
    if (!exact && m.subsumer) ev.ancestor = { id: m.subsumer.id, label: m.subsumer.label };
    matched.push(ev);
  }

  const matchedTargets = new Set(matched.map((x) => x.diseaseTerm.id));
  const notReported: DiseaseFeature[] = [];
  const contradicted: DiseaseFeature[] = [];
  for (const [id, f] of features) {
    if (!isFrequent(f.frequency)) continue;
    const df: DiseaseFeature = { term: { id, label: f.label }, frequency: f.frequency };
    if (excludedSet.has(id)) contradicted.push(df);
    else if (!observedSet.has(id) && !matchedTargets.has(id)) notReported.push(df);
  }
  notReported.sort(byBandThenId);
  contradicted.sort(byBandThenId);

  const categories = [...new Set(e.annotations.flatMap((a) => a.categories))].sort();
  const genesById = new Map<string, Gene>();
  for (const g of e.annotations.flatMap((a) => a.genes)) if (!genesById.has(g.id)) genesById.set(g.id, g);
  const genes = [...genesById.values()].sort((a, b) => (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0));

  const sources: CandidateSource[] = ["monarch-semsim"];
  if (e.annotations.length > 0) sources.push("hpo-annotations");
  if (e.orphaName) sources.push("orphadata");

  const links: Candidate["links"] = { monarch: `https://monarchinitiative.org/${r.mondoId}` };
  if (r.orpha) links.orphanet = `https://www.orpha.net/en/disease/detail/${idNumber(r.orpha)}`;
  if (r.omim) links.omim = `https://omim.org/entry/${idNumber(r.omim)}`;

  return {
    diseaseId: r.diseaseId,
    mondoId: r.mondoId,
    name: e.orphaName ?? r.name,
    overlap: overlapLabel(weightedMatchCount(matched), observed.length, contradicted.length),
    score: r.score,
    matched,
    unmatched,
    notReported: notReported.slice(0, MAX_NOT_REPORTED),
    contradicted,
    categories,
    genes,
    links,
    sources,
  };
}

/**
 * Rank candidate diseases for a set of observed (and excluded) HPO terms
 * (contract section 6 signature). Same as rankCandidatesWithReport(...).response.
 *
 * The four outcomes a caller can tell apart:
 * - live, complete evidence: resolves; rankCandidatesWithReport gives enrichment.complete === true
 * - live, incomplete evidence: resolves; enrichment.complete === false, with warnings.
 *   In the response itself, an affected candidate lacks "hpo-annotations" (or
 *   "orphadata") in `sources` and its frequencies are null; nothing is filled in.
 * - ranking provider failure: rejects with UpstreamTimeout / UpstreamError
 *   (InvalidInput for a bad request)
 * - recorded demo fallback: not produced here; getDemoRanking(key) returns it
 *   with source "demo" and dataVersions.demoCache
 */
export async function rankCandidates(req: RankRequest, deps: EngineDeps): Promise<RankResponse> {
  return (await rankCandidatesWithReport(req, deps)).response;
}

/** rankCandidates plus the per-candidate enrichment report (not part of the contract response). */
export async function rankCandidatesWithReport(req: RankRequest, deps: EngineDeps): Promise<RankWithReport> {
  const { observed, excluded, limit } = normalizeRankRequest(req);
  const now = deps.now ?? (() => new Date());

  const startedAt = Date.now();
  const url = `${MONARCH_SEMSIM}/${observed.join(",")}/Human%20Diseases?limit=${limit + 5}`;
  // The Monarch call gets its own timeout (default 10 s) but never more than the
  // whole budget; enrichment then gets what is left (rankBudgetOf).
  const budget = rankBudgetOf(deps);
  // Deadline for network work; the margin is kept for finishing the response.
  const networkBudget = Math.max(0, budget - RANK_FINISH_MARGIN_MS);
  const monarchMs = Math.min(deps.timeoutsMs?.monarchSemsim ?? DEFAULT_TIMEOUTS_MS.monarchSemsim, networkBudget);
  const body = await getJson("monarchSemsim", url, { ...deps, timeoutsMs: { ...deps.timeoutsMs, monarchSemsim: monarchMs } });
  if (body === null) throw new UpstreamError("monarchSemsim", 404);
  const top = topResults(parseMonarch(body), limit);

  // Contract v0.1.2: annotation and Orphadata calls keep their own timeouts but
  // never run past the 12 s budget. A call refused for lack of budget is
  // reported as "failed" in the enrichment report and only drops its data.
  const left = Math.max(0, networkBudget - (Date.now() - startedAt));
  const capped = (name: "hpoAnnotation" | "orphadata") => Math.min(deps.timeoutsMs?.[name] ?? DEFAULT_TIMEOUTS_MS[name], left);
  const after: EngineDeps = { ...deps, timeoutsMs: { ...deps.timeoutsMs, hpoAnnotation: capped("hpoAnnotation"), orphadata: capped("orphadata") } };

  const enriched = await Promise.all(top.map((r) => enrich(r, after)));
  const candidates: Candidate[] = top.map((r, i) => ({
    rank: i + 1,
    ...buildCandidate(r, enriched[i] as Enrichment, observed, excluded),
  }));

  const dataVersions: DataVersions = { hpo: HPO_VERSION, monarch: MONARCH_VERSION, fetchedAt: now().toISOString() };
  const orphaDates = enriched.map((e) => e.orphaDate).filter((d): d is string => d !== null).sort();
  const latest = orphaDates[orphaDates.length - 1];
  if (latest) dataVersions.orphanet = latest;

  const reports = enriched.map((e) => e.report);
  const warnings = reports.flatMap(enrichmentWarnings);
  return {
    response: { version: "0.1", source: "live", candidates, dataVersions },
    enrichment: { complete: warnings.length === 0, candidates: reports, warnings },
  };
}
