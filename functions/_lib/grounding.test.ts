// Unit tests for functions/_lib/grounding.ts (T37 secondary grounding).
// Run: node --test --experimental-strip-types functions/_lib/grounding.test.ts
// Uses a stubbed fetch with recorded-shape JAX search rows; no network.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyLexicon,
  engineDropWarning,
  lexiconWarning,
  parseLexicon,
  estimateEngineSubrequests,
  namesTerm,
  recoverUngrounded,
  secondaryLookupCap,
  type GroundedTerm,
  type LexiconEntry,
  type SecondaryProposal,
} from "./grounding.ts";

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
  assert.deepEqual(r.warnings, [
    "Matched 'His calves look very big' to Calf muscle pseudohypertrophy through the alternative label " +
      "'Pseudohypertrophy of the calves'; please check it.",
  ]);
  assert.equal(r.stats.recovered, 1);
  assert.equal(r.stats.viaAlternative, 1);
});

test("word-set equality is accepted ('Hypertrophy of the calf muscles' = 'Calf muscle hypertrophy')", async () => {
  const p = { ...CALVES, label: "Hypertrophy of the calf muscles", alternatives: [] };
  const r = await recoverUngrounded(TEXT, [p], { terms: [], warnings: [dropped(p.phrase)] }, opts([]));
  assert.equal(r.terms[0]?.hpoId, "HP:0008981");
  assert.equal(r.terms[0]?.confidence, "medium"); // main label: one step down
  assert.deepEqual(r.warnings, []); // main-label hit: the drop warning goes, no new warning
  assert.equal(r.stats.viaAlternative, 0);
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

test("engine drop warning text is locked (recovery keys on it)", () => {
  // Exact string from engine/ground.ts groundTerms:
  //   warnings.push(`Dropped '${show(phrase)}': no matching HPO term confirmed`);
  // engine/ground.ts cannot be imported under node --test (extension-less imports),
  // so the text is copied here. If the engine changes it, update both.
  assert.equal(engineDropWarning("He is tired"), "Dropped 'He is tired': no matching HPO term confirmed");
  const long = "x".repeat(70);
  assert.equal(engineDropWarning(long), `Dropped '${"x".repeat(57)}...': no matching HPO term confirmed`);
});

test("secondary lookup cap = min(12, 50 - used - 4), never below 0", () => {
  assert.equal(secondaryLookupCap(5), 12);
  assert.equal(secondaryLookupCap(34), 12);
  assert.equal(secondaryLookupCap(35), 11);
  assert.equal(secondaryLookupCap(40), 6);
  assert.equal(secondaryLookupCap(46), 0);
  assert.equal(secondaryLookupCap(80), 0);
});

test("engine subrequest estimate counts distinct ids and distinct search variants", () => {
  const n = estimateEngineSubrequests([
    { phrase: "a", label: "Seizures", hpoId: "HP:0001250" }, // id + "Seizures", "seizures", "seizure"
    { phrase: "b", label: "Seizures", hpoId: "HP:0001250" }, // all memoised
    { phrase: "c", label: "Fatigue" }, // "Fatigue", "fatigue"
    { phrase: "", label: "Ignored", hpoId: "HP:0000001" }, // engine drops phrase-less proposals
  ]);
  assert.equal(n, 1 + 3 + 2);
});

test("a cap of 0 makes no lookups; failed fetches are counted apart from budget skips", async () => {
  const none: string[] = [];
  const r0 = await recoverUngrounded(TEXT, [CALVES], { terms: [], warnings: [dropped(CALVES.phrase)] }, opts(none, { maxLookups: 0 }));
  assert.equal(none.length, 0);
  assert.equal(r0.stats.skippedByBudget, 2); // main label and one alternative
  assert.equal(r0.stats.failedLookups, 0);

  const failing = async (): Promise<Response> => new Response("err", { status: 503 });
  const p = { ...CALVES, alternatives: [] };
  const r1 = await recoverUngrounded(TEXT, [p], { terms: [], warnings: [dropped(p.phrase)] }, {
    fetch: failing,
    deadlineAt: Date.now() + 10_000,
  });
  assert.equal(r1.stats.lookups, 1);
  assert.equal(r1.stats.failedLookups, 1);
  assert.equal(r1.stats.skippedByBudget, 0);
  assert.deepEqual(r1.warnings, [dropped(p.phrase)]);
});

// ------------------------------------------------------------ lay-language lexicon (T45)

const LEX_TEXT = "Our son is 4. His calves are big and firm. He has never had a fit. He falls a lot.";
// Stub entries; ids and primary names as returned by GET https://ontology.jax.org/api/hp/terms/{id} (2026-10-24).
const STUB_LEXICON: LexiconEntry[] = parseLexicon([
  { phrase: "Calves are big", hpoId: "HP:0003707", label: "Calf muscle pseudohypertrophy", source: "stub" },
  { phrase: "a fit", hpoId: "HP:0001250", label: "Seizure", source: "stub" },
  { phrase: "falls", hpoId: "HP:0002527", label: "Falls", source: "stub" },
]);
const BIG_CALVES: SecondaryProposal = { phrase: "His calves are big and firm", label: "Big calves", negated: false, confidence: "high" };
const NO_FIT: SecondaryProposal = { phrase: "never had a fit", label: "Fits", negated: true, confidence: "high" };

test("lexicon: a phrase inside a verbatim quote adds the term with a low confidence and a warning", () => {
  const r = applyLexicon(LEX_TEXT, [BIG_CALVES], { terms: [], warnings: [dropped(BIG_CALVES.phrase)] }, STUB_LEXICON);
  assert.equal(r.terms.length, 1);
  const t = r.terms[0];
  assert.equal(t.hpoId, "HP:0003707");
  assert.equal(t.label, "Calf muscle pseudohypertrophy");
  assert.equal(t.quote, BIG_CALVES.phrase);
  assert.equal(LEX_TEXT.slice(t.start, t.end), t.quote);
  assert.equal(t.negated, false);
  assert.equal(t.confidence, "low");
  assert.equal(t.grounding, "label-search");
  assert.deepEqual(r.warnings, [
    "Matched 'His calves are big and firm' to Calf muscle pseudohypertrophy through the lay-language lexicon; please check it.",
  ]);
  assert.equal(r.warnings[0], lexiconWarning(t.quote, t.label));
  assert.deepEqual(r.stats, { checked: 1, added: 1 });
});

test("lexicon: a phrase that is in no quote adds nothing (no fuzzy match, no note-wide search)", () => {
  // "falls" occurs in the note, but no unconfirmed proposal quotes it.
  const p: SecondaryProposal = { phrase: "His calves are big and firm", label: "x", negated: false, confidence: "high" };
  const lex = parseLexicon([
    { phrase: "falls", hpoId: "HP:0002527", label: "Falls", source: "stub" },
    { phrase: "calf big", hpoId: "HP:0003707", label: "Calf muscle pseudohypertrophy", source: "stub" },
    { phrase: "calves are bigger", hpoId: "HP:0008981", label: "Calf muscle hypertrophy", source: "stub" },
  ]);
  const primary = { terms: [], warnings: [dropped(p.phrase)] };
  const r = applyLexicon(LEX_TEXT, [p], primary, lex);
  assert.equal(r.terms.length, 0);
  assert.deepEqual(r.warnings, [dropped(p.phrase)]);
  assert.equal(r.terms, primary.terms);
  // A proposal whose phrase is not verbatim in the note is never used.
  const missing: SecondaryProposal = { ...p, phrase: "he falls over" };
  const r2 = applyLexicon(LEX_TEXT, [missing], { terms: [], warnings: [dropped(missing.phrase)] }, STUB_LEXICON);
  assert.equal(r2.terms.length, 0);
  // A proposal the engine grounded (no drop warning) is not re-used.
  const r3 = applyLexicon(LEX_TEXT, [BIG_CALVES], { terms: [], warnings: [] }, STUB_LEXICON);
  assert.equal(r3.terms.length, 0);
});

test("lexicon: an id already present is not added again", () => {
  const existing: GroundedTerm = {
    hpoId: "HP:0003707",
    label: "Calf muscle pseudohypertrophy",
    quote: "calves",
    start: 18,
    end: 24,
    negated: false,
    confidence: "high",
    grounding: "exact-id",
  };
  const r = applyLexicon(LEX_TEXT, [BIG_CALVES], { terms: [existing], warnings: [dropped(BIG_CALVES.phrase)] }, STUB_LEXICON);
  assert.deepEqual(r.terms, [existing]);
  assert.deepEqual(r.warnings, [dropped(BIG_CALVES.phrase)]);
  assert.equal(r.stats.added, 0);
});

test("lexicon: at most one term per quote, longest phrase first", () => {
  const lex = parseLexicon([
    { phrase: "calves", hpoId: "HP:0001430", label: "Abnormal calf musculature morphology", source: "stub" },
    { phrase: "calves are big and firm", hpoId: "HP:0003707", label: "Calf muscle pseudohypertrophy", source: "stub" },
  ]);
  const r = applyLexicon(LEX_TEXT, [BIG_CALVES], { terms: [], warnings: [dropped(BIG_CALVES.phrase)] }, lex);
  assert.deepEqual(r.terms.map((t) => t.hpoId), ["HP:0003707"]);
});

test("lexicon: empty lexicon gives output identical to the path without it", async () => {
  const proposals = [CALVES, { ...CALVES, phrase: "He is tired", label: "Fatigue", alternatives: [] }];
  const primary = { terms: [], warnings: [dropped(CALVES.phrase), dropped("He is tired")] };
  const old = await recoverUngrounded(TEXT, proposals, primary, opts([]));
  const withEmpty = applyLexicon(TEXT, proposals, old, []);
  assert.equal(withEmpty.terms, old.terms);
  assert.equal(withEmpty.warnings, old.warnings);
  assert.equal(JSON.stringify({ terms: withEmpty.terms, warnings: withEmpty.warnings }), JSON.stringify({ terms: old.terms, warnings: old.warnings }));
  assert.deepEqual(parseLexicon([]), []);
  assert.deepEqual(parseLexicon("not an array"), []);
});

test("lexicon: a negated proposal gives a negated term", () => {
  const r = applyLexicon(LEX_TEXT, [NO_FIT], { terms: [], warnings: [dropped(NO_FIT.phrase)] }, STUB_LEXICON);
  assert.equal(r.terms.length, 1);
  assert.equal(r.terms[0].hpoId, "HP:0001250");
  assert.equal(r.terms[0].label, "Seizure");
  assert.equal(r.terms[0].quote, "never had a fit");
  assert.equal(r.terms[0].negated, true);
});

test("lexicon: malformed entries are ignored and duplicates removed", () => {
  const lex = parseLexicon([
    { phrase: "  ", hpoId: "HP:0001250", label: "Seizure", source: "s" },
    { phrase: "a fit", hpoId: "HP:12", label: "Seizure", source: "s" },
    { phrase: "a fit", hpoId: "HP:0001250", label: "", source: "s" },
    { phrase: "A fit!", hpoId: "HP:0001250", label: "Seizure", source: "s" },
    { phrase: "a  fit", hpoId: "HP:0001250", label: "Seizure", source: "s2" },
    null,
  ]);
  assert.deepEqual(lex, [{ phrase: "A fit!", hpoId: "HP:0001250", label: "Seizure", source: "s" }]);
});
