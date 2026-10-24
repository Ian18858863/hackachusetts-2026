// HPO hierarchy filter and subrequest metering for the next-questions
// fallback (T18d). Type-only imports, so node --test can load this file
// directly (see hierarchy.test.ts).
//
// Which questions are redundant, given the patient's reported terms:
//   - feature is an ancestor of an observed term: drop. "Prolonged neonatal
//     jaundice" observed already answers "jaundice?".
//   - feature is a descendant of an observed term: drop. This is an
//     intentional trade-off: a more specific feature (e.g. "Prolonged neonatal
//     jaundice" when "Jaundice" is observed) can still separate candidates,
//     but asking about a refinement of something the user already reported
//     reads as if the tool did not listen. Trust wins over a little
//     discrimination in v0.1.
//   - feature is a descendant of an excluded term: drop. No headache means no
//     more specific kind of headache either.
//   - feature is an ancestor of an excluded term: KEEP. No headache does not
//     rule out a broader feature such as pain, so the question is still valid.
// So ancestor lookups are needed for observed terms (patient side) and for
// candidate features (feature side), never for excluded terms.
//
// A lookup that returns null (failure, timeout, refused by the subrequest
// budget) means "not checked": the question is kept, which is the behaviour
// before T18d.

import type { HpoId, Question } from "../../../engine/index";
import type { FallbackDeps } from "./http";

/** All HPO ancestors of an id (not the id itself), or null when unknown. */
export type AncestorLookup = (id: HpoId) => Promise<HpoId[] | null>;

export interface HierarchyFilterOptions {
  observed: readonly HpoId[];
  excluded: readonly HpoId[];
  limit: number;
  lookup: AncestorLookup;
  /** Observed terms whose ancestors are looked up (in request order). */
  maxObservedLookups: number;
  /** Candidate features, in score order, whose ancestors are looked up. */
  maxFeatureChecks: number;
  /** Aborts when the time budget is spent. */
  deadline: AbortSignal;
}

/** Resolves to `onAbort` as soon as `signal` aborts, else to the promise's value. */
function untilDeadline<T>(p: Promise<T>, signal: AbortSignal, onAbort: T): Promise<T> {
  if (signal.aborted) return Promise.resolve(onAbort);
  return new Promise<T>((resolve) => {
    const stop = (): void => resolve(onAbort);
    signal.addEventListener("abort", stop, { once: true });
    p.then(
      (v) => {
        signal.removeEventListener("abort", stop);
        resolve(v);
      },
      () => {
        signal.removeEventListener("abort", stop);
        resolve(onAbort);
      },
    );
  });
}

/**
 * Removes questions that are redundant with the reported terms (rules above).
 * `scored` must already be in score order.
 *
 * Patient side first: the ancestors of the observed terms (one shared set).
 * If the deadline passes before it is known, the filter is skipped and
 * `scored.slice(0, limit)` is returned.
 *
 * Feature side, lazily in score order (T18o): only as many features are looked
 * up as are still needed to fill `limit`, in parallel per round, so the
 * subrequest and time budget goes to the features that can be shown. Before
 * T18o every observed lookup and a fixed first slice of features were started
 * up front, and the features that ended up shown were often never checked.
 *
 * Each kept feature lands in one tier; the output is tier 1, then 2, then 3,
 * each in score order, cut to `limit`:
 *   1. checked: its own lookup succeeded and every observed term's ancestors
 *      are known, so all three rules were applied;
 *   2. partly checked: its own lookup succeeded but some observed lookups
 *      did not (only the "ancestor of an observed term" rule may be incomplete);
 *   3. unchecked: its own lookup failed, was refused by the budget, passed the
 *      deadline or was beyond `maxFeatureChecks` (kept, contract section 7.5).
 * So an unchecked feature never comes before a checked one. When every lookup
 * succeeds the output is in plain score order.
 */
export async function dropRelatedToPatient(scored: readonly Question[], o: HierarchyFilterOptions): Promise<Question[]> {
  const unfiltered = scored.slice(0, o.limit);
  const allObserved = [...new Set(o.observed)];
  const observedIds = allObserved.slice(0, o.maxObservedLookups);
  const reported = new Set<HpoId>([...o.observed, ...o.excluded]);

  const observedAncestors = await untilDeadline(
    Promise.all(observedIds.map((id) => o.lookup(id).catch(() => null))),
    o.deadline,
    null,
  );
  if (observedAncestors === null) return unfiltered;

  const patientComplete = observedIds.length === allObserved.length && observedAncestors.every((a) => a !== null);
  const aboveObserved = new Set<HpoId>();
  for (const ids of observedAncestors) for (const id of ids ?? []) aboveObserved.add(id);
  const pending = scored.filter((q) => !aboveObserved.has(q.hpoId));

  const checked: Question[] = [];
  const partly: Question[] = [];
  const unchecked: Question[] = [];
  let next = 0;
  while (checked.length + partly.length < o.limit && next < pending.length && !o.deadline.aborted) {
    const room = o.maxFeatureChecks - next;
    if (room <= 0) break;
    const batch = pending.slice(next, next + Math.min(o.limit - checked.length - partly.length, room));
    next += batch.length;
    // Each lookup meets the deadline on its own, so answers already in are used.
    const found = await Promise.all(
      batch.map((q) => untilDeadline(o.lookup(q.hpoId).catch(() => null), o.deadline, null)),
    );
    batch.forEach((q, i) => {
      const ancestors = found[i];
      if (ancestors === null) unchecked.push(q);
      else if (ancestors.some((id) => reported.has(id))) return; // descendant of a reported term
      else (patientComplete ? checked : partly).push(q);
    });
  }
  unchecked.push(...pending.slice(next));
  return [...checked, ...partly, ...unchecked].slice(0, o.limit);
}

// ------------------------------------------------------------ subrequests

/**
 * Counts Workers subrequests of one invocation. On the Workers Free plan the
 * limit is 50 per invocation, and Cache API put / match / delete calls share
 * that quota with fetch() (developers.cloudflare.com/workers/platform/limits,
 * checked 2026-10-24). A child meter also counts on its parent.
 */
export class SubrequestMeter {
  used = 0;
  readonly parent: SubrequestMeter | undefined;
  constructor(parent?: SubrequestMeter) {
    this.parent = parent;
  }
  count(): void {
    this.used++;
    this.parent?.count();
  }
}

function refused(): Promise<never> {
  // AbortError: getJson maps it to UpstreamTimeout at once (no retry), and
  // the cache helpers treat it as a miss / dropped write.
  return Promise.reject(new DOMException("Subrequest or time budget exceeded", "AbortError"));
}

/**
 * Deps whose fetch and cache calls are counted on `meter`. With `guard`, a
 * call is refused (never made) once `meter.used >= guard.cap` or the deadline
 * has aborted, and fetches are also aborted by the deadline.
 */
export function meteredDeps(
  deps: FallbackDeps,
  meter: SubrequestMeter,
  guard?: { cap: number; deadline: AbortSignal },
): FallbackDeps {
  const blocked = (): boolean => guard !== undefined && (meter.used >= guard.cap || guard.deadline.aborted);
  const inner = deps.fetch;
  const fetch: FallbackDeps["fetch"] = (input, init) => {
    if (blocked()) return refused();
    meter.count();
    if (!guard) return inner(input, init);
    const signal = init?.signal ? AbortSignal.any([init.signal, guard.deadline]) : guard.deadline;
    return inner(input, { ...init, signal });
  };
  const out: FallbackDeps = { ...deps, fetch };
  const cache = deps.cache;
  if (cache) {
    const counted = <T>(call: () => Promise<T>): Promise<T> => {
      if (blocked()) return refused();
      meter.count();
      return call();
    };
    out.cache = {
      match: (req: RequestInfo, opts?: CacheQueryOptions) => counted(() => cache.match(req, opts)),
      put: (req: RequestInfo, res: Response) => counted(() => cache.put(req, res)),
      delete: (req: RequestInfo, opts?: CacheQueryOptions) => counted(() => cache.delete(req, opts)),
    } as unknown as Cache;
  }
  return out;
}

/**
 * Shares a fixed number of subrequests between lookups. A lookup starts only
 * after reserving its worst case (`perLookup` calls); it then runs with its
 * own child meter capped at that reservation and gives back what it did not
 * use when it ends. So a started lookup can always finish, including its
 * cache write, and the total never exceeds `total`. A lookup that cannot
 * reserve waits for running ones to give calls back; when none is running
 * and the reservation still does not fit, it returns `onSkip` at once.
 */
export class LookupBudget {
  private left: number;
  private running = 0;
  private waiters: Array<() => void> = [];
  private readonly perLookup: number;
  private readonly meter: SubrequestMeter;
  private readonly deps: FallbackDeps;
  private readonly deadline: AbortSignal;

  constructor(o: { total: number; perLookup: number; meter: SubrequestMeter; deps: FallbackDeps; deadline: AbortSignal }) {
    this.left = o.total;
    this.perLookup = o.perLookup;
    this.meter = o.meter;
    this.deps = o.deps;
    this.deadline = o.deadline;
  }

  async run<T>(fn: (deps: FallbackDeps) => Promise<T>, onSkip: T): Promise<T> {
    while (this.left < this.perLookup) {
      if (this.running === 0 || this.deadline.aborted) return onSkip;
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    this.left -= this.perLookup;
    this.running++;
    const own = new SubrequestMeter(this.meter);
    try {
      return await fn(meteredDeps(this.deps, own, { cap: this.perLookup, deadline: this.deadline }));
    } catch {
      return onSkip;
    } finally {
      this.left += this.perLookup - own.used;
      this.running--;
      const wake = this.waiters;
      this.waiters = [];
      for (const w of wake) w();
    }
  }
}
