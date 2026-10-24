// Unit tests for functions/_lib/fallback/hierarchy.ts (T18d).
// Run: node --test --experimental-strip-types functions/_lib/fallback/hierarchy.test.ts
// HPO ids and labels are real; ancestor lists are trimmed subsets of JAX
// /ancestors (checked 2026-10-24); the
// questions and scores are hand-made fixtures, not real annotation data.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Question } from "../../../engine/index";
import { dropRelatedToPatient, edgeCached, LookupBudget, meteredDeps, READ_MAX_CALLS, SubrequestMeter, type AncestorLookup } from "./hierarchy.ts";
import type { FallbackDeps } from "./http";

function q(hpoId: string, label: string, score: number): Question {
  return {
    hpoId,
    label,
    question: `Has anyone noticed ${label.toLowerCase()}?`,
    discriminates: [
      { diseaseId: "OMIM:257220", frequency: null },
      { diseaseId: "OMIM:607625", frequency: null },
    ],
    why: "fixture",
    score,
  };
}

// Score order, as fallbackNextQuestions passes it.
const SCORED: Question[] = [
  q("HP:0000952", "Jaundice", 1), // ancestor of observed HP:0006579
  q("HP:0001249", "Intellectual disability", 1),
  q("HP:0002066", "Gait ataxia", 1), // descendant of observed HP:0001251
  q("HP:0002206", "Pulmonary fibrosis", 1),
  q("HP:0002108", "Spontaneous pneumothorax", 0.9), // descendant of excluded HP:0002107
  q("HP:0002103", "Abnormal pleura morphology", 0.9), // ancestor of excluded HP:0002107: must stay
  q("HP:0001250", "Seizure", 0.9),
  q("HP:0001265", "Hyporeflexia", 0.9),
];

const OBSERVED = ["HP:0006579", "HP:0001251"]; // Prolonged neonatal jaundice, Ataxia
const EXCLUDED = ["HP:0002107"]; // Pneumothorax

const ANCESTORS: Record<string, string[]> = {
  "HP:0006579": ["HP:0000001", "HP:0000118", "HP:0000952", "HP:0001396"],
  "HP:0001251": ["HP:0000001", "HP:0000118", "HP:0000707", "HP:0011443", "HP:0012638"],
  "HP:0002107": ["HP:0000001", "HP:0000118", "HP:0002086", "HP:0002103"],
  "HP:0002066": ["HP:0000001", "HP:0000118", "HP:0001251", "HP:0001288"],
  "HP:0002108": ["HP:0000001", "HP:0000118", "HP:0002086", "HP:0002103", "HP:0002107"],
  "HP:0002103": ["HP:0000001", "HP:0000118", "HP:0002086"],
};

function lookupFrom(table: Record<string, string[]>, calls: string[] = []): AncestorLookup {
  return async (id) => {
    calls.push(id);
    return table[id] ?? [];
  };
}

function options(lookup: AncestorLookup, extra: Partial<Parameters<typeof dropRelatedToPatient>[1]> = {}) {
  return {
    observed: OBSERVED,
    excluded: EXCLUDED,
    limit: 5,
    lookup,
    maxObservedLookups: 12,
    maxFeatureChecks: 6,
    deadline: new AbortController().signal,
    ...extra,
  };
}

const ids = (qs: Question[]): string[] => qs.map((x) => x.hpoId);

test("every lookup fails: same questions as before T18d", async () => {
  const failing: AncestorLookup = async () => null;
  const throwing: AncestorLookup = async () => {
    throw new Error("network");
  };
  for (const lookup of [failing, throwing]) {
    const out = await dropRelatedToPatient(SCORED, options(lookup));
    assert.deepEqual(out, SCORED.slice(0, 5));
  }
});

test("drops ancestors and descendants of observed terms and descendants of excluded terms", async () => {
  const calls: string[] = [];
  const out = await dropRelatedToPatient(SCORED, options(lookupFrom(ANCESTORS, calls)));
  assert.deepEqual(ids(out), ["HP:0001249", "HP:0002206", "HP:0002103", "HP:0001250", "HP:0001265"]);
  // Excluded terms are never looked up: their ancestors are not filtered.
  assert.ok(!calls.includes("HP:0002107"));
  assert.ok(ids(out).includes("HP:0002103"), "an ancestor of an excluded term stays");
});

test("kept questions stay in input order and are unchanged objects", async () => {
  const out = await dropRelatedToPatient(SCORED, options(lookupFrom(ANCESTORS), { limit: 8 }));
  const positions = out.map((x) => SCORED.indexOf(x));
  assert.ok(positions.every((p) => p >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  const again = await dropRelatedToPatient(SCORED, options(lookupFrom(ANCESTORS), { limit: 8 }));
  assert.deepEqual(again, out);
});

test("deadline already passed: filter skipped", async () => {
  const out = await dropRelatedToPatient(SCORED, options(lookupFrom(ANCESTORS), { deadline: AbortSignal.abort() }));
  assert.deepEqual(out, SCORED.slice(0, 5));
});

test("deadline passes during the patient side: filter skipped", async () => {
  const ctrl = new AbortController();
  const hanging: AncestorLookup = () => new Promise(() => undefined);
  const pending = dropRelatedToPatient(SCORED, options(hanging, { deadline: ctrl.signal }));
  ctrl.abort();
  assert.deepEqual(await pending, SCORED.slice(0, 5));
});

test("feature lookups unavailable: only ancestors of observed terms are dropped", async () => {
  const observedOnly: AncestorLookup = async (id) => (OBSERVED.includes(id) ? (ANCESTORS[id] ?? []) : null);
  const out = await dropRelatedToPatient(SCORED, options(observedOnly));
  assert.deepEqual(ids(out), ["HP:0001249", "HP:0002066", "HP:0002206", "HP:0002108", "HP:0002103"]);
});

test("caps: observed and feature lookups are limited", async () => {
  const calls: string[] = [];
  await dropRelatedToPatient(
    SCORED,
    options(lookupFrom(ANCESTORS, calls), { maxObservedLookups: 1, maxFeatureChecks: 2 }),
  );
  assert.equal(calls.length, 3);
});

// ------------------------------------------------ T18o: score order and budget

/** Lookup that answers from `table` only for the first `n` calls, then null (budget spent). */
function limitedLookup(table: Record<string, string[]>, n: number, calls: string[] = []): AncestorLookup {
  return async (id) => {
    calls.push(id);
    return calls.length <= n ? (table[id] ?? []) : null;
  };
}

test("features are looked up lazily in score order and stop once limit have passed", async () => {
  const calls: string[] = [];
  const out = await dropRelatedToPatient(SCORED, options(lookupFrom(ANCESTORS, calls), { limit: 2 }));
  assert.deepEqual(ids(out), ["HP:0001249", "HP:0002206"]);
  // 2 observed, then round 1: Intellectual disability + Gait ataxia (dropped),
  // round 2: Pulmonary fibrosis. Nothing further down the list is looked up.
  assert.deepEqual(calls, ["HP:0006579", "HP:0001251", "HP:0001249", "HP:0002066", "HP:0002206"]);
});

test("a tight budget goes to the top-scored features first (demo-npc1 Gait ataxia case)", async () => {
  // 2 observed + 3 feature lookups fit. Before T18o the feature side was
  // started as one fixed slice and, with the budget spent, the descendant
  // HP:0002066 Gait ataxia stayed in the list unchecked.
  const calls: string[] = [];
  const out = await dropRelatedToPatient(SCORED, options(limitedLookup(ANCESTORS, 5, calls), { limit: 3 }));
  assert.deepEqual(calls.slice(0, 5), ["HP:0006579", "HP:0001251", "HP:0001249", "HP:0002066", "HP:0002206"]);
  assert.ok(!ids(out).includes("HP:0002066"), "the descendant of an observed term is dropped");
  assert.deepEqual(ids(out), ["HP:0001249", "HP:0002206", "HP:0002108"]);
});

test("an unchecked feature never comes before a checked one", async () => {
  // Gait ataxia's own lookup fails; lower-scored features are checked.
  const lookup: AncestorLookup = async (id) => (id === "HP:0002066" ? null : (ANCESTORS[id] ?? []));
  const out = await dropRelatedToPatient(SCORED, options(lookup));
  assert.deepEqual(ids(out), ["HP:0001249", "HP:0002206", "HP:0002103", "HP:0001250", "HP:0002066"]);
});

test("budget spent mid-list: checked features first, then the rest unchecked in score order", async () => {
  // 2 observed + 2 feature lookups succeed (Intellectual disability kept,
  // Gait ataxia dropped); every later lookup is refused.
  const out = await dropRelatedToPatient(SCORED, options(limitedLookup(ANCESTORS, 4)));
  assert.deepEqual(ids(out), ["HP:0001249", "HP:0002206", "HP:0002108", "HP:0002103", "HP:0001250"]);
});

test("missing observed ancestors put partly checked features after fully checked ones", async () => {
  // Every feature checks fine, but one observed lookup failed, so no feature is
  // fully checked: the order stays score order and nothing is dropped wrongly.
  const lookup: AncestorLookup = async (id) => (id === "HP:0006579" ? null : (ANCESTORS[id] ?? []));
  const out = await dropRelatedToPatient(SCORED, options(lookup));
  // Jaundice (ancestor of the failed observed term) cannot be recognised and stays.
  assert.deepEqual(ids(out), ["HP:0000952", "HP:0001249", "HP:0002206", "HP:0002103", "HP:0001250"]);
});

test("more observed terms than maxObservedLookups: features count as partly checked", async () => {
  const lookup = lookupFrom(ANCESTORS);
  const partial = await dropRelatedToPatient(SCORED, options(lookup, { maxObservedLookups: 1 }));
  // HP:0001251 Ataxia is not looked up, but Gait ataxia's own ancestors still
  // contain it, so it is dropped; nothing unchecked precedes these.
  assert.ok(!ids(partial).includes("HP:0002066"));
});

test("same inputs give the same output on every run", async () => {
  const runs = await Promise.all(
    [1, 2, 3].map(() => dropRelatedToPatient(SCORED, options(limitedLookup(ANCESTORS, 6)))),
  );
  assert.deepEqual(ids(runs[1]), ids(runs[0]));
  assert.deepEqual(ids(runs[2]), ids(runs[0]));
});

test("deadline during the feature side: checked ones kept first, rest unchecked", async () => {
  const ctrl = new AbortController();
  const lookup: AncestorLookup = async (id) => {
    if (id === "HP:0002206") {
      setTimeout(() => ctrl.abort(), 10);
      return new Promise(() => undefined);
    }
    return ANCESTORS[id] ?? [];
  };
  const out = await dropRelatedToPatient(SCORED, options(lookup, { deadline: ctrl.signal, limit: 3 }));
  // Round 1 (3 features): Intellectual disability kept, Gait ataxia dropped,
  // Pulmonary fibrosis hangs past the deadline and counts as unchecked.
  assert.deepEqual(ids(out), ["HP:0001249", "HP:0002206", "HP:0002108"]);
});

test("LookupBudget with 2 calls per lookup fits 12 observed lookups and then 11 of 15 feature lookups", async () => {
  const meter = new SubrequestMeter();
  meter.used = 16; // demo-npc1 annotation phase, measured 2026-10-24 (T18o)
  const base: FallbackDeps = { fetch: async () => new Response("[]") };
  const budget = new LookupBudget({ total: 24, perLookup: 2, meter, deps: base, deadline: new AbortController().signal });
  const one = (): Promise<string> => budget.run(async (d) => (await d.fetch("https://example.invalid/a"), "ok"), "skipped");
  const observed = await Promise.all(Array.from({ length: 12 }, one));
  assert.ok(observed.every((r) => r === "ok"));
  const features: string[] = [];
  for (let round = 0; round < 3; round++) features.push(...(await Promise.all(Array.from({ length: 5 }, one))));
  assert.equal(features.filter((r) => r === "ok").length, 11);
  assert.ok(meter.used <= 40);
});

test("meteredDeps counts fetch and cache calls and refuses past the cap", async () => {
  let fetched = 0;
  const store = new Map<string, Response>();
  const cache = {
    match: async (r: Request) => store.get(r.url),
    put: async (r: Request, res: Response) => void store.set(r.url, res),
    delete: async () => false,
  } as unknown as Cache;
  const base: FallbackDeps = {
    fetch: async () => {
      fetched++;
      return new Response("[]");
    },
    cache,
  };
  const meter = new SubrequestMeter();
  const counted = meteredDeps(base, meter);
  await counted.fetch("https://example.invalid/a");
  await counted.cache?.match(new Request("https://example.invalid/a"));
  assert.equal(meter.used, 2);

  const guarded = meteredDeps(base, meter, { cap: 3, deadline: new AbortController().signal });
  await guarded.fetch("https://example.invalid/b");
  assert.equal(meter.used, 3);
  await assert.rejects(guarded.fetch("https://example.invalid/c"), { name: "AbortError" });
  await assert.rejects(guarded.cache!.match(new Request("https://example.invalid/c")), { name: "AbortError" });
  assert.equal(meter.used, 3);
  assert.equal(fetched, 2);
});

test("LookupBudget: reserves the worst case, returns unused calls, never exceeds the total", async () => {
  const meter = new SubrequestMeter();
  meter.used = 30; // annotation phase
  let fetched = 0;
  const base: FallbackDeps = {
    fetch: async () => {
      fetched++;
      return new Response("[]");
    },
  };
  const budget = new LookupBudget({ total: 10, perLookup: 4, meter, deps: base, deadline: new AbortController().signal });
  // Each "warm" lookup makes 1 call and returns 3 of its 4 reserved calls. A
  // lookup starts only while 4 calls are free, so 7 run (7 used, 3 free) and
  // the last 3 are skipped.
  const warm = await Promise.all(
    Array.from({ length: 10 }, () => budget.run(async (d) => (await d.fetch("https://example.invalid/w"), "ok"), "skipped")),
  );
  assert.deepEqual(warm, [...Array(7).fill("ok"), ...Array(3).fill("skipped")]);
  assert.equal(meter.used, 37);

  // Nothing left: further lookups are skipped without any call.
  const late = await budget.run(async (d) => (await d.fetch("https://example.invalid/x"), "ok"), "skipped");
  assert.equal(late, "skipped");
  assert.equal(fetched, 7);
  assert.equal(meter.used, 37);
});

test("LookupBudget: a lookup cannot use more than its reservation", async () => {
  const meter = new SubrequestMeter();
  const base: FallbackDeps = { fetch: async () => new Response("[]") };
  const budget = new LookupBudget({ total: 8, perLookup: 4, meter, deps: base, deadline: new AbortController().signal });
  const out = await budget.run(async (d) => {
    for (let i = 0; i < 6; i++) await d.fetch("https://example.invalid/y");
    return "ok";
  }, "skipped");
  assert.equal(out, "skipped");
  assert.equal(meter.used, 4);
});

// ------------------------------------------- worst-case subrequests (T18o review)

/** Upstream that answers 5xx, then 2xx with bad bodies, forever; counts calls. */
function hostile(): { fetch: FallbackDeps["fetch"]; calls: () => number } {
  let n = 0;
  const bodies = [() => new Response("oops", { status: 503 }), () => new Response("not json"), () => new Response('{"wrong":1}')];
  return {
    fetch: async () => bodies[n++ % bodies.length](),
    calls: () => n,
  };
}

/** Same attempt pattern as getJson: one retry on 5xx, one parse. Throws on failure. */
async function getJsonLike(deps: FallbackDeps): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await deps.fetch("https://example.invalid/r");
    if (res.status >= 500 && attempt === 0) continue;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  throw new Error("failed");
}

test("edgeCached: one read never makes more than READ_MAX_CALLS calls and never returns a bad body", async () => {
  for (let start = 0; start < 3; start++) {
    const up = hostile();
    for (let i = 0; i < start; i++) await up.fetch("https://example.invalid/skip");
    const before = up.calls();
    const read = edgeCached({ fetch: up.fetch }, 60, Array.isArray);
    await assert.rejects(getJsonLike(read));
    for (let i = 0; i < 3; i++) assert.ok((await read.fetch("https://example.invalid/r")).status >= 500);
    assert.ok(up.calls() - before <= READ_MAX_CALLS, `start ${start}: ${up.calls() - before} calls`);
  }
});

test("edgeCached: a bad cached body is re-read once with no-store and then used", async () => {
  const inits: Array<RequestInit | undefined> = [];
  let n = 0;
  const read = edgeCached(
    {
      fetch: async (_u, init) => {
        inits.push(init);
        return n++ === 0 ? new Response("not json") : new Response('["HP:0000001"]');
      },
    },
    60,
    Array.isArray,
  );
  assert.deepEqual(await getJsonLike(read), ["HP:0000001"]);
  assert.equal(inits.length, 2);
  assert.equal(inits[1]?.cache, "no-store");
  assert.deepEqual((inits[0] as { cf?: unknown }).cf, { cacheTtlByStatus: { "200-299": 60, "300-599": 0 } });
});

test("worst case: hierarchy lookups on a hostile upstream never take the invocation past 40", async () => {
  for (const annotationUsed of [0, 16, 25, 37]) {
    const meter = new SubrequestMeter();
    meter.used = annotationUsed;
    const up = hostile();
    const budget = new LookupBudget({
      total: Math.max(0, 40 - annotationUsed),
      perLookup: 2,
      meter,
      deps: { fetch: up.fetch },
      deadline: new AbortController().signal,
    });
    const lookup: AncestorLookup = (id) =>
      budget.run(async (d) => (await getJsonLike(edgeCached(d, 60, Array.isArray))) as string[], null);
    const obs = Array.from({ length: 12 }, (_, i) => `HP:${String(1250 + i).padStart(7, "0")}`);
    const out = await dropRelatedToPatient(SCORED, options(lookup, { observed: obs, maxFeatureChecks: 12 }));
    assert.equal(out.length, 5);
    assert.ok(meter.used <= 40, `annotation ${annotationUsed}: total ${meter.used}`);
    assert.equal(meter.used - annotationUsed, up.calls());
  }
});

test("worst case: annotation phase with 5 candidates on a hostile upstream stays within 25 + 12 = 37", async () => {
  // Model of fallbackNextQuestions' annotation phase: per candidate 1 xref
  // cache match and 2 JAX reads (required, metered, edgeCached), plus 3
  // optional calls (Monarch xrefs, mappings, Orphadata) through a 12-call budget.
  const meter = new SubrequestMeter();
  const up = hostile();
  const store = { match: async () => undefined, put: async () => undefined, delete: async () => false } as unknown as Cache;
  const counted = meteredDeps({ fetch: up.fetch, cache: store }, meter);
  const optional = new LookupBudget({ total: 12, perLookup: 2, meter, deps: { fetch: up.fetch }, deadline: new AbortController().signal });
  const one = async (): Promise<void> => {
    await counted.cache?.match(new Request("https://example.invalid/xref"));
    for (const _set of [0, 1]) await getJsonLike(edgeCached(counted, 60, Array.isArray)).catch(() => null);
    for (const _call of [0, 1, 2]) await optional.run((d) => getJsonLike(d), null);
  };
  await Promise.all(Array.from({ length: 5 }, one));
  assert.ok(meter.used <= 37, `annotation phase used ${meter.used}`);
});
