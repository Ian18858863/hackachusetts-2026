import { describe, expect, it } from "vitest";
import { demoRankKey, getDemoCase, getDemoQuestions, getDemoRanking, getDemoTrials, listDemoCases } from "../demo/index";
import { DEMO_CASES, DEMO_SOURCES } from "../demo/cases";
import { RANK_RECORDS } from "../demo/recorded";
import { HPO_VERSION, overlapLabel } from "../index";
import { weightedMatchCount } from "../rank";
import { demoLabel } from "../text";

// Observed and excluded ids of the source phenopackets, read from
// raw.githubusercontent.com/monarch-initiative/phenopacket-store/main on 2026-10-24.
const SOURCE_OBSERVED: Record<string, string[]> = {
  "demo-npc1": ["HP:0001251", "HP:0001260", "HP:0001268", "HP:0001744", "HP:0002240", "HP:0002527", "HP:0003349", "HP:0003651", "HP:0006579", "HP:0007017", "HP:0031833", "HP:0031987"],
  "demo-dmd": ["HP:0001270", "HP:0002380", "HP:0003391", "HP:0003551", "HP:0003707", "HP:0003750", "HP:0012378", "HP:0025435", "HP:0030235", "HP:0031956", "HP:0031964", "HP:0040129"],
  "demo-marfan": ["HP:0000218", "HP:0000268", "HP:0000278", "HP:0000490", "HP:0001065", "HP:0001083", "HP:0001166", "HP:0004959", "HP:0012499"],
  "demo-kabuki": ["HP:0000400", "HP:0000431", "HP:0000437", "HP:0000592", "HP:0000637", "HP:0001212", "HP:0001252", "HP:0001263", "HP:0002553", "HP:0004322", "HP:0005338", "HP:0007655", "HP:0011626", "HP:0040019"],
  "demo-cdls": ["HP:0000028", "HP:0001007", "HP:0001156", "HP:0001159", "HP:0001249", "HP:0001263", "HP:0001511", "HP:0008897", "HP:0030148"],
};
const SOURCE_EXCLUDED_USED: Record<string, string[]> = {
  "demo-npc1": [], // source has none; Headache was added for the demo
  "demo-dmd": [], // source has none; Seizure was added for the demo
  "demo-marfan": ["HP:0002107", "HP:0002650"],
  "demo-kabuki": ["HP:0000365", "HP:0001250"],
  "demo-cdls": ["HP:0001250", "HP:0011968"],
};

describe("demo cases", () => {
  it("lists demo-npc1 first, then dmd, marfan, kabuki, cdls (contract v0.1.1)", () => {
    expect(listDemoCases().map((c) => c.caseId)).toEqual(["demo-npc1", "demo-dmd", "demo-marfan", "demo-kabuki", "demo-cdls"]);
  });

  it("demo-npc1 matches contract 9.1", () => {
    const c = getDemoCase("demo-npc1")!;
    expect(c.narrative.length).toBe(543);
    expect(c.sourcePhenopacketId).toBe("PMID_27900365_patient");
    expect(c.label).toBe("Demo case (synthetic narrative from phenopacket-store PMID_27900365_patient)");
    expect(c.extraction).toHaveLength(13);
    expect(c.extraction.filter((t) => t.negated).map((t) => [t.hpoId, t.label])).toEqual([["HP:0002315", "Headache"]]);
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

  const keyFor = (caseId: string, limit = 5) => {
    const c = DEMO_CASES.find((d) => d.caseId === caseId)!;
    return demoRankKey(
      c.extraction.filter((t) => !t.negated).map((t) => t.hpoId),
      c.extraction.filter((t) => t.negated).map((t) => t.hpoId),
      limit,
    );
  };

  it.each(["demo-npc1", "demo-dmd", "demo-kabuki"])("%s: recorded live ranking is served as demo data", (caseId) => {
    const r = getDemoRanking(keyFor(caseId));
    expect(r).toBeDefined();
    expect(r!.version).toBe("0.1");
    expect(r!.source).toBe("demo");
    expect(r!.dataVersions.demoCache).toBe("2026-10-24");
    expect(r!.dataVersions.fetchedAt).toMatch(/^2026-10-24T/);
    expect(r!.dataVersions.monarch).toBe("v3 API");
    const n = r!.candidates.length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(5);
    expect(r!.candidates.map((x) => x.rank)).toEqual(Array.from({ length: n }, (_, i) => i + 1));
    const c = DEMO_CASES.find((d) => d.caseId === caseId)!;
    const observed = new Set(c.extraction.filter((t) => !t.negated).map((t) => t.hpoId));
    for (const x of r!.candidates) {
      expect(x.sources[0]).toBe("monarch-semsim");
      expect(x.matched.length + x.unmatched.length).toBe(observed.size);
    }
    // a copy: mutating it does not change the cache
    r!.candidates.length = 0;
    expect(getDemoRanking(keyFor(caseId))!.candidates.length).toBe(n);
  });

  it("demo-npc1 recording: actual Monarch order, OMIM:257220 first, complete per-call provenance", () => {
    const r = getDemoRanking(keyFor("demo-npc1"))!;
    // Recorded live on 2026-10-24; this asserts the stored snapshot, not a claim about future live calls.
    expect(r.candidates.map((x) => x.diseaseId)).toEqual(["OMIM:257220", "ORPHA:2274", "OMIM:607625", "ORPHA:480556", "ORPHA:33574"]);
    expect(r.candidates[0]!.name).toBe("Niemann-Pick disease, type C1");
    const scores = r.candidates.map((x) => x.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));

    const rec = RANK_RECORDS.find((x) => x.caseId === "demo-npc1")!;
    expect(rec.snapshot).toBe(true);
    expect(rec.recordedAt).toBe(rec.response.dataVersions.fetchedAt);
    expect(rec.response.source).toBe("live"); // stored as fetched; relabelled only when served
    expect(rec.enrichment?.complete).toBe(true);
    expect(rec.enrichment?.warnings).toEqual([]);
    // stored labels follow the v0.1.2 rule the current engine uses
    expect(rec.overlapRule).toMatch(/^contract v0\.1\.2/);
    const observedCount = rec.request.observed.length;
    for (const x of rec.response.candidates) {
      expect(x.overlap).toBe(overlapLabel(weightedMatchCount(x.matched), observedCount, x.contradicted.length));
    }
  });

  it.each(RANK_RECORDS.map((r) => [r.caseId, r] as const))(
    "%s recording: provider claims are backed by the stored data",
    (_id, rec) => {
      for (const x of rec.response.candidates) {
        const e = rec.enrichment?.candidates.find((c) => c.diseaseId === x.diseaseId);
        const hasAnnotations = x.sources.includes("hpo-annotations");
        const hasOrphadata = x.sources.includes("orphadata");
        if (e) {
          // format 2: sources match exactly what the calls returned
          expect(hasAnnotations).toBe(e.annotations.some((a) => a.status === "ok"));
          expect(hasOrphadata).toBe("id" in e.orphadata && e.orphadata.status === "ok");
        }
        if (hasOrphadata) expect(x.links.orphanet).toBeDefined();
        if (!hasAnnotations) {
          expect(x.genes).toEqual([]);
          for (const m of x.matched) expect(m.frequency).toBeNull();
        }
        // every frequency names the annotation set it came from, and that set is one of this candidate's ids
        const ids = [x.links.orphanet && `ORPHA:${x.links.orphanet.split("/").pop()}`, x.links.omim && `OMIM:${x.links.omim.split("/").pop()}`];
        for (const f of [...x.matched.map((m) => m.frequency), ...x.notReported.map((n) => n.frequency), ...x.contradicted.map((n) => n.frequency)]) {
          if (f) expect(ids).toContain(f.source);
        }
      }
      const listing = (s: string) => rec.response.candidates.filter((x) => x.sources.includes(s as never)).length;
      if (rec.enrichment) {
        // observed outcomes: counts come from the calls themselves
        const hpo = rec.providers.hpoAnnotation;
        const orpha = rec.providers.orphadata;
        expect(hpo).not.toBe("not-captured");
        expect(orpha).not.toBe("not-captured");
        if (hpo === "not-captured" || orpha === "not-captured") return;
        expect(hpo.ok ?? 0).toBe(rec.enrichment.candidates.flatMap((c) => c.annotations).filter((a) => a.status === "ok").length);
        expect(orpha.ok ?? 0).toBe(listing("orphadata"));
        expect(rec.inferredFromResponse).toBeUndefined();
      } else {
        // not captured: no per-call counts are claimed, only response-derived ones, labelled as such
        expect(rec.providers).toEqual({ monarchSemsim: "ok", hpoAnnotation: "not-captured", orphadata: "not-captured" });
        expect(rec.inferredFromResponse?.basis).toMatch(/not observed per-call outcomes/i);
        expect(rec.inferredFromResponse?.candidatesListingHpoAnnotations).toBe(listing("hpo-annotations"));
        expect(rec.inferredFromResponse?.candidatesListingOrphadata).toBe(listing("orphadata"));
      }
      // the recording used the fixture's prepared input, and the HPO version it reports
      const c = DEMO_CASES.find((d) => d.caseId === rec.caseId)!;
      expect(rec.request.observed).toEqual([...new Set(c.extraction.filter((t) => !t.negated).map((t) => t.hpoId))].sort());
      expect(rec.request.excluded).toEqual([...new Set(c.extraction.filter((t) => t.negated).map((t) => t.hpoId))].sort());
      expect(rec.key).toBe(demoRankKey(rec.request.observed, rec.request.excluded, rec.request.limit));
      // Recorded before the HPO release was verified: they keep the "unknown"
      // they were made with and must not be relabelled with the later value.
      expect(rec.response.dataVersions.hpo).toBe("unknown");
      expect(rec.response.dataVersions.hpo).not.toBe(HPO_VERSION);
    },
  );

  it("misses honestly for everything not recorded", () => {
    expect(getDemoRanking(keyFor("demo-dmd", 3))).toBeUndefined();
    expect(getDemoRanking(keyFor("demo-marfan"))).toBeUndefined();
    expect(getDemoQuestions(keyFor("demo-dmd"))).toBeUndefined();
    expect(getDemoTrials("Duchenne muscular dystrophy")).toBeUndefined();
    expect(getDemoRanking("__proto__")).toBeUndefined();
  });
});
