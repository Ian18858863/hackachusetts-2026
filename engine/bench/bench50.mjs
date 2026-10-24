// T07 ranking benchmark on 50 held-out phenopacket-store cases (Ian instruction #30).
// Offline research script, never in the request path; not part of the Workers bundle.
// The case list and every rule are pre-registered in docs/research/ranking-benchmark-50.md
// (Part 1) and engine/bench/cases50.json; this script refuses to run if cases50.json
// does not match the hash recorded at pre-registration.
//
// Usage (from engine/): node bench/bench50.mjs
// Writes engine/bench/results50.json (raw results, original ids kept) and prints a summary.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CASES_SHA256 = "6633d71b6eb64f135dbcad8c8292774c69beca6ed46d70b44f225bcdb59822a7"; // recorded 2026-10-24 17:36:34 EDT

const MONARCH = "https://api.monarchinitiative.org/v3/api/semsim/search";
const PCF = "https://pubcasefinder.dbcls.jp/api/pcf_get_ranked_list";
const TOP = 50;
const RRF_K = 60;
const CONCURRENCY = 3; // per upstream
const TIMEOUT_MS = 90_000;
const RETRIES = 2; // on 429, 5xx, network error or timeout; backoff 2 s, 4 s

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  let last = "";
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await sleep(2000 * attempt);
    const t0 = Date.now();
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status === 429 || res.status >= 500) { last = `HTTP ${res.status}`; continue; }
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, attempts: attempt + 1, ms: Date.now() - t0 };
      const body = await res.json();
      return { ok: true, body, attempts: attempt + 1, ms: Date.now() - t0 };
    } catch (e) {
      last = e?.name === "TimeoutError" ? `timeout after ${TIMEOUT_MS} ms` : `network error: ${e?.message ?? e}`;
    }
  }
  return { ok: false, error: last, attempts: RETRIES + 1 };
}

/** Run tasks with at most `n` in flight. */
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

const normOmim = (id) => (typeof id === "string" ? id.replace(/^(MIM|OMIM):/i, "OMIM:") : id);

async function monarch(c) {
  const r = await getJson(`${MONARCH}/${c.observed.join(",")}/Human%20Diseases?limit=${TOP}`);
  if (!r.ok) return { ok: false, error: r.error, attempts: r.attempts };
  if (!Array.isArray(r.body)) return { ok: false, error: "unusable body (not an array)", attempts: r.attempts };
  const list = r.body.slice(0, TOP).map((x, i) => ({
    rank: i + 1,
    id: x?.subject?.id,
    name: x?.subject?.name,
    score: x?.score,
    omimXrefs: (x?.subject?.xref ?? []).filter((v) => /^OMIM:\d+$/.test(v)),
  }));
  return { ok: true, attempts: r.attempts, ms: r.ms, list };
}

async function pubcasefinder(c) {
  const r = await getJson(`${PCF}?target=omim&format=json&hpo_id=${encodeURIComponent(c.observed.join(","))}`);
  if (!r.ok) return { ok: false, error: r.error, attempts: r.attempts };
  if (!Array.isArray(r.body)) return { ok: false, error: "unusable body (not an array)", attempts: r.attempts };
  // Pre-registered rank: 1-based position in the returned list. PCF's own (tied) rank is kept as `pcfRank`.
  const list = r.body.slice(0, TOP).map((x, i) => ({ rank: i + 1, pcfRank: x?.rank, id: normOmim(x?.id), name: x?.omim_disease_name_en }));
  // The expected id may sit below the top 50: record its position in the full list too.
  return { ok: true, attempts: r.attempts, ms: r.ms, total: r.body.length, list, fullIndex: (id) => r.body.findIndex((x) => normOmim(x?.id) === id) };
}

function rrf(a, b) {
  const keys = new Map(); // key -> { key, ranks: {A, B}, score }
  const add = (key, method, rank) => {
    const e = keys.get(key) ?? { key, ranks: {}, score: 0 };
    if (e.ranks[method] === undefined) { e.ranks[method] = rank; e.score += 1 / (RRF_K + rank); }
    keys.set(key, e);
  };
  const mList = a?.ok ? a.list : [];
  const pList = b?.ok ? b.list : [];
  for (const m of mList) add(m.id, "A", m.rank);
  for (const p of pList) {
    const host = mList.find((m) => m.omimXrefs.includes(p.id)); // first in Monarch rank order
    add(host ? host.id : p.id, "B", p.rank);
  }
  const best = (e) => Math.min(e.ranks.A ?? Infinity, e.ranks.B ?? Infinity);
  const sorted = [...keys.values()].sort((x, y) => y.score - x.score || best(x) - best(y) || (x.key < y.key ? -1 : x.key > y.key ? 1 : 0));
  return sorted.map((e, i) => ({ rank: i + 1, ...e, omimXrefs: mList.find((m) => m.id === e.key)?.omimXrefs ?? (e.key.startsWith("OMIM:") ? [e.key] : []) }));
}

const raw = await readFile(join(here, "cases50.json"), "utf8");
const sha = createHash("sha256").update(raw).digest("hex");
if (sha !== CASES_SHA256) { console.error(`cases50.json changed since pre-registration (sha256 ${sha})`); process.exit(2); }
const pre = JSON.parse(raw);
const cases = pre.cases;

const started = new Date();
console.log(`start ${started.toISOString()} | ${cases.length} cases`);
const [A, B] = await Promise.all([pool(cases, CONCURRENCY, monarch), pool(cases, CONCURRENCY, pubcasefinder)]);

const rows = cases.map((c, i) => {
  const a = A[i], b = B[i], fused = rrf(a, b);
  const exp = normOmim(c.expected);
  const aRank = a.ok ? a.list.find((m) => m.omimXrefs.includes(exp))?.rank ?? null : null;
  const bRank = b.ok ? b.list.find((p) => p.id === exp)?.rank ?? null : null;
  const bFull = b.ok ? b.fullIndex(exp) : -1;
  const cRank = fused.find((e) => e.omimXrefs.includes(exp) || e.key === exp)?.rank ?? null;
  const notes = [];
  if (!a.ok) notes.push(`Monarch failed: ${a.error}`);
  if (!b.ok) notes.push(`PubCaseFinder failed: ${b.error}`);
  if (a.ok && aRank === null && !a.list.some((m) => m.omimXrefs.length)) notes.push("no Monarch candidate has an OMIM xref");
  return {
    case: c.case, folder: c.folder, source: c.source, expected: exp, expectedLabel: c.expectedLabel, observed: c.observed.length,
    ranks: { monarch: aRank, pubcasefinder: bRank, rrf: cRank },
    pubcasefinderFullPosition: bFull >= 0 ? bFull + 1 : null,
    upstream: { monarch: a.ok ? { ok: true, attempts: a.attempts, ms: a.ms } : { ok: false, error: a.error, attempts: a.attempts }, pubcasefinder: b.ok ? { ok: true, attempts: b.attempts, ms: b.ms, total: b.total } : { ok: false, error: b.error, attempts: b.attempts } },
    notes,
    top: { monarch: a.ok ? a.list.slice(0, 10) : null, pubcasefinder: b.ok ? b.list.slice(0, 10) : null, rrf: fused.slice(0, 10) },
  };
});

const N = 50;
const acc = (m, k) => rows.filter((r) => r.ranks[m] !== null && r.ranks[m] <= k).length;
const answered = { monarch: A.filter((x) => x.ok).length, pubcasefinder: B.filter((x) => x.ok).length, rrf: rows.filter((_, i) => A[i].ok || B[i].ok).length };
const summary = Object.fromEntries(["monarch", "pubcasefinder", "rrf"].map((m) => [m, { top1: acc(m, 1), top3: acc(m, 3), top10: acc(m, 10), denominator: N, answered: answered[m] }]));
const finished = new Date();
await writeFile(join(here, "results50.json"), JSON.stringify({ casesSha256: sha, started: started.toISOString(), finished: finished.toISOString(), runtimeMs: finished - started, summary, rows }, null, 2) + "\n");
console.log(`finished ${finished.toISOString()} | ${((finished - started) / 1000).toFixed(1)} s`);
console.log(JSON.stringify(summary));
