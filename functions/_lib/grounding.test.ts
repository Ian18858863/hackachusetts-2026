// Unit tests for functions/_lib/grounding.ts (T37 secondary grounding).
// Run: node --test --experimental-strip-types functions/_lib/grounding.test.ts
// Uses a stubbed fetch with recorded-shape JAX search rows; no network.

import { test } from "node:test";
import assert from "node:assert/strict";
import { namesTerm, recoverUngrounded, type GroundedTerm, type SecondaryProposal } from "./grounding.ts";

// Shapes as returned by GET https://ontology.jax.org/api/hp/search (2026-10-24).
const ROWS: Record<string, Array<{ id: string; name: string; synonyms: string[] }>> = {
  "pseudohypertrophy of the calves": [
    { id: "HP:0003707", name: "Calf muscle pseudohypertrophy", synonyms: ["Pseudohypertrophy of the calves"] },
  ],
  "hypertrophy of the calf muscles": [
    { id: "HP:0008981", name: "Calf muscle hypertrophy", synonyms: [] },
    { id: "HP:0001430", name: "Abnormal calf musculature morphology", synonyms: [] },
  ],
  "big calf muscles": [
    { id: "HP:0008981", name: "Calf muscle hypertrophy", synonyms: [] },
    { id: "HP:0003707", name: "Calf muscle pseudohypertrophy", synonyms: ["Pseudohypertrophy of the calves"] },
  ],
  "frequent falls": [{ id: "HP:0002359", name: "Frequent falls", synonyms: ["Frequent falls"] }],
  "fatigue": [{ id: "HP:0012378", name: "Fatigue", synonyms: ["Tiredness"] }],
};

function stubFetch(calls: string[]) {
  return async (input: string): Promise<Response> => {
    const q = new URL(input).searchParams.get("q") ?? "";
    calls.push(q);
    const terms = ROWS[q.toLowerCase()] ?? [];
    return new Response(JSON.stringify({ terms, totalCount: terms.length }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

const TEXT = "He keeps falling. His calves look very big. He is tired.";

function dropped(phrase: string): string {
  return `Dropped '${phrase}': no matching HPO term confirmed`;
}

function opts(calls: string[], extra: Partial<Parameters<typeof recoverUngrounded>[3]> = {}) {
  return { fetch: stubFetch(calls), deadlineAt: Date.now() + 10_000, ...extra };
}

const CALVES: SecondaryProposal = {
  phrase: "His calves look very big",
  label: "Enlarged calves",
  alternatives: ["Pseudohypertrophy of the calves"],
  negated: false,
  confidence: "high",
};

test("synonym hit on an alternative label is accepted with the HPO primary name and verbatim quote", async () => {
  const calls: string[] = [];
  const r = await recoverUngrounded(TEXT, [CALVES], { terms: [], warnings: [dropped(CALVES.phrase)] }, opts(calls));
  assert.equal(r.terms.length, 1);
  const t = r.terms[0];
  assert.equal(t.hpoId, "HP:0003707");
  assert.equal(t.label, "Calf muscle pseudohypertrophy");
  assert.equal(TEXT.slice(t.start, t.end), t.quote);
  assert.equal(t.quote, CALVES.phrase);
  assert.equal(t.grounding, "label-search");
  assert.equal(t.confidence, "low"); // alternative label: two steps down from high
  assert.deepEqual(r.warnings, []);
  assert.equal(r.stats.recovered, 1);
});

test("word-set equality is accepted ('Hypertrophy of the calf muscles' = 'Calf muscle hypertrophy')", async () => {
  const p = { ...CALVES, label: "Hypertrophy of the calf muscles", alternatives: [] };
  const r = await recoverUngrounded(TEXT, [p], { terms: [], warnings: [dropped(p.phrase)] }, opts([]));
  assert.equal(r.terms[0]?.hpoId, "HP:0008981");
  assert.equal(r.terms[0]?.confidence, "medium"); // main label: one step down
});

test("a label that only resembles a term is rejected (no fuzzy match, no top-result guess)", async () => {
  const p = { ...CALVES, label: "Big calf muscles", alternatives: [] };
  const r = await recoverUngrounded(TEXT, [p], { terms: [], warnings: [dropped(p.phrase)] }, opts([]));
  assert.equal(r.terms.length, 0);
  assert.deepEqual(r.warnings, [dropped(p.phrase)]);
  assert.equal(namesTerm({ name: "Calf muscle hypertrophy", synonyms: [] }, "Calf muscle hypertrophies"), true);
  assert.equal(namesTerm({ name: "Calf muscle hypertrophy", synonyms: [] }, "Calf muscle hypertroph"), false);
  assert.equal(namesTerm({ name: "Calf muscle hypertrophy", synonyms: [] }, "Calf hypertrophy"), false);
});

test("a phrase that is not verbatim in the note is rejected", async () => {
  const p = { ...CALVES, phrase: "his calves are huge" };
  const r = await recoverUngrounded(TEXT, [p], { terms: [], warnings: [dropped(p.phrase)] }, opts([]));
  assert.equal(r.terms.length, 0);
  assert.deepEqual(r.warnings, [`Dropped '${p.phrase}': phrase not found in the text`]);
});

test("a term already grounded by the engine is not added again", async () => {
  const existing: GroundedTerm = {
    hpoId: "HP:0003707",
    label: "Calf muscle pseudohypertrophy",
    quote: "calves",
    start: 22,
    end: 28,
    negated: false,
    confidence: "high",
    grounding: "label-search",
  };
  const r = await recoverUngrounded(TEXT, [CALVES], { terms: [existing], warnings: [dropped(CALVES.phrase)] }, opts([]));
  assert.equal(r.terms.length, 1);
  assert.match(r.warnings[0], /duplicate of HP:0003707/);
});

test("labels are tried in order and the first accepted one wins; proposals the engine kept are not retried", async () => {
  const calls: string[] = [];
  const p: SecondaryProposal = {
    phrase: "keeps falling",
    label: "Falling a lot",
    alternatives: ["Frequent falls", "Fatigue"],
    negated: false,
    confidence: "high",
  };
  const kept: SecondaryProposal = { phrase: "He is tired", label: "Fatigue", negated: false, confidence: "high" };
  const r = await recoverUngrounded(TEXT, [p, kept], { terms: [], warnings: [dropped(p.phrase)] }, opts(calls));
  assert.deepEqual(calls, ["Falling a lot", "Frequent falls"]);
  assert.equal(r.terms[0]?.hpoId, "HP:0002359");
  assert.equal(r.stats.retried, 1);
});

test("the lookup cap is respected", async () => {
  const calls: string[] = [];
  const p = { ...CALVES, label: "Nothing one", alternatives: ["Nothing two", "Nothing three", "Nothing four"] };
  const r = await recoverUngrounded(TEXT, [p], { terms: [], warnings: [dropped(p.phrase)] }, opts(calls, { maxLookups: 2 }));
  assert.equal(calls.length, 2);
  assert.equal(r.stats.skippedByBudget, 2);
});
