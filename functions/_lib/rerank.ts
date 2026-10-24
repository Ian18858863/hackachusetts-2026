// Not shipped: pre-registered test showed no recall gain; /api/rank does not use this.
//
// Frequency-aware re-rank layer on top of Monarch semsim (T23).
//
// Method: docs/research/ranking-benchmark.md, section "Method (pre-registered
// 2026-10-24 12:57 ET)". The constants below are copied from that section and
// must not be tuned on benchmark results.
//
// In the spirit of LIRICAL (Robinson et al., Am J Hum Genet 2020) and
// Phenomizer (Köhler et al., Am J Hum Genet 2009): per-feature likelihood
// ratios from HPO annotation frequencies, summed in log10 space, with partial
// credit for ancestor-level matches.
//
// Pure and deterministic. No fetch, no Node APIs: callers pass the Monarch
// results and the HPO annotation maps. Output keeps every score component so
// the UI can explain the order. Scores are log10 likelihood-ratio sums used
// only for ordering; they are not probabilities and must never be shown as a
// percentage.

// ---------------------------------------------------------------------------
// Constants (pre-registered; see the method section for one-line reasons)
// ---------------------------------------------------------------------------

export type FrequencyBand =
  | "Obligate" | "Very frequent" | "Frequent" | "Occasional" | "Very rare" | "Excluded";

/** Midpoints of the HPO frequency ranges (HP:0040280–HP:0040285). */
export const BAND_MIDPOINT: Readonly<Record<FrequencyBand, number>> = {
  Obligate: 1.0,
  "Very frequent": 0.895,
  Frequent: 0.545,
  Occasional: 0.17,
  "Very rare": 0.025,
  Excluded: 0,
};
/** Annotated without a frequency (same default as CONTRACT §7.5 step 2). */
export const UNSPECIFIED_MIDPOINT = 0.5;
/** Floor: lower edge of the "Very rare" band (1%). */
export const EPSILON = 0.01;
/** Assumed chance that parent notes mention a feature that is present. */
export const MENTION_RATE = 0.5;
/** At most this many never-mentioned hallmark features are penalised. */
export const MISSING_FEATURE_CAP = 3;

/** Subsumers that never count as a match, besides direct children of HP:0000118. */
export const ROOT_TERMS: readonly string[] = ["HP:0000001", "HP:0000118"];

// ---------------------------------------------------------------------------
// Input types (subset of the Monarch v3 semsim and JAX annotation shapes)
// ---------------------------------------------------------------------------

export interface MonarchBestMatch {
  match_source: string;
  match_target: string;
  match_subsumer?: string | null;
  similarity?: { jaccard_similarity?: number | null } | null;
}

export interface MonarchResult {
  score: number;
  subject: { id: string; name?: string; xref?: string[] | null };
  similarity?: { object_best_matches?: Record<string, MonarchBestMatch> | null } | null;
}

/** One disease's HPO annotations: term id → frequency midpoint (null = unspecified). */
export type AnnotationMap = ReadonlyMap<string, number | null>;

export interface RerankInput {
  /** Monarch semsim results in Monarch's order. */
  results: readonly MonarchResult[];
  /** Annotations per MONDO id. Missing or empty map = candidate is unscored. */
  annotations: ReadonlyMap<string, AnnotationMap>;
  observed: readonly string[];
  excluded: readonly string[];
  /** Direct children of HP:0000118 (organ-system grouping terms). */
  organSystemIds: readonly string[];
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface ObservedComponent {
  hpoId: string;
  via: "exact" | "ancestor" | "none";
  /** Disease term used for the ancestor match. */
  diseaseTerm?: string;
  p: number;
  background: number;
  log10LR: number;
}

export interface ExcludedComponent {
  hpoId: string;
  /** Exact-annotation midpoint in this disease (0 = not annotated). */
  q: number;
  background: number;
  log10LR: number;
}

export interface MissingComponent {
  hpoId: string;
  p: number;
  background: number;
  log10Factor: number;
}

export interface RerankedCandidate {
  rank: number;
  mondoId: string;
  name: string;
  monarchRank: number;
  monarchScore: number;
  scored: boolean;
  /** Sum of log10 likelihood ratios. Ordering only; not a probability. null when unscored. */
  total: number | null;
  observed: ObservedComponent[];
  excluded: ExcludedComponent[];
  missing: MissingComponent[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a raw HPO annotation frequency to a band (CONTRACT §5 rule).
 * Accepts band names, "n/m" fractions and "x%" values. Empty or unknown → null.
 */
export function frequencyBand(raw: string | null | undefined): FrequencyBand | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (s === "") return null;
  const named = (Object.keys(BAND_MIDPOINT) as FrequencyBand[]).find(
    (b) => b.toLowerCase() === s.toLowerCase(),
  );
  if (named) return named;
  let pct: number | null = null;
  const frac = /^(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (frac) {
    const n = Number(frac[1]);
    const m = Number(frac[2]);
    if (m > 0 && n <= m) pct = (100 * n) / m;
  }
  const per = /^(\d+(?:\.\d+)?)\s*%$/.exec(s);
  if (per) {
    const v = Number(per[1]);
    if (v <= 100) pct = v;
  }
  if (pct == null) return null;
  if (pct >= 100) return "Obligate";
  if (pct >= 80) return "Very frequent";
  if (pct >= 30) return "Frequent";
  if (pct >= 5) return "Occasional";
  if (pct >= 1) return "Very rare";
  if (pct === 0) return "Excluded";
  // 0 < pct < 1 lies between the HPO ranges; the nearest band is Very rare.
  return "Very rare";
}

/** Midpoint for a raw frequency; null when unspecified. */
export function frequencyMidpoint(raw: string | null | undefined): number | null {
  const band = frequencyBand(raw);
  return band == null ? null : BAND_MIDPOINT[band];
}

const sortUnique = (ids: readonly string[]): string[] => [...new Set(ids)].sort();
const mean = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function midpointOrDefault(v: number | null | undefined): number {
  return v == null ? UNSPECIFIED_MIDPOINT : v;
}

interface ObservedEvidence { via: "exact" | "ancestor" | "none"; p: number; diseaseTerm?: string }

/** Method step 1: p(t|D) for one observed term. */
function observedEvidence(
  t: string,
  result: MonarchResult,
  ann: AnnotationMap,
  grouping: ReadonlySet<string>,
): ObservedEvidence {
  if (ann.has(t)) {
    return { via: "exact", p: Math.max(midpointOrDefault(ann.get(t)), EPSILON), diseaseTerm: t };
  }
  const m = result.similarity?.object_best_matches?.[t];
  if (m && m.match_subsumer && !grouping.has(m.match_subsumer)) {
    const w = clamp01(m.similarity?.jaccard_similarity ?? 0);
    const target = m.match_target;
    const mid = ann.has(target) ? midpointOrDefault(ann.get(target)) : UNSPECIFIED_MIDPOINT;
    return { via: "ancestor", p: Math.max(w * mid, EPSILON), diseaseTerm: target };
  }
  return { via: "none", p: EPSILON };
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/** Disease terms explained by a qualifying best match of an observed term. */
function matchedTargets(result: MonarchResult, observed: readonly string[], grouping: ReadonlySet<string>): Set<string> {
  const out = new Set<string>();
  for (const t of observed) {
    const m = result.similarity?.object_best_matches?.[t];
    if (m && m.match_subsumer && !grouping.has(m.match_subsumer)) out.add(m.match_target);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

/**
 * Re-rank Monarch semsim candidates with the pre-registered likelihood-ratio
 * score. Deterministic and independent of the order (and duplicates) of
 * `observed`, `excluded` and `organSystemIds`.
 */
export function rerank(input: RerankInput): RerankedCandidate[] {
  const observed = sortUnique(input.observed);
  const excludedSet = new Set(input.excluded);
  const excluded = sortUnique(input.excluded).filter((e) => !observed.includes(e));
  const grouping = new Set<string>([...ROOT_TERMS, ...input.organSystemIds]);

  // Merge duplicate MONDO ids, keeping the first (highest Monarch position).
  const seen = new Set<string>();
  const rows: Array<{ result: MonarchResult; monarchRank: number }> = [];
  input.results.forEach((result, i) => {
    if (seen.has(result.subject.id)) return;
    seen.add(result.subject.id);
    rows.push({ result, monarchRank: i + 1 });
  });

  const scoredRows = rows.filter((r) => (input.annotations.get(r.result.subject.id)?.size ?? 0) > 0);
  const annOf = (r: { result: MonarchResult }): AnnotationMap => input.annotations.get(r.result.subject.id)!;

  // Per-candidate observed evidence, then pool backgrounds.
  const evidence = scoredRows.map((r) =>
    observed.map((t) => observedEvidence(t, r.result, annOf(r), grouping)),
  );
  const bgObserved = observed.map((_, j) => mean(evidence.map((ev) => ev[j].p)));
  const exactMid = (ann: AnnotationMap, id: string): number => (ann.has(id) ? midpointOrDefault(ann.get(id)) : 0);
  const bgExcluded = excluded.map((e) => mean(scoredRows.map((r) => exactMid(annOf(r), e))));
  const bgFeature = (f: string): number => mean(scoredRows.map((r) => exactMid(annOf(r), f)));

  const scored: RerankedCandidate[] = scoredRows.map((r, i) => {
    const ann = annOf(r);
    const obs: ObservedComponent[] = observed.map((t, j) => {
      const ev = evidence[i][j];
      const background = bgObserved[j];
      const comp: ObservedComponent = { hpoId: t, via: ev.via, p: ev.p, background, log10LR: Math.log10(ev.p / background) };
      if (ev.via === "ancestor") comp.diseaseTerm = ev.diseaseTerm;
      return comp;
    });
    const exc: ExcludedComponent[] = excluded.map((e, j) => {
      const q = exactMid(ann, e);
      const background = bgExcluded[j];
      const log10LR = Math.log10(Math.max(1 - q, EPSILON) / Math.max(1 - background, EPSILON));
      return { hpoId: e, q, background, log10LR };
    });
    const explained = matchedTargets(r.result, observed, grouping);
    const hallmarks = [...ann.entries()]
      .filter(([f, v]) => v != null && v >= BAND_MIDPOINT["Very frequent"])
      .map(([f]) => f)
      .filter((f) => !observed.includes(f) && !excludedSet.has(f) && !explained.has(f))
      .sort(cmp);
    const missing: MissingComponent[] = hallmarks
      .map((f) => {
        const p = ann.get(f) as number;
        const background = bgFeature(f);
        const factor = Math.min(1, (1 - MENTION_RATE * p) / (1 - MENTION_RATE * background));
        return { hpoId: f, p, background, log10Factor: Math.log10(factor) };
      })
      .sort((a, b) => a.log10Factor - b.log10Factor || cmp(a.hpoId, b.hpoId))
      .slice(0, MISSING_FEATURE_CAP);
    const total =
      obs.reduce((s, c) => s + c.log10LR, 0) +
      exc.reduce((s, c) => s + c.log10LR, 0) +
      missing.reduce((s, c) => s + c.log10Factor, 0);
    return {
      rank: 0,
      mondoId: r.result.subject.id,
      name: r.result.subject.name ?? r.result.subject.id,
      monarchRank: r.monarchRank,
      monarchScore: r.result.score,
      scored: true,
      total,
      observed: obs,
      excluded: exc,
      missing,
    };
  });

  scored.sort(
    (a, b) =>
      (b.total as number) - (a.total as number) ||
      b.monarchScore - a.monarchScore ||
      cmp(a.mondoId, b.mondoId),
  );

  const unscored: RerankedCandidate[] = rows
    .filter((r) => !scoredRows.includes(r))
    .map((r) => ({
      rank: 0,
      mondoId: r.result.subject.id,
      name: r.result.subject.name ?? r.result.subject.id,
      monarchRank: r.monarchRank,
      monarchScore: r.result.score,
      scored: false,
      total: null,
      observed: [],
      excluded: [],
      missing: [],
    }));

  const out = [...scored, ...unscored];
  out.forEach((c, i) => (c.rank = i + 1));
  return out;
}

/**
 * Build an AnnotationMap from a JAX `/api/network/annotation/<id>` payload.
 * When a term appears more than once, its highest midpoint is kept
 * (unspecified counts as UNSPECIFIED_MIDPOINT for that comparison).
 */
export function annotationMapFromJax(payload: unknown): Map<string, number | null> {
  const out = new Map<string, number | null>();
  const cats = (payload as { categories?: Record<string, unknown> } | null)?.categories;
  if (!cats || typeof cats !== "object") return out;
  for (const key of Object.keys(cats).sort()) {
    const list = (cats as Record<string, unknown>)[key];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const id = (item as { id?: unknown })?.id;
      if (typeof id !== "string" || !/^HP:\d{7}$/.test(id)) continue;
      const raw = (item as { metadata?: { frequency?: unknown } })?.metadata?.frequency;
      const mid = frequencyMidpoint(typeof raw === "string" ? raw : null);
      if (!out.has(id)) {
        out.set(id, mid);
      } else {
        const prev = out.get(id) ?? null;
        if (midpointOrDefault(mid) > midpointOrDefault(prev)) out.set(id, mid);
      }
    }
  }
  return out;
}
