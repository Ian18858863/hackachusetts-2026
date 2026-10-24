// GET /api/terms?q=&limit= (docs/CONTRACT.md section 7.3).
//
// HPO term search for "add a term by hand", so the app never calls the HPO API
// directly. `q` 2-100 characters, `limit` 1-20 (default 8).
// Engine: searchTerms (2 s timeout). Successful responses are kept in the
// Workers Cache API for 7 days, keyed by q|limit (contract section 10).
// The query is not logged.

import { searchTerms } from "../../engine/index";
import type { DataVersions, EngineDeps, HpoTerm } from "../../engine/index";
import {
  CONTRACT_VERSION,
  defaultCache,
  engineErrorResponse,
  invalid,
  json,
  methodNotAllowed,
} from "../_lib/respond";
import type { PagesContext } from "../_lib/respond";

const Q_MIN = 2;
const Q_MAX = 100;
const LIMIT_MIN = 1;
const LIMIT_MAX = 20;
const LIMIT_DEFAULT = 8;
const CACHE_TTL_S = 7 * 24 * 60 * 60;
/** Synthetic origin for cache keys; never fetched. Bump the path on shape changes. */
const CACHE_KEY_BASE = "https://rdd-cache.invalid/api/terms/v0.1";

interface TermsResponseBody {
  version: typeof CONTRACT_VERSION;
  source: "live";
  terms: HpoTerm[];
  dataVersions: DataVersions;
}

export const onRequest = async (context: PagesContext<Record<string, unknown>>): Promise<Response> => {
  if (context.request.method !== "GET") return methodNotAllowed(["GET"]);

  const params = new URL(context.request.url).searchParams;
  const rawQ = params.get("q");
  if (rawQ === null) return invalid("`q` is required: type at least 2 characters to search.");
  const q = rawQ.trim().replace(/\s+/g, " ");
  if (q.length < Q_MIN || q.length > Q_MAX) {
    return invalid(`\`q\` needs ${Q_MIN} to ${Q_MAX} characters. Type a longer or shorter search and try again.`);
  }

  let limit = LIMIT_DEFAULT;
  const rawLimit = params.get("limit");
  if (rawLimit !== null && rawLimit !== "") {
    if (!/^\d{1,3}$/.test(rawLimit)) return invalid(`\`limit\` must be a whole number from ${LIMIT_MIN} to ${LIMIT_MAX}.`);
    limit = Number(rawLimit);
    if (limit < LIMIT_MIN || limit > LIMIT_MAX) {
      return invalid(`\`limit\` must be a whole number from ${LIMIT_MIN} to ${LIMIT_MAX}.`);
    }
  }

  const cache = defaultCache();
  const cacheKey = new Request(`${CACHE_KEY_BASE}?q=${encodeURIComponent(q)}&limit=${limit}`);
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) {
        const headers = new Headers(hit.headers);
        headers.set("X-RDD-Cache", "hit");
        return new Response(hit.body, { status: hit.status, headers });
      }
    } catch {
      // A cache read failure must never fail the request.
    }
  }

  const deps: EngineDeps = { fetch: globalThis.fetch.bind(globalThis) };
  if (cache) deps.cache = cache;

  let result: { terms: HpoTerm[]; dataVersions: DataVersions };
  try {
    result = await searchTerms(q, limit, deps);
  } catch (err) {
    return engineErrorResponse(err, "Your terms are kept");
  }

  const out: TermsResponseBody = {
    version: CONTRACT_VERSION,
    source: "live",
    terms: result.terms,
    dataVersions: result.dataVersions,
  };
  const response = json(out, 200, { "Cache-Control": `public, max-age=${CACHE_TTL_S}`, "X-RDD-Cache": "miss" });

  if (cache) {
    const stored = response.clone();
    stored.headers.delete("X-RDD-Cache");
    context.waitUntil(cache.put(cacheKey, stored).catch(() => undefined));
  }
  return response;
};
