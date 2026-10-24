// HPO disease annotations from the JAX API (CONTRACT.md 7.4 step 4, section 10)
// and the Orphadata name check (7.4 step 10). Shared by rank.ts and, later,
// questions.ts. Parsing only keeps what the source states: no frequency is
// ever filled in when the source leaves it empty.

import { getJson } from "./http";
import { normalizeFrequency, normalizeHpoId } from "./hpo";
import type { DiseaseId, EngineDeps, FrequencyInfo, Gene, HpoId } from "./types";

const JAX_ANNOTATION = "https://ontology.jax.org/api/network/annotation";
const ORPHADATA = "https://api.orphadata.com/rd-cross-referencing/orphacodes";

export interface AnnotatedFeature {
  id: HpoId;
  label: string;
  category: string;
  frequency: FrequencyInfo; // label null = annotated without a frequency
}

export interface DiseaseAnnotations {
  diseaseId: DiseaseId; // the id that was queried, e.g. "ORPHA:558"
  name: string;
  features: AnnotatedFeature[]; // one per HPO id, source order
  categories: string[]; // category keys that have at least one feature
  genes: Gene[];
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** FrequencyInfo from a raw source value. `raw` is kept only when it is not already a band name. */
export function frequencyInfo(raw: string, source: DiseaseId): FrequencyInfo {
  const value = raw.trim();
  const label = normalizeFrequency(value);
  const info: FrequencyInfo = { label, source };
  if (value !== "" && value !== label) info.raw = value;
  return info;
}

/** Parse a JAX /api/network/annotation body. Returns null if the shape is unusable. */
export function parseAnnotations(body: unknown, diseaseId: DiseaseId): DiseaseAnnotations | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const disease = (b.disease ?? {}) as Record<string, unknown>;
  const cats = b.categories;
  if (typeof cats !== "object" || cats === null) return null;

  const features: AnnotatedFeature[] = [];
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const [category, rows] of Object.entries(cats as Record<string, unknown>)) {
    if (!Array.isArray(rows)) continue;
    let used = false;
    for (const row of rows) {
      if (typeof row !== "object" || row === null) continue;
      const r = row as Record<string, unknown>;
      const id = normalizeHpoId(r.id);
      const label = str(r.name);
      if (!id || label === "") continue;
      used = true;
      if (seen.has(id)) continue;
      seen.add(id);
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      features.push({ id, label, category, frequency: frequencyInfo(str(meta.frequency), diseaseId) });
    }
    if (used) categories.push(category);
  }

  const genes: Gene[] = [];
  if (Array.isArray(b.genes)) {
    for (const g of b.genes) {
      if (typeof g !== "object" || g === null) continue;
      const gg = g as Record<string, unknown>;
      const id = str(gg.id);
      const symbol = str(gg.name);
      if (id !== "" && symbol !== "") genes.push({ id, symbol });
    }
  }
  return { diseaseId, name: str(disease.name), features, categories, genes };
}

/**
 * What happened to one upstream enrichment call. "ok" is the only status that
 * contributes data; every other status contributes nothing.
 * - not-found: the service answered 404 (it has no record for this id)
 * - unusable: 2xx but the body had no usable shape
 * - failed: timeout, non-2xx, network error or invalid JSON
 */
export type FetchStatus = "ok" | "not-found" | "unusable" | "failed";

export interface AnnotationOutcome {
  id: DiseaseId;
  status: FetchStatus;
  data: DiseaseAnnotations | null; // non-null only when status is "ok"
  error?: string; // engine error message for "failed"
}

/** GET JAX annotations for an ORPHA:n or OMIM:n id. Never throws: failures are reported in the outcome. */
export async function fetchAnnotations(diseaseId: DiseaseId, deps: EngineDeps): Promise<AnnotationOutcome> {
  let body: unknown;
  try {
    body = await getJson("hpoAnnotation", `${JAX_ANNOTATION}/${encodeURIComponent(diseaseId)}`, deps);
  } catch (err) {
    return { id: diseaseId, status: "failed", data: null, error: err instanceof Error ? err.message : "unknown error" };
  }
  if (body === null) return { id: diseaseId, status: "not-found", data: null };
  const data = parseAnnotations(body, diseaseId);
  return data ? { id: diseaseId, status: "ok", data } : { id: diseaseId, status: "unusable", data: null };
}

export interface OrphadataRecord {
  orphaCode: string; // "558"
  preferredTerm: string;
  date: string; // "2026-06-23"
}

export interface OrphadataOutcome {
  status: FetchStatus;
  data: OrphadataRecord | null; // non-null only when status is "ok"
  error?: string;
}

function parseOrphadata(body: unknown, orphaNumber: string): OrphadataRecord | null {
  if (typeof body !== "object" || body === null) return null;
  const results = ((body as Record<string, unknown>).data as Record<string, unknown> | undefined)?.results;
  if (typeof results !== "object" || results === null) return null;
  const r = results as Record<string, unknown>;
  const preferredTerm = str(r["Preferred term"]);
  const orphaCode = String(r.ORPHAcode ?? "");
  if (preferredTerm === "" || orphaCode !== orphaNumber) return null;
  const date = /^\d{4}-\d{2}-\d{2}/.exec(str(r.Date))?.[0] ?? "";
  return { orphaCode, preferredTerm, date };
}

/** Orphadata cross-reference record for an ORPHA number. Never throws: failures are reported in the outcome. */
export async function fetchOrphadata(orphaNumber: string, deps: EngineDeps): Promise<OrphadataOutcome> {
  let body: unknown;
  try {
    body = await getJson("orphadata", `${ORPHADATA}/${encodeURIComponent(orphaNumber)}?lang=en`, deps);
  } catch (err) {
    return { status: "failed", data: null, error: err instanceof Error ? err.message : "unknown error" };
  }
  if (body === null) return { status: "not-found", data: null };
  const data = parseOrphadata(body, orphaNumber);
  return data ? { status: "ok", data } : { status: "unusable", data: null };
}
