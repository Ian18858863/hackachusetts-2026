// HPO ancestor lookups for the fallback layer (T18d).
//
// GET https://ontology.jax.org/api/hp/terms/{HP:id}/ancestors
// Checked 2026-10-24: the body is an array of { id, name, translations,
// descendantCount } holding every transitive ancestor up to HP:0000001 "All",
// without the term itself (13 rows for HP:0006579 Prolonged neonatal jaundice,
// including HP:0000952 Jaundice). An unknown id answers HTTP 400.
//
// Uses the hpoTerm upstream (2 s timeout, contract section 10) and caches the
// id list per term for 7 days, like other HPO term lookups. A failed lookup
// returns null so callers can fall back to behaviour without hierarchy data.

import type { HpoId } from "../../../engine/index";
import { cacheGetJson, cacheKey, cachePutJson, getJson } from "./http";
import type { FallbackDeps } from "./http";

const JAX_TERMS = "https://ontology.jax.org/api/hp/terms/";
const ANCESTORS_TTL_S = 7 * 24 * 60 * 60;
const HPO_ID_RE = /^HP:\d{7}$/;

function parseAncestors(body: unknown): HpoId[] | null {
  if (!Array.isArray(body)) return null;
  const ids = new Set<HpoId>();
  for (const row of body as unknown[]) {
    const id = (row as Record<string, unknown> | null)?.id;
    if (typeof id === "string" && HPO_ID_RE.test(id)) ids.add(id);
  }
  return [...ids].sort();
}

/** Every HPO ancestor of `id` (not including `id`), or null when the lookup failed. */
export async function hpoAncestors(id: HpoId, deps: FallbackDeps): Promise<HpoId[] | null> {
  const key = cacheKey("hpo-ancestors", id);
  const hit = await cacheGetJson<HpoId[]>(deps.cache, key);
  if (Array.isArray(hit)) return hit;
  try {
    const body = await getJson("hpoTerm", `${JAX_TERMS}${encodeURIComponent(id)}/ancestors`, deps);
    const ids = parseAncestors(body);
    if (ids === null) return null;
    cachePutJson(deps, key, ids, ANCESTORS_TTL_S);
    return ids;
  } catch {
    return null;
  }
}
