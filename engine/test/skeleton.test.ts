import { describe, expect, it } from "vitest";
import * as engine from "../index";
import type { CaseObject, EngineDeps } from "../types";

// Every function name in CONTRACT.md section 6.
const SECTION_6 = [
  "groundTerms",
  "searchTerms",
  "rankCandidates",
  "nextQuestions",
  "searchTrials",
  "buildBrief",
  "toPhenopacket",
  "overlapLabel",
  "normalizeFrequency",
  "specialistsFor",
  "listDemoCases",
  "getDemoCase",
  "demoRankKey",
  "getDemoRanking",
  "getDemoQuestions",
  "getDemoTrials",
] as const;

const deps: EngineDeps = {
  fetch: async () => {
    throw new Error("placeholders must not touch the network");
  },
};

describe("HPO_VERSION", () => {
  it("is exported as the verified release 2026-09-01", () => {
    expect(engine.HPO_VERSION).toBe("2026-09-01");
  });
});

describe("engine/index.ts exports", () => {
  it("exports every section 6 function", () => {
    for (const name of SECTION_6) expect(typeof engine[name], name).toBe("function");
    expect(Object.keys(engine.ENGINE_STATUS).sort()).toEqual([...SECTION_6].sort());
  });

  it("placeholders throw NotImplementedError instead of returning analysis", async () => {
    await expect(engine.searchTrials({ condition: "Marfan syndrome" }, deps)).rejects.toBeInstanceOf(
      engine.NotImplementedError,
    );
    expect(() => engine.specialistsFor(["Eye"])).toThrow(engine.NotImplementedError);
  });
});

describe("overlapLabel", () => {
  it.each([
    [6, 10, 0, "strong"],
    [5, 10, 0, "partial"],
    [3, 10, 0, "partial"],
    [2, 10, 0, "weak"],
    [6, 10, 1, "partial"],
    [6, 10, 2, "weak"],
    [6, 10, 9, "weak"],
    [3, 0, 0, "weak"],
    [12, 10, 0, "strong"],
    [Number.NaN, 10, 0, "weak"],
  ] as const)("matched %d / observed %d, contradicted %d -> %s", (m, o, c, want) => {
    expect(engine.overlapLabel(m, o, c)).toBe(want);
  });
});

describe("normalizeFrequency", () => {
  it.each([
    ["Very frequent", "Very frequent"],
    ["very FREQUENT", "Very frequent"],
    ["HP:0040283", "Occasional"],
    ["112/140", "Very frequent"], // 80 %
    ["111/140", "Frequent"], // 79.3 %
    ["7/7", "Obligate"],
    ["0/5", "Excluded"],
    ["1/100", "Very rare"],
    ["1/1000", "Very rare"],
    ["29/100", "Occasional"],
    ["30%", "Frequent"],
    ["4.5%", "Very rare"],
    ["100%", "Obligate"],
    ["0%", "Excluded"],
    ["", null],
    ["  ", null],
    ["6/5", null],
    ["3/0", null],
    ["101%", null],
    ["often", null],
  ] as const)("%j -> %j", (raw, want) => {
    expect(engine.normalizeFrequency(raw)).toBe(want);
  });

  it("null and undefined -> null", () => {
    expect(engine.normalizeFrequency(null)).toBeNull();
    expect(engine.normalizeFrequency(undefined)).toBeNull();
  });
});

describe("toPhenopacket", () => {
  const base: CaseObject = {
    version: "0.1",
    caseId: "00000000-0000-4000-8000-000000000000",
    demo: { caseId: "demo-marfan", sourcePhenopacketId: "PMID_10756346_Patient_B55", label: "Demo case" },
    notes: "not exported",
    terms: [
      { hpoId: "HP:0001166", label: "Arachnodactyly", status: "observed", provenance: "demo", quote: "very long, thin fingers", updatedAt: "2026-10-24T16:00:00.000Z" },
      { hpoId: "HP:0002107", label: "Pneumothorax", status: "excluded", provenance: "demo", quote: "never had a collapsed lung", updatedAt: "2026-10-24T16:00:00.000Z" },
      { hpoId: "HP:0000218", label: "High palate", status: "removed", provenance: "demo", updatedAt: "2026-10-24T16:00:00.000Z" },
    ],
    lastRanking: null,
    questions: [],
    selectedCandidateId: null,
    createdAt: "2026-10-24T16:00:00.000Z",
    updatedAt: "2026-10-24T16:00:00.000Z",
  };

  it("matches the contract 7.7 demo example", () => {
    const pp = engine.toPhenopacket(base, { created: "2026-10-24T16:10:00.000Z", hpoVersion: "2025-11-24" });
    expect(pp).toEqual({
      id: "rdd-demo-marfan-20261024T161000Z",
      subject: { id: "DEMO-synthetic-demo-marfan", sex: "UNKNOWN_SEX" },
      phenotypicFeatures: [
        { type: { id: "HP:0001166", label: "Arachnodactyly" }, description: "very long, thin fingers" },
        { type: { id: "HP:0002107", label: "Pneumothorax" }, excluded: true, description: "never had a collapsed lung" },
      ],
      metaData: {
        created: "2026-10-24T16:10:00.000Z",
        createdBy: "Rare Disease Detective v0.1",
        resources: [
          { id: "hp", name: "human phenotype ontology", url: "http://purl.obolibrary.org/obo/hp.owl", version: "2025-11-24", namespacePrefix: "HP", iriPrefix: "http://purl.obolibrary.org/obo/HP_" },
        ],
        phenopacketSchemaVersion: "2.0",
        externalReferences: [
          { id: "phenopacket-store:PMID_10756346_Patient_B55", description: "DEMO DATA. Synthetic narrative derived from a phenopacket-store case (BSD-3). Not a real patient." },
        ],
      },
    });
  });

  it("non-demo cases use rdd-subject-1, no external references, and no notes", () => {
    const pp = engine.toPhenopacket({ ...base, demo: null }, { created: "2026-10-24T16:10:00.000Z", hpoVersion: "unknown" });
    expect(pp.subject.id).toBe("rdd-subject-1");
    expect(pp.metaData.externalReferences).toBeUndefined();
    expect(JSON.stringify(pp)).not.toContain("not exported");
    expect(pp).not.toHaveProperty("diseases");
    expect(pp).not.toHaveProperty("interpretations");
  });
});
