// Unit tests for functions/_lib/fallback/hierarchy.ts (T18d).
// Run: node --test --experimental-strip-types functions/_lib/fallback/hierarchy.test.ts
// HPO ids and labels are real; ancestor lists are trimmed subsets of JAX
// /ancestors (checked 2026-10-24); the
// questions and scores are hand-made fixtures, not real annotation data.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Question } from "../../../engine/index";
import { dropRelatedToPatient, LookupBudget, meteredDeps, SubrequestMeter, type AncestorLookup } from "./hierarchy.ts";
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
