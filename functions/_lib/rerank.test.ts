// Unit tests and invariant checks for functions/_lib/rerank.ts.
// Run: node --test --experimental-strip-types functions/_lib/rerank.test.ts
// Fixtures are small hand-made objects, not real disease data.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rerank,
  frequencyBand,
  annotationMapFromJax,
  EPSILON,
  type MonarchResult,
  type RerankInput,
} from "./rerank.ts";

const ORGAN = ["HP:0000478"]; // stands in for one direct child of HP:0000118

function result(id: string, score: number, matches: Record<string, [string, string, number]>): MonarchResult {
  const obm: NonNullable<NonNullable<MonarchResult["similarity"]>["object_best_matches"]> = {};
  for (const [src, [target, subsumer, jac]] of Object.entries(matches)) {
    obm[src] = { match_source: src, match_target: target, match_subsumer: subsumer, similarity: { jaccard_similarity: jac } };
  }
  return { score, subject: { id, name: id.replace("MONDO:", "Disease "), xref: [] }, similarity: { object_best_matches: obm } };
}

// Disease A: has T1 (Very frequent) and T2 (Frequent) exactly.
// Disease B: higher Monarch score, only ancestor matches and a hallmark H1 never mentioned.
// Disease C: no annotations → unscored.
function baseInput(): RerankInput {
  const results = [
    result("MONDO:0000002", 12, { "HP:0000011": ["HP:0000099", "HP:0000050", 0.5], "HP:0000012": ["HP:0000098", "HP:0000478", 0.3] }),
    result("MONDO:0000001", 10, { "HP:0000011": ["HP:0000011", "HP:0000011", 1], "HP:0000012": ["HP:0000012", "HP:0000012", 1] }),
    result("MONDO:0000003", 9, {}),
  ];
  const annotations = new Map([
    ["MONDO:0000001", new Map<string, number | null>([["HP:0000011", 0.895], ["HP:0000012", 0.545], ["HP:0000020", 0.17]])],
    ["MONDO:0000002", new Map<string, number | null>([["HP:0000099", null], ["HP:0000098", 0.545], ["HP:0000030", 1.0], ["HP:0000020", 0.895]])],
  ]);
  return { results, annotations, observed: ["HP:0000011", "HP:0000012"], excluded: [], organSystemIds: ORGAN };
}

const scoreOf = (out: ReturnType<typeof rerank>, id: string): number => out.find((c) => c.mondoId === id)!.total!;

test("frequencyBand maps names, fractions and percentages to HPO bands", () => {
  assert.equal(frequencyBand("Very frequent"), "Very frequent");
  assert.equal(frequencyBand("112/140"), "Very frequent");
  assert.equal(frequencyBand("1/1"), "Obligate");
  assert.equal(frequencyBand("3/10"), "Frequent");
  assert.equal(frequencyBand("0/5"), "Excluded");
  assert.equal(frequencyBand("4%"), "Very rare");
  assert.equal(frequencyBand(""), null);
  assert.equal(frequencyBand("sometimes"), null);
  assert.equal(frequencyBand("5/3"), null);
});

test("annotationMapFromJax keeps the highest midpoint per term and ignores bad ids", () => {
  const m = annotationMapFromJax({
    categories: {
      Eye: [{ id: "HP:0000001", metadata: { frequency: "Occasional" } }, { id: "bad", metadata: { frequency: "Obligate" } }],
      Limbs: [{ id: "HP:0000001", metadata: { frequency: "Very frequent" } }, { id: "HP:0000002", metadata: { frequency: "" } }],
    },
  });
  assert.equal(m.get("HP:0000001"), 0.895);
  assert.equal(m.get("HP:0000002"), null);
  assert.equal(m.has("bad"), false);
});

test("exact frequent matches outrank a higher semsim score built on weak ancestor matches", () => {
  const out = rerank(baseInput());
  assert.deepEqual(out.map((c) => c.mondoId), ["MONDO:0000001", "MONDO:0000002", "MONDO:0000003"]);
  assert.deepEqual(out.map((c) => c.rank), [1, 2, 3]);
  const b = out[1];
  // HP:0000012's subsumer is an organ-system term, so it gets no credit.
  assert.equal(b.observed.find((o) => o.hpoId === "HP:0000012")!.via, "none");
  assert.equal(b.observed.find((o) => o.hpoId === "HP:0000011")!.via, "ancestor");
  // Hallmarks never mentioned are penalised (HP:0000030 Obligate, HP:0000020 Very frequent).
  assert.deepEqual(b.missing.map((m) => m.hpoId).sort(), ["HP:0000020", "HP:0000030"]);
  assert.equal(out[2].scored, false);
  assert.equal(out[2].total, null);
});

test("deterministic and independent of input order and duplicates", () => {
  const a = rerank(baseInput());
  const shuffled = baseInput();
  shuffled.observed = ["HP:0000012", "HP:0000011", "HP:0000012"];
  shuffled.results = [shuffled.results[2], shuffled.results[0], shuffled.results[1]];
  // Monarch rank is an input fact; compare everything except it.
  const strip = (xs: ReturnType<typeof rerank>) => xs.filter((c) => c.scored).map(({ monarchRank, ...rest }) => rest);
  assert.deepEqual(strip(rerank(shuffled)), strip(a));
  assert.deepEqual(rerank(baseInput()), a);
});

test("excluding a feature the disease has as Very frequent never raises its score (pool background below its frequency)", () => {
  const before = baseInput();
  const after = baseInput();
  after.excluded = ["HP:0000020"]; // Very frequent in MONDO:0000002, Occasional in MONDO:0000001
  const s0 = scoreOf(rerank(before), "MONDO:0000002");
  const s1 = scoreOf(rerank(after), "MONDO:0000002");
  assert.ok(s1 <= s0, `${s1} > ${s0}`);
  // The exclusion also moves it down relative to the disease that rarely has the feature.
  const gap0 = scoreOf(rerank(before), "MONDO:0000001") - s0;
  const gap1 = scoreOf(rerank(after), "MONDO:0000001") - s1;
  assert.ok(gap1 >= gap0);
});

test("an excluded Obligate feature is floored, not -Infinity", () => {
  const inp = baseInput();
  inp.excluded = ["HP:0000030"];
  const c = rerank(inp).find((x) => x.mondoId === "MONDO:0000002")!;
  const e = c.excluded[0];
  assert.equal(e.q, 1);
  assert.ok(Number.isFinite(e.log10LR));
  assert.ok(Math.abs(e.log10LR - Math.log10(EPSILON / (1 - 0.5))) < 1e-12);
});

test("all scores and components are finite, also with no matches at all", () => {
  const inp = baseInput();
  inp.observed = ["HP:0009999"];
  inp.excluded = ["HP:0000011", "HP:0000030"];
  for (const c of rerank(inp).filter((x) => x.scored)) {
    assert.ok(Number.isFinite(c.total!));
    for (const o of c.observed) assert.ok(Number.isFinite(o.log10LR));
    for (const e of c.excluded) assert.ok(Number.isFinite(e.log10LR));
    for (const m of c.missing) assert.ok(Number.isFinite(m.log10Factor) && m.log10Factor <= 0);
  }
});

test("missing-feature penalty is capped at 3 features", () => {
  const inp = baseInput();
  const ann = new Map(inp.annotations);
  const big = new Map(ann.get("MONDO:0000001")!);
  for (let i = 40; i < 50; i++) big.set(`HP:00000${i}`, 1.0);
  ann.set("MONDO:0000001", big);
  inp.annotations = ann;
  const c = rerank(inp).find((x) => x.mondoId === "MONDO:0000001")!;
  assert.equal(c.missing.length, 3);
});
