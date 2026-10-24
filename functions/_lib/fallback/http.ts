// Upstream fetch and cache helpers for the Ian-owned fallback layer (T18b).
//
// Same rules as the engine's fetch wrapper (docs/CONTRACT.md section 10):
// per-upstream timeout through AbortSignal.timeout, one retry after 300 ms on
// 5xx or a network error when the budget allows, 404 -> null. Failures throw
// the engine's typed errors so functions/_lib/respond.ts maps them unchanged.
//
// The cache helpers wrap the Workers Cache API. A cache failure never fails a
// request. Cache keys are synthetic URLs that are never fetched.

import { UpstreamError, UpstreamTimeout } from "../../../engine/index";
import type { EngineDeps, UpstreamName } from "../../../engine/index";

/** Default per-upstream timeouts in ms (contract section 10). */
export const TIMEOUTS_MS: Readonly<Record<UpstreamName, number>> = {
  hpoSearch: 2000,
  hpoTerm: 2000,
  hpoAnnotation: 3000,
  monarchSemsim: 8000,
  orphadata: 2000,
  pubCaseFinder: 6000,
  clinicalTrials: 6000,
};

const RETRY_BACKOFF_MS = 300;

/** Engine deps plus waitUntil, so cache writes do not delay the response. */
export interface FallbackDeps extends EngineDeps {
  waitUntil?: (promise: Promise<unknown>) => void;
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GetJsonOptions {
  /** Overrides the upstream's default timeout for this call. */
  timeoutMs?: number;
  /**
   * "null" (default): HTTP 404 means "this resource does not exist" -> null.
   * "error": HTTP 404 is an upstream failure (for search endpoints such as
   * Monarch semsim and ClinicalTrials.gov, where 404 never means "no results").
   */
  notFound?: "null" | "error";
}

/**
 * GET a JSON document from `upstream`. Returns null on HTTP 404 unless
 * `notFound: "error"`. Throws UpstreamTimeout or UpstreamError otherwise.
 */
export async function getJson(
  upstream: UpstreamName,
  url: string,
  deps: FallbackDeps,
  options: GetJsonOptions = {},
): Promise<unknown> {
  const doFetch = deps.fetch; // local binding: Workers reject fetch called as a method
  const budget = options.timeoutMs ?? deps.timeoutsMs?.[upstream] ?? TIMEOUTS_MS[upstream];
  const startedAt = Date.now();
  const left = (): number => budget - (Date.now() - startedAt);

  for (let attempt = 0; attempt < 2; attempt++) {
    if (left() <= 0) throw new UpstreamTimeout(upstream);
    let res: Response;
    try {
      res = await doFetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(left()),
      });
    } catch (err) {
      if (isAbort(err)) throw new UpstreamTimeout(upstream);
      if (attempt === 0 && left() > RETRY_BACKOFF_MS) {
        await sleep(RETRY_BACKOFF_MS);
        continue;
      }
      throw new UpstreamError(upstream, null);
    }
    if (res.status === 404 && options.notFound !== "error") return null;
    if (res.status >= 500 && attempt === 0 && left() > RETRY_BACKOFF_MS) {
      await sleep(RETRY_BACKOFF_MS);
      continue;
    }
    if (!res.ok) throw new UpstreamError(upstream, res.status);
    try {
      return (await res.json()) as unknown;
    } catch (err) {
      if (isAbort(err)) throw new UpstreamTimeout(upstream);
      throw new UpstreamError(upstream, res.status);
    }
  }
  throw new UpstreamError(upstream, null);
}

// ------------------------------------------------------------------ cache

const CACHE_ORIGIN = "https://rdd-cache.invalid";

/** Synthetic cache key request for a namespaced key, e.g. ("ann", "ORPHA:646"). */
export function cacheKey(namespace: string, key: string): Request {
  return new Request(`${CACHE_ORIGIN}/${namespace}/v0.1/${encodeURIComponent(key)}`);
}

/** Cached JSON value, or undefined on a miss or any cache error. */
export async function cacheGetJson<T>(cache: Cache | undefined, key: Request): Promise<T | undefined> {
  if (!cache) return undefined;
  try {
    const hit = await cache.match(key);
    if (!hit) return undefined;
    return (await hit.json()) as T;
  } catch {
    return undefined;
  }
}

/** Store a JSON value for `ttlSeconds`. Uses waitUntil when available; never throws. */
export function cachePutJson(deps: FallbackDeps, key: Request, value: unknown, ttlSeconds: number): void {
  const cache = deps.cache;
  if (!cache) return;
  const res = new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${ttlSeconds}` },
  });
  const put = cache.put(key, res).catch(() => undefined);
  if (deps.waitUntil) deps.waitUntil(put);
}
