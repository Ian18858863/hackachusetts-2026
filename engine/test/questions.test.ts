// nextQuestions with a mocked fetch. ALL DATA HERE IS SYNTHETIC: HPO-shaped
// ids in the HP:99xxxxx range, diseases ORPHA:9000001..5 / OMIM:9000001..5
// with invented frequencies. Property tests generate whole ontologies and
// annotation sets, so the rules are checked on inputs nobody picked by hand.

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { InvalidInput, UpstreamError } from "../errors";
import {
  ENGINE_SUBREQUEST_CAP,
  MIDPOINT,
  MIN_SCORE,
  UNSPECIFIED_MIDPOINT,
  nextQuestions,
  nextQuestionsWithReport,
} from "../questions";
import type { EngineDeps, FetchLike, FrequencyLabel } from "../types";

// ------------------------------------------------------------ synthetic world

interface World {
  parent: Record<string, string | null>; // term -> parent (single-parent tree is enough to test the rules)
  diseases: Record<string, Array<{ id: string; freq: string; category?: string }>>;
  /** ORPHA id -> its MONDO entity and linked OMIM id (Monarch mapping + entity xrefs). Unlisted ORPHA ids have no partner. */
  links?: Record<string, { mondo: string; omim: string | null; jaxMondo?: boolean }>;
}

const term = (n: number) => `HP:99${String(n).padStart(5, "0")}`;

function ancestors(w: World, id: string): string[] {
  const out: string[] = [];
  let p = w.parent[id] ?? null;
  while (p) {
    out.push(p);
    p = w.parent[p] ?? null;
  }
  return out;
}

interface MockOpts {
  failAnnotation?: Set<string>; // 503 for these disease ids
  failMonarch?: boolean; // 503 for every Monarch mapping / entity call
  failAncestors?: Set<string>; // 503 for these term ids
  notFound?: Set<string>; // 404 for these disease ids
  delayMs?: number;
}

function mockWorld(w: World, opts: MockOpts = {}): { deps: EngineDeps; calls: string[] } {
  const calls: string[] = [];
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
  const fetch: FetchLike = async (input) => {
    calls.push(input);
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    const url = new URL(input);
    const anc = /^\/api\/hp\/terms\/(.+)\/ancestors$/.exec(url.pathname);
    if (anc) {
      const id = decodeURIComponent(anc[1] ?? "");
      if (opts.failAncestors?.has(id)) return json({}, 503);
      if (!(id in w.parent)) return json({ message: "bad id" }, 400);
      return json(ancestors(w, id).map((a) => ({ id: a, name: `label ${a}` })));
    }
    if (url.hostname === "api.monarchinitiative.org") {
      if (opts.failMonarch) return json({}, 503);
      const links = w.links ?? {};
      if (url.pathname === "/v3/api/mappings") {
        const orphanet = url.searchParams.get("entity_id") ?? "";
        const orpha = orphanet.replace(/^Orphanet:/, "ORPHA:");
        const l = links[orpha];
        return json({ items: l ? [{ subject_id: l.mondo, predicate_id: "skos:exactMatch", object_id: orphanet }] : [], total: l ? 1 : 0 });
      }
      const ent = /^\/v3\/api\/entity\/(.+)$/.exec(url.pathname);
      if (ent) {
        const mondo = decodeURIComponent(ent[1] ?? "");
        const hit = Object.entries(links).find(([, l]) => l.mondo === mondo);
        if (!hit) return json({ detail: "not found" }, 404);
        const [orpha, l] = hit;
        return json({ id: mondo, name: `mondo name of ${orpha}`, xref: [orpha.replace("ORPHA:", "Orphanet:"), ...(l.omim ? [l.omim] : [])] });
      }
      return json({}, 404);
    }
    const ann = /^\/api\/network\/annotation\/(.+)$/.exec(url.pathname);
    if (ann) {
      const id = decodeURIComponent(ann[1] ?? "");
      if (opts.failAnnotation?.has(id)) return json({}, 503);
      const rows = w.diseases[id];
      if (!rows || opts.notFound?.has(id)) return json({ message: "not found" }, 404);
      const categories: Record<string, unknown[]> = {};
      for (const r of rows) (categories[r.category ?? "Limbs"] ??= []).push({ id: r.id, name: `label ${r.id}`, metadata: { frequency: r.freq } });
      const jaxMondo = Object.entries(w.links ?? {}).find(([o, l]) => o === id && l.jaxMondo)?.[1].mondo;
      return json({ disease: { id, name: `Synthetic ${id}`, ...(jaxMondo ? { mondoId: jaxMondo } : {}) }, categories, genes: [] });
    }
    return json({}, 404);
  };
  return { deps: { fetch, now: () => new Date("2026-10-24T19:00:00.000Z") }, calls };
}

// A small fixed world for unit tests:
//   1 (root-ish) -> 2 -> 3 -> 4,  1 -> 5 -> 6,  1 -> 7,  1 -> 8 -> 9
const W: World = {
  parent: { [term(1)]: null, [term(2)]: term(1), [term(3)]: term(2), [term(4)]: term(3), [term(5)]: term(1), [term(6)]: term(5), [term(7)]: term(1), [term(8)]: term(1), [term(9)]: term(8) },
  diseases: {
    "ORPHA:9000001": [
      { id: term(4), freq: "Very frequent" },
      { id: term(6), freq: "Obligate" },
      { id: term(7), freq: "Frequent" },
      { id: term(9), freq: "Very frequent" },
      { id: "HP:9900020", freq: "", category: "Inheritance" },
    ],
    "OMIM:9000002": [
      { id: term(7), freq: "1/10" },
      { id: term(2), freq: "" },
    ],
    "ORPHA:9000003": [{ id: term(6), freq: "Occasional" }],
  },
};
W.parent["HP:9900020"] = null;

describe.concurrent("nextQuestions: request", () => {
  it("validates input", async () => {
    const { deps } = mockWorld(W);
    const ok = { observed: [term(3)], candidates: ["ORPHA:9000001", "OMIM:9000002"] };
    await expect(nextQuestions({ ...ok, observed: [] }, deps)).rejects.toBeInstanceOf(InvalidInput);
    await expect(nextQuestions({ ...ok, candidates: ["ORPHA:9000001"] }, deps)).rejects.toBeInstanceOf(InvalidInput);
    await expect(nextQuestions({ ...ok, candidates: ["ORPHA:9000001", "ORPHA:9000001"] }, deps)).rejects.toBeInstanceOf(InvalidInput);
    await expect(nextQuestions({ ...ok, candidates: ["ORPHA:9000001", "Orphanet:1"] }, deps)).rejects.toBeInstanceOf(InvalidInput);
    await expect(nextQuestions({ ...ok, excluded: [term(3)] }, deps)).rejects.toBeInstanceOf(InvalidInput);
    await expect(nextQuestions({ ...ok, limit: 9 }, deps)).rejects.toBeInstanceOf(InvalidInput);
  });
});

describe.concurrent("nextQuestions: method (contract 7.5)", () => {
  it("scores the spread, applies the hierarchy filter, builds questions from data", async () => {
    // observed 3: drops 4 (descendant of 3) and 2 (ancestor of 3); excluded 5: drops 6 (descendant of 5)
    const { response, report } = await nextQuestionsWithReport(
      { observed: [term(3)], excluded: [term(5)], candidates: ["ORPHA:9000001", "OMIM:9000002"], limit: 5 },
      mockWorld(W).deps,
    );
    expect(response.source).toBe("live");
    expect(response.dataVersions).toEqual({ hpo: "2026-09-01", fetchedAt: "2026-10-24T19:00:00.000Z" });
    expect(response.questions.map((q) => [q.hpoId, q.score])).toEqual([
      [term(9), 0.9], // Very frequent 0.9 vs not listed 0
      [term(7), 0.38], // Frequent 0.55 vs 1/10 = 10 % -> Occasional 0.17
    ]);
    const q7 = response.questions.find((q) => q.hpoId === term(7))!;
    expect(q7.discriminates).toEqual([
      { diseaseId: "ORPHA:9000001", frequency: { label: "Frequent", source: "ORPHA:9000001" } },
      { diseaseId: "OMIM:9000002", frequency: { label: "Occasional", raw: "1/10", source: "OMIM:9000002" } },
    ]);
    expect(q7.why).toBe("Frequent in Synthetic ORPHA:9000001; Occasional (1/10) in Synthetic OMIM:9000002");
    expect(q7.question).toBe(`Has anyone noticed label ${term(7)}?`);
    expect(report.hierarchy.dropped).toEqual(
      expect.arrayContaining([
        { hpoId: term(4), reason: "descendant-of-observed", relatedTo: term(3) },
        { hpoId: term(6), reason: "descendant-of-excluded", relatedTo: term(5) },
      ]),
    );
    expect(report.complete).toBe(true);
  });

  it("drops an ancestor of an observed term, keeps an ancestor of an excluded term", async () => {
    // observed 4 makes 2 (its ancestor) a duplicate; excluded 3 does not rule out its ancestor 2? 2 is still an ancestor of observed 4.
    const r1 = await nextQuestionsWithReport({ observed: [term(4)], candidates: ["ORPHA:9000001", "OMIM:9000002"] }, mockWorld(W).deps);
    expect(r1.report.hierarchy.dropped).toContainEqual({ hpoId: term(2), reason: "ancestor-of-observed", relatedTo: term(4) });
    // excluded 3 only: 2 is its ancestor and is kept ("no X" does not rule out a broader feature)
    const r2 = await nextQuestions({ observed: [term(9)], excluded: [term(3)], candidates: ["ORPHA:9000001", "OMIM:9000002"] }, mockWorld(W).deps);
    expect(r2.questions.map((q) => q.hpoId)).toContain(term(2));
    expect(r2.questions.find((q) => q.hpoId === term(2))!.score).toBe(UNSPECIFIED_MIDPOINT);
  });

  it("never asks about inheritance or onset rows", async () => {
    const r = await nextQuestions({ observed: [term(8)], candidates: ["ORPHA:9000001", "OMIM:9000002"], limit: 8 }, mockWorld(W).deps);
    expect(r.questions.map((q) => q.hpoId)).not.toContain("HP:9900020");
  });
});

describe.concurrent("nextQuestions: missing data is never filled in", () => {
  it("a failed candidate takes no part: frequency null, not named in why, report incomplete", async () => {
    const { response, report } = await nextQuestionsWithReport(
      { observed: [term(8)], candidates: ["ORPHA:9000001", "OMIM:9000002", "ORPHA:9000003"] },
      mockWorld(W, { failAnnotation: new Set(["ORPHA:9000003"]) }).deps,
    );
    expect(report.complete).toBe(false);
    expect(report.candidates[2]).toMatchObject({ diseaseId: "ORPHA:9000003", status: "failed", participates: false });
    for (const q of response.questions) {
      expect(q.discriminates[2]).toEqual({ diseaseId: "ORPHA:9000003", frequency: null });
      expect(q.why).not.toContain("ORPHA:9000003");
    }
  });

  it("a MONDO candidate or a 404 is reported, not guessed, and makes coverage partial", async () => {
    const { response, report } = await nextQuestionsWithReport(
      { observed: [term(8)], candidates: ["ORPHA:9000001", "OMIM:9000002", "MONDO:9000009", "OMIM:9000008"] },
      mockWorld(W).deps,
    );
    expect(report.candidates.map((c) => [c.diseaseId, c.status, c.participates])).toEqual([
      ["ORPHA:9000001", "ok", true],
      ["OMIM:9000002", "ok", true],
      ["MONDO:9000009", "not-applicable", false],
      ["OMIM:9000008", "not-found", false],
    ]);
    expect(report.coverage).toEqual({ requested: 4, participating: 2, full: false });
    expect(report.complete).toBe(false);
    for (const q of response.questions) {
      expect(q.discriminates.slice(2)).toEqual([
        { diseaseId: "MONDO:9000009", frequency: null },
        { diseaseId: "OMIM:9000008", frequency: null },
      ]);
      expect(q.why).not.toMatch(/MONDO:9000009|OMIM:9000008/);
    }
  });

  it("a candidate 404 alone: partial coverage, no failure status", async () => {
    const { report } = await nextQuestionsWithReport(
      { observed: [term(8)], candidates: ["ORPHA:9000001", "OMIM:9000002", "ORPHA:9000003"] },
      mockWorld(W, { notFound: new Set(["ORPHA:9000003"]) }).deps,
    );
    expect(report.candidates[2]).toMatchObject({ status: "not-found", participates: false });
    expect(report.candidates.some((c) => c.status === "failed")).toBe(false);
    expect(report.coverage.full).toBe(false);
    expect(report.complete).toBe(false);
  });

  it("all candidates with data and all checks run: complete and full coverage", async () => {
    const { report } = await nextQuestionsWithReport(
      { observed: [term(8)], candidates: ["ORPHA:9000001", "OMIM:9000002", "ORPHA:9000003"] },
      mockWorld(W).deps,
    );
    expect(report.coverage).toEqual({ requested: 3, participating: 3, full: true });
    expect(report.complete).toBe(true);
  });

  it("fewer than two candidates with data because of failures -> UpstreamError", async () => {
    await expect(
      nextQuestions({ observed: [term(8)], candidates: ["ORPHA:9000001", "OMIM:9000002"] }, mockWorld(W, { failAnnotation: new Set(["OMIM:9000002"]) }).deps),
    ).rejects.toBeInstanceOf(UpstreamError);
  });

  it("fewer than two with data and no failure -> a real empty answer", async () => {
    const r = await nextQuestions({ observed: [term(8)], candidates: ["ORPHA:9000001", "OMIM:9000008"] }, mockWorld(W).deps);
    expect(r.questions).toEqual([]);
  });

  it("a failed hierarchy lookup keeps the feature and marks it unchecked", async () => {
    const { response, report } = await nextQuestionsWithReport(
      { observed: [term(3)], candidates: ["ORPHA:9000001", "OMIM:9000002"] },
      mockWorld(W, { failAncestors: new Set([term(9)]) }).deps,
    );
    expect(response.questions.map((q) => q.hpoId)).toContain(term(9));
    expect(report.hierarchy.uncheckedReturned).toContain(term(9));
    expect(report.complete).toBe(false);
  });
});

// --------------------------------------------------------------- properties

const BANDS: readonly string[] = ["Obligate", "Very frequent", "Frequent", "Occasional", "Very rare", "Excluded", "", "3/4", "1/20", "7/7"];

/** A random forest of up to 25 terms plus 2-5 diseases annotating random subsets. */
const worldArb = fc
  .record({
    size: fc.integer({ min: 4, max: 25 }),
    parents: fc.array(fc.nat(), { minLength: 25, maxLength: 25 }),
    roots: fc.array(fc.boolean(), { minLength: 25, maxLength: 25 }),
    nDiseases: fc.integer({ min: 2, max: 5 }),
    annotations: fc.array(fc.array(fc.tuple(fc.nat(), fc.constantFrom(...BANDS)), { maxLength: 12 }), { minLength: 5, maxLength: 5 }),
  })
  .map(({ size, parents, roots, nDiseases, annotations }) => {
    const parent: World["parent"] = {};
    for (let i = 0; i < size; i++) parent[term(i)] = i === 0 || roots[i] ? null : term((parents[i] ?? 0) % i);
    const diseases: World["diseases"] = {};
    const ids: string[] = [];
    for (let d = 0; d < nDiseases; d++) {
      const id = d % 2 === 0 ? `ORPHA:900000${d + 1}` : `OMIM:900000${d + 1}`;
      ids.push(id);
      const seen = new Set<string>();
      diseases[id] = (annotations[d] ?? [])
        .map(([t, freq]) => ({ id: term(t % size), freq }))
        .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    }
    return { world: { parent, diseases } as World, size, candidates: ids };
  });

const caseArb = worldArb.chain((w) =>
  fc
    .record({
      observed: fc.uniqueArray(fc.integer({ min: 0, max: w.size - 1 }), { minLength: 1, maxLength: 4 }),
      excluded: fc.uniqueArray(fc.integer({ min: 0, max: w.size - 1 }), { maxLength: 3 }),
      limit: fc.integer({ min: 1, max: 8 }),
    })
    .map((r) => ({
      ...w,
      observed: r.observed.map(term),
      excluded: r.excluded.map(term).filter((x) => !r.observed.map(term).includes(x)),
      limit: r.limit,
    })),
);

describe.concurrent("nextQuestions: properties (contract 7.5, section 11 P9)", () => {
  it("P9 + hierarchy: never a reported term, its descendant, an observed term's ancestor; one discriminator per candidate", async () => {
    await fc.assert(
      fc.asyncProperty(caseArb, async (c) => {
        const r = await nextQuestions({ observed: c.observed, excluded: c.excluded, candidates: c.candidates, limit: c.limit }, mockWorld(c.world).deps);
        for (const q of r.questions) {
          expect(c.observed).not.toContain(q.hpoId);
          expect(c.excluded).not.toContain(q.hpoId);
          const anc = ancestors(c.world, q.hpoId);
          for (const o of c.observed) {
            expect(anc).not.toContain(o); // not a descendant of an observed term
            expect(ancestors(c.world, o)).not.toContain(q.hpoId); // not an ancestor of one
          }
          for (const e of c.excluded) expect(anc).not.toContain(e); // not a descendant of an excluded term
          expect(q.discriminates.map((d) => d.diseaseId)).toEqual(c.candidates);
        }
      }),
      { numRuns: 200, seed: 20261024 },
    );
  });

  it("limits and order: at most `limit`, score >= 0.35, score desc then id asc", async () => {
    await fc.assert(
      fc.asyncProperty(caseArb, async (c) => {
        const r = await nextQuestions({ observed: c.observed, excluded: c.excluded, candidates: c.candidates, limit: c.limit }, mockWorld(c.world).deps);
        expect(r.questions.length).toBeLessThanOrEqual(c.limit);
        r.questions.forEach((q, i) => {
          expect(q.score).toBeGreaterThanOrEqual(MIN_SCORE);
          const p = r.questions[i - 1];
          if (p) expect(p.score > q.score || (p.score === q.score && p.hpoId < q.hpoId)).toBe(true);
        });
      }),
      { numRuns: 200, seed: 20261024 },
    );
  });

  it("deterministic: same upstream data -> same output for any order or duplication of observed/excluded", async () => {
    await fc.assert(
      fc.asyncProperty(caseArb, fc.integer(), async (c, seed) => {
        const shuffle = (xs: string[]) => xs.map((x, i) => ({ x, k: Math.sin(seed + i) })).sort((a, b) => a.k - b.k).map((o) => o.x);
        const a = await nextQuestions({ observed: c.observed, excluded: c.excluded, candidates: c.candidates, limit: c.limit }, mockWorld(c.world).deps);
        const b = await nextQuestions(
          { observed: shuffle([...c.observed, ...c.observed]), excluded: shuffle([...c.excluded, ...c.excluded]), candidates: c.candidates, limit: c.limit },
          mockWorld(c.world).deps,
        );
        expect(b).toEqual(a);
      }),
      { numRuns: 100, seed: 20261024 },
    );
  });

  it("no fabricated frequencies: every frequency, score and why phrase traces to the annotation rows", async () => {
    await fc.assert(
      fc.asyncProperty(caseArb, async (c) => {
        const r = await nextQuestions({ observed: c.observed, excluded: c.excluded, candidates: c.candidates, limit: c.limit }, mockWorld(c.world).deps);
        for (const q of r.questions) {
          const mids: number[] = [];
          for (const d of q.discriminates) {
            const row = c.world.diseases[d.diseaseId]?.find((x) => x.id === q.hpoId);
            if (!row) {
              expect(d.frequency).toBeNull();
              if ((c.world.diseases[d.diseaseId] ?? []).length > 0) mids.push(0);
              continue;
            }
            expect(d.frequency?.source).toBe(d.diseaseId);
            expect(d.frequency?.raw ?? d.frequency?.label ?? "").toBe(row.freq);
            mids.push(d.frequency?.label ? MIDPOINT[d.frequency.label as FrequencyLabel] : UNSPECIFIED_MIDPOINT);
          }
          expect(q.score).toBe(Math.round((Math.max(...mids) - Math.min(...mids)) * 1000) / 1000);
          expect(q.why).not.toMatch(/absent in|%|probab/i);
        }
      }),
      { numRuns: 200, seed: 20261024 },
    );
  });

  it.concurrent(`subrequest cap: never more than ${ENGINE_SUBREQUEST_CAP} fetch calls, retries included, even when upstream fails`, async () => {
    await fc.assert(
      fc.asyncProperty(
        caseArb,
        fc.boolean(),
        fc.boolean(),
        async (c, failSomeAnnotations, failAllAncestors) => {
          const failAnnotation = failSomeAnnotations ? new Set(c.candidates.slice(2)) : new Set<string>();
          const failAncestors = failAllAncestors ? new Set(Object.keys(c.world.parent)) : new Set<string>();
          const m = mockWorld(c.world, { failAnnotation, failAncestors });
          const outcome = await nextQuestionsWithReport(
            { observed: c.observed, excluded: c.excluded, candidates: c.candidates, limit: 8 },
            m.deps,
          ).catch((e: unknown) => e);
          expect(m.calls.length).toBeLessThanOrEqual(ENGINE_SUBREQUEST_CAP);
          if (!(outcome instanceof Error)) {
            const ok = outcome as Awaited<ReturnType<typeof nextQuestionsWithReport>>;
            expect(ok.report.subrequests.used).toBe(m.calls.length);
          }
        },
      ),
      // Failing calls wait the real 300 ms retry backoff, so fewer runs and a longer timeout.
      { numRuns: 30, seed: 20261024 },
    );
  }, 120_000);
});

describe.concurrent("nextQuestions: budgets", () => {
  it("a wide request stays under the cap and keeps the rest unchecked rather than failing", async () => {
    // 50 observed terms + 5 candidates with 40 features each would need ~100 calls without a cap
    const parent: World["parent"] = {};
    for (let i = 0; i < 300; i++) parent[term(i)] = i === 0 ? null : term(0);
    const diseases: World["diseases"] = {};
    for (let d = 1; d <= 5; d++) diseases[`ORPHA:900000${d}`] = Array.from({ length: 40 }, (_, k) => ({ id: term(100 + d * 40 + k), freq: "Obligate" }));
    const m = mockWorld({ parent, diseases });
    const observed = Array.from({ length: 50 }, (_, i) => term(i + 1));
    const { response, report } = await nextQuestionsWithReport(
      { observed, candidates: Object.keys(diseases), limit: 8 },
      m.deps,
    );
    expect(m.calls.length).toBeLessThanOrEqual(ENGINE_SUBREQUEST_CAP);
    expect(response.questions).toHaveLength(8);
    expect(report.complete).toBe(false); // some observed ancestors could not be fetched
    expect(report.hierarchy.uncheckedReturned.length).toBeGreaterThan(0);
  });

  it("slow upstream: finishes inside the 5 s budget", async () => {
    const t0 = Date.now();
    const m = mockWorld(W, { delayMs: 400 });
    await nextQuestionsWithReport({ observed: [term(3)], candidates: ["ORPHA:9000001", "OMIM:9000002"], limit: 8 }, m.deps);
    expect(Date.now() - t0).toBeLessThan(5000);
  });
});

// ------------------------------------------------- five-second budget (real timers)

/** A fetch that never answers and ignores its abort signal (the worst case). */
const hangForever: FetchLike = () => new Promise<Response>(() => {});

/** Wrap mockWorld's fetch: hang or fail for some URLs, record when each call started. */
function harness(
  w: World,
  rule: (url: string) => "hang" | "fail" | { delayMs: number } | null,
): { deps: EngineDeps; starts: number[]; urls: string[]; t0: number } {
  const base = mockWorld(w).deps.fetch;
  const t0 = Date.now();
  const starts: number[] = [];
  const urls: string[] = [];
  const fetch: FetchLike = async (input, init) => {
    starts.push(Date.now() - t0);
    urls.push(input);
    const r = rule(input);
    if (r === "hang") return hangForever(input, init);
    if (r === "fail") return new Response("{}", { status: 503 });
    if (r) await new Promise((res) => setTimeout(res, r.delayMs));
    return base(input, init);
  };
  return { deps: { fetch, now: () => new Date("2026-10-24T19:00:00.000Z") }, starts, urls, t0 };
}

// Whole operation, end to end: strictly under the 5 s budget (no slack).
const BUDGET_MS = 5000;

describe.concurrent("nextQuestions: five-second budget", () => {
  it("every request hangs (and ignores its signal): returns an upstream error within the budget", async () => {
    const h = harness(W, () => "hang");
    const t0 = Date.now();
    const err = await nextQuestions({ observed: [term(3)], candidates: ["ORPHA:9000001", "OMIM:9000002"] }, h.deps).catch((e: unknown) => e);
    const took = Date.now() - t0;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).name).toBe("UpstreamTimeout");
    expect(took).toBeLessThan(BUDGET_MS);
    for (const s of h.starts) expect(s).toBeLessThan(5000);
  }, 15_000);

  it("ancestor lookups hang: the questions still come back inside 5 s, unchecked, report incomplete", async () => {
    const h = harness(W, (u) => (u.includes("/ancestors") ? "hang" : null));
    const t0 = Date.now();
    const { response, report } = await nextQuestionsWithReport({ observed: [term(3)], candidates: ["ORPHA:9000001", "OMIM:9000002"] }, h.deps);
    expect(Date.now() - t0).toBeLessThan(BUDGET_MS);
    expect(response.questions.length).toBeGreaterThan(0);
    expect(report.hierarchy.failedLookups).toBeGreaterThan(0);
    expect(report.complete).toBe(false);
    for (const s of report.subrequests.startedAtMs) expect(s).toBeLessThan(5000);
  }, 15_000);

  it("repeated 503s: one retry per call at most, never past the cap or the deadline", async () => {
    const h = harness(W, (u) => (u.includes("/ancestors") ? "fail" : null));
    const t0 = Date.now();
    const { report } = await nextQuestionsWithReport({ observed: [term(3)], candidates: ["ORPHA:9000001", "OMIM:9000002"], limit: 8 }, h.deps);
    expect(Date.now() - t0).toBeLessThan(BUDGET_MS);
    const ancestorCalls = h.urls.filter((u) => u.includes("/ancestors")).length;
    expect(ancestorCalls).toBeLessThanOrEqual(2 * report.hierarchy.lookups); // first try + one retry
    expect(h.starts.length).toBeLessThanOrEqual(ENGINE_SUBREQUEST_CAP);
    expect(report.hierarchy.failedLookups).toBe(report.hierarchy.lookups);
  }, 15_000);

  it("retries near the deadline: no call starts at or after 5 s", async () => {
    // Annotations answer at ~4.6 s; ancestor calls then fail fast, so any retry would land near 5 s.
    const h = harness(W, (u) => (u.includes("/annotation/") ? { delayMs: 4600 } : u.includes("/ancestors") ? "fail" : null));
    const deps: EngineDeps = { ...h.deps, timeoutsMs: { hpoAnnotation: 5000 } };
    const t0 = Date.now();
    const { report } = await nextQuestionsWithReport({ observed: [term(3)], candidates: ["ORPHA:9000001", "OMIM:9000002"] }, deps);
    expect(Date.now() - t0).toBeLessThan(BUDGET_MS);
    for (const s of h.starts) expect(s).toBeLessThan(5000);
    expect(report.complete).toBe(false);
  }, 15_000);

  it("too little time left for the hierarchy: filter skipped, scored list returned unfiltered, reported", async () => {
    const h = harness(W, (u) => (u.includes("/annotation/") ? { delayMs: 4800 } : null));
    const deps: EngineDeps = { ...h.deps, timeoutsMs: { hpoAnnotation: 5000 } };
    const { response, report } = await nextQuestionsWithReport({ observed: [term(3)], candidates: ["ORPHA:9000001", "OMIM:9000002"], limit: 8 }, deps);
    expect(report.hierarchy.ran).toBe(false);
    expect(report.hierarchy.lookups).toBe(0);
    expect(h.urls.filter((u) => u.includes("/ancestors"))).toEqual([]); // no ancestor call was started
    expect(response.questions.map((q) => q.hpoId)).toContain(term(4)); // unfiltered: the descendant of term 3 is kept
    expect(report.warnings.join(" ")).toMatch(/hierarchy check could not run/i);
    expect(report.complete).toBe(false);
  }, 15_000);

  // Total wall-clock time, not only start times (found 2026-10-24 15:27 ET: these
  // two cases returned at 5004-5006 ms before FINISH_MARGIN_MS was added).
  it.each([
    ["a lookup starts just before the deadline and then hangs", 4750, "hang" as const],
    ["a lookup starts at ~4.6 s, answers nothing, hangs", 4600, "hang" as const],
    ["lookups fail with retry backoff near the deadline", 4500, "fail" as const],
    ["lookups fail with retry backoff mid-budget", 2500, "fail" as const],
  ])("%s: whole call finishes strictly under 5 s", async (_name, annDelay, ancestors) => {
    const h = harness(W, (u) => (u.includes("/annotation/") ? { delayMs: annDelay } : u.includes("/ancestors") ? ancestors : null));
    const deps: EngineDeps = { ...h.deps, timeoutsMs: { hpoAnnotation: 5000 } };
    const t0 = Date.now();
    const { response, report } = await nextQuestionsWithReport({ observed: [term(3)], candidates: ["ORPHA:9000001", "OMIM:9000002"], limit: 8 }, deps);
    expect(Date.now() - t0).toBeLessThan(BUDGET_MS);
    expect(response.questions.length).toBeGreaterThan(0); // unchecked questions are kept (7.5 step 5)
    expect(report.complete).toBe(false);
  }, 15_000);

  it("the annotation request itself hangs: UpstreamTimeout strictly under 5 s", async () => {
    const h = harness(W, (u) => (u.includes("/annotation/") ? "hang" : null));
    const deps: EngineDeps = { ...h.deps, timeoutsMs: { hpoAnnotation: 5000 } };
    const t0 = Date.now();
    const err = await nextQuestions({ observed: [term(3)], candidates: ["ORPHA:9000001", "OMIM:9000002"] }, deps).catch((e: unknown) => e);
    expect((err as Error).name).toBe("UpstreamTimeout");
    expect(Date.now() - t0).toBeLessThan(BUDGET_MS);
  }, 15_000);

  it("the cap is reached: exactly 40 calls, the rest refused without touching the network", async () => {
    const parent: World["parent"] = {};
    for (let i = 0; i < 300; i++) parent[term(i)] = i === 0 ? null : term(0);
    const diseases: World["diseases"] = {};
    for (let d = 1; d <= 5; d++) diseases[`ORPHA:900000${d}`] = Array.from({ length: 40 }, (_, k) => ({ id: term(100 + d * 40 + k), freq: "Obligate" }));
    const m = mockWorld({ parent, diseases });
    const { report } = await nextQuestionsWithReport(
      { observed: Array.from({ length: 50 }, (_, i) => term(i + 1)), candidates: Object.keys(diseases), limit: 8 },
      m.deps,
    );
    // The planner sizes its batches to the budget left, so it stops at exactly
    // the cap instead of trying a 41st call; the rest stay unchecked.
    expect(m.calls.length).toBe(ENGINE_SUBREQUEST_CAP);
    expect(report.subrequests.used).toBe(ENGINE_SUBREQUEST_CAP);
    expect(report.hierarchy.uncheckedReturned.length).toBeGreaterThan(0);
  });

  it("retries that would pass the cap are refused without a network call", async () => {
    const parent: World["parent"] = {};
    for (let i = 0; i < 300; i++) parent[term(i)] = i === 0 ? null : term(0);
    const diseases: World["diseases"] = {};
    for (let d = 1; d <= 5; d++) diseases[`ORPHA:900000${d}`] = Array.from({ length: 40 }, (_, k) => ({ id: term(100 + d * 40 + k), freq: "Obligate" }));
    const m = mockWorld({ parent, diseases }, { failAncestors: new Set(Object.keys(parent)) });
    const { report } = await nextQuestionsWithReport(
      { observed: Array.from({ length: 50 }, (_, i) => term(i + 1)), candidates: Object.keys(diseases), limit: 8 },
      m.deps,
    );
    expect(m.calls.length).toBe(ENGINE_SUBREQUEST_CAP);
    expect(report.subrequests.refused).toBeGreaterThan(0); // retries asked for more than the cap allowed
    expect(report.subrequests.used + report.subrequests.refused).toBeGreaterThan(ENGINE_SUBREQUEST_CAP);
  }, 15_000);
});

// ------------------------------------- R6.1: ORPHA candidates read their linked OMIM set

// Real identifiers; the mocked rows are trimmed copies of what the live APIs
// returned on 2026-10-24 (15:52 ET):
// - JAX ORPHA:488650 has mondoId MONDO:0013686 and does NOT list HP:0008981;
//   Monarch entity MONDO:0013686 xrefs OMIM:614321 and Orphanet:488650;
//   JAX OMIM:614321 lists HP:0008981 (Limbs) with frequency "".
// - JAX ORPHA:206564 answers 404; Monarch maps Orphanet:206564 (skos:exactMatch)
//   to MONDO:0013161, whose xrefs include OMIM:613157;
//   JAX OMIM:613157 lists HP:0008981 with frequency "1/1" and HP:0001270 with "Occasional".
const CALF = "HP:0008981"; // Calf muscle hypertrophy
const MOTOR = "HP:0001270"; // Motor delay
const REAL: World = {
  parent: { [CALF]: null, [MOTOR]: null, [term(1)]: null },
  diseases: {
    "ORPHA:488650": [], // trimmed: the live set has 18 rows, none of them HP:0008981
    "OMIM:614321": [{ id: CALF, freq: "" }],
    "OMIM:613157": [{ id: CALF, freq: "1/1" }, { id: MOTOR, freq: "Occasional" }],
  },
  links: {
    "ORPHA:488650": { mondo: "MONDO:0013686", omim: "OMIM:614321", jaxMondo: true },
    "ORPHA:206564": { mondo: "MONDO:0013161", omim: "OMIM:613157" },
  },
};
const REAL_REQ = { observed: [term(1)], candidates: ["ORPHA:488650", "ORPHA:206564"], limit: 5 };

describe.concurrent("R6.1 linked OMIM evidence", () => {
  it("ORPHA:488650: HP:0008981 from linked OMIM:614321 is evidence, never 'not listed'", async () => {
    const { response, report } = await nextQuestionsWithReport(REAL_REQ, mockWorld(REAL).deps);
    const q = response.questions.find((x) => x.hpoId === CALF)!;
    expect(q).toBeDefined();
    expect(q.discriminates[0]).toEqual({ diseaseId: "ORPHA:488650", frequency: { label: null, source: "OMIM:614321" } });
    expect(q.why).not.toMatch(/not listed for mondo name of ORPHA:488650/);
    expect(q.why).toMatch(/listed without a frequency for (mondo name of |Synthetic )ORPHA:488650/i);
    // Before the fix ORPHA:488650 counted as "not listed" (0) against Obligate (1.0): score 1. Now 1.0 - 0.5.
    expect(q.score).toBe(0.5);
    expect(report.candidates[0]).toMatchObject({ partner: { id: "OMIM:614321", status: "ok" }, sources: ["ORPHA:488650", "OMIM:614321"] });
  });

  it("ORPHA:206564: no ORPHA record (404), frequency comes from linked OMIM:613157, normalised", async () => {
    const { response, report } = await nextQuestionsWithReport(REAL_REQ, mockWorld(REAL).deps);
    const q = response.questions.find((x) => x.hpoId === CALF)!;
    expect(q.discriminates[1]).toEqual({ diseaseId: "ORPHA:206564", frequency: { label: "Obligate", raw: "1/1", source: "OMIM:613157" } });
    expect(report.candidates[1]).toMatchObject({ status: "not-found", participates: true, partner: { id: "OMIM:613157", status: "ok" }, sources: ["OMIM:613157"] });
    expect(report.complete).toBe(true);
  });

  it("ORPHA frequency null + OMIM banded: the OMIM band is used, with its own source (synthetic ids)", async () => {
    const w: World = {
      parent: { [term(1)]: null, [term(2)]: null },
      diseases: {
        "ORPHA:9000001": [{ id: term(2), freq: "" }],
        "OMIM:9000011": [{ id: term(2), freq: "9/10" }],
        "OMIM:9000002": [{ id: term(1), freq: "Frequent" }],
      },
      links: { "ORPHA:9000001": { mondo: "MONDO:9000001", omim: "OMIM:9000011" } },
    };
    const r = await nextQuestions({ observed: [term(9)], candidates: ["ORPHA:9000001", "OMIM:9000002"] }, mockWorld({ ...w, parent: { ...w.parent, [term(9)]: null } }).deps);
    const q = r.questions.find((x) => x.hpoId === term(2))!;
    expect(q.discriminates[0]!.frequency).toEqual({ label: "Very frequent", raw: "9/10", source: "OMIM:9000011" });
  });

  it("ORPHA band takes precedence when both sets have a usable frequency (synthetic ids)", async () => {
    const w: World = {
      parent: { [term(1)]: null, [term(2)]: null, [term(9)]: null },
      diseases: {
        "ORPHA:9000001": [{ id: term(2), freq: "Occasional" }],
        "OMIM:9000011": [{ id: term(2), freq: "10/10" }],
        "OMIM:9000002": [{ id: term(2), freq: "Obligate" }],
      },
      links: { "ORPHA:9000001": { mondo: "MONDO:9000001", omim: "OMIM:9000011" } },
    };
    const r = await nextQuestions({ observed: [term(9)], candidates: ["ORPHA:9000001", "OMIM:9000002"] }, mockWorld(w).deps);
    const q = r.questions.find((x) => x.hpoId === term(2))!;
    expect(q.discriminates[0]!.frequency).toEqual({ label: "Occasional", source: "ORPHA:9000001" });
    expect(q.score).toBe(0.83); // 1.0 - 0.17, the OMIM 10/10 is not used
  });

  it.each([
    ["the Monarch link lookup fails", { failMonarch: true }],
    ["the linked OMIM annotation call fails", { failAnnotation: new Set(["OMIM:614321"]) }],
  ])("%s: no negative evidence is invented for ORPHA:488650", async (_n, opts) => {
    // ORPHA:488650's own set lists one unrelated term so it still participates
    const w: World = { ...REAL, parent: { ...REAL.parent, "HP:0003236": null }, diseases: { ...REAL.diseases, "ORPHA:488650": [{ id: "HP:0003236", freq: "Frequent" }] } };
    const { response, report } = await nextQuestionsWithReport({ ...REAL_REQ, candidates: ["ORPHA:488650", "OMIM:613157"] }, mockWorld(w, opts).deps);
    expect(report.complete).toBe(false);
    expect(report.warnings.join(" ")).toMatch(/ORPHA:488650: only part of its HPO annotations could be read/);
    const q = response.questions.find((x) => x.hpoId === CALF);
    // HP:0008981 is only in OMIM:613157; with ORPHA:488650 unknown there is nothing to compare, so no question is made
    expect(q).toBeUndefined();
    for (const x of response.questions) {
      expect(x.why).not.toMatch(/not listed for (mondo name of |Synthetic )?ORPHA:488650/);
      if (x.discriminates[0]!.frequency === null) expect(x.why).not.toMatch(/ORPHA:488650/);
    }
  });

  it("both candidates lose data to failures: UpstreamError, never an answer built on gaps", async () => {
    await expect(
      nextQuestions({ ...REAL_REQ }, mockWorld({ ...REAL, diseases: { ...REAL.diseases, "ORPHA:488650": [] } }, { failMonarch: true }).deps),
    ).rejects.toBeInstanceOf(UpstreamError);
  });

  it.concurrent("property: with random links and random partner failures, every frequency traces to the candidate's own or linked set, and 'not listed' is only said with complete data", async () => {
    const arb = caseArb.chain((c) =>
      fc.record({
        linkMask: fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
        failMask: fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
        partnerRows: fc.array(fc.array(fc.tuple(fc.nat(), fc.constantFrom(...BANDS)), { maxLength: 6 }), { minLength: 5, maxLength: 5 }),
      }).map((x) => ({ c, ...x })),
    );
    await fc.assert(
      fc.asyncProperty(arb, async ({ c, linkMask, failMask, partnerRows }) => {
        const world: World = { parent: c.world.parent, diseases: { ...c.world.diseases }, links: {} };
        const fail = new Set<string>();
        const size = Object.keys(c.world.parent).length;
        c.candidates.forEach((id, i) => {
          if (!id.startsWith("ORPHA:") || !linkMask[i]) return;
          const omim = `OMIM:90001${i}0`;
          world.links![id] = { mondo: `MONDO:90001${i}0`, omim };
          const seen = new Set<string>();
          world.diseases[omim] = (partnerRows[i] ?? []).map(([t, freq]) => ({ id: term(t % size), freq })).filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
          if (failMask[i]) fail.add(omim);
        });
        const res = await nextQuestionsWithReport({ observed: c.observed, excluded: c.excluded, candidates: c.candidates, limit: c.limit }, mockWorld(world, { failAnnotation: fail }).deps).catch((e: unknown) => e);
        if (res instanceof Error) return;
        const { response, report } = res as Awaited<ReturnType<typeof nextQuestionsWithReport>>;
        for (const q of response.questions) {
          q.discriminates.forEach((d, i) => {
            const own = c.world.diseases[d.diseaseId]?.find((r) => r.id === q.hpoId);
            const partnerId = world.links![d.diseaseId]?.omim ?? null;
            const partner = partnerId && !fail.has(partnerId) ? world.diseases[partnerId]?.find((r) => r.id === q.hpoId) : undefined;
            if (d.frequency) {
              expect([d.diseaseId, partnerId]).toContain(d.frequency.source);
              const row = d.frequency.source === d.diseaseId ? own : partner;
              expect(row).toBeDefined();
              expect(d.frequency.raw ?? d.frequency.label ?? "").toBe(row!.freq);
            } else {
              expect(own).toBeUndefined();
              expect(partner).toBeUndefined();
              const cr = report.candidates[i]!;
              const incomplete = cr.partner !== undefined && "status" in cr.partner && (cr.partner.status === "failed" || cr.partner.status === "lookup-failed");
              if (incomplete) expect(q.why).not.toMatch(new RegExp(`not listed for (Synthetic |mondo name of )?${d.diseaseId}(;|$)`));
            }
          });
        }
      }),
      { numRuns: 100, seed: 20261024 },
    );
  }, 120_000);
});

describe.concurrent("R6.1 R2: a failed primary ORPHA call still uses its verified OMIM partner", () => {
  it("ORPHA:488650 fails (503); OMIM:614321 evidence is still used, and the candidate stays incomplete", async () => {
    // Same real link as above; Monarch maps Orphanet:488650 -> MONDO:0013686 (verified 2026-10-24).
    const w: World = { ...REAL, links: { ...REAL.links, "ORPHA:488650": { mondo: "MONDO:0013686", omim: "OMIM:614321" } } };
    const { response, report } = await nextQuestionsWithReport(REAL_REQ, mockWorld(w, { failAnnotation: new Set(["ORPHA:488650"]) }).deps);
    const c0 = report.candidates[0]!;
    expect(c0).toMatchObject({ status: "failed", participates: true, partner: { id: "OMIM:614321", status: "ok" }, sources: ["OMIM:614321"], evidenceComplete: false });
    const q = response.questions.find((x) => x.hpoId === CALF)!;
    expect(q.discriminates[0]).toEqual({ diseaseId: "ORPHA:488650", frequency: { label: null, source: "OMIM:614321" } });
    expect(report.complete).toBe(false);
    // a feature only ORPHA:206564 has (Motor delay) is unknown for the incomplete ORPHA:488650, never "not listed"
    const motor = response.questions.find((x) => x.hpoId === MOTOR);
    if (motor) {
      expect(motor.discriminates[0]!.frequency).toBeNull();
      expect(motor.why).not.toMatch(/ORPHA:488650/);
    }
  });

  it("evidenceComplete is true only for candidates whose every set was read", async () => {
    const { report } = await nextQuestionsWithReport(REAL_REQ, mockWorld(REAL).deps);
    expect(report.candidates.map((c) => c.evidenceComplete)).toEqual([true, true]);
  });
});
