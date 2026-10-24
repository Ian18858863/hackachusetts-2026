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

import { fetchAnnotations, type AnnotationOutcome, type DiseaseAnnotations, type FetchStatus } from "./annotations";
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

function toCandidateData(a: DiseaseAnnotations): CandidateData {
  const features = new Map<HpoId, { label: string; frequency: FrequencyInfo }>();
  for (const f of a.features) {
    if (NON_FEATURE_CATEGORIES.has(f.category)) continue;
    features.set(f.id, { label: f.label, frequency: f.frequency });
  }
  return { diseaseId: a.diseaseId, name: a.name || a.diseaseId, features };
}

// -------------------------------------------------------------------- report

export interface QuestionsCandidateReport {
  diseaseId: DiseaseId;
  status: FetchStatus | "not-applicable"; // not-applicable: MONDO id, no annotation call
  /** true when this candidate's annotations took part in the spread. */
  participates: boolean;
  error?: string;
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

  // 1. annotations, one call per ORPHA / OMIM candidate, in parallel
  const annDeps = capped(metered, "hpoAnnotation", deadline);
  const outcomes = await Promise.all(
    norm.candidates.map((id): Promise<AnnotationOutcome | null> =>
      id.startsWith("MONDO:") ? Promise.resolve(null) : fetchAnnotations(id, annDeps),
    ),
  );

  const data = new Map<DiseaseId, CandidateData>();
  const candidateReports: QuestionsCandidateReport[] = norm.candidates.map((id, i) => {
    const o = outcomes[i] ?? null;
    if (!o) return { diseaseId: id, status: "not-applicable", participates: false };
    const cd = o.status === "ok" && o.data ? toCandidateData(o.data) : null;
    const participates = cd !== null && cd.features.size > 0;
    if (participates && cd) data.set(id, cd);
    const r: QuestionsCandidateReport = { diseaseId: id, status: o.status, participates };
    if (o.error) r.error = o.error;
    return r;
  });
  for (const r of candidateReports) {
    if (r.status === "failed" || r.status === "unusable") {
      warnings.push(`${r.diseaseId}: HPO annotations ${r.status === "failed" ? "could not be fetched" : "were unusable"}; it takes no part in the questions`);
    } else if (!r.participates) {
      warnings.push(`${r.diseaseId}: no HPO annotation data${r.status === "not-applicable" ? " for a MONDO id" : ""}; it takes no part in the questions`);
    }
  }

  const participating = norm.candidates.map((id) => data.get(id)).filter((c): c is CandidateData => c !== undefined);
  const lost = outcomes.filter((o) => o && (o.status === "failed" || o.status === "unusable"));
  if (participating.length < 2 && lost.length > 0) {
    // Without data we cannot say "not listed": let the function use the demo cache or 502/504.
    const allTimeouts = lost.every((o) => /timed out/.test(o?.error ?? ""));
    throw allTimeouts ? new UpstreamTimeout("hpoAnnotation") : new UpstreamError("hpoAnnotation", null);
  }

  // 2-4. score every feature annotated in a participating candidate and not already reported
  const reported = new Set([...norm.observed, ...norm.excluded]);
  const featureIds = new Set<HpoId>();
  for (const c of participating) for (const id of c.features.keys()) if (!reported.has(id)) featureIds.add(id);
  const scored: Array<{ hpoId: HpoId; score: number }> = [];
  for (const hpoId of featureIds) {
    const m = participating.map((c) => midpoint(c.features.get(hpoId)?.frequency));
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
    const why = participating.map((c) => frequencyPhrase(c.features.get(hpoId)?.frequency, c.name)).join("; ");
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
    candidateReports.every((r) => r.status !== "failed" && r.status !== "unusable") &&
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
