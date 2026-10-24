// Injected-fetch wrapper (CONTRACT.md section 10). Workers-compatible: only
// fetch, URL, AbortSignal and standard JS. Partial task 1.2: timeouts and one
// retry are in; the optional Workers cache is not wired yet.

import { UpstreamError, UpstreamTimeout } from "./errors";
import type { EngineDeps, UpstreamName } from "./types";

/** Default per-upstream timeouts in ms (CONTRACT.md section 10). */
export const DEFAULT_TIMEOUTS_MS: Readonly<Record<UpstreamName, number>> = {
  hpoSearch: 2000,
  hpoTerm: 2000,
  hpoAnnotation: 3000,
  monarchSemsim: 8000,
  orphadata: 2000,
  pubCaseFinder: 6000,
  clinicalTrials: 6000,
};

const RETRY_BACKOFF_MS = 300;

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * GET a JSON document. Returns null on HTTP 404 (the resource does not exist).
 * Throws UpstreamTimeout or UpstreamError otherwise. One retry after 300 ms on
 * 5xx or network error, only if the time budget allows.
 */
export async function getJson(upstream: UpstreamName, url: string, deps: EngineDeps): Promise<unknown> {
  // Call fetch through a local binding: Workers throw "Illegal invocation"
  // when the global fetch is called as a method of another object (deps.fetch()).
  const doFetch = deps.fetch;
  const budget = deps.timeoutsMs?.[upstream] ?? DEFAULT_TIMEOUTS_MS[upstream];
  const startedAt = Date.now();

  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = budget - (Date.now() - startedAt);
    if (remaining <= 0) throw new UpstreamTimeout(upstream);
    let res: Response;
    try {
      res = await doFetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(remaining),
      });
    } catch (err) {
      if (isTimeout(err)) throw new UpstreamTimeout(upstream);
      if (attempt === 0 && budget - (Date.now() - startedAt) > RETRY_BACKOFF_MS) {
        await sleep(RETRY_BACKOFF_MS);
        continue;
      }
      throw new UpstreamError(upstream, null);
    }
    if (res.status === 404) return null;
    if (res.status >= 500 && attempt === 0 && budget - (Date.now() - startedAt) > RETRY_BACKOFF_MS) {
      await sleep(RETRY_BACKOFF_MS);
      continue;
    }
    if (!res.ok) throw new UpstreamError(upstream, res.status);
    try {
      return await res.json();
    } catch {
      throw new UpstreamError(upstream, res.status);
    }
  }
  throw new UpstreamError(upstream, null);
}
