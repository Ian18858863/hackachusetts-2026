// T08: fast-check properties for contract section 11 items that had no
// generated-input test yet: P7, P8, P10, P11, P12. (P1-P6 and P9 are in
// ground/rank/questions tests; P14 is checked exhaustively over the five
// bundled demo cases in demo.test.ts; P13 needs buildBrief, still a placeholder.)
//
// No network: every upstream is an injected mock. All disease data is
// synthetic (ids in the 9xxxxxx range). Fixed seed for reproducibility.

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { normalizeFrequency } from "../hpo";
import { overlapLabel, rankCandidates } from "../rank";
import { toPhenopacket } from "../brief";
import type { CaseObject, CaseTerm, FetchLike, FrequencyLabel, OverlapLabel } from "../types";

const SEED = 20261024;
const ORDER: Record<OverlapLabel, number> = { weak: 0, partial: 1, strong: 2 };
const term = (n: number) => `HP:98${String(n).padStart(5, "0")}`;

// ------------------------------------------------------------------ P8

describe("P8 overlapLabel is monotone", () => {
  const counts = fc.record({
    m1: fc.nat({ max: 60 }),
    m2: fc.nat({ max: 60 }),
    observed: fc.nat({ max: 60 }),
    c1: fc.nat({ max: 10 }),
    c2: fc.nat({ max: 10 }),
  });

  it("non-decreasing in matchedCount, non-increasing in contradictedCount", () => {
    fc.assert(
      fc.property(counts, ({ m1, m2, observed, c1, c2 }) => {
        const [mLo, mHi] = m1 <= m2 ? [m1, m2] : [m2, m1];
        const [cLo, cHi] = c1 <= c2 ? [c1, c2] : [c2, c1];
        expect(ORDER[overlapLabel(mLo, observed, cLo)]).toBeLessThanOrEqual(ORDER[overlapLabel(mHi, observed, cLo)]);
        expect(ORDER[overlapLabel(mLo, observed, cLo)]).toBeGreaterThanOrEqual(ORDER[overlapLabel(mLo, observed, cHi)]);
      }),
      { numRuns: 2000, seed: SEED },
    );
  });
});

// ------------------------------------------------------------------ P7

/**
 * A generated Monarch + JAX world: 1-4 synthetic diseases (ORPHA ids), each
 * matching a random subset of the patient's observed terms exactly and
 * annotating random features with random frequency bands.
 */
const BANDS = ["Obligate", "Very frequent", "Frequent", "Occasional", "Very rare", "Excluded", ""] as const;
const FREQUENT = new Set(["Obligate", "Very frequent", "Frequent"]);

const p7Arb = fc
  .record({
    nObserved: fc.integer({ min: 1, max: 6 }),
    diseases: fc.array(
      fc.record({
        score: fc.integer({ min: 1, max: 50 }),
        matchMask: fc.array(fc.boolean(), { minLength: 6, maxLength: 6 }),
        annotations: fc.array(fc.tuple(fc.integer({ min: 0, max: 14 }), fc.constantFrom(...BANDS)), { maxLength: 10 }),
      }),
      { minLength: 1, maxLength: 4 },
    ),
    baseExcluded: fc.uniqueArray(fc.integer({ min: 6, max: 14 }), { maxLength: 3 }),
    pickDisease: fc.nat(),
    pickFeature: fc.nat(),
  })
  .map((g) => {
    const observed = Array.from({ length: g.nObserved }, (_, i) => term(i));
    const diseases = g.diseases.map((d, i) => {
      const seen = new Set<string>();
      return {
        orpha: `ORPHA:${9100001 + i}`,
        mondo: `MONDO:${9100001 + i}`,
        score: d.score + i / 100, // distinct scores: the property is about labels, not tie order
        matches: observed.filter((_, k) => d.matchMask[k]),
        rows: d.annotations
          .map(([t, freq]) => ({ id: term(t), freq }))
          .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))),
      };
    });
    return { observed, diseases, baseExcluded: g.baseExcluded.map(term), pickDisease: g.pickDisease, pickFeature: g.pickFeature };
  });

type P7World = typeof p7Arb extends fc.Arbitrary<infer T> ? T : never;

function p7Fetch(w: P7World): FetchLike {
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
  return async (input) => {
    const url = new URL(input);
    if (url.hostname === "api.monarchinitiative.org") {
      const ids = decodeURIComponent(url.pathname.split("/")[5] ?? "").split(",");
      return json(
        w.diseases.map((d) => ({
          subject: { id: d.mondo, name: `synthetic ${d.orpha}`, xref: [d.orpha.replace("ORPHA:", "Orphanet:")], deprecated: false },
          score: d.score,
          similarity: {
            object_termset: Object.fromEntries(ids.map((id) => [id, { id, label: `label ${id}` }])),
            object_best_matches: Object.fromEntries(
              d.matches.filter((m) => ids.includes(m)).map((m) => [m, { match_source: m, match_target: m, match_subsumer: m, match_source_label: m, match_target_label: m, match_subsumer_label: m }]),
            ),
          },
        })),
      );
    }
    if (url.hostname === "ontology.jax.org") {
      const id = decodeURIComponent(url.pathname.split("/").pop() ?? "");
      const d = w.diseases.find((x) => x.orpha === id);
      if (!d) return json({ message: "not found" }, 404);
      return json({ disease: { id, name: `synthetic ${id}` }, categories: { Limbs: d.rows.map((r) => ({ id: r.id, name: `label ${r.id}`, metadata: { frequency: r.freq } })) }, genes: [] });
    }
    return json({}, 404); // Orphadata: no record (the name check is optional)
  };
}

describe("P7 excluding a frequent feature never improves that disease's overlap label", () => {
  it("rankCandidates + overlapLabel, generated diseases and annotations", async () => {
    let checked = 0;
    await fc.assert(
      fc.asyncProperty(p7Arb, async (w) => {
        // the feature to add: one the picked disease annotates as Obligate / Very frequent / Frequent
        const d = w.diseases[w.pickDisease % w.diseases.length]!;
        const frequent = d.rows.filter((r) => FREQUENT.has(r.freq) && !w.observed.includes(r.id) && !w.baseExcluded.includes(r.id));
        if (frequent.length === 0) return; // no such feature in this world: P7 says nothing
        const f = frequent[w.pickFeature % frequent.length]!.id;
        const deps = { fetch: p7Fetch(w), now: () => new Date("2026-10-24T20:00:00.000Z") };
        const before = await rankCandidates({ observed: w.observed, excluded: w.baseExcluded, limit: 10 }, deps);
        const after = await rankCandidates({ observed: w.observed, excluded: [...w.baseExcluded, f], limit: 10 }, deps);
        const b = before.candidates.find((c) => c.diseaseId === d.orpha);
        const a = after.candidates.find((c) => c.diseaseId === d.orpha);
        expect(a).toBeDefined(); // excluding a term never removes a candidate (Monarch ignores excluded terms)
        expect(b).toBeDefined();
        expect(ORDER[a!.overlap]).toBeLessThanOrEqual(ORDER[b!.overlap]);
        expect(a!.contradicted.map((x) => x.term.id)).toContain(f); // and the contradiction is shown
        checked++;
      }),
      { numRuns: 300, seed: SEED },
    );
    expect(checked).toBeGreaterThan(50); // the generator really exercises the property
  });
});

// ----------------------------------------------------------- P10 and P11

const caseTermArb = (id: string): fc.Arbitrary<CaseTerm> =>
  fc.record(
    {
      hpoId: fc.constant(id),
      label: fc.string({ minLength: 1, maxLength: 20 }),
      status: fc.constantFrom("observed", "excluded", "removed" as const),
      provenance: fc.constantFrom("llm", "manual", "demo" as const),
      quote: fc.string({ maxLength: 30 }),
      updatedAt: fc.constant("2026-10-24T16:00:00.000Z"),
    },
    { requiredKeys: ["hpoId", "label", "status", "provenance", "updatedAt"] },
  );

/** Case objects as the app stores them: one entry per HPO id, any status mix, demo or not. */
const caseArb: fc.Arbitrary<CaseObject> = fc
  .record({
    ids: fc.uniqueArray(fc.integer({ min: 0, max: 99_999 }), { maxLength: 25 }),
    demo: fc.option(fc.record({ caseId: fc.constantFrom("demo-npc1", "demo-dmd", "demo-x"), sourcePhenopacketId: fc.stringMatching(/^[A-Za-z0-9_]{1,30}$/) }), { nil: null }),
  })
  .chain(({ ids, demo }) =>
    fc.tuple(...ids.map((n) => caseTermArb(term(n)))).map((terms) => ({
      version: "0.1" as const,
      caseId: "00000000-0000-4000-8000-000000000000",
      demo: demo ? { ...demo, label: "Demo case" } : null,
      notes: "free text that must never be exported",
      terms,
      lastRanking: null,
      questions: [],
      selectedCandidateId: null,
      createdAt: "2026-10-24T16:00:00.000Z",
      updatedAt: "2026-10-24T16:00:00.000Z",
    })),
  );

const createdArb = fc.date({ min: new Date("2000-01-01T00:00:00Z"), max: new Date("2099-12-31T23:59:59Z"), noInvalidDate: true }).map((d) => d.toISOString());
const versionArb = fc.oneof(fc.constant("2026-09-01"), fc.constant("unknown"), fc.stringMatching(/^\d{4}-\d{2}-\d{2}$/));

describe("P10 phenopacket required fields", () => {
  it("id, subject.id, metaData.created/createdBy, an hp resource with version, schema 2.0", () => {
    fc.assert(
      fc.property(caseArb, createdArb, versionArb, (c, created, hpoVersion) => {
        const p = toPhenopacket(c, { created, hpoVersion });
        expect(typeof p.id).toBe("string");
        expect(p.id.length).toBeGreaterThan(0);
        expect(p.subject.id.length).toBeGreaterThan(0);
        expect(p.metaData.created).toBe(created);
        expect(p.metaData.createdBy).toBe("Rare Disease Detective v0.1");
        const hp = p.metaData.resources.filter((r) => r.id === "hp");
        expect(hp).toHaveLength(1);
        expect(hp[0]!.version).toBe(hpoVersion);
        expect(p.metaData.phenopacketSchemaVersion).toBe("2.0");
        // never a diagnosis, never the free-text notes
        expect(p).not.toHaveProperty("diseases");
        expect(p).not.toHaveProperty("interpretations");
        expect(JSON.stringify(p)).not.toContain("must never be exported");
      }),
      { numRuns: 500, seed: SEED },
    );
  });
});

describe("P11 phenopacket round trip", () => {
  it("(id, excluded) pairs equal the case's observed and excluded terms; removed terms never appear", () => {
    fc.assert(
      fc.property(caseArb, createdArb, (c, created) => {
        const p = toPhenopacket(c, { created, hpoVersion: "2026-09-01" });
        const got = p.phenotypicFeatures.map((f) => `${f.type.id}|${f.excluded === true}`).sort();
        const want = c.terms.filter((t) => t.status !== "removed").map((t) => `${t.hpoId}|${t.status === "excluded"}`).sort();
        expect(got).toEqual(want);
        const removed = new Set(c.terms.filter((t) => t.status === "removed").map((t) => t.hpoId));
        for (const f of p.phenotypicFeatures) {
          expect(removed.has(f.type.id)).toBe(false);
          const t = c.terms.find((x) => x.hpoId === f.type.id)!;
          expect(f.type.label).toBe(t.label);
        }
      }),
      { numRuns: 500, seed: SEED },
    );
  });
});

// ------------------------------------------------------------------ P12

/**
 * Contract section 5 bands as an independent oracle, in exact integer math:
 * Obligate 100 %, Very frequent 80-99 %, Frequent 30-79 %, Occasional 5-29 %,
 * Very rare 1-4 %, Excluded 0 %. Only percentages inside one of these ranges
 * are pinned to a band; values in the gaps between them (e.g. 79.5 %, 0.5 %)
 * are not defined by section 5 and are only required to be one of the two
 * neighbouring bands.
 */
const SECTION5: Array<{ band: FrequencyLabel; lo: number; hi: number }> = [
  { band: "Excluded", lo: 0, hi: 0 },
  { band: "Very rare", lo: 1, hi: 4 },
  { band: "Occasional", lo: 5, hi: 29 },
  { band: "Frequent", lo: 30, hi: 79 },
  { band: "Very frequent", lo: 80, hi: 99 },
  { band: "Obligate", lo: 100, hi: 100 },
];

/** Allowed bands for n/m: the band whose integer range contains it, else the two neighbours of its gap. */
function allowedForFraction(n: number, m: number): FrequencyLabel[] {
  // p = 100n/m; compare as 100n vs k*m to stay exact
  for (const r of SECTION5) {
    if (100 * n >= r.lo * m && 100 * n <= r.hi * m) return [r.band];
  }
  for (let i = 0; i + 1 < SECTION5.length; i++) {
    const a = SECTION5[i]!;
    const b = SECTION5[i + 1]!;
    if (100 * n > a.hi * m && 100 * n < b.lo * m) return [a.band, b.band];
  }
  return [];
}

describe("P12 normalizeFrequency matches the section 5 bands", () => {
  it('every "n/m" with 0 <= n <= m, m > 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }).chain((m) => fc.tuple(fc.integer({ min: 0, max: m }), fc.constant(m))),
        fc.constantFrom("", " ", "  "),
        ([n, m], pad) => {
          const got = normalizeFrequency(`${pad}${n}${pad}/${pad}${m}${pad}`);
          expect(got).not.toBeNull();
          expect(allowedForFraction(n, m)).toContain(got);
        },
      ),
      { numRuns: 3000, seed: SEED },
    );
  });

  it('every "x%" with 0 <= x <= 100 (up to two decimals)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000 }), (hundredths) => {
        const x = hundredths / 100;
        const text = `${x}%`;
        const got = normalizeFrequency(text);
        expect(got).not.toBeNull();
        expect(allowedForFraction(hundredths, 10_000)).toContain(got);
      }),
      { numRuns: 3000, seed: SEED },
    );
  });

  it("monotone: a larger fraction never maps to a rarer band", () => {
    const rank: Record<FrequencyLabel, number> = { Excluded: 0, "Very rare": 1, Occasional: 2, Frequent: 3, "Very frequent": 4, Obligate: 5 };
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5000 }), fc.nat(), fc.nat(), (m, a, b) => {
        const [lo, hi] = [a % (m + 1), b % (m + 1)].sort((x, y) => x - y) as [number, number];
        expect(rank[normalizeFrequency(`${lo}/${m}`)!]).toBeLessThanOrEqual(rank[normalizeFrequency(`${hi}/${m}`)!]);
      }),
      { numRuns: 2000, seed: SEED },
    );
  });

  it("null for empty, unknown or out-of-range input", () => {
    const bandNames = new Set(["obligate", "very frequent", "frequent", "occasional", "very rare", "excluded"]);
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom("", " ", "\t"),
          fc.string({ maxLength: 12 }).filter((s) => !bandNames.has(s.trim().toLowerCase()) && !/^\s*\d+(\.\d+)?\s*%?\s*$|\d\s*\/\s*\d|^\s*HP:/i.test(s)),
          fc.integer({ min: 1, max: 1000 }).chain((m) => fc.integer({ min: m + 1, max: m + 1000 }).map((n) => `${n}/${m}`)), // n > m
          fc.integer({ min: 0, max: 1000 }).map((n) => `${n}/0`), // m = 0
          fc.integer({ min: 10_001, max: 1_000_000 }).map((h) => `${h / 100}%`), // over 100 %
        ),
        (raw) => {
          expect(normalizeFrequency(raw)).toBeNull();
        },
      ),
      { numRuns: 2000, seed: SEED },
    );
    expect(normalizeFrequency(null)).toBeNull();
    expect(normalizeFrequency(undefined)).toBeNull();
  });
});
