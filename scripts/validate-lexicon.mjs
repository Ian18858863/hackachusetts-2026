#!/usr/bin/env node
// Validate a lay-language lexicon and (with --write) store it as
// functions/_lib/lexicon.json (T45).
//
// Usage:
//   node scripts/validate-lexicon.mjs <file.csv|file.json> [--write] [--out <path>] [--delay-ms <n>]
//
// Input: CSV with a header row and columns phrase,hpo_id[,label][,source]
// (RFC 4180 quoting), or a JSON array of { phrase, hpoId|hpo_id, label?, source? }.
// Default is a dry run: the report is printed and nothing is written.
//
// For every row:
//   - the phrase is trimmed and whitespace collapsed; a phrase with no letters
//     or digits after normalisation is dropped;
//   - the id must match HP:####### and is checked with
//     GET https://ontology.jax.org/api/hp/terms/<id>, one call at a time with a
//     small delay. 404 -> unknown, dropped. The API answers an obsolete or
//     alternate id with its replacement term; a different id in the answer ->
//     obsolete, dropped (the replacement is named in the report, never used
//     silently). Network or other errors -> dropped as "not checked";
//   - the label is the HPO primary name from the API (a CSV label that differs
//     is reported, then replaced);
//   - duplicates are dropped: the same normalised phrase is kept once (first
//     row wins), because the hook adds at most one term per quote.
// Normalisation matches lexiconKey() in functions/_lib/grounding.ts: NFKC, lower
// case, - _ / as spaces, other punctuation dropped, single spaces.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUT = resolve(ROOT, "functions/_lib/lexicon.json");
const JAX_TERM = "https://ontology.jax.org/api/hp/terms/";
const HPO_ID_RE = /^HP:\d{7}$/;

function usage(msg) {
  if (msg) console.error(`error: ${msg}`);
  console.error("usage: node scripts/validate-lexicon.mjs <file.csv|file.json> [--write] [--out <path>] [--delay-ms <n>]");
  process.exit(2);
}

function parseArgs(argv) {
  const args = { input: null, write: false, out: DEFAULT_OUT, delayMs: 250 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--write") args.write = true;
    else if (a === "--dry-run") args.write = false;
    else if (a === "--out") args.out = resolve(argv[++i] ?? usage("--out needs a path"));
    else if (a === "--delay-ms") {
      args.delayMs = Number(argv[++i]);
      if (!Number.isFinite(args.delayMs) || args.delayMs < 0) usage("--delay-ms needs a number >= 0");
    } else if (a.startsWith("--")) usage(`unknown option ${a}`);
    else if (args.input === null) args.input = a;
    else usage("only one input file");
  }
  if (!args.input) usage("missing input file");
  return args;
}

/** Same as lexiconKey() in functions/_lib/grounding.ts. */
export function lexiconKey(s) {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[-_/]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter((w) => w !== "")
    .join(" ");
}

/** Minimal RFC 4180 CSV parser (quoted fields, "" escapes, CRLF or LF). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function readRows(path) {
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  if (/\.json$/i.test(path)) {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("JSON input must be an array");
    return data.map((r) => ({
      phrase: typeof r?.phrase === "string" ? r.phrase : "",
      hpoId: typeof r?.hpoId === "string" ? r.hpoId : typeof r?.hpo_id === "string" ? r.hpo_id : "",
      label: typeof r?.label === "string" ? r.label : "",
      source: typeof r?.source === "string" ? r.source : "",
    }));
  }
  const [header, ...body] = parseCsv(text);
  if (!header) return [];
  const cols = header.map((h) => h.trim().toLowerCase());
  const at = (name) => cols.indexOf(name);
  if (at("phrase") < 0 || at("hpo_id") < 0) throw new Error("CSV header must include phrase and hpo_id");
  const get = (r, name) => (at(name) >= 0 ? (r[at(name)] ?? "") : "");
  return body.map((r) => ({ phrase: get(r, "phrase"), hpoId: get(r, "hpo_id"), label: get(r, "label"), source: get(r, "source") }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function lookup(id) {
  try {
    const res = await fetch(`${JAX_TERM}${encodeURIComponent(id)}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return { kind: "unknown" };
    if (!res.ok) return { kind: "error", detail: `HTTP ${res.status}` };
    const body = await res.json();
    if (typeof body?.id !== "string" || typeof body?.name !== "string") return { kind: "error", detail: "unexpected response" };
    if (body.id !== id || /^obsolete\b/i.test(body.name)) return { kind: "obsolete", replacement: `${body.id} ${body.name}` };
    return { kind: "ok", name: body.name.replace(/\s+/g, " ").trim() };
  } catch (err) {
    return { kind: "error", detail: err?.name === "TimeoutError" ? "timeout" : "network error" };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = readRows(resolve(args.input));
  const kept = [];
  const dropped = [];
  const notes = [];
  const seenPhrase = new Map();
  const idCache = new Map();
  let calls = 0;

  for (let i = 0; i < rows.length; i++) {
    const n = i + 1;
    const r = rows[i];
    const phrase = r.phrase.replace(/\s+/g, " ").trim();
    const hpoId = r.hpoId.trim().toUpperCase();
    const key = lexiconKey(phrase);
    const drop = (reason) => dropped.push({ row: n, phrase, hpoId, reason });
    if (key === "") { drop("empty phrase"); continue; }
    if (!HPO_ID_RE.test(hpoId)) { drop("malformed HPO id (expected HP:#######)"); continue; }
    if (seenPhrase.has(key)) { drop(`duplicate phrase (row ${seenPhrase.get(key)} kept)`); continue; }

    let result = idCache.get(hpoId);
    if (!result) {
      if (calls > 0 && args.delayMs > 0) await sleep(args.delayMs);
      calls++;
      result = await lookup(hpoId);
      idCache.set(hpoId, result);
    }
    if (result.kind === "unknown") { drop("unknown HPO id (JAX 404)"); continue; }
    if (result.kind === "obsolete") { drop(`obsolete or alternate id; JAX answers with ${result.replacement}`); continue; }
    if (result.kind === "error") { drop(`not checked (${result.detail})`); continue; }

    const given = r.label.replace(/\s+/g, " ").trim();
    if (given !== "" && given !== result.name) notes.push(`row ${n}: label '${given}' replaced by HPO primary name '${result.name}'`);
    seenPhrase.set(key, n);
    kept.push({ phrase, hpoId, label: result.name, source: r.source.replace(/\s+/g, " ").trim() });
  }

  console.log(`Lexicon check: ${rows.length} rows read from ${args.input}; ${calls} JAX lookups`);
  console.log(`Kept ${kept.length}:`);
  for (const k of kept) console.log(`  + '${k.phrase}' -> ${k.hpoId} ${k.label}${k.source ? ` [${k.source}]` : ""}`);
  console.log(`Dropped ${dropped.length}:`);
  for (const d of dropped) console.log(`  - row ${d.row} '${d.phrase}' ${d.hpoId || "(no id)"}: ${d.reason}`);
  if (notes.length > 0) {
    console.log("Notes:");
    for (const line of notes) console.log(`  ${line}`);
  }
  if (args.write) {
    writeFileSync(args.out, `${JSON.stringify(kept, null, 2)}\n`);
    console.log(`Wrote ${kept.length} entries to ${args.out}`);
  } else {
    console.log("Dry run: nothing written (add --write to update functions/_lib/lexicon.json)");
  }
}

main().catch((err) => {
  console.error(`error: ${err?.message ?? err}`);
  process.exit(1);
});
