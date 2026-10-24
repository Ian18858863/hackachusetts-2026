import { describe, expect, it } from "vitest";
import { demoRankKey, getDemoCase, getDemoQuestions, getDemoRanking, getDemoTrials, listDemoCases } from "../demo/index";
import { DEMO_CASES, DEMO_SOURCES } from "../demo/cases";
import { demoLabel } from "../text";

// Observed and excluded ids of the source phenopackets, read from
// raw.githubusercontent.com/monarch-initiative/phenopacket-store/main on 2026-10-24.
const SOURCE_OBSERVED: Record<string, string[]> = {
  "demo-dmd": ["HP:0001270", "HP:0002380", "HP:0003391", "HP:0003551", "HP:0003707", "HP:0003750", "HP:0012378", "HP:0025435", "HP:0030235", "HP:0031956", "HP:0031964", "HP:0040129"],
  "demo-marfan": ["HP:0000218", "HP:0000268", "HP:0000278", "HP:0000490", "HP:0001065", "HP:0001083", "HP:0001166", "HP:0004959", "HP:0012499"],
  "demo-kabuki": ["HP:0000400", "HP:0000431", "HP:0000437", "HP:0000592", "HP:0000637", "HP:0001212", "HP:0001252", "HP:0001263", "HP:0002553", "HP:0004322", "HP:0005338", "HP:0007655", "HP:0011626", "HP:0040019"],
  "demo-cdls": ["HP:0000028", "HP:0001007", "HP:0001156", "HP:0001159", "HP:0001249", "HP:0001263", "HP:0001511", "HP:0008897", "HP:0030148"],
};
const SOURCE_EXCLUDED_USED: Record<string, string[]> = {
  "demo-dmd": [], // source has none; Seizure was added for the demo
  "demo-marfan": ["HP:0002107", "HP:0002650"],
  "demo-kabuki": ["HP:0000365", "HP:0001250"],
  "demo-cdls": ["HP:0001250", "HP:0011968"],
};

describe("demo cases", () => {
  it("lists demo-dmd first, then marfan, kabuki, cdls", () => {
    expect(listDemoCases().map((c) => c.caseId)).toEqual(["demo-dmd", "demo-marfan", "demo-kabuki", "demo-cdls"]);
  });

  it.each(DEMO_CASES.map((c) => [c.caseId, c] as const))("%s: P14 offsets, labels and source match", (id, c) => {
    expect(c.label).toBe(demoLabel(c.sourcePhenopacketId));
    expect(DEMO_SOURCES[id]?.licence).toBe("BSD-3-Clause");
    for (const t of c.extraction) {
      expect(t.hpoId).toMatch(/^HP:\d{7}$/);
      expect(0 <= t.start && t.start < t.end && t.end <= c.narrative.length).toBe(true);
      expect(c.narrative.slice(t.start, t.end)).toBe(t.quote);
      expect(t).toMatchObject({ grounding: "exact-id", confidence: "high" });
    }
    const observed = c.extraction.filter((t) => !t.negated).map((t) => t.hpoId);
    const excluded = c.extraction.filter((t) => t.negated).map((t) => t.hpoId);
    expect(observed.length).toBeGreaterThanOrEqual(6);
    expect([...observed].sort()).toEqual(SOURCE_OBSERVED[id]);
    const notFromSource = excluded.filter((x) => !(SOURCE_EXCLUDED_USED[id] ?? []).includes(x));
    expect(notFromSource).toEqual(DEMO_SOURCES[id]?.addedNegations);
    expect(new Set(c.extraction.map((t) => t.hpoId)).size).toBe(c.extraction.length);
    const starts = c.extraction.map((t) => t.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("titles do not reveal the expected diagnosis", () => {
    for (const c of DEMO_CASES) {
      const firstWord = c.expectedDiagnosis.label.split(" ")[0] ?? "";
      expect(c.title.toLowerCase()).not.toContain(firstWord.toLowerCase());
    }
  });

  it("getDemoCase returns a copy and undefined for unknown ids", () => {
    const a = getDemoCase("demo-dmd");
    expect(a?.narrative.length).toBe(440);
    if (a?.extraction[0]) a.extraction[0].label = "mutated";
    expect(getDemoCase("demo-dmd")?.extraction[0]?.label).toBe("Motor delay");
    expect(getDemoCase("demo-unknown")).toBeUndefined();
  });

  it("demoRankKey ignores order and duplicates", () => {
    const k = demoRankKey(["HP:0000002", "HP:0000001", "HP:0000001"], ["HP:0000009"], 5);
    expect(k).toBe("HP:0000001,HP:0000002|HP:0000009|5");
    expect(demoRankKey(["HP:0000001", "HP:0000002"], ["HP:0000009", "HP:0000009"], 5)).toBe(k);
  });

  it("has no recorded responses yet (honest cache miss)", () => {
    const c = DEMO_CASES[0]!;
    const key = demoRankKey(
      c.extraction.filter((t) => !t.negated).map((t) => t.hpoId),
      c.extraction.filter((t) => t.negated).map((t) => t.hpoId),
      5,
    );
    expect(getDemoRanking(key)).toBeUndefined();
    expect(getDemoQuestions(key)).toBeUndefined();
    expect(getDemoTrials("Duchenne muscular dystrophy")).toBeUndefined();
    expect(getDemoRanking("__proto__")).toBeUndefined();
  });
});
