// JAX HPO disease annotations for the fallback layer (T18b).
//
// GET https://ontology.jax.org/api/network/annotation/{ORPHA:n | OMIM:n}
// (contract section 10: 3 s timeout, cached 24 h per disease id).
// Verified 2026-10-24: the body is { disease, categories, genes, medicalActions };
// `categories` maps a category name to rows { id, name, metadata: { frequency } }.
// ORPHA sets carry frequency bands and no genes; OMIM sets carry "n/m" or ""
// and the genes (e.g. ORPHA:558 vs OMIM:154700, ORPHA:646 vs OMIM:257220).

import { normalizeFrequency } from "../../../engine/index";
import type { DiseaseId, FrequencyInfo, FrequencyLabel, Gene, HpoId } from "../../../engine/index";
import { cacheGetJson, cacheKey, cachePutJson, getJson } from "./http";
import type { FallbackDeps } from "./http";

const JAX_ANNOTATION = "https://ontology.jax.org/api/network/annotation/";
const ANNOTATION_TTL_S = 24 * 60 * 60;

/**
 * Annotation categories that hold course modifiers rather than clinical
 * features (onset, inheritance). They are kept for evidence frequencies but
 * never become notReported, contradicted, questions or organ-system categories.
 */
const NON_FEATURE_CATEGORIES: ReadonlySet<string> = new Set(["Clinical course", "Inheritance"]);

export interface AnnotatedFeature {
  id: HpoId;
  label: string;
  /** Frequency as given by this annotation set; "" when not given. */
  raw: string;
  band: FrequencyLabel | null;
  /** False for onset and inheritance rows (NON_FEATURE_CATEGORIES). */
  clinical: boolean;
}

/** Parsed annotation set of one disease id. Plain JSON so it can be cached. */
export interface AnnotationSet {
  id: DiseaseId;
  name: string | null;
  /** MONDO id JAX gives for this disease, if any (used to find the ORPHA/OMIM partner). */
  mondoId?: string;
  categories: string[];
  genes: Gene[];
  features: AnnotatedFeature[];
}

const HPO_ID_RE = /^HP:\d{7}$/;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseAnnotation(id: DiseaseId, body: unknown): AnnotationSet {
  const out: AnnotationSet = { id, name: null, categories: [], genes: [], features: [] };
  if (typeof body !== "object" || body === null) return out;
  const b = body as Record<string, unknown>;

  const disease = b.disease as Record<string, unknown> | undefined;
  const name = str(disease?.name).trim();
  if (name) out.name = name;
  const mondoId = str(disease?.mondoId).trim();
  if (/^MONDO:\d+$/.test(mondoId)) out.mondoId = mondoId;

  if (Array.isArray(b.genes)) {
    const seen = new Set<string>();
    for (const g of b.genes as unknown[]) {
      const row = (g ?? {}) as Record<string, unknown>;
      const gid = str(row.id);
      const symbol = str(row.name);
      if (gid && symbol && !seen.has(gid)) {
        seen.add(gid);
        out.genes.push({ id: gid, symbol });
      }
    }
  }

  const cats = b.categories;
  if (typeof cats === "object" && cats !== null && !Array.isArray(cats)) {
    const byId = new Map<HpoId, AnnotatedFeature>();
    for (const [category, rows] of Object.entries(cats as Record<string, unknown>)) {
      if (!Array.isArray(rows)) continue;
      const clinical = !NON_FEATURE_CATEGORIES.has(category);
      if (clinical && rows.length > 0) out.categories.push(category);
      for (const r of rows as unknown[]) {
        const row = (r ?? {}) as Record<string, unknown>;
        const fid = str(row.id);
        const label = str(row.name);
        if (!HPO_ID_RE.test(fid) || !label) continue;
        const raw = str((row.metadata as Record<string, unknown> | undefined)?.frequency).trim();
        const band = normalizeFrequency(raw);
        const prev = byId.get(fid);
        // A term can sit in several categories; keep the row that has a frequency.
        if (!prev || (prev.band === null && band !== null)) {
          byId.set(fid, { id: fid, label, raw, band, clinical: clinical && (prev?.clinical ?? true) });
        } else if (!clinical) {
          prev.clinical = false;
        }
      }
    }
    out.features = [...byId.values()].sort((a, b2) => (a.id < b2.id ? -1 : a.id > b2.id ? 1 : 0));
    out.categories.sort();
  }
  return out;
}

/** Cached marker for "this id has no annotation set" (HTTP 404). */
interface Missing {
  missing: true;
}

/** Only ORPHA and OMIM ids have JAX annotation sets; MONDO ids are never sent to JAX. */
export function hasAnnotationId(id: string): boolean {
  return /^(ORPHA|OMIM):\d+$/.test(id);
}

/**
 * Annotation set for one ORPHA or OMIM id; null when JAX has none (404) or
 * the id is not an ORPHA / OMIM id (no request is made then).
 * Throws the engine's UpstreamTimeout / UpstreamError on failure.
 */
export async function fetchAnnotation(id: DiseaseId, deps: FallbackDeps): Promise<AnnotationSet | null> {
  if (!hasAnnotationId(id)) return null;
  const key = cacheKey("ann", id);
  const cached = await cacheGetJson<AnnotationSet | Missing>(deps.cache, key);
  if (cached) return "missing" in cached ? null : cached;

  const body = await getJson("hpoAnnotation", `${JAX_ANNOTATION}${encodeURIComponent(id)}`, deps);
  const value = body === null ? null : parseAnnotation(id, body);
  cachePutJson(deps, key, value ?? ({ missing: true } satisfies Missing), ANNOTATION_TTL_S);
  return value;
}

/** One feature of a disease after merging its ORPHA and OMIM annotation sets. */
export interface MergedFeature {
  id: HpoId;
  label: string;
  frequency: FrequencyInfo;
  clinical: boolean;
}

export interface MergedAnnotations {
  /** Ids of the annotation sets that answered (in preference order). */
  sources: DiseaseId[];
  features: Map<HpoId, MergedFeature>;
  categories: string[];
  genes: Gene[];
}

function frequencyFrom(f: AnnotatedFeature, source: DiseaseId): FrequencyInfo {
  const info: FrequencyInfo = { label: f.band, source };
  if (f.raw !== "" && f.raw !== f.band) info.raw = f.raw;
  return info;
}

/**
 * Merge annotation sets in preference order (ORPHA first, then OMIM;
 * contract 7.4 step 4): a frequency comes from the first set that gives a
 * band, else the feature is "annotated without a frequency" from the first set
 * that lists it. Genes and categories are unions.
 */
export function mergeAnnotations(sets: readonly AnnotationSet[]): MergedAnnotations {
  const features = new Map<HpoId, MergedFeature>();
  const categories = new Set<string>();
  const genes = new Map<string, Gene>();
  for (const set of sets) {
    for (const c of set.categories) categories.add(c);
    for (const g of set.genes) if (!genes.has(g.id)) genes.set(g.id, g);
    for (const f of set.features) {
      const prev = features.get(f.id);
      if (!prev) {
        features.set(f.id, { id: f.id, label: f.label, frequency: frequencyFrom(f, set.id), clinical: f.clinical });
      } else {
        if (prev.frequency.label === null && f.band !== null) prev.frequency = frequencyFrom(f, set.id);
        prev.clinical = prev.clinical && f.clinical;
      }
    }
  }
  return {
    sources: sets.map((s) => s.id),
    features,
    categories: [...categories].sort(),
    genes: [...genes.values()].sort((a, b) => (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0)),
  };
}

/** Frequency bands that count as "usually has" (contract 7.4 steps 6 and 7). */
export const FREQUENT_BANDS: ReadonlySet<FrequencyLabel> = new Set(["Obligate", "Very frequent", "Frequent"]);

/** Band order for sorting, most frequent first. */
export const BAND_ORDER: Readonly<Record<FrequencyLabel, number>> = {
  Obligate: 0,
  "Very frequent": 1,
  Frequent: 2,
  Occasional: 3,
  "Very rare": 4,
  Excluded: 5,
};
