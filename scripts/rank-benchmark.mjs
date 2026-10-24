#!/usr/bin/env node
// Ranking benchmark through our own POST /api/rank (T36).
//
//   node scripts/rank-benchmark.mjs <base-url> [--limit 10] [--pause-ms 8000]
//
// The 14 cases of docs/research/ranking-benchmark.md: the observed terms of
// four demo cases (contract section 9) and the ten phenopacket-store cases
// picked by the pre-registered rule (observed = phenotypicFeatures without
// excluded: true, read from the cached files of that run). Excluded terms are
// not sent: PubCaseFinder ignores them and some cases have more than the 50
// that /api/rank accepts. limit is at most 10 (contract section 7.4), so ranks
// beyond 10 are reported as "> 10".
//
// A hit: the expected OMIM id equals the candidate's diseaseId or its OMIM
// link. Requests are spaced by --pause-ms (default 8 s) to stay under the
// PubCaseFinder guideline of 10 requests per minute.
// Our own evaluation on 14 published cases. Not a clinical validation.

const CASES = [
  {"caseId": "demo-dmd", "expected": "OMIM:310200", "observed": ["HP:0001270", "HP:0003551", "HP:0003391", "HP:0003707", "HP:0012378", "HP:0003750", "HP:0030235", "HP:0031956", "HP:0031964", "HP:0025435", "HP:0002380", "HP:0040129"]},
  {"caseId": "demo-marfan", "expected": "OMIM:154700", "observed": ["HP:0001166", "HP:0000218", "HP:0001065", "HP:0001083", "HP:0000268", "HP:0000278", "HP:0000490", "HP:0012499", "HP:0004959"]},
  {"caseId": "demo-kabuki", "expected": "OMIM:147920", "observed": ["HP:0001252", "HP:0001263", "HP:0004322", "HP:0000637", "HP:0007655", "HP:0002553", "HP:0005338", "HP:0000431", "HP:0000437", "HP:0000592", "HP:0000400", "HP:0001212", "HP:0040019", "HP:0011626"]},
  {"caseId": "demo-cdls", "expected": "OMIM:122470", "observed": ["HP:0001511", "HP:0008897", "HP:0001263", "HP:0001249", "HP:0001007", "HP:0000028", "HP:0001159", "HP:0001156", "HP:0030148"]},
  {"caseId": "PMID_15266616_100", "expected": "OMIM:147791", "observed": ["HP:0000078", "HP:0000337", "HP:0000348", "HP:0001763", "HP:0002553", "HP:0010487", "HP:0011220"]},
  {"caseId": "PMID_14742428_DM", "expected": "OMIM:620698", "observed": ["HP:0001250", "HP:0001254", "HP:0010910", "HP:0010911", "HP:0010913", "HP:0011968"]},
  {"caseId": "PMID_37913506_II_3", "expected": "OMIM:620734", "observed": ["HP:0000822", "HP:0004749", "HP:0031295", "HP:6000691"]},
  {"caseId": "PMID_33275657_Family_A_III_2", "expected": "OMIM:301071", "observed": ["HP:0030977"]},
  {"caseId": "PMID_26153216_Patient_1", "expected": "OMIM:616977", "observed": ["HP:0000218", "HP:0000316", "HP:0000463", "HP:0000736", "HP:0000750", "HP:0000752", "HP:0001252", "HP:0002015", "HP:0011333", "HP:0031705", "HP:0031936", "HP:0033725", "HP:0100710"]},
  {"caseId": "PMID_39623139_Patient_1", "expected": "OMIM:621056", "observed": ["HP:0000252", "HP:0000463", "HP:0000483", "HP:0000501", "HP:0000505", "HP:0000545", "HP:0000563", "HP:0000621", "HP:0000648", "HP:0000750", "HP:0000821", "HP:0000938", "HP:0000965", "HP:0002023", "HP:0002239", "HP:0002342", "HP:0002353", "HP:0002604", "HP:0002757", "HP:0003196", "HP:0004322", "HP:0004691", "HP:0004692", "HP:0034697", "HP:0100255", "HP:6001182"]},
  {"caseId": "PMID_27900365_patient", "expected": "OMIM:257220", "observed": ["HP:0001251", "HP:0001260", "HP:0001268", "HP:0001744", "HP:0002240", "HP:0002527", "HP:0003349", "HP:0003651", "HP:0006579", "HP:0007017", "HP:0031833", "HP:0031987"]},
  {"caseId": "PMID_39132680_Family_1_16DG0991", "expected": "OMIM:620962", "observed": ["HP:0000083", "HP:0000122", "HP:0000126", "HP:0000952", "HP:0001433", "HP:0001510", "HP:0001541", "HP:0001942", "HP:0002643", "HP:0002908", "HP:0003259", "HP:0004719"]},
  {"caseId": "PMID_38609546_patient_P1", "expected": "OMIM:620795", "observed": ["HP:0000389", "HP:0001369", "HP:0001744", "HP:0001954", "HP:0002240", "HP:0002573", "HP:0002583", "HP:0002716", "HP:0006568", "HP:0011850"]},
  {"caseId": "PMID_18423521_Patient_1a", "expected": "OMIM:113620", "observed": ["HP:0000268", "HP:0000455", "HP:0000582", "HP:0002216", "HP:0009794"]}
];

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith("--")) ?? "").replace(/\/$/, "");
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : dflt;
};
const limit = opt("--limit", 10);
const pauseMs = opt("--pause-ms", 8000);
if (!base) {
  console.error("usage: node scripts/rank-benchmark.mjs <base-url> [--limit 10] [--pause-ms 8000]");
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const omimNum = (id) => (/^OMIM:(\d+)$/.exec(id) ?? [])[1];

function rankOf(candidates, expected) {
  const n = omimNum(expected);
  for (const c of candidates) {
    if (c.diseaseId === expected) return c.rank;
    if (n && typeof c.links?.omim === "string" && c.links.omim.endsWith(`/${n}`)) return c.rank;
  }
  return null;
}

const rows = [];
for (const [i, c] of CASES.entries()) {
  if (i > 0) await sleep(pauseMs);
  const t0 = Date.now();
  let status = 0;
  let path = "";
  let body = null;
  try {
    const res = await fetch(`${base}/api/rank`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ observed: c.observed, excluded: [], limit }),
    });
    status = res.status;
    path = res.headers.get("X-RDD-Path") ?? "";
    body = await res.json();
  } catch (err) {
    path = `error: ${err?.name ?? err}`;
  }
  const ms = Date.now() - t0;
  const cands = Array.isArray(body?.candidates) ? body.candidates : [];
  const rank = status === 200 ? rankOf(cands, c.expected) : null;
  rows.push({ c, status, path, ms, rank, top: cands[0]?.name ?? "" });
  console.error(`${c.caseId}: ${status} ${path} ${ms} ms rank ${rank ?? `> ${limit}`}`);
}

console.log(`| Case | Expected | n terms | Rank via /api/rank | HTTP | X-RDD-Path | ms | Top 1 |`);
console.log(`|---|---|---|---|---|---|---|---|`);
for (const r of rows) {
  console.log(`| ${r.c.caseId} | ${r.c.expected} | ${r.c.observed.length} | ${r.rank ?? `> ${limit}`} | ${r.status} | ${r.path} | ${r.ms} | ${r.top} |`);
}
const ok = rows.filter((r) => r.status === 200);
const top1 = rows.filter((r) => r.rank === 1).length;
const top3 = rows.filter((r) => r.rank !== null && r.rank <= 3).length;
const top10 = rows.filter((r) => r.rank !== null && r.rank <= limit).length;
console.log("");
console.log(`Base ${base}, limit ${limit}, ${new Date().toISOString()}. HTTP 200: ${ok.length}/${rows.length}.`);
console.log(`top-1 ${top1}/${rows.length}, top-3 ${top3}/${rows.length}, top-${limit} ${top10}/${rows.length}`);
