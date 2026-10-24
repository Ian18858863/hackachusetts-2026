// One request budget for POST /api/rank under RDD_RANK_SOURCE = "pcf" (T36c).
//
// - Subrequests: one counter for every fetch and every Cache API operation of
//   the whole invocation (the handler's rank-cache reads and writes, the
//   PubCaseFinder path and the Monarch path). Cloudflare Workers allow 50 per
//   invocation and Cache API calls count; we stop at REQUEST_SUBREQUEST_CAP.
//   Over the cap a fetch rejects at once and a cache read misses, a write is
//   skipped, so only evidence degrades (evidenceComplete false).
// - Deadline: an absolute time (ms since epoch). A fetch wrapped with
//   `deadlineFetch` is aborted when the deadline passes, whatever timeout the
//   caller set.

export const REQUEST_SUBREQUEST_CAP = 46;

export interface RequestBudget {
  used: number;
  cap: number;
}

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

function timeoutError(): Error {
  const e = new Error("request deadline passed");
  e.name = "TimeoutError";
  return e;
}

/** Counts every call against the shared budget; rejects once it is spent. */
export function countedFetch(inner: FetchFn, budget: RequestBudget): FetchFn {
  return (input, init) => {
    if (budget.used >= budget.cap) return Promise.reject(new TypeError("subrequest budget spent"));
    budget.used++;
    return inner(input, init);
  };
}

/** Aborts the call at `deadline` (absolute ms), combined with any signal the caller passed. */
export function deadlineFetch(inner: FetchFn, deadline: () => number): FetchFn {
  return (input, init) => {
    const left = deadline() - Date.now();
    if (left <= 0) return Promise.reject(timeoutError());
    const bound = AbortSignal.timeout(left);
    const signal = init?.signal ? AbortSignal.any([init.signal, bound]) : bound;
    return inner(input, { ...init, signal });
  };
}

/** Cache API wrapper that counts match and put against the shared budget. */
export function countedCache(cache: Cache | undefined, budget: RequestBudget): Cache | undefined {
  if (!cache) return undefined;
  const take = (): boolean => {
    if (budget.used >= budget.cap) return false;
    budget.used++;
    return true;
  };
  const wrapped = {
    match: (req: RequestInfo | URL, opts?: CacheQueryOptions) => (take() ? cache.match(req, opts) : Promise.resolve(undefined)),
    put: (req: RequestInfo | URL, res: Response) => (take() ? cache.put(req, res) : Promise.resolve()),
    delete: (req: RequestInfo | URL, opts?: CacheQueryOptions) => (take() ? cache.delete(req, opts) : Promise.resolve(false)),
  };
  return wrapped as unknown as Cache;
}

/** Resolves with `value` after `ms` (0 or less: next tick). */
export function after<T>(ms: number, value: T): { promise: Promise<T>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(value), Math.max(0, ms));
  });
  return { promise, cancel: () => timer !== undefined && clearTimeout(timer) };
}
