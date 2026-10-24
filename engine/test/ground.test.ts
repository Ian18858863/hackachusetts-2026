import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { InvalidInput, UpstreamError } from "../errors";
import { groundTerms } from "../ground";
import type { TermProposal } from "../types";
import { DB, mockHpo } from "./mockHpo";

const TEXT =
  "He has never had seizures. He has very long, thin fingers. His calves are big. He is often tired. He is often tired after school.";

function p(phrase: string, label: string, extra: Partial<TermProposal> = {}): TermProposal {
  return { phrase, label, negated: false, confidence: "high", ...extra };
}

describe("groundTerms: ids", () => {
  it("resolves a label without an id by HPO name/synonym: Seizures -> HP:0001250 Seizure", async () => {
    const { deps } = mockHpo();
    const r = await groundTerms(TEXT, [p("never had seizures", "Seizures", { negated: true })], deps);
    expect(r.terms).toEqual([
      {
        hpoId: "HP:0001250",
        label: "Seizure",
        quote: "never had seizures",
        start: 7,
        end: 25,
        negated: true,
        confidence: "medium", // label-search lowers confidence one step
        grounding: "label-search",
      },
    ]);
    expect(r.warnings).toEqual([]);
  });

  it("keeps a correct supplied id as exact-id with unchanged confidence", async () => {
    const { deps } = mockHpo();
    const r = await groundTerms(TEXT, [p("very long, thin fingers", "Arachnodactyly", { hpoId: "HP:0001166" })], deps);
    expect(r.terms[0]).toMatchObject({ hpoId: "HP:0001166", grounding: "exact-id", confidence: "high" });
  });

  it("does not let a wrong existing id override the label", async () => {
    const { deps } = mockHpo();
    const r = await groundTerms(TEXT, [p("never had seizures", "Seizure", { hpoId: "HP:0001166" })], deps);
    expect(r.terms).toHaveLength(1);
    expect(r.terms[0]).toMatchObject({ hpoId: "HP:0001250", label: "Seizure", grounding: "label-search" });
    expect(r.warnings.join(" ")).toMatch(/HP:0001166.*does not match/);
  });

  it("falls back to the label when the supplied id does not exist", async () => {
    const { deps } = mockHpo();
    const r = await groundTerms(TEXT, [p("very long, thin fingers", "Arachnodactyly", { hpoId: "HP:9999999" })], deps);
    expect(r.terms[0]).toMatchObject({ hpoId: "HP:0001166", grounding: "label-search" });
    expect(r.warnings.join(" ")).toMatch(/HP:9999999 does not exist/);
  });

  it("treats a malformed id as missing and never echoes it as an HPO id", async () => {
    const { deps } = mockHpo();
    const r = await groundTerms(TEXT, [p("very long, thin fingers", "Arachnodactyly", { hpoId: "HP:12" })], deps);
    expect(r.terms[0]?.hpoId).toBe("HP:0001166");
    expect(r.warnings.join(" ")).toMatch(/not a valid HPO id/);
  });

  it("drops a wrong id whose label is also unknown", async () => {
    const { deps } = mockHpo();
    const r = await groundTerms(TEXT, [p("often tired", "Tired all the time", { hpoId: "HP:0001166" })], deps);
    expect(r.terms).toEqual([]);
    expect(r.warnings).toEqual(["Dropped 'often tired': no matching HPO term confirmed"]);
  });
});

describe("groundTerms: label matching", () => {
  it.each([
    ["arachnodactyly", "HP:0001166"], // case
    ["SEIZURE", "HP:0001250"], // case
    ["seizures", "HP:0001250"], // plural of the primary name
    ["Spider fingers", "HP:0001166"], // synonym
    ["Long slender finger", "HP:0001166"], // singular of a plural synonym
    ["long-slender fingers", "HP:0001166"], // punctuation tolerance
  ])("label %s -> %s", async (label, id) => {
    const { deps } = mockHpo();
    const r = await groundTerms(TEXT, [p("very long, thin fingers", label)], deps);
    expect(r.terms.map((t) => t.hpoId)).toEqual([id]);
  });

  it("returns the HPO primary name, never the LLM wording", async () => {
    const { deps } = mockHpo();
    const r = await groundTerms(TEXT, [p("never had seizures", "epileptic SEIZURE", { hpoId: "HP:0001250" })], deps);
    expect(r.terms[0]).toMatchObject({ label: "Seizure", grounding: "exact-id" });
  });

  it("drops unknown terms instead of taking the top search result", async () => {
    const { deps } = mockHpo();
    const r = await groundTerms(TEXT, [p("never had seizures", "Fits at night time")], deps);
    expect(r.terms).toEqual([]);
    expect(r.warnings).toEqual(["Dropped 'never had seizures': no matching HPO term confirmed"]);
  });

  it("does not match a longer HPO name that merely contains the label", async () => {
    const { deps } = mockHpo();
    // search for "seizures" also returns "Hypocalcemic seizures" first; it must not win
    const r = await groundTerms(TEXT, [p("never had seizures", "Seizures")], deps);
    expect(r.terms[0]?.hpoId).toBe("HP:0001250");
  });
});

describe("groundTerms: offsets and dedupe", () => {
  it("drops a phrase that is not in the text", async () => {
    const { deps } = mockHpo();
    const r = await groundTerms(TEXT, [p("spider-like hands", "Arachnodactyly")], deps);
    expect(r.terms).toEqual([]);
    expect(r.warnings).toEqual(["Dropped 'spider-like hands': phrase not found in the text"]);
  });

  it("locates a phrase case-insensitively but quotes the text itself", async () => {
    const { deps } = mockHpo();
    const r = await groundTerms(TEXT, [p("HIS CALVES ARE BIG", "Calf muscle pseudohypertrophy")], deps);
    const t = r.terms[0];
    expect(t?.quote).toBe("His calves are big");
    expect(t && TEXT.slice(t.start, t.end)).toBe("His calves are big");
  });

  it("uses the next unused occurrence when a phrase repeats", async () => {
    const { deps } = mockHpo();
    const r = await groundTerms(
      TEXT,
      [p("often tired", "Fatigue"), p("often tired", "Tiredness"), p("never had seizures", "Seizure")],
      deps,
    );
    // second proposal maps to the same id (Fatigue) and is dropped as a duplicate
    expect(r.terms.map((t) => [t.hpoId, t.start])).toEqual([
      ["HP:0001250", 7],
      ["HP:0012378", TEXT.indexOf("often tired")],
    ]);
    expect(r.warnings).toEqual(["Dropped 'often tired': duplicate of HP:0012378 Fatigue"]);
  });

  it("keeps the first quote per HPO id and returns terms in order of start", async () => {
    const { deps } = mockHpo();
    const r = await groundTerms(
      TEXT,
      [
        p("very long, thin fingers", "Arachnodactyly", { hpoId: "HP:0001166" }),
        p("never had seizures", "Seizure", { hpoId: "HP:0001250" }),
        p("thin fingers", "Spider fingers"),
      ],
      deps,
    );
    expect(r.terms.map((t) => t.hpoId)).toEqual(["HP:0001250", "HP:0001166"]);
    expect(r.terms[1]?.quote).toBe("very long, thin fingers");
  });

  it("skips malformed proposals with a warning", async () => {
    const { deps } = mockHpo();
    const bad = [{ label: "Seizure" }, null, p("", "Seizure")] as unknown as TermProposal[];
    const r = await groundTerms(TEXT, bad, deps);
    expect(r.terms).toEqual([]);
    expect(r.warnings).toHaveLength(3);
  });
});

describe("groundTerms: inputs, upstream and runtime", () => {
  it("rejects empty and over-long text", async () => {
    const { deps } = mockHpo();
    await expect(groundTerms("", [], deps)).rejects.toBeInstanceOf(InvalidInput);
    await expect(groundTerms("x".repeat(8001), [], deps)).rejects.toBeInstanceOf(InvalidInput);
  });

  it("throws UpstreamError when the HPO API keeps failing (after one retry)", async () => {
    const mock = mockHpo({ status: 500 });
    await expect(groundTerms(TEXT, [p("never had seizures", "Seizure")], mock.deps)).rejects.toBeInstanceOf(
      UpstreamError,
    );
    // R6.3: after the first query form fails, the next form ("seizure") is tried too:
    // 2 query forms x (1 try + 1 retry) = 4 calls. Still an UpstreamError overall.
    expect(mock.calls).toHaveLength(4);
  });

  it("calls fetch without a `this` binding (Workers Illegal invocation guard)", async () => {
    const { deps } = mockHpo({ strictThis: true });
    const r = await groundTerms(TEXT, [p("never had seizures", "Seizure", { hpoId: "HP:0001250" })], deps);
    expect(r.terms).toHaveLength(1);
  });

  it("fetches each id and each search query once per call", async () => {
    const mock = mockHpo();
    await groundTerms(
      TEXT,
      [p("never had seizures", "Seizure", { hpoId: "HP:0001250" }), p("had seizures", "Seizure", { hpoId: "HP:0001250" })],
      mock.deps,
    );
    expect(mock.calls).toHaveLength(1);
  });

  it("reports dataVersions from the injected clock", async () => {
    const { deps } = mockHpo();
    const r = await groundTerms(TEXT, [], deps);
    expect(r.dataVersions).toEqual({ hpo: "2026-09-01", fetchedAt: "2026-10-24T16:30:00.000Z" });
  });
});

describe("groundTerms: properties P1-P3 (contract section 11)", () => {
  const known = new Map(DB.map((t) => [t.id, t.label]));
  const words = TEXT.split(" ");
  const phraseArb = fc
    .tuple(fc.nat({ max: words.length - 1 }), fc.integer({ min: 1, max: 4 }), fc.boolean())
    .map(([i, n, upper]) => {
      const s = words.slice(i, i + n).join(" ");
      return upper ? s.toUpperCase() : s;
    });
  const labelArb = fc.oneof(
    fc.constantFrom(...DB.flatMap((t) => [t.label, ...(t.synonyms ?? [])])),
    fc.string({ maxLength: 20 }),
  );
  const idArb = fc.option(
    fc.oneof(fc.constantFrom(...DB.map((t) => t.id), "HP:9999999", "HP:1", "MONDO:0007947"), fc.string({ maxLength: 12 })),
    { nil: undefined },
  );
  const proposalArb = fc.record({
    phrase: phraseArb,
    label: labelArb,
    hpoId: idArb,
    negated: fc.boolean(),
    confidence: fc.constantFrom("high", "medium", "low" as const),
  });

  it("only HPO-confirmed ids, exact quote offsets, primary names, no duplicate ids", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(proposalArb, { maxLength: 8 }), async (raw) => {
        const proposals = raw.map(({ hpoId, ...rest }) => (hpoId === undefined ? rest : { ...rest, hpoId }));
        const { deps } = mockHpo();
        const r = await groundTerms(TEXT, proposals as TermProposal[], deps);
        const ids = r.terms.map((t) => t.hpoId);
        expect(new Set(ids).size).toBe(ids.length); // P3
        for (const t of r.terms) {
          expect(known.get(t.hpoId)).toBe(t.label); // P1 + P2 label
          expect(t.start).toBeGreaterThanOrEqual(0); // P2 offsets
          expect(t.start).toBeLessThan(t.end);
          expect(t.end).toBeLessThanOrEqual(TEXT.length);
          expect(TEXT.slice(t.start, t.end)).toBe(t.quote);
        }
      }),
      { numRuns: 200, seed: 20261024 },
    );
  });
});
