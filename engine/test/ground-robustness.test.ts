// R6.3 (Ian instruction #34): per-proposal failure isolation and Unicode
// punctuation normalisation for JAX search queries. Deterministic mocks, no
// network. The mock reproduces what JAX did on 2026-10-24 (17:52 ET): HTTP 400
// for a query with a curly apostrophe, en dash or curly double quotes, 200 for
// the ASCII forms.

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { UpstreamError } from "../errors";
import { groundTerms } from "../ground";
import { normalizeQueryPunctuation, searchVariants } from "../hpo";
import type { EngineDeps, FetchLike, HpoTerm, TermProposal } from "../types";

const DB: readonly HpoTerm[] = [
  { id: "HP:0003391", label: "Gowers sign", synonyms: ["Gowers' sign", "Gowers maneuver"] },
  { id: "HP:0001250", label: "Seizure", synonyms: ["Seizures", "Epileptic seizure"] },
  { id: "HP:0001166", label: "Arachnodactyly", synonyms: ["Long slender fingers", "Long, slender fingers", "Spider fingers"] },
  { id: "HP:0003707", label: "Calf muscle pseudohypertrophy", synonyms: [] },
];

/** Like JAX: 400 for typographic punctuation in q, optional extra failures. */
function jax(opts: { fail?: (q: string) => number | null } = {}): { deps: EngineDeps; queries: string[] } {
  const queries: string[] = [];
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
  const fetch: FetchLike = async (input) => {
    const u = new URL(input);
    if (u.pathname === "/api/hp/search") {
      const q = u.searchParams.get("q") ?? "";
      queries.push(q);
      const forced = opts.fail?.(q);
      if (forced) return json({ message: "forced" }, forced);
      if (/[\u2018\u2019\u201C\u201D\u2013\u2014]/.test(q)) return json({ message: "Bad Request" }, 400);
      const ql = q.toLowerCase();
      const hits = DB.filter((t) => t.label.toLowerCase().includes(ql) || (t.synonyms ?? []).some((s) => s.toLowerCase().includes(ql)));
      return json({ terms: hits.map((t) => ({ id: t.id, name: t.label, synonyms: t.synonyms })) });
    }
    const term = /^\/api\/hp\/terms\/(.+)$/.exec(u.pathname);
    if (term) {
      const t = DB.find((x) => x.id === decodeURIComponent(term[1] ?? ""));
      return t ? json({ id: t.id, name: t.label, synonyms: t.synonyms }) : json({}, 404);
    }
    return json({}, 404);
  };
  return { deps: { fetch, now: () => new Date("2026-10-24T22:00:00.000Z") }, queries };
}

const TEXT = "To get up he does a Gowers’ sign, his fingers are long–slender and he has had “seizures”. His calves are big.";
const p = (phrase: string, label: string, extra: Partial<TermProposal> = {}): TermProposal => ({ phrase, label, negated: false, confidence: "high", ...extra });

describe("R6.3 query punctuation normalisation", () => {
  it("Gowers’ sign is searched as Gowers' sign", async () => {
    const m = jax();
    const r = await groundTerms(TEXT, [p("Gowers’ sign", "Gowers’ sign")], m.deps);
    expect(m.queries[0]).toBe("Gowers' sign");
    expect(m.queries.some((q) => q.includes("\u2019"))).toBe(false);
    expect(r.terms.map((t) => [t.hpoId, t.label])).toEqual([["HP:0003391", "Gowers sign"]]);
    expect(r.warnings).toEqual([]);
  });

  it("curly single and double quotes and dash variants become ASCII; letters and digits stay", () => {
    expect(normalizeQueryPunctuation("‘a’ ‚b‛ ＇c")).toBe("'a' 'b' 'c");
    expect(normalizeQueryPunctuation("“a” „b‟ ＂c")).toBe('"a" "b" "c');
    expect(normalizeQueryPunctuation("a‐b‑c‒d–e—f―g−h﹘i﹣j－k")).toBe("a-b-c-d-e-f-g-h-i-j-k");
    expect(normalizeQueryPunctuation("Café 2q37.3 Ångström α-1")).toBe("Café 2q37.3 Ångström α-1");
    expect(searchVariants("Gowers’ sign")[0]).toBe("Gowers' sign");
  });

  it("property: normalisation leaves no listed character, changes nothing else, and keeps length", () => {
    const special = "\u2018\u2019\u201A\u201B\uFF07\u201C\u201D\u201E\u201F\uFF02\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D";
    fc.assert(
      fc.property(fc.array(fc.oneof(fc.constantFrom(...special.split("")), fc.string({ maxLength: 3 })), { maxLength: 20 }).map((xs) => xs.join("")), (s) => {
        const n = normalizeQueryPunctuation(s);
        expect(n.length).toBe(s.length);
        for (let i = 0; i < s.length; i++) {
          if (special.includes(s[i]!)) expect("'\"-").toContain(n[i]);
          else expect(n[i]).toBe(s[i]);
        }
      }),
      { numRuns: 500, seed: 20261024 },
    );
  });

  it("the patient text, quotes and offsets are not changed by normalisation", async () => {
    const r = await groundTerms(TEXT, [p("Gowers’ sign", "Gowers’ sign"), p("“seizures”", "“Seizures”")], jax().deps);
    for (const t of r.terms) expect(TEXT.slice(t.start, t.end)).toBe(t.quote);
    expect(r.terms.find((t) => t.hpoId === "HP:0003391")!.quote).toBe("Gowers’ sign"); // curly apostrophe kept
    expect(r.terms.find((t) => t.hpoId === "HP:0001250")!.quote).toBe("“seizures”");
  });
});

describe("R6.3 per-proposal failure isolation", () => {
  it("one HTTP 400 no longer aborts the call: valid terms are returned, the failed one is dropped with a warning", async () => {
    // "Odd label" fails with 400 for every query form; the others are fine.
    const m = jax({ fail: (q) => (q.toLowerCase().startsWith("odd") ? 400 : null) });
    const r = await groundTerms(
      TEXT,
      [p("Gowers’ sign", "Gowers’ sign"), p("His calves are big", "Odd label"), p("“seizures”", "Seizures"), p("long–slender", "long–slender fingers")],
      m.deps,
    );
    expect(r.terms.map((t) => t.hpoId)).toEqual(["HP:0003391", "HP:0001166", "HP:0001250"]); // order of start
    expect(r.warnings).toEqual(["Dropped 'His calves are big': the HPO lookup failed (HTTP 400), so the term could not be verified"]);
    expect(r.terms.some((t) => t.quote === "His calves are big")).toBe(false); // no fabricated term
  });

  it("several failed lookups do not stop the successful ones", async () => {
    const m = jax({ fail: (q) => (/^(odd|bad)/i.test(q) ? 503 : null) });
    const r = await groundTerms(
      TEXT,
      [p("Gowers’ sign", "Odd one"), p("His calves are big", "Calf muscle pseudohypertrophy"), p("long–slender", "Bad two")],
      m.deps,
    );
    expect(r.terms.map((t) => t.hpoId)).toEqual(["HP:0003707"]);
    expect(r.warnings).toHaveLength(2);
    for (const w of r.warnings) expect(w).toMatch(/HPO lookup failed \(HTTP 503\)/);
  });

  it("a failed id check falls back to the label and never trusts the id unverified", async () => {
    const m = jax();
    const deps: EngineDeps = { ...m.deps, fetch: async (input, init) => (input.includes("/api/hp/terms/") ? new Response("{}", { status: 503 }) : m.deps.fetch(input, init)) };
    const r = await groundTerms(TEXT, [p("“seizures”", "Seizure", { hpoId: "HP:0001250" })], deps);
    expect(r.terms[0]).toMatchObject({ hpoId: "HP:0001250", grounding: "label-search" });
    expect(r.warnings.join(" ")).toMatch(/suggested id HP:0001250 could not be checked/);
  });

  it("a failed query form plus an empty answer from another form: 'not verified', not 'no match'", async () => {
    // "Odd thing" (form 1) fails; "odd thing" (form 2, punctuation-free) answers with nothing
    const m = jax({ fail: (q) => (q === "Odd thing" ? 400 : null) });
    const r = await groundTerms(TEXT, [p("Gowers’ sign", "Odd thing")], m.deps);
    expect(m.queries).toEqual(["Odd thing", "odd thing"]);
    expect(r.terms).toEqual([]);
    expect(r.warnings).toEqual(["Dropped 'Gowers’ sign': the HPO lookup failed (HTTP 400; 1 of 2 lookups answered with no match), so the term could not be verified"]);
  });

  it("a failed id check plus a label with no match: 'not verified' (the id might have been right)", async () => {
    const m = jax();
    const deps: EngineDeps = { ...m.deps, fetch: async (input, init) => (input.includes("/api/hp/terms/") ? new Response("{}", { status: 400 }) : m.deps.fetch(input, init)) };
    const r = await groundTerms(TEXT, [p("His calves are big", "Something unknown", { hpoId: "HP:0003707" })], deps);
    expect(r.terms).toEqual([]);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatch(NOT_VERIFIED);
  });

  it("if the first query form fails, the next form is still tried", async () => {
    const m = jax({ fail: (q) => (q === "Spider fingers" ? 400 : null) });
    const r = await groundTerms(TEXT, [p("long–slender", "Spider fingers")], m.deps);
    expect(m.queries.slice(0, 2)).toEqual(["Spider fingers", "spider fingers"]);
    expect(r.terms.map((t) => t.hpoId)).toEqual(["HP:0001166"]);
    expect(r.warnings).toEqual([]);
  });

  // Outcome matrix (R6.3 R2). A rejected query (4xx) only drops its proposal;
  // only a provider that answers nothing at all to the call raises an error.
  const NOT_VERIFIED = /could not be verified/;
  const NOT_FOUND = /no matching HPO term confirmed/;

  it("one proposal, its lookups return HTTP 400: dropped with a 'not verified' warning, no error", async () => {
    const r = await groundTerms(TEXT, [p("Gowers’ sign", "Gowers sign")], jax({ fail: () => 400 }).deps);
    expect(r.terms).toEqual([]); // the function's normal zero-terms path (422)
    expect(r.warnings).toEqual(["Dropped 'Gowers’ sign': the HPO lookup failed (HTTP 400), so the term could not be verified"]);
  });

  it("several proposals fail with 400: each dropped with its own warning, no error", async () => {
    const r = await groundTerms(TEXT, [p("Gowers’ sign", "Gowers sign"), p("“seizures”", "Seizures")], jax({ fail: () => 400 }).deps);
    expect(r.terms).toEqual([]);
    expect(r.warnings).toHaveLength(2);
    for (const w of r.warnings) expect(w).toMatch(NOT_VERIFIED);
  });

  it("no legitimate match for some, one lookup fails: 'not found' and 'not verified' stay distinct", async () => {
    const r = await groundTerms(
      TEXT,
      [p("His calves are big", "Something unknown"), p("Gowers’ sign", "Odd label")],
      jax({ fail: (q) => (q.toLowerCase().startsWith("odd") ? 400 : null) }).deps,
    );
    expect(r.terms).toEqual([]);
    expect(r.warnings[0]).toMatch(NOT_FOUND);
    expect(r.warnings[1]).toMatch(NOT_VERIFIED);
  });

  it.each([503, 429])("the whole HPO service is unavailable (every lookup %i): UpstreamError, retryable in the function", async (status) => {
    const m = jax({ fail: () => status });
    await expect(groundTerms(TEXT, [p("Gowers’ sign", "Gowers sign"), p("“seizures”", "Seizures")], m.deps)).rejects.toBeInstanceOf(UpstreamError);
  });

  it("the service fails for some lookups but answers others: no error, unverified ones flagged", async () => {
    const m = jax({ fail: (q) => (q.toLowerCase().includes("gowers") ? 503 : null) });
    const r = await groundTerms(TEXT, [p("Gowers’ sign", "Gowers sign"), p("His calves are big", "Something unknown")], m.deps);
    expect(r.terms).toEqual([]);
    expect(r.warnings[0]).toMatch(NOT_VERIFIED);
    expect(r.warnings[1]).toMatch(NOT_FOUND);
  });

  it("no lookup failed and nothing matched: still a normal empty result (422 path unchanged)", async () => {
    const r = await groundTerms(TEXT, [p("His calves are big", "Something unknown")], jax().deps);
    expect(r.terms).toEqual([]);
    expect(r.warnings).toEqual(["Dropped 'His calves are big': no matching HPO term confirmed"]);
  });

  it("deduplication and ordering are unchanged", async () => {
    const r = await groundTerms(
      TEXT,
      [p("“seizures”", "Seizure"), p("Gowers’ sign", "Gowers’ sign"), p("seizures", "Epileptic seizure"), p("His calves are big", "Odd")],
      jax({ fail: (q) => (q.toLowerCase().startsWith("odd") ? 400 : null) }).deps,
    );
    expect(r.terms.map((t) => [t.hpoId, t.start])).toEqual([["HP:0003391", TEXT.indexOf("Gowers’ sign")], ["HP:0001250", TEXT.indexOf("“seizures”")]]);
    expect(r.warnings).toEqual([
      "Dropped 'seizures': duplicate of HP:0001250 Seizure",
      "Dropped 'His calves are big': the HPO lookup failed (HTTP 400), so the term could not be verified",
    ]);
  });
});
