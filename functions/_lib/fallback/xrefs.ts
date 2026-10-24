// ORPHA / OMIM / MONDO cross-references of a candidate disease, so that
// /api/next-questions reads the same merged ORPHA + OMIM annotation sets as
// /api/rank (T18b review finding 3). Temporary fallback code: the engine
// path takes over when Jerry's nextQuestions lands.
//
// Resolution order:
//   1. Workers cache, written by the rank fallback for every candidate it
//      returned (24 h), keyed by diseaseId, ORPHA, OMIM and MONDO id. Same
//      ids and same display name as the ranking screen.
//   2. Monarch entity GET /v3/api/entity/{MONDO id} xrefs (2 s). The MONDO id
//      comes from the request (MONDO candidates) or from the JAX annotation
//      of the requested ORPHA / OMIM id (`disease.mondoId`).
// If neither works, the caller marks the candidate's annotations as
// incomplete and names the annotation set it used.

import type { DiseaseId } from "../../../engine/index";
import { cacheGetJson, cacheKey, cachePutJson, getJson } from "./http";
import type { FallbackDeps } from "./http";

const MONARCH_ENTITY = "https://api.monarchinitiative.org/v3/api/entity/";
const ENTITY_TIMEOUT_MS = 2000;
const XREF_TTL_S = 24 * 60 * 60;

export interface DiseaseXrefs {
  mondo: string | null;
  orpha: DiseaseId | null;
  omim: DiseaseId | null;
  /** Display name used on the ranking screen, when known. */
  name: string | null;
}

/** First ORPHA and OMIM ids in a Monarch xref list, normalised (Orphanet:n -> ORPHA:n). */
export function pickXrefs(xrefs: readonly string[]): { orpha: DiseaseId | null; omim: DiseaseId | null } {
  const orphaX = xrefs.find((x) => /^(Orphanet|ORPHA):\d+$/.test(x));
  const omimX = xrefs.find((x) => /^OMIM:\d+$/.test(x));
  return { orpha: orphaX ? `ORPHA:${orphaX.split(":")[1]}` : null, omim: omimX ?? null };
}

/** Remember a ranked candidate's cross-references under each of its ids. */
export function rememberXrefs(diseaseId: DiseaseId, x: DiseaseXrefs, deps: FallbackDeps): void {
  const keys = new Set([diseaseId, x.orpha, x.omim, x.mondo].filter((k): k is string => !!k));
  for (const k of keys) cachePutJson(deps, cacheKey("xref", k), x, XREF_TTL_S);
}

export async function cachedXrefs(id: DiseaseId, deps: FallbackDeps): Promise<DiseaseXrefs | undefined> {
  return cacheGetJson<DiseaseXrefs>(deps.cache, cacheKey("xref", id));
}

/** Cross-references from the Monarch entity record; null on any failure. */
export async function monarchXrefs(mondo: string, deps: FallbackDeps): Promise<DiseaseXrefs | null> {
  try {
    const body = await getJson("monarchSemsim", `${MONARCH_ENTITY}${encodeURIComponent(mondo)}`, deps, {
      timeoutMs: ENTITY_TIMEOUT_MS,
      notFound: "error",
    });
    const rec = (body ?? {}) as { id?: unknown; name?: unknown; xref?: unknown };
    if (rec.id !== mondo) return null;
    const list = Array.isArray(rec.xref) ? rec.xref.filter((v): v is string => typeof v === "string") : [];
    return { mondo, ...pickXrefs(list), name: typeof rec.name === "string" && rec.name ? rec.name : null };
  } catch {
    return null;
  }
}
