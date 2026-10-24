#!/usr/bin/env node
// End-to-end smoke check for Rare Disease Detective (spec task 5.1, T24).
//
// Usage:
//   node scripts/smoke.mjs <baseUrl> [--live-llm]
//   node scripts/smoke.mjs http://127.0.0.1:8810
//   node scripts/smoke.mjs https://hackachusetts-2026.pages.dev --live-llm
//
// Node 22+, built-in fetch, no dependencies. Prints one line per check:
//   PASS|FAIL|NOTE  <check>  <HTTP status>  <latency>  <key values>
// NOTE lines are reported results that do not fail the run (for example a
// contract error from the live LLM path). Exit code 1 if any check FAILs.
//
// Shapes follow docs/CONTRACT.md (v0.1.2). Demo narratives are read at run
// time from the files that serve them, so the script never drifts from them:
//   demo-npc1: functions/_lib/fallback/demoCases.ts (temporary copy, contract section 9)
//   demo-dmd:  engine/demo/cases.ts
// All data sent is synthetic demo data from contract section 9; no real patients.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REQUEST_TIMEOUT_MS = 30_000;

// demo-npc1 term set (contract section 9.1): 12 observed terms + Headache excluded.
const NPC1_OBSERVED = [
  "HP:0006579", "HP:0007017", "HP:0031987", "HP:0001260", "HP:0002527", "HP:0001268",
  "HP:0001251", "HP:0031833", "HP:0002240", "HP:0001744", "HP:0003651", "HP:0003349",
];
const NPC1_EXCLUDED = ["HP:0002315"]; // Headache, negated in the narrative
const NPC1_SOURCE_ID = "PMID_27900365_patient";
const DMD_NEGATED = "HP:0001250"; // Seizure, negated in the demo-dmd narrative
const OVERLAP_LABELS = new Set(["strong", "partial", "weak"]);
const HPO_ID_RE = /^HP:\d{7}$/;
// Contract section 13, verbatim.
const DISCLAIMER = "Decision support, not a diagnosis. These are possible matches to discuss with a doctor.";
const HPO_ATTRIBUTION_RE =
  /^This product uses the Human Phenotype Ontology \(version [^)]+\)\. Find out more at https:\/\/hpo\.jax\.org$/;

// ---------------------------------------------------------------- arguments

const args = process.argv.slice(2);
const liveLlm = args.includes("--live-llm");
const positional = args.filter((a) => !a.startsWith("--"));
if (positional.length !== 1) {
  console.error("Usage: node scripts/smoke.mjs <baseUrl> [--live-llm]");
  process.exit(2);
}
let base;
try {
  base = new URL(positional[0]);
} catch {
  console.error(`Not a valid URL: ${positional[0]}`);
  process.exit(2);
}
const baseUrl = base.origin;
const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);

// ---------------------------------------------------------------- helpers

const results = [];

function line(verdict, name, status, ms, detail) {
  const st = status === undefined ? "---" : String(status);
  const lat = ms === undefined ? "-" : `${ms}ms`;
  console.log(`${verdict.padEnd(4)}  ${name.padEnd(36)}  ${st.padEnd(3)}  ${lat.padStart(7)}  ${detail}`);
  results.push(verdict);
}

class CheckFailure extends Error {}
function expect(cond, message) {
  if (!cond) throw new CheckFailure(message);
}

/** One HTTP call. Returns status, latency, headers and the parsed body (JSON or text). */
async function call(method, path, body) {
  const init = { method, headers: { Accept: "application/json" }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const t0 = performance.now();
  const res = await fetch(baseUrl + path, init);
  const text = await res.text();
  const ms = Math.round(performance.now() - t0);
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: res.status, ms, headers: res.headers, text, json };
}

/**
 * Run one check. `fn` returns { r, detail, verdict? } where r is the call result.
 * A thrown CheckFailure becomes FAIL with the last call's status and latency.
 */
async function check(name, fn) {
  const ctx = { r: undefined };
  try {
    const out = await fn(ctx);
    line(out.verdict ?? "PASS", name, ctx.r?.status, ctx.r?.ms, out.detail);
    return out.value;
  } catch (err) {
    const why = err instanceof CheckFailure ? err.message : `${err?.name ?? "Error"}: ${err?.message ?? err}`;
    line("FAIL", name, ctx.r?.status, ctx.r?.ms, why);
    return undefined;
  }
}

function isContractError(j) {
  return (
    j && j.version === "0.1" && j.error &&
    typeof j.error.code === "string" && typeof j.error.message === "string" && typeof j.error.retryable === "boolean"
  );
}

/**
 * Success envelope (contract section 4): version "0.1", source live|demo
 * (or exactly `wantSource`), and dataVersions.fetchedAt. `dv` defaults to
 * j.dataVersions; the brief carries it in brief.dataVersions.
 */
function expectEnvelope(j, { wantSource, dv = j?.dataVersions } = {}) {
  expect(j && j.version === "0.1", `version=${j?.version}`);
  if (wantSource) expect(j.source === wantSource, `source=${j.source}, expected ${wantSource}`);
  else expect(j.source === "live" || j.source === "demo", `source=${j.source}`);
  expect(dv && typeof dv.fetchedAt === "string" && !Number.isNaN(Date.parse(dv.fetchedAt)), "dataVersions.fetchedAt missing");
}

function expectNoPercentages(value, where) {
  const pct = findPercentages(value, where);
  expect(pct.length === 0, `percentages at ${pct.slice(0, 3).join(", ")}`);
}

function errSummary(r) {
  return isContractError(r.json) ? `${r.json.error.code}: ${r.json.error.message}` : r.text.slice(0, 160);
}

/** Read a demo narrative from a TypeScript source file: `caseId: "<id>"` then the next `narrative: "..."`. */
function readNarrative(relPath, caseId) {
  const src = readFileSync(join(REPO_ROOT, relPath), "utf8");
  const at = src.indexOf(`caseId: "${caseId}"`);
  if (at < 0) throw new Error(`${caseId} not found in ${relPath}`);
  const m = /narrative:\s*("(?:[^"\\\n]|\\.)*")/.exec(src.slice(at));
  if (!m) throw new Error(`narrative for ${caseId} not found in ${relPath}`);
  return JSON.parse(m[1]);
}

/** Any string containing a percentage, outside source frequency `raw` values (e.g. "45%"). */
function findPercentages(value, path = "") {
  const hits = [];
  if (typeof value === "string") {
    if (/\d\s*%/.test(value) && !path.endsWith(".raw")) hits.push(path);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => hits.push(...findPercentages(v, `${path}[${i}]`)));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (/percent|probab/i.test(k)) hits.push(`${path}.${k}`);
      hits.push(...findPercentages(v, `${path}.${k}`));
    }
  }
  return hits;
}

// ---------------------------------------------------------------- checks

console.log(`Smoke check ${baseUrl}${liveLlm ? " (with --live-llm)" : ""} at ${new Date().toISOString()}`);

for (const path of ["/", "/app/"]) {
  await check(`GET ${path}`, async (ctx) => {
    const r = (ctx.r = await call("GET", path));
    expect(r.status === 200, `expected 200, got ${r.status}`);
    const type = r.headers.get("content-type") ?? "";
    expect(type.includes("text/html"), `expected HTML, got ${type || "no content-type"}`);
    const title = /<title>([^<]*)<\/title>/i.exec(r.text)?.[1]?.trim() ?? "(no title)";
    return { detail: `html title="${title}"` };
  });
}

await check("GET /api/health", async (ctx) => {
  const r = (ctx.r = await call("GET", "/api/health"));
  expect(r.status === 200 && r.json, `expected 200 JSON, got ${r.status}`);
  const j = r.json;
  expect(j.version === "0.1", `version=${j.version}`);
  expect(j.ok === true, `ok=${j.ok}`);
  // Contract 7.1 allows binding false on local runs (demo-only extraction): NOTE there, FAIL live.
  const bindingOk = j.llm?.binding === true;
  if (!isLocal) expect(bindingOk, `llm.binding=${j.llm?.binding}`);
  // `commit` is not in contract 7.1 but functions/api/health.ts sends CF_PAGES_COMMIT_SHA on deploys.
  if (!isLocal) expect(typeof j.commit === "string" && j.commit.length >= 7, "commit missing");
  const commit = j.commit ? j.commit.slice(0, 7) : "absent (allowed on local dev)";
  return {
    verdict: bindingOk ? "PASS" : "NOTE",
    detail: `version=${j.version} binding=${j.llm?.binding}${bindingOk ? "" : " (local: demo-only extraction)"} model=${j.llm?.model} commit=${commit}`,
  };
});

/** Demo extraction check; returns the response body on success. */
async function demoExtract(caseId, relPath, negatedId) {
  return check(`POST /api/extract ${caseId}`, async (ctx) => {
    const narrative = readNarrative(relPath, caseId);
    const r = (ctx.r = await call("POST", "/api/extract", { text: narrative, caseId }));
    expect(r.status === 200, `expected 200, got ${r.status} ${errSummary(r)}`);
    const j = r.json;
    expectEnvelope(j, { wantSource: "demo" });
    expect(Array.isArray(j.terms) && j.terms.length === 13, `terms=${j.terms?.length}, expected 13`);
    const bad = j.terms.filter((t) => narrative.slice(t.start, t.end) !== t.quote).map((t) => t.hpoId);
    expect(bad.length === 0, `quote offsets wrong for ${bad.join(",")}`);
    const negated = j.terms.filter((t) => t.negated);
    expect(negated.some((t) => t.hpoId === negatedId), `negated ${negatedId} missing`);
    return {
      value: { narrative, body: j },
      detail: `source=${j.source} terms=${j.terms.length} negated=${negated.map((t) => `${t.hpoId} ${t.label}`).join(", ")} model=${j.model}`,
    };
  });
}

const npc1 = await demoExtract("demo-npc1", "functions/_lib/fallback/demoCases.ts", NPC1_EXCLUDED[0]);
if (npc1) {
  // The prepared extraction must match the contract term set used for /api/rank below.
  await check("extract demo-npc1 term set", async () => {
    const obs = npc1.body.terms.filter((t) => !t.negated).map((t) => t.hpoId).sort();
    const exc = npc1.body.terms.filter((t) => t.negated).map((t) => t.hpoId).sort();
    expect(JSON.stringify(obs) === JSON.stringify([...NPC1_OBSERVED].sort()), `observed differs: ${obs.join(",")}`);
    expect(JSON.stringify(exc) === JSON.stringify(NPC1_EXCLUDED), `excluded differs: ${exc.join(",")}`);
    return { detail: `matches contract 9.1 (${obs.length} observed + ${exc.join(",")} excluded)` };
  });
}
await demoExtract("demo-dmd", "engine/demo/cases.ts", DMD_NEGATED);

if (liveLlm) {
  // Short synthetic sentence, not a demo narrative, so the Workers AI path runs.
  const text = "She has very long thin fingers and the lens in her eye moved out of place. No seizures.";
  await check("POST /api/extract live LLM", async (ctx) => {
    const r = (ctx.r = await call("POST", "/api/extract", { text }));
    if (r.status === 200) {
      const j = r.json;
      expectEnvelope(j, { wantSource: "live" });
      expect(Array.isArray(j.terms) && j.terms.every((t) => HPO_ID_RE.test(t.hpoId) && text.slice(t.start, t.end) === t.quote), "term ids or quotes invalid");
      return { detail: `source=live model=${j.model} terms=${j.terms.map((t) => `${t.hpoId}${t.negated ? "(absent)" : ""}`).join(",")} warnings=${j.warnings?.length ?? 0}` };
    }
    // A contract error from the LLM path is reported, not failed (503/504/502/422).
    expect(isContractError(r.json), `non-contract error body: ${r.text.slice(0, 160)}`);
    return { verdict: "NOTE", detail: `contract error ${errSummary(r)} (retryable=${r.json.error.retryable})` };
  });
}

await check("GET /api/terms long fingers", async (ctx) => {
  const r = (ctx.r = await call("GET", "/api/terms?q=long%20fingers"));
  expect(r.status === 200, `expected 200, got ${r.status} ${errSummary(r)}`);
  expectEnvelope(r.json);
  const terms = r.json?.terms;
  expect(Array.isArray(terms) && terms.length > 0, "no terms");
  expect(terms.every((t) => HPO_ID_RE.test(t.id) && typeof t.label === "string"), "malformed term");
  return { detail: `source=${r.json.source} results=${terms.length} first=${terms[0].id} ${terms[0].label}` };
});

const rank = await check("POST /api/rank demo-npc1", async (ctx) => {
  const req = { observed: NPC1_OBSERVED, excluded: NPC1_EXCLUDED, limit: 5 };
  const r = (ctx.r = await call("POST", "/api/rank", req));
  expect(r.status === 200, `expected 200, got ${r.status} ${errSummary(r)}`);
  const j = r.json;
  expectEnvelope(j);
  const c = j.candidates;
  expect(Array.isArray(c) && c.length === 5, `candidates=${c?.length}, expected 5`);
  expect(c.every((x, i) => x.rank === i + 1), `ranks=${c.map((x) => x.rank).join(",")}`);
  expect(c.every((x) => OVERLAP_LABELS.has(x.overlap)), `overlap labels=${c.map((x) => x.overlap).join(",")}`);
  expect(c.every((x) => typeof x.score === "number"), "score not a number");
  expectNoPercentages(c, "candidates");
  const top3 = c.slice(0, 3).map((x) => `#${x.rank} ${x.diseaseId} ${x.name} (${x.overlap})`).join("; ");
  const path = r.headers.get("x-rdd-path") ?? "?";
  const cache = r.headers.get("x-rdd-cache") ?? "-";
  return { value: { req, body: j }, detail: `source=${j.source} path=${path} cache=${cache} top3: ${top3}` };
});

let questions;
if (rank) {
  questions = await check("POST /api/next-questions top 3", async (ctx) => {
    const candidates = rank.body.candidates.slice(0, 3).map((x) => x.diseaseId);
    const r = (ctx.r = await call("POST", "/api/next-questions", {
      observed: NPC1_OBSERVED, excluded: NPC1_EXCLUDED, candidates, limit: 5,
    }));
    expect(r.status === 200, `expected 200, got ${r.status} ${errSummary(r)}`);
    expectEnvelope(r.json);
    const q = r.json?.questions;
    expect(Array.isArray(q), "questions missing");
    expectNoPercentages(q, "questions");
    const known = new Set([...NPC1_OBSERVED, ...NPC1_EXCLUDED]);
    const repeated = q.filter((x) => known.has(x.hpoId)).map((x) => x.hpoId);
    expect(repeated.length === 0, `asks about observed/excluded ${repeated.join(",")}`);
    expect(q.every((x) => x.discriminates?.length === candidates.length), "discriminates count != candidates");
    return { value: q, detail: `source=${r.json.source} questions=${q.length}: ${q.map((x) => `${x.hpoId} ${x.label}`).join("; ") || "(none)"}` };
  });
} else {
  line("FAIL", "POST /api/next-questions top 3", undefined, undefined, "skipped: /api/rank failed");
}

await check("GET /api/trials NPC type C1", async (ctx) => {
  const r = (ctx.r = await call("GET", "/api/trials?condition=Niemann-Pick%20disease%2C%20type%20C1"));
  expect(r.status === 200, `expected 200, got ${r.status} ${errSummary(r)}`);
  expectEnvelope(r.json);
  const s = r.json?.studies;
  expect(Array.isArray(s) && s.length <= 5, `studies=${s?.length}, expected at most 5`);
  expect(s.every((x) => x.status === "RECRUITING"), `statuses=${s.map((x) => x.status).join(",")}`);
  return { detail: `source=${r.json.source} studies=${s.length} total=${r.json.total} ${s.map((x) => x.nctId).join(",")}` };
});

if (npc1 && rank) {
  await check("POST /api/brief demo-npc1", async (ctx) => {
    const now = new Date().toISOString();
    const caseObject = {
      version: "0.1",
      caseId: randomUUID(),
      demo: {
        caseId: "demo-npc1",
        sourcePhenopacketId: NPC1_SOURCE_ID,
        label: `Demo case (synthetic narrative from phenopacket-store ${NPC1_SOURCE_ID})`,
      },
      notes: npc1.narrative,
      terms: npc1.body.terms.map((t) => ({
        hpoId: t.hpoId, label: t.label, status: t.negated ? "excluded" : "observed", provenance: "demo",
        quote: t.quote, start: t.start, end: t.end, confidence: t.confidence, grounding: t.grounding, updatedAt: now,
      })),
      lastRanking: { request: rank.req, response: rank.body, rankedAt: now },
      questions: questions ?? [],
      selectedCandidateId: null,
      createdAt: now,
      updatedAt: now,
    };
    const r = (ctx.r = await call("POST", "/api/brief", { case: caseObject }));
    expect(r.status === 200, `expected 200, got ${r.status} ${errSummary(r)}`);
    const b = r.json?.brief;
    expect(b, "brief missing");
    expectEnvelope(r.json, { wantSource: "demo", dv: b.dataVersions });
    expect(b.disclaimer === DISCLAIMER, `disclaimer not verbatim: ${JSON.stringify(b.disclaimer)}`);
    const hpoLine = (b.attributions ?? []).find((a) => HPO_ATTRIBUTION_RE.test(a));
    expect(hpoLine, "HPO attribution with version missing");
    expectNoPercentages(b, "brief");
    const p = r.json?.phenopacket;
    expect(p, "phenopacket missing");
    expect(p.metaData?.phenopacketSchemaVersion === "2.0", `schema=${p.metaData?.phenopacketSchemaVersion}`);
    expect(!("diseases" in p) && !("interpretations" in p), "phenopacket has diseases or interpretations");
    const headache = p.phenotypicFeatures?.find((f) => f.type?.id === "HP:0002315");
    expect(headache?.excluded === true, "Headache HP:0002315 not excluded");
    const hpoVersion = /\(version ([^)]+)\)/.exec(hpoLine)[1];
    return {
      detail: `source=${r.json.source} schema=2.0 features=${p.phenotypicFeatures.length} headacheExcluded=true disclaimer=verbatim hpoAttribution=version ${hpoVersion} candidates=${b.candidates?.length} tests=${b.testsToAsk?.length} specialists=${b.specialists?.length}`,
    };
  });
} else {
  line("FAIL", "POST /api/brief demo-npc1", undefined, undefined, "skipped: extract or rank failed");
}

await check("POST /api/rank {} -> 400", async (ctx) => {
  const r = (ctx.r = await call("POST", "/api/rank", {}));
  expect(r.status === 400, `expected 400, got ${r.status}`);
  expect(isContractError(r.json), `not the contract error shape: ${r.text.slice(0, 160)}`);
  expect(r.json.error.code === "INVALID_REQUEST", `code=${r.json.error.code}`);
  return { detail: `code=${r.json.error.code} retryable=${r.json.error.retryable}` };
});

await check("GET /api/rank -> 405", async (ctx) => {
  const r = (ctx.r = await call("GET", "/api/rank"));
  expect(r.status === 405, `expected 405, got ${r.status}`);
  expect(isContractError(r.json) && r.json.error.code === "METHOD_NOT_ALLOWED", `body: ${r.text.slice(0, 160)}`);
  const allow = r.headers.get("allow");
  expect(allow && allow.includes("POST"), `Allow header=${allow}`);
  return { detail: `code=${r.json.error.code} Allow=${allow}` };
});

await check("POST /api/extract 8001 chars -> 413", async (ctx) => {
  const r = (ctx.r = await call("POST", "/api/extract", { text: "a".repeat(8001) }));
  expect(r.status === 413, `expected 413, got ${r.status}`);
  expect(isContractError(r.json) && r.json.error.code === "TEXT_TOO_LONG", `body: ${r.text.slice(0, 160)}`);
  expect(r.json.error.retryable === false, `retryable=${r.json.error.retryable}`);
  return { detail: `code=${r.json.error.code} retryable=${r.json.error.retryable}` };
});

// Spec task 5.1 also asks for a forced upstream failure run (demo fallback,
// retryable: true). This script cannot force it against a running server.
line("NOTE", "forced upstream failure", undefined, undefined, "NOT RUN: forced upstream failure (see docs/QA.md)");

// ---------------------------------------------------------------- summary

const fails = results.filter((v) => v === "FAIL").length;
const notes = results.filter((v) => v === "NOTE").length;
console.log(`\n${results.length - fails - notes} passed, ${fails} failed, ${notes} noted (${baseUrl})`);
process.exit(fails > 0 ? 1 : 0);
