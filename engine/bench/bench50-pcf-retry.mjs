// Supplementary pass for the T07 50-case benchmark: re-query PubCaseFinder only for
// the cases whose PubCaseFinder request failed in the primary run (HTTP 429 after 3
// attempts). One request at a time, 8 s apart, stopping at a fixed wall-clock deadline.
// The primary results file is never modified: this writes results50-pcf-retry.json,
// and the report shows primary and supplementary numbers separately.
//
// Usage (from engine/): node bench/bench50-pcf-retry.mjs <deadline ISO time>

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const deadline = Date.parse(process.argv[2] ?? "");
if (!Number.isFinite(deadline)) { console.error("pass a deadline, e.g. 2026-10-24T22:02:00Z"); process.exit(2); }
const PCF = "https://pubcasefinder.dbcls.jp/api/pcf_get_ranked_list";
const GAP_MS = 8000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const normOmim = (id) => (typeof id === "string" ? id.replace(/^(MIM|OMIM):/i, "OMIM:") : id);

const cases = JSON.parse(await readFile(join(here, "cases50.json"), "utf8")).cases;
const primary = JSON.parse(await readFile(join(here, "results50.json"), "utf8"));
const todo = primary.rows.filter((r) => !r.upstream.pubcasefinder.ok).map((r) => cases.find((c) => c.case === r.case));
const out = [];
console.log(`retry pass: ${todo.length} cases, deadline ${new Date(deadline).toISOString()}`);
for (const c of todo) {
  if (Date.now() + 20_000 > deadline) { out.push({ case: c.case, ok: false, error: "not attempted: deadline" }); continue; }
  const t0 = Date.now();
  try {
    const res = await fetch(`${PCF}?target=omim&format=json&hpo_id=${encodeURIComponent(c.observed.join(","))}`, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) out.push({ case: c.case, ok: false, error: `HTTP ${res.status}`, at: new Date().toISOString() });
    else {
      const body = await res.json();
      const exp = normOmim(c.expected);
      const pos = Array.isArray(body) ? body.findIndex((x) => normOmim(x?.id) === exp) : -1;
      const top50 = Array.isArray(body) ? body.slice(0, 50).map((x, i) => ({ rank: i + 1, id: normOmim(x?.id) })) : [];
      out.push({ case: c.case, ok: Array.isArray(body), at: new Date().toISOString(), ms: Date.now() - t0, total: Array.isArray(body) ? body.length : null, rank: pos >= 0 ? pos + 1 : null, top50 });
    }
  } catch (e) {
    out.push({ case: c.case, ok: false, error: e?.name === "TimeoutError" ? "timeout" : String(e?.message ?? e), at: new Date().toISOString() });
  }
  console.log(c.case, JSON.stringify(out.at(-1)).slice(0, 120));
  await writeFile(join(here, "results50-pcf-retry.json"), JSON.stringify({ note: "Supplementary PubCaseFinder pass for primary-run failures; not part of the pre-registered primary result.", rows: out }, null, 2) + "\n");
  await sleep(GAP_MS);
}
await writeFile(join(here, "results50-pcf-retry.json"), JSON.stringify({ note: "Supplementary PubCaseFinder pass for primary-run failures; not part of the pre-registered primary result.", rows: out }, null, 2) + "\n");
console.log("done");
