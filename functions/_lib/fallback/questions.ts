// Fallback for nextQuestions (docs/CONTRACT.md section 7.5), used only while
// the engine function is a placeholder (T18b).
//
// Temporary: this re-implements engine logic (contract sections 2-3 give it
// to engine/**, Jerry's T07) only so the demo works; the engine path takes
// over automatically (engineFirst) and this file is to be deleted then.
//
// Phenomizer idea (Köhler et al. 2009): a feature that is frequent in some top
// candidates and rare or not listed in others separates them best.
//   score = max - min of frequency midpoints across the candidates that have
//   annotation data (Obligate 1.0, Very frequent 0.9, Frequent 0.55,
//   Occasional 0.17, Very rare 0.025, Excluded 0; listed without a frequency
//   0.5; not listed 0).
// Features already observed or excluded are skipped; score >= 0.35 is kept.
// Features that are an HPO ancestor or descendant of an observed or excluded
// term are skipped too (T18d): asking "jaundice?" after "prolonged neonatal
// jaundice" is redundant. Ancestors come from hpoAncestors.ts (JAX, cached 7
// days). The patient side is looked up for at most MAX_PATIENT_LOOKUPS terms,
// in parallel with the annotations; the descendant check covers only the top
// MAX_FEATURE_CHECKS features by score. A failed lookup only means that term
// is not checked, so the result falls back to the behaviour without hierarchy.
//
// Annotation data per candidate: the same merged ORPHA + OMIM sets as the rank
// fallback (xrefs.ts resolves the partner id). MONDO ids are never sent to JAX.
// - A candidate with no annotation set at all is marked `noAnnotationData` in
//   `discriminates`, takes no part in the spread and is not named in `why`:
//   "not listed" is only said after a real lookup (section 7.5 step 6).
// - If the partner id could not be resolved or one set failed, `why` names the
//   annotation set it used, e.g. "(ORPHA:2274 annotations only)".
// The question is a fixed template around the HPO label; `discriminates` and
// `why` come only from the annotation data.

import { HPO_VERSION } from "../../../engine/hpo";
import type {
  DataVersions,
  DiseaseId,
  FrequencyInfo,
  FrequencyLabel,
  HpoId,
  NextQuestionsResponse,
  Question,
} from "../../../engine/index";
import { fetchAnnotation, hasAnnotationId, mergeAnnotations } from "./annotations";
import type { AnnotationSet, MergedAnnotations } from "./annotations";
import type { FallbackDeps } from "./http";
import { hpoAncestors } from "./hpoAncestors";
import { cachedXrefs, monarchXrefs } from "./xrefs";
import type { DiseaseXrefs } from "./xrefs";

const MIDPOINT: Readonly<Record<FrequencyLabel, number>> = {
  Obligate: 1.0,
  "Very frequent": 0.9,
  Frequent: 0.55,
  Occasional: 0.17,
  "Very rare": 0.025,
  Excluded: 0,
};
const LISTED_WITHOUT_FREQUENCY = 0.5;
const NOT_LISTED = 0;
const MIN_SCORE = 0.35;
/** Cap on ancestor lookups for observed + excluded terms (Workers subrequest budget). */
const MAX_PATIENT_LOOKUPS = 20;
/** Cap on ancestor lookups for candidate features, taken in score order. */
const MAX_FEATURE_CHECKS = 15;

export interface NormalizedQuestionsRequest {
  observed: HpoId[];
  excluded: HpoId[];
  candidates: DiseaseId[]; // as requested, deduplicated, 2-5
  limit: number;
}

/**
 * One `discriminates` entry. `noAnnotationData` is an additive field (not in
 * contract section 5 yet): true when no HPO annotation set exists for the
 * candidate, so `frequency: null` there means "no data", not "not listed".
 */
type Discriminator = Question["discriminates"][number] & { noAnnotationData?: true };

interface CandidateData {
  id: DiseaseId;
  name: string;
  merged: MergedAnnotations | null;
  /** False when the partner set could not be resolved or a set failed. */
  complete: boolean;
}

/** "Hypometric upward saccades" -> "hypometric upward saccades"; keeps acronyms like "EEG". */
function lowerFirst(label: string): string {
  if (/^[A-Z]{2}/.test(label)) return label;
  return label.charAt(0).toLowerCase() + label.slice(1);
}

/** Annotation ids to read for a candidate, and whether the list is known to be complete. */
async function annotationIds(
  id: DiseaseId,
  deps: FallbackDeps,
): Promise<{ ids: DiseaseId[]; resolved: boolean; name: string | null; primary?: AnnotationSet | null }> {
  const fromRank: DiseaseXrefs | undefined = await cachedXrefs(id, deps);
  const idsOf = (x: DiseaseXrefs): DiseaseId[] => [x.orpha, x.omim].filter((v): v is DiseaseId => v !== null);
  if (fromRank) return { ids: idsOf(fromRank), resolved: true, name: fromRank.name };

  if (!hasAnnotationId(id)) {
    // MONDO candidate: only Monarch can say which ORPHA / OMIM ids it has.
    const x = await monarchXrefs(id, deps);
    return x ? { ids: idsOf(x), resolved: true, name: x.name } : { ids: [], resolved: false, name: null };
  }

  // ORPHA or OMIM: read it first (failures propagate), then look for its partner.
  const primary = await fetchAnnotation(id, deps);
  const mondo = primary?.mondoId;
  const x = mondo ? await monarchXrefs(mondo, deps) : null;
  if (!x) return { ids: [id], resolved: false, name: null, primary };
  const ids = idsOf(x);
  if (!ids.includes(id)) ids.unshift(id);
  return { ids, resolved: true, name: null, primary };
}

async function loadCandidate(id: DiseaseId, deps: FallbackDeps): Promise<CandidateData> {
  const plan = await annotationIds(id, deps);
  const settled = await Promise.allSettled(
    plan.ids.map((sid) =>
      sid === id && plan.primary !== undefined ? Promise.resolve(plan.primary) : fetchAnnotation(sid, deps),
    ),
  );
  const sets: AnnotationSet[] = [];
  let firstError: unknown;
  for (const s of settled) {
    if (s.status === "rejected") firstError ??= s.reason;
    else if (s.value) sets.push(s.value);
  }
  // Every lookup failed: without data we cannot say "not listed"; the handler
  // turns this into a retryable 502/504 (or the demo recording).
  if (sets.length === 0 && firstError !== undefined) throw firstError;

  const merged = sets.length > 0 ? mergeAnnotations(sets) : null;
  const hasClinical = merged !== null && [...merged.features.values()].some((f) => f.clinical);
  return {
    id,
    name: plan.name ?? sets[0]?.name ?? id,
    merged: hasClinical ? merged : null,
    complete: plan.resolved && firstError === undefined,
  };
}

function nameInWhy(c: CandidateData): string {
  if (c.complete || !c.merged) return c.name;
  return `${c.name} (${c.merged.sources.join(" + ")} annotations only)`;
}

function frequencyPhrase(freq: FrequencyInfo | null, name: string): string {
  if (freq === null) return `not listed for ${name}`;
  if (freq.label === null) return `listed without a frequency for ${name}`;
  if (freq.label === "Excluded") return `listed as excluded in ${name}`;
  const raw = freq.raw ? ` (${freq.raw})` : "";
  return `${freq.label}${raw} in ${name}`;
}

/** Round away float noise (e.g. 0.9 - 0.55) without changing the order. */
function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

export async function fallbackNextQuestions(
  req: NormalizedQuestionsRequest,
  deps: FallbackDeps,
): Promise<NextQuestionsResponse> {
  const now = deps.now ?? (() => new Date());
  const patientTerms = [...new Set([...req.observed, ...req.excluded])];
  // Started before the annotations are awaited so both run in parallel; never rejects.
  const patientAncestors = Promise.all(
    patientTerms.slice(0, MAX_PATIENT_LOOKUPS).map((id) => hpoAncestors(id, deps)),
  );
  const data = await Promise.all(req.candidates.map((id) => loadCandidate(id, deps)));
  const fetchedAt = now().toISOString();
  const dataVersions: DataVersions = { hpo: HPO_VERSION, fetchedAt };

  const annotated = data.filter((c) => c.merged !== null);
  // Fewer than two candidates with data: nothing can be compared honestly.
  if (annotated.length < 2) return { version: "0.1", source: "live", questions: [], dataVersions };

  const skip = new Set([...req.observed, ...req.excluded]);
  const allIds = new Set<HpoId>();
  for (const c of annotated) {
    for (const f of c.merged?.features.values() ?? []) if (f.clinical && !skip.has(f.id)) allIds.add(f.id);
  }

  const featureOf = (c: CandidateData, hpoId: HpoId): FrequencyInfo | null => {
    const f = c.merged?.features.get(hpoId);
    return f && f.clinical ? f.frequency : null;
  };

  const scored: Question[] = [];
  for (const hpoId of allIds) {
    const mids = annotated.map((c) => {
      const f = featureOf(c, hpoId);
      return f === null ? NOT_LISTED : f.label === null ? LISTED_WITHOUT_FREQUENCY : MIDPOINT[f.label];
    });
    const score = round3(Math.max(...mids) - Math.min(...mids));
    if (score < MIN_SCORE) continue;

    const discriminates: Discriminator[] = data.map((c) =>
      c.merged === null
        ? { diseaseId: c.id, frequency: null, noAnnotationData: true }
        : { diseaseId: c.id, frequency: featureOf(c, hpoId) },
    );
    const label =
      annotated.map((c) => c.merged?.features.get(hpoId)?.label).find((l): l is string => !!l) ?? hpoId;
    const why = annotated.map((c) => frequencyPhrase(featureOf(c, hpoId), nameInWhy(c))).join("; ");
    scored.push({
      hpoId,
      label,
      question: `Has anyone noticed ${lowerFirst(label)}?`,
      discriminates,
      why: why.charAt(0).toUpperCase() + why.slice(1),
      score,
    });
  }
  scored.sort((a, b) => b.score - a.score || (a.hpoId < b.hpoId ? -1 : a.hpoId > b.hpoId ? 1 : 0));

  const questions = await dropRelatedToPatient(scored, skip, await patientAncestors, req.limit, deps);
  return { version: "0.1", source: "live", questions, dataVersions };
}

/**
 * Removes questions whose feature is an HPO ancestor of a patient term (from
 * `patientAncestors`) or has a patient term among its own ancestors (checked
 * for the first MAX_FEATURE_CHECKS remaining questions). Order is kept; a
 * failed lookup (null) keeps the question.
 */
async function dropRelatedToPatient(
  scored: Question[],
  patientTerms: ReadonlySet<HpoId>,
  patientAncestors: ReadonlyArray<HpoId[] | null>,
  limit: number,
  deps: FallbackDeps,
): Promise<Question[]> {
  const aboveAPatientTerm = new Set<HpoId>();
  for (const ids of patientAncestors) for (const id of ids ?? []) aboveAPatientTerm.add(id);
  const notAncestors = scored.filter((q) => !aboveAPatientTerm.has(q.hpoId));

  const checked = notAncestors.slice(0, MAX_FEATURE_CHECKS);
  const featureAncestors = await Promise.all(checked.map((q) => hpoAncestors(q.hpoId, deps)));
  const kept = checked.filter((_, i) => !(featureAncestors[i] ?? []).some((id) => patientTerms.has(id)));
  return [...kept, ...notAncestors.slice(MAX_FEATURE_CHECKS)].slice(0, limit);
}
