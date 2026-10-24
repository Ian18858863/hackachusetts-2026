// Ranking benchmark: Monarch semsim order vs the pre-registered re-rank (T23).
// Run: node --experimental-strip-types scripts/ranking-benchmark.ts
//
// Method: docs/research/ranking-benchmark.md, "Method (pre-registered
// 2026-10-24 12:57 ET)". Offline development script; never in a request path.
// Every upstream response is cached in scripts/benchmark-data/ with its URL
// and fetch time; a rerun reads the cache. Optional env GITHUB_TOKEN raises
// the GitHub API rate limit; it is sent only to api.github.com and never logged.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rerank, annotationMapFromJax, type MonarchResult, type AnnotationMap } from "../functions/_lib/rerank.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = join(ROOT, "scripts", "benchmark-data");
const REPORT = join(ROOT, "docs", "research", "ranking-benchmark.md");
const N = 50;
const HPO_RE = /^HP:\d{7}$/;

interface Cached { url: string; fetchedAt: string; status: number; body: unknown }

/**
 * Monarch semsim responses are ~1.5 MB each, mostly `subject.has_phenotype_closure`
 * and similar fields the benchmark never reads. Keep only the fields used
 * (score, subject id/name/xref, similarity.object_best_matches) so the committed
 * cache stays small. Other upstream bodies are stored as received.
 */
function trimBody(url: string, body: unknown): unknown {
  if (!url.startsWith("https://api.monarchinitiative.org/") || !Array.isArray(body)) return body;
  return body.map((r: { score?: unknown; subject?: { id?: unknown; name?: unknown; xref?: unknown }; similarity?: { object_best_matches?: unknown } }) => ({
    score: r.score,
    subject: { id: r.subject?.id, name: r.subject?.name, xref: r.subject?.xref },
    similarity: { object_best_matches: r.similarity?.object_best_matches },
  }));
}

async function getJson(url: string): Promise<Cached> {
  const file = join(CACHE_DIR, createHash("sha256").update(url).digest("hex").slice(0, 24) + ".json");
  // Transient answers (network error, 429, 5xx) are never final: refetch them.
  // Bug fix after run 1: 429 responses were cached as final and made
  // candidates unscored (recorded in docs/research/ranking-benchmark.md).
  const transient = (s: number): boolean => s === 0 || s === 429 || s >= 500;
  if (existsSync(file)) {
    const cached = JSON.parse(readFileSync(file, "utf8")) as Cached;
    if (!transient(cached.status)) return cached;
  }
  const headers: Record<string, string> = { accept: "application/json", "user-agent": "rdd-ranking-benchmark" };
  if (url.startsWith("https://api.github.com/") && process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  let last: Cached | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) });
      const text = await res.text();
      let body: unknown = null;
      try { body = JSON.parse(text); } catch { body = null; }
      body = trimBody(url, body);
      last = { url, fetchedAt: new Date().toISOString(), status: res.status, body };
      if (!transient(res.status)) break;
      const retryAfter = Number(res.headers.get("retry-after"));
      await new Promise((r) => setTimeout(r, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * (attempt + 1)));
    } catch (err) {
      last = { url, fetchedAt: new Date().toISOString(), status: 0, body: { error: String(err) } };
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  if (transient(last!.status)) throw new Error(`upstream still failing after retries: HTTP ${last!.status} for ${url.split("?")[0]}`);
  {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(file, JSON.stringify(last));
  }
  return last!;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

interface Case { caseId: string; demo: boolean; source: string; observed: string[]; excluded: string[]; expected: string; expectedLabel: string }

// CONTRACT §9, terms exactly as listed.
const DEMO_CASES: Case[] = [
  { caseId: "demo-dmd", demo: true, source: "PMID_38054185_Case_presentation", expected: "OMIM:310200", expectedLabel: "Duchenne muscular dystrophy",
    observed: ["HP:0001270", "HP:0003551", "HP:0003391", "HP:0003707", "HP:0012378", "HP:0003750", "HP:0030235", "HP:0031956", "HP:0031964", "HP:0025435", "HP:0002380", "HP:0040129"],
    excluded: ["HP:0001250"] },
  { caseId: "demo-marfan", demo: true, source: "PMID_10756346_Patient_B55", expected: "OMIM:154700", expectedLabel: "Marfan syndrome",
    observed: ["HP:0001166", "HP:0000218", "HP:0001065", "HP:0001083", "HP:0000268", "HP:0000278", "HP:0000490", "HP:0012499", "HP:0004959"],
    excluded: ["HP:0002107", "HP:0002650"] },
  { caseId: "demo-kabuki", demo: true, source: "PMID_24739679_patient_K1", expected: "OMIM:147920", expectedLabel: "Kabuki syndrome 1",
    observed: ["HP:0001252", "HP:0001263", "HP:0004322", "HP:0000637", "HP:0007655", "HP:0002553", "HP:0005338", "HP:0000431", "HP:0000437", "HP:0000592", "HP:0000400", "HP:0001212", "HP:0040019", "HP:0011626"],
    excluded: ["HP:0001250", "HP:0000365"] },
  { caseId: "demo-cdls", demo: true, source: "PMID_20358602_Patient_C10", expected: "OMIM:122470", expectedLabel: "Cornelia de Lange syndrome 1",
    observed: ["HP:0001511", "HP:0008897", "HP:0001263", "HP:0001249", "HP:0001007", "HP:0000028", "HP:0001159", "HP:0001156", "HP:0030148"],
    excluded: ["HP:0001250", "HP:0011968"] },
];
const DEMO_FOLDERS = new Set(["DMD", "FBN1", "KMT2D", "NIPBL"]);

function monarchUrl(observed: string[]): string {
  const ids = [...new Set(observed)].sort().join(",");
  return `https://api.monarchinitiative.org/v3/api/semsim/search/${ids}/Human%20Diseases?limit=${N}`;
}

async function selectStoreCases(skips: string[]): Promise<Case[]> {
  const list = await getJson("https://api.github.com/repos/monarch-initiative/phenopacket-store/contents/notebooks");
  if (list.status !== 200 || !Array.isArray(list.body)) throw new Error(`GitHub listing failed: ${list.status}`);
  const folders = (list.body as Array<{ name: string; type: string }>)
    .filter((e) => e.type === "dir" && !DEMO_FOLDERS.has(e.name))
    .map((e) => e.name)
    .sort();
  const C = folders.length;
  const k = Math.floor(C / 10);
  console.log(`phenopacket-store notebooks: C=${C} folders (demo folders removed), k=${k}`);
  const chosen = new Set<number>();
  const cases: Case[] = [];
  for (let i = 0; i < 10; i++) {
    let idx = i * k;
    while (true) {
      while (chosen.has(idx)) idx++;
      if (idx >= C) throw new Error("ran out of folders");
      chosen.add(idx);
      const folder = folders[idx];
      const c = await loadFolderCase(folder);
      if (typeof c === "string") { skips.push(`${folder} (index ${idx}): ${c}`); idx++; continue; }
      const mon = await getJson(monarchUrl(c.observed));
      if (mon.status < 200 || mon.status > 299) { skips.push(`${folder} (index ${idx}): Monarch HTTP ${mon.status}`); idx++; continue; }
      cases.push(c);
      break;
    }
  }
  return cases;
}

async function loadFolderCase(folder: string): Promise<Case | string> {
  const dir = await getJson(`https://api.github.com/repos/monarch-initiative/phenopacket-store/contents/notebooks/${encodeURIComponent(folder)}/phenopackets`);
  if (dir.status === 404) return "no phenopackets/ folder";
  if (dir.status !== 200 || !Array.isArray(dir.body)) return `GitHub HTTP ${dir.status}`;
  const files = (dir.body as Array<{ name: string; type: string; download_url: string | null }>)
    .filter((e) => e.type === "file" && e.name.endsWith(".json"))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  if (files.length === 0 || !files[0].download_url) return "no .json file";
  const pp = await getJson(files[0].download_url);
  if (pp.status !== 200 || !pp.body) return `phenopacket HTTP ${pp.status}`;
  const body = pp.body as {
    id?: string;
    phenotypicFeatures?: Array<{ type?: { id?: string }; excluded?: boolean }>;
    interpretations?: Array<{ diagnosis?: { disease?: { id?: string; label?: string } } }>;
    diseases?: Array<{ term?: { id?: string; label?: string } }>;
  };
  const feats = body.phenotypicFeatures ?? [];
  const observed = [...new Set(feats.filter((f) => !f.excluded).map((f) => f.type?.id ?? "").filter((id) => HPO_RE.test(id)))];
  const excluded = [...new Set(feats.filter((f) => f.excluded).map((f) => f.type?.id ?? "").filter((id) => HPO_RE.test(id)))];
  if (observed.length === 0) return "zero observed terms";
  if (observed.length > 50) return `${observed.length} observed terms (> 50)`;
  const dis = body.interpretations?.[0]?.diagnosis?.disease ?? body.diseases?.[0]?.term;
  if (!dis?.id) return "no expected disease id";
  return { caseId: `${folder}/${files[0].name}`, demo: false, source: body.id ?? files[0].name, observed, excluded, expected: dis.id, expectedLabel: dis.label ?? dis.id };
}

const normXref = (x: string): string => x.replace(/^Orphanet:/i, "ORPHA:");
const xrefsOf = (r: MonarchResult): string[] => (r.subject.xref ?? []).map(normXref);
const isExpected = (r: MonarchResult, expected: string): boolean => r.subject.id === expected || xrefsOf(r).includes(normXref(expected));

async function annotationsFor(r: MonarchResult): Promise<{ map: AnnotationMap; usedId: string | null }> {
  const xr = xrefsOf(r);
  const orpha = xr.find((x) => /^ORPHA:\d+$/.test(x));
  const omim = xr.find((x) => /^OMIM:\d+$/.test(x));
  for (const id of [orpha, omim].filter((x): x is string => !!x)) {
    const res = await getJson(`https://ontology.jax.org/api/network/annotation/${id}`);
    if (res.status === 200) {
      const map = annotationMapFromJax(res.body);
      if (map.size > 0) return { map, usedId: id };
    }
  }
  return { map: new Map(), usedId: null };
}

interface Row { c: Case; before: number | null; after: number | null; top3: string[]; scoredCount: number; expectedAnnId: string | null; expectedSupport: string }

async function runCase(c: Case, organ: string[]): Promise<Row> {
  const mon = await getJson(monarchUrl(c.observed));
  if (mon.status !== 200 || !Array.isArray(mon.body)) throw new Error(`Monarch HTTP ${mon.status} for ${c.caseId}`);
  const results = mon.body as MonarchResult[];
  const anns = await mapLimit(results, 4, annotationsFor);
  const annotations = new Map<string, AnnotationMap>();
  results.forEach((r, i) => { if (!annotations.has(r.subject.id)) annotations.set(r.subject.id, anns[i].map); });
  const out = rerank({ results, annotations, observed: c.observed, excluded: c.excluded, organSystemIds: organ });
  const beforeIdx = results.findIndex((r) => isExpected(r, c.expected));
  const expMondo = beforeIdx >= 0 ? results[beforeIdx].subject.id : null;
  const afterIdx = expMondo ? out.findIndex((x) => x.mondoId === expMondo) : -1;
  let expectedSupport = "not in pool";
  let expectedAnnId: string | null = null;
  if (beforeIdx >= 0) {
    expectedAnnId = anns[beforeIdx].usedId;
    const cand = out[afterIdx];
    const exact = cand.observed.filter((o) => o.via === "exact").length;
    const anc = cand.observed.filter((o) => o.via === "ancestor").length;
    expectedSupport = cand.scored ? `${exact} exact + ${anc} ancestor of ${c.observed.length}` : "unscored";
  }
  return {
    c,
    before: beforeIdx >= 0 ? beforeIdx + 1 : null,
    after: afterIdx >= 0 ? afterIdx + 1 : null,
    top3: out.slice(0, 3).map((x) => x.name),
    scoredCount: out.filter((x) => x.scored).length,
    expectedAnnId,
    expectedSupport,
  };
}

const fmtRank = (r: number | null): string => (r == null ? `> ${N}` : String(r));
const within = (rows: Row[], key: "before" | "after", k: number): number => rows.filter((r) => r[key] != null && (r[key] as number) <= k).length;

async function main(): Promise<void> {
  const organRes = await getJson("https://ontology.jax.org/api/hp/terms/HP:0000118/children");
  if (organRes.status !== 200 || !Array.isArray(organRes.body)) throw new Error("HP:0000118 children fetch failed");
  const organ = (organRes.body as Array<{ id: string }>).map((t) => t.id);

  const skips: string[] = [];
  const store = await selectStoreCases(skips);
  const cases = [...DEMO_CASES, ...store];
  const rows: Row[] = [];
  for (const c of cases) { rows.push(await runCase(c, organ)); console.log(`${c.caseId}: before ${fmtRank(rows.at(-1)!.before)}, after ${fmtRank(rows.at(-1)!.after)}`); }

  const stamp = new Date().toLocaleString("sv-SE", { timeZone: "America/New_York" }).slice(0, 16) + " ET";
  const lines: string[] = [];
  lines.push(`## Results (${stamp})`, "");
  lines.push(`Generated by \`node --experimental-strip-types scripts/ranking-benchmark.ts\`. Candidate pool: Monarch top ${N}. "> ${N}" = not in Monarch's top ${N}, so the re-rank cannot find it either. Upstream responses cached in \`scripts/benchmark-data/\` (fetch times inside each file).`, "");
  lines.push(`Organ-system grouping terms: ${organ.length} children of HP:0000118. phenopacket-store selection: ${store.length} cases.`, "");
  lines.push("| Case | Expected disease | Rank before (Monarch) | Rank after (re-rank) | Expected disease evidence (annotation id; observed terms credited) | Top 3 after |");
  lines.push("|---|---|---|---|---|---|");
  for (const r of rows) {
    const label = r.c.demo ? `\`${r.c.caseId}\` (demo)` : `\`${r.c.source}\``;
    lines.push(`| ${label} | ${r.c.expected} ${r.c.expectedLabel} | ${fmtRank(r.before)} | ${fmtRank(r.after)} | ${r.expectedAnnId ?? "-"}; ${r.expectedSupport} | ${r.top3.join("; ")} |`);
  }
  lines.push("", "Summary (counts of cases with the expected disease at or above the rank):", "");
  lines.push("| Set | n | Top-1 before | Top-1 after | Top-3 before | Top-3 after | Top-10 before | Top-10 after | In Monarch top 50 |");
  lines.push("|---|---|---|---|---|---|---|---|---|");
  for (const [name, set] of [["All cases", rows], ["Demo cases", rows.filter((r) => r.c.demo)], ["phenopacket-store (non-demo)", rows.filter((r) => !r.c.demo)]] as const) {
    lines.push(`| ${name} | ${set.length} | ${within(set, "before", 1)} | ${within(set, "after", 1)} | ${within(set, "before", 3)} | ${within(set, "after", 3)} | ${within(set, "before", 10)} | ${within(set, "after", 10)} | ${set.filter((r) => r.before != null).length} |`);
  }
  lines.push("", "Skipped folders (mechanical rule):", "");
  if (skips.length === 0) lines.push("- none");
  for (const s of skips) lines.push(`- ${s}`);
  lines.push("", "Selected phenopacket-store files:", "");
  for (const c of store) lines.push(`- \`notebooks/${c.caseId.replace("/", "/phenopackets/")}\` (${c.observed.length} observed, ${c.excluded.length} excluded)`);

  const block = `<!-- results:start -->\n${lines.join("\n")}\n<!-- results:end -->`;
  const doc = readFileSync(REPORT, "utf8");
  const re = /<!-- results:start -->[\s\S]*<!-- results:end -->/;
  writeFileSync(REPORT, re.test(doc) ? doc.replace(re, block) : doc.trimEnd() + "\n\n" + block + "\n");
  console.log(lines.join("\n"));
}

main().catch((err) => { console.error(String(err)); process.exit(1); });
