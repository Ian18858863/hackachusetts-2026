// rankCandidates with a mocked fetch. ALL DISEASE DATA HERE IS SYNTHETIC
// (ids in the 9000000 range, "Synthetic disease" names, invented frequencies)
// so tests never pose as real medical facts (medical-data steering, test
// exception). HPO term ids are real ids used only as opaque keys.

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { InvalidInput, UpstreamError, UpstreamTimeout } from "../errors";
import { DEFAULT_TIMEOUTS_MS } from "../http";
import { RANK_BUDGET_MS, rankCandidates, rankCandidatesWithReport, weightedMatchCount } from "../rank";
import type { EngineDeps, FetchLike } from "../types";

const A = "HP:0001166"; // patient terms (opaque keys)
const B = "HP:0000218";
const C = "HP:0001083";
const D = "HP:0000268";
const X = "HP:0002650"; // excluded in some tests
const T = "HP:0002616"; // a disease-only term

interface SynDisease {
  mondo: string;
  name: string;
  score: number;
  xref: string[];
  // patient term -> [disease term, subsumer]
  matches: Record<string, [string, string]>;
}

const DISEASES: SynDisease[] = [
  {
    mondo: "MONDO:9000001",
    name: "synthetic disease one",
    score: 14,
    xref: ["Orphanet:9000001", "OMIM:9000001"],
    matches: { [A]: [A, A], [B]: [B, B], [C]: [T, "HP:0004942"], [D]: ["HP:0000001", "HP:0000118"] },
  },
  { mondo: "MONDO:9000002", name: "synthetic disease two", score: 13, xref: ["OMIM:9000002"], matches: { [A]: [A, A], [B]: ["HP:0000152", "UPHENO:0000001"] } },
  // same ORPHA id as disease one, lower score -> merged away
  { mondo: "MONDO:9000003", name: "synthetic disease one, subtype", score: 12, xref: ["Orphanet:9000001"], matches: {} },
  { mondo: "MONDO:9000004", name: "synthetic disease four", score: 13, xref: [], matches: { [A]: [A, A] } },
];

const ANNOTATIONS: Record<string, unknown> = {
  "ORPHA:9000001": {
    disease: { id: "ORPHA:9000001", name: "Synthetic disease one" },
    categories: {
      Limbs: [
        { id: A, name: "Arachnodactyly", metadata: { frequency: "Very frequent" } },
        { id: X, name: "Scoliosis", metadata: { frequency: "Frequent" } },
        { id: "HP:0001519", name: "Disproportionate tall stature", metadata: { frequency: "Very frequent" } },
      ],
      Cardiovascular: [{ id: T, name: "Aortic root aneurysm", metadata: { frequency: "" } }],
      Eye: [{ id: "HP:0000545", name: "Myopia", metadata: { frequency: "Occasional" } }],
    },
    genes: [],
  },
  "OMIM:9000001": {
    disease: { id: "OMIM:9000001", name: "SYNTHETIC DISEASE ONE" },
    categories: {
      Cardiovascular: [{ id: T, name: "Aortic root aneurysm", metadata: { frequency: "9/10" } }],
      Limbs: [{ id: A, name: "Arachnodactyly", metadata: { frequency: "1/10" } }],
    },
    genes: [{ id: "NCBIGene:9000001", name: "SYN1" }],
  },
  "OMIM:9000002": {
    disease: { id: "OMIM:9000002", name: "Synthetic disease two" },
    categories: { Limbs: [{ id: A, name: "Arachnodactyly", metadata: { frequency: "" } }] },
    genes: [{ id: "NCBIGene:9000002", name: "SYN2" }],
  },
};

const LABELS: Record<string, string> = { [A]: "Arachnodactyly", [B]: "High palate", [C]: "Ectopia lentis", [D]: "Dolichocephaly" };

interface MockOpts {
  monarchStatus?: number;
  monarchHang?: boolean;
  monarchBody?: unknown; // replaces the generated Monarch body
  failAnnotation?: string;
  annotationsMissing?: boolean; // JAX answers 404 for every disease id
  orphadataStatus?: number;
  orphadataBody?: unknown;
}

function mock(opts: MockOpts = {}): { deps: EngineDeps; calls: string[] } {
  const calls: string[] = [];
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
  const fetch: FetchLike = async (input, init) => {
    calls.push(input);
    const url = new URL(input);
    if (url.hostname === "api.monarchinitiative.org") {
      if (opts.monarchHang) {
        return new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("t"), { name: "TimeoutError" }))),
        );
      }
      if (opts.monarchStatus) return json({}, opts.monarchStatus);
      if (opts.monarchBody !== undefined) return json(opts.monarchBody);
      const ids = decodeURIComponent(url.pathname.split("/")[5] ?? "").split(",");
      return json(
        DISEASES.map((d) => ({
          subject: { id: d.mondo, name: d.name, xref: d.xref },
          score: d.score,
          similarity: {
            object_termset: Object.fromEntries(ids.map((id) => [id, { id, label: LABELS[id] ?? id }])),
            object_best_matches: Object.fromEntries(
              Object.entries(d.matches)
                .filter(([src]) => ids.includes(src))
                .map(([src, [tgt, sub]]) => [
                  src,
                  { match_source: src, match_source_label: LABELS[src], match_target: tgt, match_target_label: `label of ${tgt}`, match_subsumer: sub, match_subsumer_label: `label of ${sub}` },
                ]),
            ),
          },
        })),
      );
    }
    if (url.hostname === "ontology.jax.org") {
      const id = decodeURIComponent(url.pathname.split("/").pop() ?? "");
      if (id === opts.failAnnotation) return json({}, 503);
      if (opts.annotationsMissing) return json({ message: "not found" }, 404);
      const body = ANNOTATIONS[id];
      return body ? json(body) : json({ message: "not found" }, 404);
    }
    if (url.hostname === "api.orphadata.com") {
      if (opts.orphadataStatus) return json({}, opts.orphadataStatus);
      if (opts.orphadataBody !== undefined) return json(opts.orphadataBody);
      return json({ data: { results: { ORPHAcode: 9000001, "Preferred term": "Synthetic disease one (Orphanet name)", Date: "2026-06-23 07:53:50" } } });
    }
    return json({}, 404);
  };
  return { deps: { fetch, now: () => new Date("2026-10-24T17:00:00.000Z"), timeoutsMs: { monarchSemsim: 400 } }, calls };
}

describe("rankCandidates: request and Monarch call", () => {
  it("validates input", async () => {
    const { deps } = mock();
    await expect(rankCandidates({ observed: [] }, deps)).rejects.toBeInstanceOf(InvalidInput);
    await expect(rankCandidates({ observed: ["HP:12"] }, deps)).rejects.toBeInstanceOf(InvalidInput);
    await expect(rankCandidates({ observed: [A], excluded: [A] }, deps)).rejects.toBeInstanceOf(InvalidInput);
    await expect(rankCandidates({ observed: [A], limit: 11 }, deps)).rejects.toBeInstanceOf(InvalidInput);
  });

  it("sends sorted, deduplicated observed ids with limit + 5 and no excluded ids", async () => {
    const m = mock();
    await rankCandidates({ observed: [C, A, A], excluded: [X], limit: 3 }, m.deps);
    // C (HP:0001083) sorts before A (HP:0001166)
    expect(m.calls[0]).toBe(`https://api.monarchinitiative.org/v3/api/semsim/search/${C},${A}/Human%20Diseases?limit=8`);
  });

  it("propagates Monarch failures as typed errors (functions decide the demo fallback)", async () => {
    await expect(rankCandidates({ observed: [A] }, mock({ monarchStatus: 400 }).deps)).rejects.toBeInstanceOf(UpstreamError);
    await expect(rankCandidates({ observed: [A] }, mock({ monarchHang: true }).deps)).rejects.toBeInstanceOf(UpstreamTimeout);
  });
});

describe("rankCandidates: candidates", () => {
  it("keeps Monarch order, merges same diseaseId, picks ORPHA > OMIM > MONDO, ranks 1..n", async () => {
    const { deps } = mock();
    const r = await rankCandidates({ observed: [A, B, C, D], limit: 5 }, deps);
    expect(r.version).toBe("0.1");
    expect(r.source).toBe("live");
    expect(r.candidates.map((c) => [c.rank, c.diseaseId, c.score])).toEqual([
      [1, "ORPHA:9000001", 14],
      [2, "MONDO:9000004", 13], // tie at 13 broken by diseaseId
      [3, "OMIM:9000002", 13],
    ]);
  });

  it("builds evidence: exact, ancestor, too-general and non-HP subsumers go to unmatched", async () => {
    const { deps } = mock();
    const r = await rankCandidates({ observed: [A, B, C, D], excluded: [X] }, deps);
    const one = r.candidates[0]!;
    // in sorted patient-term order: B (HP:0000218), C (HP:0001083), A (HP:0001166)
    expect(one.matched).toEqual([
      { patientTerm: { id: B, label: "High palate" }, diseaseTerm: { id: B, label: `label of ${B}` }, via: "exact", frequency: null },
      {
        patientTerm: { id: C, label: "Ectopia lentis" },
        diseaseTerm: { id: T, label: `label of ${T}` },
        via: "ancestor",
        ancestor: { id: "HP:0004942", label: "label of HP:0004942" },
        // ORPHA has the term without a frequency; the OMIM band fills it, raw kept
        frequency: { label: "Very frequent", raw: "9/10", source: "OMIM:9000001" },
      },
      { patientTerm: { id: A, label: "Arachnodactyly" }, diseaseTerm: { id: A, label: `label of ${A}` }, via: "exact", frequency: { label: "Very frequent", source: "ORPHA:9000001" } },
    ]);
    expect(one.unmatched).toEqual([{ id: D, label: "Dolichocephaly" }]); // subsumer HP:0000118
    const two = r.candidates.find((c) => c.diseaseId === "OMIM:9000002")!;
    // sorted: B (HP:0000218, via a non-HP UPHENO subsumer), D (HP:0000268), C (HP:0001083)
    expect(two.unmatched.map((t) => t.id)).toEqual([B, D, C]);
  });

  it("notReported and contradicted only from frequent annotated features, never invented", async () => {
    const { deps } = mock();
    const r = await rankCandidates({ observed: [A, B, C], excluded: [X] }, deps);
    const one = r.candidates[0]!;
    expect(one.notReported).toEqual([
      { term: { id: "HP:0001519", label: "Disproportionate tall stature" }, frequency: { label: "Very frequent", source: "ORPHA:9000001" } },
    ]);
    expect(one.contradicted).toEqual([{ term: { id: X, label: "Scoliosis" }, frequency: { label: "Frequent", source: "ORPHA:9000001" } }]);
    expect(one.overlap).toBe("partial"); // 3/3 = strong, one contradiction -> partial
  });

  it("adds genes, categories, links, sources and the Orphanet name", async () => {
    const { deps } = mock();
    const r = await rankCandidates({ observed: [A] }, deps);
    const one = r.candidates[0]!;
    expect(one.name).toBe("Synthetic disease one (Orphanet name)");
    expect(one.genes).toEqual([{ id: "NCBIGene:9000001", symbol: "SYN1" }]);
    expect(one.categories).toEqual(["Cardiovascular", "Eye", "Limbs"]);
    expect(one.links).toEqual({
      monarch: "https://monarchinitiative.org/MONDO:9000001",
      orphanet: "https://www.orpha.net/en/disease/detail/9000001",
      omim: "https://omim.org/entry/9000001",
    });
    expect(one.sources).toEqual(["monarch-semsim", "hpo-annotations", "orphadata"]);
    const four = r.candidates.find((c) => c.diseaseId === "MONDO:9000004")!;
    expect(four).toMatchObject({ name: "synthetic disease four", genes: [], categories: [], sources: ["monarch-semsim"] });
    expect(r.dataVersions).toEqual({ hpo: "2026-09-01", monarch: "v3 API", orphanet: "2026-06-23", fetchedAt: "2026-10-24T17:00:00.000Z" });
  });

  it("an annotation or Orphadata failure only removes that data", async () => {
    const { deps } = mock({ failAnnotation: "OMIM:9000002", orphadataStatus: 500 });
    const r = await rankCandidates({ observed: [A] }, deps);
    const two = r.candidates.find((c) => c.diseaseId === "OMIM:9000002")!;
    expect(two.sources).toEqual(["monarch-semsim"]);
    expect(two.matched[0]?.frequency).toBeNull();
    const one = r.candidates[0]!;
    expect(one.name).toBe("synthetic disease one"); // Monarch name kept
    expect(one.sources).toEqual(["monarch-semsim", "hpo-annotations"]);
    expect(r.dataVersions.orphanet).toBeUndefined();
  });
});

describe("rankCandidates: properties P4-P6 (contract section 11)", () => {
  const pool = [A, B, C, D, "HP:0000490", "HP:0012499"];
  const arb = fc.record({
    observed: fc.subarray(pool, { minLength: 1 }),
    dupes: fc.array(fc.constantFrom(...pool), { maxLength: 3 }),
    excluded: fc.subarray([X, "HP:0002107"]),
    limit: fc.integer({ min: 1, max: 10 }),
    seed: fc.integer(),
  });
  const shuffle = <T>(xs: T[], seed: number) =>
    xs.map((x, i) => ({ x, k: Math.sin(seed + i) })).sort((a, b) => a.k - b.k).map((o) => o.x);

  it("order/duplicate independence, ranks 1..n, matched + unmatched = observed", async () => {
    await fc.assert(
      fc.asyncProperty(arb, async ({ observed, dupes, excluded, limit, seed }) => {
        const a = await rankCandidates({ observed, excluded, limit }, mock().deps);
        const b = await rankCandidates(
          { observed: shuffle([...observed, ...dupes.filter((d) => observed.includes(d))], seed), excluded: shuffle([...excluded, ...excluded], seed), limit },
          mock().deps,
        );
        expect(b).toEqual(a); // P4
        const n = a.candidates.length;
        expect(n).toBeLessThanOrEqual(limit);
        expect(a.candidates.map((c) => c.rank)).toEqual(Array.from({ length: n }, (_, i) => i + 1)); // P5
        for (let i = 1; i < n; i++) {
          const p = a.candidates[i - 1]!;
          const c = a.candidates[i]!;
          expect(p.score > c.score || (p.score === c.score && p.diseaseId < c.diseaseId)).toBe(true);
        }
        for (const c of a.candidates) {
          expect(c.matched.length + c.unmatched.length).toBe(new Set(observed).size); // P6
          expect(c.notReported.length).toBeLessThanOrEqual(8);
        }
      }),
      { numRuns: 60, seed: 20261024 },
    );
  });
});

describe("rankCandidates: malformed or missing Monarch data", () => {
  it("rejects a non-array body", async () => {
    await expect(rankCandidates({ observed: [A] }, mock({ monarchBody: { results: [] } }).deps)).rejects.toBeInstanceOf(UpstreamError);
  });

  it("rejects a body whose rows are all unusable instead of returning an empty live ranking", async () => {
    const junk = [{ subject: { id: "not-mondo" }, score: 1 }, { subject: { id: "MONDO:9000001" }, score: "high" }, null];
    await expect(rankCandidates({ observed: [A] }, mock({ monarchBody: junk }).deps)).rejects.toBeInstanceOf(UpstreamError);
  });

  it("an empty array is a real 'no candidates' answer with complete enrichment", async () => {
    const { response, enrichment } = await rankCandidatesWithReport({ observed: [A] }, mock({ monarchBody: [] }).deps);
    expect(response.candidates).toEqual([]);
    expect(response.source).toBe("live");
    expect(enrichment).toEqual({ complete: true, candidates: [], warnings: [] });
  });

  it("skips malformed rows and malformed matches but keeps the usable ones", async () => {
    const body = [
      { subject: { id: "MONDO:9000004", name: "synthetic disease four", xref: [] }, score: 9,
        similarity: { object_termset: { [A]: { id: A, label: "Arachnodactyly" } },
          object_best_matches: { [A]: { match_source: A, match_target: "not-an-hpo-id", match_subsumer: A } } } },
      { subject: { name: "no id" }, score: 10 },
    ];
    const r = await rankCandidates({ observed: [A] }, mock({ monarchBody: body }).deps);
    expect(r.candidates.map((c) => c.diseaseId)).toEqual(["MONDO:9000004"]);
    expect(r.candidates[0]!.matched).toEqual([]);
    expect(r.candidates[0]!.unmatched).toEqual([{ id: A, label: "Arachnodactyly" }]);
  });
});

describe("rankCandidatesWithReport: enrichment outcomes", () => {
  it("complete evidence: every call accounted for, no warnings", async () => {
    const { response, enrichment } = await rankCandidatesWithReport({ observed: [A, B] }, mock().deps);
    expect(response).toEqual(await rankCandidates({ observed: [A, B] }, mock().deps));
    expect(enrichment.complete).toBe(true);
    expect(enrichment.warnings).toEqual([]);
    expect(enrichment.candidates).toEqual([
      { diseaseId: "ORPHA:9000001", annotations: [{ id: "ORPHA:9000001", status: "ok" }, { id: "OMIM:9000001", status: "ok" }], orphadata: { id: "ORPHA:9000001", status: "ok" } },
      { diseaseId: "MONDO:9000004", annotations: [], orphadata: { status: "not-applicable" } },
      { diseaseId: "OMIM:9000002", annotations: [{ id: "OMIM:9000002", status: "ok" }], orphadata: { status: "not-applicable" } },
    ]);
  });

  it("failed JAX annotation call: reported as failed, evidence left empty, nothing filled in", async () => {
    const { response, enrichment } = await rankCandidatesWithReport({ observed: [A] }, mock({ failAnnotation: "OMIM:9000002" }).deps);
    expect(response.source).toBe("live");
    expect(enrichment.complete).toBe(false);
    const two = enrichment.candidates.find((c) => c.diseaseId === "OMIM:9000002")!;
    expect(two.annotations).toEqual([{ id: "OMIM:9000002", status: "failed", error: "Upstream hpoAnnotation failed with HTTP 503" }]);
    expect(enrichment.warnings).toEqual([
      "OMIM:9000002: HPO annotations for OMIM:9000002 could not be fetched; frequencies from that set are missing",
    ]);
    const cand = response.candidates.find((c) => c.diseaseId === "OMIM:9000002")!;
    expect(cand.sources).toEqual(["monarch-semsim"]);
    expect(cand.matched.map((m) => m.frequency)).toEqual([null]);
    expect(cand).toMatchObject({ genes: [], categories: [], notReported: [], contradicted: [] });
  });

  it("one of two annotation sets fails: the other set's evidence stays, attributed to its own source", async () => {
    const { response, enrichment } = await rankCandidatesWithReport({ observed: [A, C] }, mock({ failAnnotation: "OMIM:9000001" }).deps);
    expect(enrichment.complete).toBe(false);
    const one = response.candidates[0]!;
    expect(one.sources).toContain("hpo-annotations");
    expect(one.genes).toEqual([]); // genes only came from the failed OMIM set
    // T is annotated in ORPHA without a frequency; the OMIM band is gone, so it stays label null with ORPHA as source
    const viaT = one.matched.find((m) => m.diseaseTerm.id === T)!;
    expect(viaT.frequency).toEqual({ label: null, source: "ORPHA:9000001" });
  });

  it("Monarch ranks but no annotations exist (404): complete, no evidence claimed", async () => {
    const { response, enrichment } = await rankCandidatesWithReport({ observed: [A], excluded: [X] }, mock({ annotationsMissing: true }).deps);
    expect(enrichment.complete).toBe(true);
    expect(enrichment.candidates[0]!.annotations.map((a) => a.status)).toEqual(["not-found", "not-found"]);
    for (const c of response.candidates) {
      expect(c.sources).not.toContain("hpo-annotations");
      expect(c).toMatchObject({ genes: [], categories: [], notReported: [], contradicted: [] });
      for (const m of c.matched) expect(m.frequency).toBeNull();
    }
  });

  it("missing Orphanet cross-reference: no Orphadata call, no link, not-applicable", async () => {
    const m = mock();
    const { response, enrichment } = await rankCandidatesWithReport({ observed: [A] }, m.deps);
    const two = response.candidates.find((c) => c.diseaseId === "OMIM:9000002")!;
    expect(two.links.orphanet).toBeUndefined();
    expect(two.sources).not.toContain("orphadata");
    expect(enrichment.candidates.find((c) => c.diseaseId === "OMIM:9000002")!.orphadata).toEqual({ status: "not-applicable" });
    expect(m.calls.filter((u) => u.includes("api.orphadata.com"))).toEqual([
      "https://api.orphadata.com/rd-cross-referencing/orphacodes/9000001?lang=en",
    ]);
  });

  it("unusable Orphadata record: reported, Monarch name kept, no orphanet version claimed", async () => {
    const body = { data: { results: { ORPHAcode: 123, "Preferred term": "Some other disorder", Date: "2026-06-23" } } };
    const { response, enrichment } = await rankCandidatesWithReport({ observed: [A] }, mock({ orphadataBody: body }).deps);
    expect(enrichment.complete).toBe(false);
    expect(enrichment.candidates[0]!.orphadata).toEqual({ id: "ORPHA:9000001", status: "unusable" });
    expect(enrichment.warnings).toEqual(["ORPHA:9000001: Orphadata name check returned an unusable record; the Monarch name is shown"]);
    expect(response.candidates[0]!).toMatchObject({ name: "synthetic disease one" });
    expect(response.candidates[0]!.sources).not.toContain("orphadata");
    expect(response.dataVersions.orphanet).toBeUndefined();
  });

  it("failed Orphadata call is reported as failed", async () => {
    const { enrichment } = await rankCandidatesWithReport({ observed: [A] }, mock({ orphadataStatus: 500 }).deps);
    expect(enrichment.candidates[0]!.orphadata).toMatchObject({ id: "ORPHA:9000001", status: "failed" });
    expect(enrichment.complete).toBe(false);
  });
});

describe("rankCandidates: removing a matched phenotype (reference evidence fixed)", () => {
  const pool = [A, B, C, D];
  it("never increases any remaining candidate's matched count", async () => {
    await fc.assert(
      fc.asyncProperty(fc.subarray(pool, { minLength: 2 }), fc.nat(), async (observed, pick) => {
        const full = await rankCandidates({ observed, limit: 10 }, mock().deps);
        for (const cand of full.candidates) {
          if (cand.matched.length === 0) continue;
          const drop = cand.matched[pick % cand.matched.length]!.patientTerm.id;
          const fewer = await rankCandidates({ observed: observed.filter((id) => id !== drop), limit: 10 }, mock().deps);
          for (const after of fewer.candidates) {
            const before = full.candidates.find((c) => c.diseaseId === after.diseaseId);
            if (!before) continue;
            expect(after.matched.length).toBeLessThanOrEqual(before.matched.length);
            expect(after.matched.some((m) => m.patientTerm.id === drop)).toBe(false);
          }
          expect(fewer.candidates.find((c) => c.diseaseId === cand.diseaseId)?.matched.length ?? 0).toBe(cand.matched.length - 1);
        }
      }),
      { numRuns: 40, seed: 20261024 },
    );
  });
});

describe("contract v0.1.2 parity", () => {
  it("weightedMatchCount = floor(exact + 0.5 x ancestor)", () => {
    const ev = (via: "exact" | "ancestor") => ({ patientTerm: { id: A, label: "" }, diseaseTerm: { id: A, label: "" }, via, frequency: null });
    expect(weightedMatchCount([])).toBe(0);
    expect(weightedMatchCount([ev("ancestor")])).toBe(0);
    expect(weightedMatchCount([ev("ancestor"), ev("ancestor")])).toBe(1);
    expect(weightedMatchCount([ev("exact"), ev("ancestor"), ev("ancestor"), ev("ancestor")])).toBe(2);
  });

  it("ancestor-only matches count half for the overlap label; matched still lists them all", async () => {
    // disease one matches A and B exactly and C via an ancestor: floor(2 + 0.5) = 2 of 3 -> strong
    const r = await rankCandidates({ observed: [A, B, C] }, mock().deps);
    const one = r.candidates[0]!;
    expect(one.matched.map((m) => m.via).sort()).toEqual(["ancestor", "exact", "exact"]);
    expect(one.overlap).toBe("strong");
    // with C only (ancestor): floor(0.5) = 0 of 1 -> weak, even though matched has one entry
    const onlyC = await rankCandidates({ observed: [C] }, mock().deps);
    const c1 = onlyC.candidates.find((c) => c.diseaseId === "ORPHA:9000001")!;
    expect(c1.matched).toHaveLength(1);
    expect(c1.overlap).toBe("weak");
  });

  it("Monarch default timeout is 10 s; later calls are capped by the 12 s budget", () => {
    expect(DEFAULT_TIMEOUTS_MS.monarchSemsim).toBe(10000);
    expect(RANK_BUDGET_MS).toBe(12000);
  });

  it("an exhausted budget drops enrichment and reports it, without failing the ranking", async () => {
    const m = mock();
    const slowFetch: FetchLike = async (input, init) => {
      if (input.includes("monarchinitiative")) await new Promise((r) => setTimeout(r, 30));
      return m.deps.fetch(input, init);
    };
    const realNow = Date.now;
    let shift = 0;
    Date.now = () => realNow() + shift;
    try {
      const deps: EngineDeps = { ...m.deps, fetch: async (input, init) => {
        const res = await slowFetch(input, init);
        if (input.includes("monarchinitiative")) shift = RANK_BUDGET_MS; // pretend Monarch used the whole budget
        return res;
      } };
      const { response, enrichment } = await rankCandidatesWithReport({ observed: [A] }, deps);
      expect(response.candidates.length).toBeGreaterThan(0);
      expect(enrichment.complete).toBe(false);
      for (const c of response.candidates) expect(c.sources).toEqual(["monarch-semsim"]);
      expect(m.calls.some((u) => u.includes("ontology.jax.org"))).toBe(false); // refused before any call
    } finally {
      Date.now = realNow;
    }
  });
});
