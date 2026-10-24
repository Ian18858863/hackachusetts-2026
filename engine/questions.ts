// "What to check next" (CONTRACT.md 7.5, v0.1.2): features that are frequent
// in some top candidates and rare or not listed in others separate them best
// (the Phenomizer idea, Köhler et al. 2009).
//
// Every question comes from HPO annotation data: the term, its label, the
// `discriminates` list and `why`. Nothing is guessed when data is missing:
// - a candidate whose annotations could not be loaded (failed or unusable
//   call, no annotation set, or a MONDO id JAX cannot annotate) takes no part
//   in the spread, gets `frequency: null` and is not named in `why`, because
//   "not listed for" may only be said after a real lookup (7.5 step 7);
// - a hierarchy check that could not run keeps the feature (7.5 step 5).
//
// Budgets (7.5 and section 10): 5 s in total, and at most
// ENGINE_SUBREQUEST_CAP fetch calls per invocation, retries included. The cap
// is 40, not 50, so the calling function keeps 10 of the Workers free-plan
// limit of 50 for its own Cache API calls (which count too).

import { fetchAnnotations, type DiseaseAnnotations, type FetchStatus } from "./annotations";
import { InvalidInput, UpstreamError, UpstreamTimeout } from "./errors";
import { DEFAULT_TIMEOUTS_MS, getJson } from "./http";
import { HPO_ID_RE, HPO_VERSION, normalizeHpoId } from "./hpo";
import type {
  DiseaseId,
  EngineDeps,
  FetchLike,
  FrequencyInfo,
  FrequencyLabel,
  HpoId,
  NextQuestionsRequest,
  NextQuestionsResponse,
  Question,
} from "./types";

// ------------------------------------------------------------------ constants

/** Frequency midpoints (7.5 step 2). */
export const MIDPOINT: Readonly<Record<FrequencyLabel, number>> = {
  Obligate: 1.0,
  "Very frequent": 0.9,
  Frequent: 0.55,
  Occasional: 0.17,
  "Very rare": 0.025,
  Excluded: 0,
};
/** Annotated without a frequency (7.5 step 2). */
export const UNSPECIFIED_MIDPOINT = 0.5;
/** Not annotated in a candidate that has data (7.5 step 2). */
export const NOT_LISTED_MIDPOINT = 0;
/** Minimum spread for a question (7.5 step 4). */
export const MIN_SCORE = 0.35;

/** Total budget for one nextQuestions call (7.5). */
export const QUESTIONS_BUDGET_MS = 5000;
/**
 * Network work stops this long before the 5 s budget, so aborting late calls
 * and building the questions still finish inside it. Without it, hung calls
 * aborted exactly at 5000 ms and the function returned at 5002-5006 ms
 * (measured 2026-10-24 15:27 ET).
 */
export const FINISH_MARGIN_MS = 100;
/** Hard cap on fetch calls per invocation, retries included (see file header). */
export const ENGINE_SUBREQUEST_CAP = 40;
/** Below this much time left, no new hierarchy lookup is started. */
const MIN_LOOKUP_MS = 150;

/**
 * Annotation categories that hold course modifiers, not clinical features
 * (onset, inheritance). Asking "Has anyone noticed autosomal recessive
 * inheritance?" is not a question for a family, so they never become questions.
 */
export const NON_FEATURE_CATEGORIES: ReadonlySet<string> = new Set(["Clinical course", "Inheritance"]);

const JAX_TERMS = "https://ontology.jax.org/api/hp/terms";
const DISEASE_ID_RE = /^(ORPHA|OMIM|MONDO):\d+$/;

// ---------------------------------------------------------------- validation

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

export interface NormalizedQuestionsRequest {
  observed: HpoId[]; // sorted, deduplicated
  excluded: HpoId[]; // sorted, deduplicated
  candidates: DiseaseId[]; // request order kept: it is the order of `discriminates`
  limit: number;
}

/** Validated request. Throws InvalidInput. */
export function normalizeQuestionsRequest(req: NextQuestionsRequest): NormalizedQuestionsRequest {
  if (typeof req !== "object" || req === null) throw new InvalidInput("body");
  const observed = cleanIds("observed", req.observed, 1, 50);
  const excluded = cleanIds("excluded", req.excluded, 0, 50);
  const both = observed.find((id) => excluded.includes(id));
  if (both) throw new InvalidInput("excluded", `${both} is also in observed`);
  if (!Array.isArray(req.candidates)) throw new InvalidInput("candidates", "must be an array of disease ids");
  const candidates: DiseaseId[] = [];
  for (const c of req.candidates) {
    if (typeof c !== "string" || !DISEASE_ID_RE.test(c)) throw new InvalidInput("candidates", "ids must be ORPHA:n, OMIM:n or MONDO:n");
    if (candidates.includes(c)) throw new InvalidInput("candidates", `${c} is listed twice`);
    candidates.push(c);
  }
  if (candidates.length < 2 || candidates.length > 5) throw new InvalidInput("candidates", "2-5 ids");
  const limit = req.limit ?? 5;
  if (!Number.isInteger(limit) || limit < 1 || limit > 8) throw new InvalidInput("limit", "1-8");
  return { observed, excluded, candidates, limit };
}

// ------------------------------------------------------------------- budgets

/** Counts every fetch call and refuses calls past the cap without touching the network. */
class Meter {
  used = 0;
  refused = 0;
  constructor(readonly cap: number) {}

  /** Time each fetch call started (Date.now()), for budget checks and tests. */
  readonly startedAt: number[] = [];

  wrap(fetchFn: FetchLike, deadline: number): FetchLike {
    // Call through a local binding (Workers "Illegal invocation" guard).
    const doFetch = fetchFn;
    return (input, init) => {
      if (this.used >= this.cap || Date.now() >= deadline) {
        this.refused++;
        // "AbortError" makes getJson give up at once (no retry sleep) with UpstreamTimeout.
        const err = new Error(this.used >= this.cap ? "Subrequest budget exhausted" : "Time budget exhausted");
        err.name = "AbortError";
        return Promise.reject(err);
      }
      this.used++;
      this.startedAt.push(Date.now());
      const p = doFetch(input, init);
      // Never wait past the signal, even if the underlying fetch ignores it.
      const signal = init?.signal;
      if (!signal) return p;
      return new Promise<Response>((resolve, reject) => {
        const onAbort = () => {
          const err = new Error("Request aborted by its timeout");
          err.name = "TimeoutError";
          reject(err);
        };
        if (signal.aborted) return onAbort();
        signal.addEventListener("abort", onAbort, { once: true });
        p.then(
          (r) => { signal.removeEventListener("abort", onAbort); resolve(r); },
          (e: unknown) => { signal.removeEventListener("abort", onAbort); reject(e); },
        );
      });
    };
  }
}

/** deps whose timeout for `name` never runs past the deadline. */
function capped(deps: EngineDeps, name: "hpoAnnotation" | "hpoTerm", deadline: number): EngineDeps {
  const left = Math.max(0, deadline - Date.now());
  const ms = Math.min(deps.timeoutsMs?.[name] ?? DEFAULT_TIMEOUTS_MS[name], left);
  return { ...deps, timeoutsMs: { ...deps.timeoutsMs, [name]: ms } };
}

// ----------------------------------------------------------------- hierarchy

/** Ancestors of an HPO term (self not included), or null when the lookup failed or was refused. */
async function ancestorsOf(id: HpoId, deps: EngineDeps): Promise<Set<HpoId> | null> {
  let body: unknown;
  try {
    body = await getJson("hpoTerm", `${JAX_TERMS}/${encodeURIComponent(id)}/ancestors`, deps);
  } catch {
    return null;
  }
  if (!Array.isArray(body)) return null;
  const out = new Set<HpoId>();
  for (const row of body) {
    const a = normalizeHpoId((row as { id?: unknown } | null)?.id);
    if (a) out.add(a);
  }
  return out;
}

export type DropReason = "ancestor-of-observed" | "descendant-of-observed" | "descendant-of-excluded";

export interface HierarchyReport {
  /** false when the filter could not run at all (no budget or time left). */
  ran: boolean;
  lookups: number; // lookups started
  failedLookups: number; // failed, timed out or refused
  dropped: Array<{ hpoId: HpoId; reason: DropReason; relatedTo: HpoId }>;
  /** Returned questions whose hierarchy check was incomplete (kept per 7.5 step 5). */
  uncheckedReturned: HpoId[];
}

// ------------------------------------------------------------------- scoring

interface CandidateData {
  diseaseId: DiseaseId;
  name: string;
  features: Map<HpoId, { label: string; frequency: FrequencyInfo }>; // clinical features only
  /**
   * true when every annotation set of this candidate was read (for ORPHA: its
   * own set and its linked OMIM set, or a confirmed "no partner"). Only then
   * may a feature it lacks be called "not listed" (7.5 step 7).
   */
  complete: boolean;
}

function midpoint(f: FrequencyInfo | undefined): number {
  if (!f) return NOT_LISTED_MIDPOINT;
  return f.label === null ? UNSPECIFIED_MIDPOINT : MIDPOINT[f.label];
}

/** Round away float noise (e.g. 0.9 - 0.55) without changing the order. */
function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/** "Hypometric upward saccades" -> "hypometric upward saccades"; keeps acronyms such as "EEG". */
function lowerFirst(label: string): string {
  if (/^[A-Z]{2}/.test(label)) return label;
  return label.charAt(0).toLowerCase() + label.slice(1);
}

function frequencyPhrase(f: FrequencyInfo | undefined, name: string): string {
  if (!f) return `not listed for ${name}`;
  if (f.label === null) return `listed without a frequency for ${name}`;
  if (f.label === "Excluded") return `listed as excluded in ${name}`;
  const raw = f.raw ? ` (${f.raw})` : "";
  return `${f.label}${raw} in ${name}`;
}

/**
 * Clinical features of one or more annotation sets, merged as rank.ts does
 * (contract 7.4 step 4): sets in order ORPHA then OMIM; a feature takes the
 * first banded frequency (so a usable ORPHA band wins, else the normalised
 * OMIM value), else the first set's unbanded entry. Each frequency keeps the
 * `source` of the set it came from.
 */
export function mergeClinicalFeatures(sets: readonly DiseaseAnnotations[]): Map<HpoId, { label: string; frequency: FrequencyInfo }> {
  const merged = new Map<HpoId, { label: string; frequency: FrequencyInfo }>();
  for (const set of sets) {
    for (const f of set.features) {
      if (NON_FEATURE_CATEGORIES.has(f.category)) continue;
      const prev = merged.get(f.id);
      if (!prev || (prev.frequency.label === null && f.frequency.label !== null)) {
        merged.set(f.id, { label: prev?.label ?? f.label, frequency: f.frequency });
      }
    }
  }
  return merged;
}

// ------------------------------------------------- ORPHA -> OMIM partner link

const MONARCH_API = "https://api.monarchinitiative.org/v3/api";
/** Monarch mapping and entity lookups are small; 2 s like the other id lookups (contract 10). */
const PARTNER_LOOKUP_MS = 2000;

type PartnerResult =
  | { status: "ok"; omim: DiseaseId | null; mondoName: string | null } // omim null = Monarch lists no OMIM partner
  | { status: "failed"; error: string };

/**
 * The OMIM id linked to an ORPHA disease, the same link rankCandidates gets
 * from Monarch xrefs (7.4 step 3): the disease's MONDO id (from the JAX
 * annotation set, else Monarch's skos:exactMatch mapping of Orphanet:n), then
 * the OMIM xref of that MONDO entity. A failed lookup is reported, never
 * read as "no partner".
 */
async function omimPartnerOf(orpha: DiseaseId, mondoFromJax: string | undefined, deps: EngineDeps, deadline: number): Promise<PartnerResult> {
  const left = () => Math.max(0, Math.min(PARTNER_LOOKUP_MS, deadline - Date.now()));
  const monarch = (): EngineDeps => ({ ...deps, timeoutsMs: { ...deps.timeoutsMs, monarchSemsim: left() } });
  try {
    let mondo = mondoFromJax ?? null;
    if (!mondo) {
      const orphanet = `Orphanet:${orpha.slice(orpha.indexOf(":") + 1)}`;
      const body = await getJson("monarchSemsim", `${MONARCH_API}/mappings?entity_id=${encodeURIComponent(orphanet)}`, monarch());
      const items = (body as { items?: unknown } | null)?.items;
      if (!Array.isArray(items)) return { status: "failed", error: "Monarch mapping response unusable" };
      const hit = items.find((x) => {
        const m = x as Record<string, unknown>;
        return m.object_id === orphanet && m.predicate_id === "skos:exactMatch" && typeof m.subject_id === "string" && /^MONDO:\d+$/.test(m.subject_id);
      }) as { subject_id: string } | undefined;
      if (!hit) return { status: "ok", omim: null, mondoName: null };
      mondo = hit.subject_id;
    }
    const entity = await getJson("monarchSemsim", `${MONARCH_API}/entity/${encodeURIComponent(mondo)}`, monarch());
    if (entity === null) return { status: "ok", omim: null, mondoName: null };
    const e = entity as { xref?: unknown; name?: unknown };
    if (!Array.isArray(e.xref)) return { status: "failed", error: "Monarch entity response unusable" };
    const omim = e.xref.find((x): x is string => typeof x === "string" && /^OMIM:\d+$/.test(x)) ?? null;
    return { status: "ok", omim, mondoName: typeof e.name === "string" && e.name !== "" ? e.name : null };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : "unknown error" };
  }
}

interface LoadedCandidate {
  data: CandidateData | null; // null: no clinical features at all
  report: QuestionsCandidateReport;
  /** true when a call failed or was unusable (as opposed to "there is nothing to get"). */
  lost: boolean;
  timedOut: boolean;
}

async function loadCandidate(id: DiseaseId, deps: EngineDeps, deadline: number): Promise<LoadedCandidate> {
  if (id.startsWith("MONDO:")) {
    return { data: null, report: { diseaseId: id, status: "not-applicable", participates: false }, lost: false, timedOut: false };
  }
  const annDeps = () => capped(deps, "hpoAnnotation", deadline);
  const primary = await fetchAnnotations(id, annDeps());
  const report: QuestionsCandidateReport = { diseaseId: id, status: primary.status, participates: false };
  if (primary.error) report.error = primary.error;
  const lostStatus = (s: FetchStatus) => s === "failed" || s === "unusable";
  const timeout = (e?: string) => /timed out|budget exhausted/i.test(e ?? "");
  let lost = lostStatus(primary.status);
  let timedOut = lost && timeout(primary.error);
  const sets: DiseaseAnnotations[] = primary.status === "ok" && primary.data ? [primary.data] : [];
  let complete = !lost;
  let name = primary.data?.name || "";

  // ORPHA candidates also read their linked OMIM set, as rankCandidates does (7.4 step 4).
  // Also after a failed ORPHA call: the verified OMIM set is still real evidence
  // (the candidate stays incomplete, so nothing it lacks is called "not listed").
  if (id.startsWith("ORPHA:")) {
    const link = await omimPartnerOf(id, primary.data?.mondoId, deps, deadline);
    if (link.status === "failed") {
      report.partner = { status: "lookup-failed", error: link.error };
      complete = false;
      lost = true;
      timedOut ||= timeout(link.error);
    } else if (link.omim === null) {
      report.partner = { status: "none" };
      if (!name && link.mondoName) name = link.mondoName;
    } else {
      const omim = await fetchAnnotations(link.omim, annDeps());
      report.partner = omim.error ? { id: link.omim, status: omim.status, error: omim.error } : { id: link.omim, status: omim.status };
      if (omim.status === "ok" && omim.data) sets.push(omim.data);
      if (lostStatus(omim.status)) {
        complete = false;
        lost = true;
        timedOut ||= timeout(omim.error);
      }
      if (!name) name = link.mondoName || omim.data?.name || "";
    }
  }

  report.evidenceComplete = complete;
  const features = mergeClinicalFeatures(sets);
  if (features.size === 0) return { data: null, report, lost, timedOut };
  report.participates = true;
  report.sources = sets.map((s) => s.diseaseId);
  return { data: { diseaseId: id, name: name || id, features, complete }, report, lost, timedOut };
}

// -------------------------------------------------------------------- report

export interface QuestionsCandidateReport {
  diseaseId: DiseaseId;
  status: FetchStatus | "not-applicable"; // not-applicable: MONDO id, no annotation call
  /** true when this candidate's annotations took part in the spread. */
  participates: boolean;
  error?: string;
  /** ORPHA candidates only: the linked OMIM set (none = Monarch lists no OMIM partner). */
  partner?: { id: DiseaseId; status: FetchStatus; error?: string } | { status: "none" } | { status: "lookup-failed"; error: string };
  /** Annotation sets that supplied this candidate's features, ORPHA first. */
  sources?: DiseaseId[];
  /**
   * true when every annotation set of this candidate was read. When false, a
   * `frequency: null` for this candidate means "could not be read", not
   * "not listed". Absent for MONDO candidates (no annotation call).
   */
  evidenceComplete?: boolean;
}

export interface NextQuestionsReport {
  /**
   * true only when every requested candidate took part (full coverage), no
   * call failed, and every returned question was fully hierarchy-checked.
   * A 404 or a MONDO candidate is not a failure, but it is partial coverage,
   * so `complete` is false and `coverage` says how many took part.
   */
  complete: boolean;
  coverage: { requested: number; participating: number; full: boolean };
  candidates: QuestionsCandidateReport[];
  hierarchy: HierarchyReport;
  /** startedAtMs: when each fetch call started, in ms after the call began (all < 5000). */
  subrequests: { used: number; refused: number; cap: number; startedAtMs: number[] };
  warnings: string[];
}

export interface NextQuestionsWithReport {
  response: NextQuestionsResponse;
  report: NextQuestionsReport;
}

// ---------------------------------------------------------------------- main

/**
 * Discriminating questions for 2-5 candidate diseases (contract section 6
 * signature). Same as nextQuestionsWithReport(...).response.
 *
 * Throws InvalidInput for a bad request. Throws UpstreamTimeout / UpstreamError
 * when annotation failures leave fewer than two candidates with data (the
 * function then tries the demo cache). Fewer than two candidates with data and
 * no failure (e.g. no annotation sets exist) is a real "no questions" answer.
 */
export async function nextQuestions(req: NextQuestionsRequest, deps: EngineDeps): Promise<NextQuestionsResponse> {
  return (await nextQuestionsWithReport(req, deps)).response;
}

/** nextQuestions plus a report of what each call returned and which checks ran (not part of the contract response). */
export async function nextQuestionsWithReport(req: NextQuestionsRequest, deps: EngineDeps): Promise<NextQuestionsWithReport> {
  const norm = normalizeQuestionsRequest(req);
  const now = deps.now ?? (() => new Date());
  const startedAt = Date.now();
  // Deadline for starting and waiting on network calls; the rest of the margin is for finishing.
  const deadline = startedAt + QUESTIONS_BUDGET_MS - FINISH_MARGIN_MS;
  const meter = new Meter(ENGINE_SUBREQUEST_CAP);
  const metered: EngineDeps = { ...deps, fetch: meter.wrap(deps.fetch, deadline) };
  const warnings: string[] = [];

  // 1. annotations per candidate in parallel; ORPHA candidates also read their linked OMIM set (7.4 step 4)
  const loaded = await Promise.all(norm.candidates.map((id) => loadCandidate(id, metered, deadline)));

  const data = new Map<DiseaseId, CandidateData>();
  const candidateReports: QuestionsCandidateReport[] = loaded.map((l) => {
    if (l.data) data.set(l.report.diseaseId, l.data);
    return l.report;
  });
  for (const l of loaded) {
    const r = l.report;
    if (!r.participates) {
      warnings.push(
        l.lost
          ? `${r.diseaseId}: HPO annotations could not be fully read; it takes no part in the questions`
          : `${r.diseaseId}: no HPO annotation data${r.status === "not-applicable" ? " for a MONDO id" : ""}; it takes no part in the questions`,
      );
    } else if (l.data && !l.data.complete) {
      warnings.push(`${r.diseaseId}: only part of its HPO annotations could be read; features it lacks are not called "not listed"`);
    }
  }

  const participating = norm.candidates.map((id) => data.get(id)).filter((c): c is CandidateData => c !== undefined);
  const lost = loaded.filter((l) => l.lost);
  if (participating.length < 2 && lost.length > 0) {
    // Without data we cannot say "not listed": let the function use the demo cache or 502/504.
    throw lost.every((l) => l.timedOut) ? new UpstreamTimeout("hpoAnnotation") : new UpstreamError("hpoAnnotation", null);
  }

  /**
   * A candidate's evidence for one feature: its frequency if annotated;
   * "not-listed" only when all its sets were read; else unknown (no claim).
   */
  const evidence = (c: CandidateData, hpoId: HpoId): FrequencyInfo | "not-listed" | "unknown" =>
    c.features.get(hpoId)?.frequency ?? (c.complete ? "not-listed" : "unknown");

  // 2-4. score every feature annotated in a participating candidate and not already reported;
  // candidates with unknown evidence for a feature take no part in its spread
  const reported = new Set([...norm.observed, ...norm.excluded]);
  const featureIds = new Set<HpoId>();
  for (const c of participating) for (const id of c.features.keys()) if (!reported.has(id)) featureIds.add(id);
  const scored: Array<{ hpoId: HpoId; score: number }> = [];
  for (const hpoId of featureIds) {
    const m: number[] = [];
    for (const c of participating) {
      const e = evidence(c, hpoId);
      if (e === "unknown") continue;
      m.push(e === "not-listed" ? NOT_LISTED_MIDPOINT : midpoint(e));
    }
    if (m.length < 2) continue; // nothing to compare against
    const score = round3(Math.max(...m) - Math.min(...m));
    if (score >= MIN_SCORE) scored.push({ hpoId, score });
  }
  scored.sort((a, b) => b.score - a.score || (a.hpoId < b.hpoId ? -1 : a.hpoId > b.hpoId ? 1 : 0));

  // 5. hierarchy filter, bounded by time and subrequests
  const hierarchy = await filterByHierarchy(scored, norm, metered, meter, deadline);

  // 6-7. questions
  const questions: Question[] = hierarchy.kept.map(({ hpoId, score }) => {
    const label = participating.map((c) => c.features.get(hpoId)?.label).find((l) => l) ?? hpoId;
    const discriminates = norm.candidates.map((diseaseId) => ({
      diseaseId,
      frequency: data.get(diseaseId)?.features.get(hpoId)?.frequency ?? null,
    }));
    const why = participating
      .filter((c) => evidence(c, hpoId) !== "unknown")
      .map((c) => frequencyPhrase(c.features.get(hpoId)?.frequency, c.name))
      .join("; ");
    return {
      hpoId,
      label,
      question: `Has anyone noticed ${lowerFirst(label)}?`,
      discriminates,
      why: why.charAt(0).toUpperCase() + why.slice(1),
      score,
    };
  });

  if (!hierarchy.report.ran && scored.length > 0) warnings.push("The hierarchy check could not run; questions are not filtered against related reported terms");
  else if (hierarchy.report.uncheckedReturned.length > 0) {
    warnings.push(`Hierarchy check incomplete for ${hierarchy.report.uncheckedReturned.join(", ")}; kept`);
  }

  const coverage = {
    requested: norm.candidates.length,
    participating: participating.length,
    full: participating.length === norm.candidates.length,
  };
  const complete =
    coverage.full &&
    loaded.every((l) => !l.lost && (l.data?.complete ?? true)) &&
    hierarchy.report.ran &&
    hierarchy.report.uncheckedReturned.length === 0;

  return {
    response: { version: "0.1", source: "live", questions, dataVersions: { hpo: HPO_VERSION, fetchedAt: now().toISOString() } },
    report: {
      complete,
      coverage,
      candidates: candidateReports,
      hierarchy: hierarchy.report,
      subrequests: { used: meter.used, refused: meter.refused, cap: meter.cap, startedAtMs: meter.startedAt.map((t) => t - startedAt) },
      warnings,
    },
  };
}

/**
 * 7.5 step 5. Drops a feature that is an ancestor or a descendant of an
 * observed term, or a descendant of an excluded term; keeps an ancestor of an
 * excluded term. Lookups go in score order, one batch at a time, only as far
 * as needed to fill `limit`. A check that cannot run keeps the feature.
 */
async function filterByHierarchy(
  scored: ReadonlyArray<{ hpoId: HpoId; score: number }>,
  norm: NormalizedQuestionsRequest,
  deps: EngineDeps,
  meter: Meter,
  deadline: number,
): Promise<{ kept: Array<{ hpoId: HpoId; score: number }>; report: HierarchyReport }> {
  const report: HierarchyReport = { ran: false, lookups: 0, failedLookups: 0, dropped: [], uncheckedReturned: [] };
  if (scored.length === 0) return { kept: [], report: { ...report, ran: true } };

  const budgetLeft = () => meter.cap - meter.used;
  const timeLeft = () => deadline - Date.now();
  if (budgetLeft() <= 0 || timeLeft() < MIN_LOOKUP_MS) return { kept: scored.slice(0, norm.limit), report };
  report.ran = true;

  const lookup = async (id: HpoId): Promise<Set<HpoId> | null> => {
    report.lookups++;
    const r = await ancestorsOf(id, capped(deps, "hpoTerm", deadline));
    if (!r) report.failedLookups++;
    return r;
  };

  // Ancestors of observed terms (needed to see whether a feature is a broader term of one).
  // Keep enough budget for the first batch of feature lookups.
  const firstBatch = Math.min(norm.limit, scored.length);
  const observedToFetch = norm.observed.slice(0, Math.max(0, budgetLeft() - firstBatch));
  const firstIds = scored.slice(0, Math.min(firstBatch, Math.max(0, budgetLeft() - observedToFetch.length))).map((s) => s.hpoId);
  const [obsAnc, firstAnc] = await Promise.all([
    Promise.all(observedToFetch.map(lookup)),
    Promise.all(firstIds.map(lookup)),
  ]);
  const observedAncestors = new Map<HpoId, Set<HpoId> | null>();
  norm.observed.forEach((o) => observedAncestors.set(o, null));
  observedToFetch.forEach((o, i) => observedAncestors.set(o, obsAnc[i] ?? null));
  const allObservedKnown = [...observedAncestors.values()].every((s) => s !== null);

  const featureAncestors = new Map<HpoId, Set<HpoId> | null>();
  firstIds.forEach((id, i) => featureAncestors.set(id, firstAnc[i] ?? null));

  const kept: Array<{ hpoId: HpoId; score: number }> = [];
  let next = firstIds.length;

  const judge = (item: { hpoId: HpoId; score: number }, anc: Set<HpoId> | null | undefined) => {
    const f = item.hpoId;
    if (anc) {
      const o = norm.observed.find((x) => anc.has(x));
      if (o) return void report.dropped.push({ hpoId: f, reason: "descendant-of-observed", relatedTo: o });
      const e = norm.excluded.find((x) => anc.has(x));
      if (e) return void report.dropped.push({ hpoId: f, reason: "descendant-of-excluded", relatedTo: e });
    }
    const broader = norm.observed.find((o) => observedAncestors.get(o)?.has(f));
    if (broader) return void report.dropped.push({ hpoId: f, reason: "ancestor-of-observed", relatedTo: broader });
    kept.push(item);
    if (!anc || !allObservedKnown) report.uncheckedReturned.push(f);
  };

  for (let i = 0; i < firstIds.length && kept.length < norm.limit; i++) {
    const item = scored[i];
    if (item) judge(item, featureAncestors.get(item.hpoId));
  }

  // Further batches, only as many as needed to fill `limit`.
  while (kept.length < norm.limit && next < scored.length) {
    const room = Math.min(norm.limit - kept.length, scored.length - next, budgetLeft());
    if (room <= 0 || timeLeft() < MIN_LOOKUP_MS) break;
    const batch = scored.slice(next, next + room);
    next += batch.length;
    const anc = await Promise.all(batch.map((s) => lookup(s.hpoId)));
    batch.forEach((item, i) => {
      if (kept.length < norm.limit) judge(item, anc[i]);
    });
  }

  // Out of budget or time: the rest are kept unchecked, in score order (7.5 step 5).
  while (kept.length < norm.limit && next < scored.length) {
    const item = scored[next++];
    if (!item) break;
    judge(item, null);
  }

  // Questions are ordered by score, then id (7.5 step 4), whatever the batch order.
  report.uncheckedReturned.sort();
  return { kept, report };
}
