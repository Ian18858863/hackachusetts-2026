// Fallback for rankCandidates (docs/CONTRACT.md section 7.4), used only while
// the engine function is a placeholder (T18b). Same method as the contract:
//
//   1. Monarch semsim, default metric, limit + 5, no re-rank.
//   2. diseaseId: ORPHA (from an Orphanet xref) > OMIM > MONDO; merge
//      duplicates keeping the higher score.
//   3. Order by Monarch score desc, then diseaseId asc; keep the top `limit`.
//   4. Per candidate, JAX annotations for the ORPHA and the OMIM id in
//      parallel (3 s each), plus an Orphadata name check (2 s). A failed
//      annotation call only drops "hpo-annotations"; Orphadata failures are
//      ignored.
//   5. Evidence from Monarch object_best_matches; frequencies, notReported,
//      contradicted, genes and categories from the annotations; overlap from
//      the engine's overlapLabel.
//
// The Monarch score is passed through unchanged as the raw service score.
// Nothing here turns it into a percentage.
//
// Temporary: this file re-implements engine logic (contract sections 2-3 give
// it to engine/**, Jerry's T07) only so the demo works while rankCandidates is
// a placeholder. The engine path takes over automatically (engineFirst) and
// this layer is to be deleted once it does.

import { HPO_VERSION, overlapLabel } from "../../../engine/index";
import type {
  Candidate,
  CandidateSource,
  DataVersions,
  DiseaseFeature,
  DiseaseId,
  Evidence,
  HpoId,
  RankResponse,
  TermRef,
} from "../../../engine/index";
import { BAND_ORDER, FREQUENT_BANDS, fetchAnnotation, mergeAnnotations } from "./annotations";
import type { AnnotationSet, MergedAnnotations } from "./annotations";
import { getJson, TIMEOUTS_MS } from "./http";
import type { FallbackDeps } from "./http";
import { pickXrefs, rememberXrefs } from "./xrefs";

const MONARCH_SEMSIM = "https://api.monarchinitiative.org/v3/api/semsim/search/";
const ORPHADATA = "https://api.orphadata.com/rd-cross-referencing/orphacodes/";

/**
 * Subsumers that never count as a match (contract 7.4 step 5): the HPO root,
 * Phenotypic abnormality, and its direct children (organ-system level).
 * Children read from GET https://ontology.jax.org/api/hp/terms/HP:0000118/children
 * on 2026-10-24 (23 terms).
 */
const GROUPING_TERMS: ReadonlySet<HpoId> = new Set([
  "HP:0000001",
  "HP:0000118",
  "HP:0025354",
  "HP:0001871",
  "HP:0000152",
  "HP:0040064",
  "HP:0001939",
  "HP:0001197",
  "HP:0000769",
  "HP:0001626",
  "HP:0025031",
  "HP:0000598",
  "HP:0000818",
  "HP:0000478",
  "HP:0000119",
  "HP:0002715",
  "HP:0001574",
  "HP:0033127",
  "HP:0000707",
  "HP:0002086",
  "HP:0045027",
  "HP:0001608",
  "HP:0025142",
  "HP:0001507",
  "HP:0002664",
]);

const NOT_REPORTED_MAX = 8;

// ---------------------------------------------------------------- Monarch

interface BestMatch {
  source: HpoId;
  sourceLabel: string;
  target: HpoId;
  targetLabel: string;
  subsumer: HpoId | null;
  subsumerLabel: string;
}

interface MonarchRow {
  mondoId: string;
  name: string;
  score: number;
  orpha: DiseaseId | null;
  omim: DiseaseId | null;
  best: Map<HpoId, BestMatch>;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseMonarch(body: unknown): MonarchRow[] {
  if (!Array.isArray(body)) return [];
  const rows: MonarchRow[] = [];
  for (const item of body as unknown[]) {
    const r = (item ?? {}) as Record<string, unknown>;
    const subject = (r.subject ?? {}) as Record<string, unknown>;
    const mondoId = str(subject.id);
    const score = typeof r.score === "number" && Number.isFinite(r.score) ? r.score : NaN;
    if (!mondoId || Number.isNaN(score)) continue;
    const xrefs = Array.isArray(subject.xref) ? (subject.xref as unknown[]).map(str) : [];
    const { orpha, omim } = pickXrefs(xrefs);

    const best = new Map<HpoId, BestMatch>();
    const sim = (r.similarity ?? {}) as Record<string, unknown>;
    const obm = sim.object_best_matches;
    if (typeof obm === "object" && obm !== null) {
      for (const m of Object.values(obm as Record<string, unknown>)) {
        const mm = (m ?? {}) as Record<string, unknown>;
        const source = str(mm.match_source);
        const target = str(mm.match_target);
        if (!source || !target) continue;
        best.set(source, {
          source,
          sourceLabel: str(mm.match_source_label),
          target,
          targetLabel: str(mm.match_target_label),
          subsumer: str(mm.match_subsumer) || null,
          subsumerLabel: str(mm.match_subsumer_label),
        });
      }
    }
    rows.push({
      mondoId,
      name: str(subject.name) || mondoId,
      score,
      orpha,
      omim,
      best,
    });
  }
  return rows;
}

function diseaseIdOf(row: MonarchRow): DiseaseId {
  return row.orpha ?? row.omim ?? row.mondoId;
}

function byScoreThenId(a: { score: number; id: string }, b: { score: number; id: string }): number {
  return b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

// -------------------------------------------------------------- Orphadata

interface OrphaName {
  name: string;
  date: string | null;
}

async function orphadataName(orpha: DiseaseId, deps: FallbackDeps): Promise<OrphaName | null> {
  try {
    const code = orpha.split(":")[1] ?? "";
    const body = await getJson("orphadata", `${ORPHADATA}${encodeURIComponent(code)}?lang=en`, deps);
    const results = ((body as { data?: { results?: unknown } } | null)?.data?.results ?? {}) as Record<string, unknown>;
    const name = str(results["Preferred term"]).trim();
    if (!name) return null;
    const date = /^\d{4}-\d{2}-\d{2}/.exec(str(results.Date))?.[0] ?? null;
    return { name, date };
  } catch {
    return null; // non-blocking (contract 7.4)
  }
}

// ---------------------------------------------------------------- ranking

export interface NormalizedRankRequest {
  observed: HpoId[]; // sorted, deduplicated
  excluded: HpoId[]; // sorted, deduplicated
  limit: number;
}

/** Labels for patient terms, collected from every Monarch row. */
function patientLabels(rows: readonly MonarchRow[]): Map<HpoId, string> {
  const labels = new Map<HpoId, string>();
  for (const row of rows) {
    for (const m of row.best.values()) if (m.sourceLabel && !labels.has(m.source)) labels.set(m.source, m.sourceLabel);
  }
  return labels;
}

/**
 * Matched count used for the overlap label: exact matches count 1, matches
 * through a broader shared term count 0.5, floored before overlapLabel so the
 * engine signature is unchanged. [CONTRACT CHANGE] proposal on open question 8
 * (relayed by the coordinator, 2026-10-24): with plain counting every demo-npc1
 * candidate came out "strong", because any shared ancestor below the
 * organ-system level counts as a match. `matched` itself still lists every
 * ancestor match, shown in the UI as "Through the broader term ...".
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

function buildCandidate(
  row: MonarchRow,
  rank: number,
  req: NormalizedRankRequest,
  labels: Map<HpoId, string>,
  ann: MergedAnnotations | null,
  orpha: OrphaName | null,
): Candidate {
  const observedSet = new Set(req.observed);
  const excludedSet = new Set(req.excluded);

  const matched: Evidence[] = [];
  const unmatched: TermRef[] = [];
  for (const id of req.observed) {
    const m = row.best.get(id);
    const patientTerm: TermRef = { id, label: labels.get(id) ?? m?.sourceLabel ?? id };
    if (!m || !m.subsumer || GROUPING_TERMS.has(m.subsumer)) {
      unmatched.push(patientTerm);
      continue;
    }
    const exact = m.source === m.target;
    const ev: Evidence = {
      patientTerm,
      diseaseTerm: { id: m.target, label: m.targetLabel || m.target },
      via: exact ? "exact" : "ancestor",
      frequency: ann?.features.get(m.target)?.frequency ?? null,
    };
    if (!exact) ev.ancestor = { id: m.subsumer, label: m.subsumerLabel || m.subsumer };
    matched.push(ev);
  }

  const matchedTargets = new Set(matched.map((e) => e.diseaseTerm.id));
  const notReported: DiseaseFeature[] = [];
  const contradicted: DiseaseFeature[] = [];
  if (ann) {
    const frequent = [...ann.features.values()].filter(
      (f) => f.clinical && f.frequency.label !== null && FREQUENT_BANDS.has(f.frequency.label),
    );
    frequent.sort(
      (a, b) =>
        BAND_ORDER[a.frequency.label ?? "Excluded"] - BAND_ORDER[b.frequency.label ?? "Excluded"] ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
    for (const f of frequent) {
      const feature: DiseaseFeature = { term: { id: f.id, label: f.label }, frequency: f.frequency };
      if (excludedSet.has(f.id)) contradicted.push(feature);
      else if (!observedSet.has(f.id) && !matchedTargets.has(f.id) && notReported.length < NOT_REPORTED_MAX) {
        notReported.push(feature);
      }
    }
  }

  const sources: CandidateSource[] = ["monarch-semsim"];
  if (ann) sources.push("hpo-annotations");
  let name = row.name;
  if (orpha && orpha.name !== row.name) {
    name = orpha.name;
    sources.push("orphadata");
  }

  const links: Candidate["links"] = { monarch: `https://monarchinitiative.org/${row.mondoId}` };
  if (row.orpha) links.orphanet = `https://www.orpha.net/en/disease/detail/${row.orpha.split(":")[1]}`;
  if (row.omim) links.omim = `https://omim.org/entry/${row.omim.split(":")[1]}`;

  return {
    rank,
    diseaseId: diseaseIdOf(row),
    mondoId: row.mondoId,
    name,
    overlap: overlapLabel(weightedMatchCount(matched), req.observed.length, contradicted.length),
    score: row.score,
    matched,
    unmatched,
    notReported,
    contradicted,
    categories: ann ? ann.categories : [],
    genes: ann ? ann.genes : [],
    links,
    sources,
  };
}

/**
 * Annotation sets for a candidate (ORPHA first). `merged` is null if none
 * answered; `failed` is true when at least one call failed (as opposed to a
 * 404 "no annotation set"), so the response is degraded for this request only.
 */
async function candidateAnnotations(
  row: MonarchRow,
  deps: FallbackDeps,
): Promise<{ merged: MergedAnnotations | null; failed: boolean }> {
  const ids = [row.orpha, row.omim].filter((x): x is DiseaseId => x !== null);
  const settled = await Promise.allSettled(ids.map((id) => fetchAnnotation(id, deps)));
  const sets: AnnotationSet[] = [];
  let failed = false;
  for (const s of settled) {
    if (s.status === "rejected") failed = true;
    else if (s.value) sets.push(s.value);
  }
  return { merged: sets.length > 0 ? mergeAnnotations(sets) : null, failed };
}

/**
 * Total /api/rank budget (contract section 7.4: 12 s). Monarch may use up to
 * 10 s (TIMEOUTS_MS in http.ts); the annotation (3 s) and Orphadata (2 s)
 * calls that follow keep their own timeouts but never run past this budget.
 * When the budget is spent they fail fast, which only drops their data
 * (contract 7.4, "One HPO annotation call fails").
 */
const RANK_BUDGET_MS = 12000;

function budgetedDeps(deps: FallbackDeps, leftMs: number): FallbackDeps {
  const left = Math.max(0, leftMs);
  const cap = (name: "hpoAnnotation" | "orphadata"): number =>
    Math.min(deps.timeoutsMs?.[name] ?? TIMEOUTS_MS[name], left);
  return { ...deps, timeoutsMs: { ...deps.timeoutsMs, hpoAnnotation: cap("hpoAnnotation"), orphadata: cap("orphadata") } };
}

export interface FallbackRankResult {
  body: RankResponse;
  /** False when an annotation call failed: do not cache this response (R11.4). */
  complete: boolean;
}

/**
 * Rank candidates for a normalised request. Throws the engine's
 * UpstreamTimeout / UpstreamError when Monarch fails (the handler then tries
 * the demo cache).
 */
export async function fallbackRank(req: NormalizedRankRequest, deps: FallbackDeps): Promise<FallbackRankResult> {
  const now = deps.now ?? (() => new Date());
  const startedAt = Date.now();
  const url = `${MONARCH_SEMSIM}${req.observed.join(",")}/Human%20Diseases?limit=${req.limit + 5}`;
  // A 404 from a search endpoint is a failure, never "no candidates".
  const body = await getJson("monarchSemsim", url, deps, { notFound: "error" });
  const after = budgetedDeps(deps, RANK_BUDGET_MS - (Date.now() - startedAt));
  const rows = parseMonarch(body);
  const fetchedAt = now().toISOString();

  // Merge rows that map to the same diseaseId, keeping the higher score.
  const byId = new Map<DiseaseId, MonarchRow>();
  for (const row of rows) {
    const id = diseaseIdOf(row);
    const prev = byId.get(id);
    if (!prev || row.score > prev.score) byId.set(id, row);
  }
  const top = [...byId.entries()]
    .map(([id, row]) => ({ id, score: row.score, row }))
    .sort(byScoreThenId)
    .slice(0, req.limit)
    .map((x) => x.row);

  const labels = patientLabels(rows);
  const [annotations, orphaNames] = await Promise.all([
    Promise.all(top.map((row) => candidateAnnotations(row, after))),
    Promise.all(top.map((row) => (row.orpha ? orphadataName(row.orpha, after) : Promise.resolve(null)))),
  ]);

  const candidates = top.map((row, i) =>
    buildCandidate(row, i + 1, req, labels, annotations[i]?.merged ?? null, orphaNames[i] ?? null),
  );
  // Let /api/next-questions read the same ORPHA + OMIM sets and names.
  candidates.forEach((c, i) => {
    const row = top[i];
    if (row) rememberXrefs(c.diseaseId, { mondo: row.mondoId, orpha: row.orpha, omim: row.omim, name: c.name }, deps);
  });

  const dataVersions: DataVersions = { hpo: HPO_VERSION, monarch: "v3 API", fetchedAt };
  const orphaDate = orphaNames.find((o) => o?.date)?.date;
  if (orphaDate) dataVersions.orphanet = orphaDate;

  return {
    body: { version: "0.1", source: "live", candidates, dataVersions },
    complete: annotations.every((a) => !a.failed),
  };
}
