// Dev-only recorder for the demo cache (CONTRACT.md section 9). Never runs in
// the request path and is not part of the Workers bundle.
//
// It calls the REAL engine (rankCandidatesWithReport) against the REAL upstream
// APIs for each demo case's prepared term set and saves the response verbatim,
// together with what each provider call actually returned. Nothing in
// engine/demo/recorded/ is hand-written.
//
// - A Monarch failure saves nothing for that case.
// - Incomplete enrichment (an annotation or Orphadata call failed or was
//   unusable) saves nothing unless --allow-incomplete is given; then the file
//   says so in `enrichment.complete` and `enrichment.warnings`.
//
// Usage (from engine/): npm run record:demo -- demo-npc1 [demo-dmd ...] [--allow-incomplete]

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = join(root, "demo", "recorded");
const bundle = join(root, "node_modules", ".cache", "rdd-record", "engine.mjs");

await build({ entryPoints: [join(root, "index.ts")], bundle: true, platform: "neutral", format: "esm", outfile: bundle, logLevel: "warning" });
const engine = await import(bundle);

const args = process.argv.slice(2);
const allowIncomplete = args.includes("--allow-incomplete");
const caseIds = args.filter((a) => !a.startsWith("--"));
if (caseIds.length === 0) {
  console.error("Name at least one demo case id, e.g. demo-npc1");
  process.exit(2);
}

/** Count call outcomes per provider from the engine's enrichment report. */
function providerSummary(enrichment) {
  const tally = () => ({ ok: 0, "not-found": 0, unusable: 0, failed: 0, "not-applicable": 0 });
  const hpoAnnotation = tally();
  const orphadata = tally();
  for (const c of enrichment.candidates) {
    for (const a of c.annotations) hpoAnnotation[a.status]++;
    orphadata[c.orphadata.status]++;
  }
  return { monarchSemsim: "ok", hpoAnnotation, orphadata };
}

await mkdir(outDir, { recursive: true });
// Recording is offline, so it may wait longer than the runtime budget
// (CONTRACT.md section 10); the request path keeps the contract timeouts.
const deps = { fetch, timeoutsMs: { monarchSemsim: 30000, hpoAnnotation: 10000, orphadata: 10000 } };
let failed = 0;

for (const caseId of caseIds) {
  const c = engine.getDemoCase(caseId);
  if (!c) {
    console.error(`${caseId}: unknown demo case`);
    failed++;
    continue;
  }
  const observed = c.extraction.filter((t) => !t.negated).map((t) => t.hpoId);
  const excluded = c.extraction.filter((t) => t.negated).map((t) => t.hpoId);
  const limit = 5;
  const key = engine.demoRankKey(observed, excluded, limit);
  let result;
  try {
    result = await engine.rankCandidatesWithReport({ observed, excluded, limit }, deps);
  } catch (err) {
    failed++;
    console.error(`${caseId}: rank NOT recorded (ranking provider failed): ${err instanceof Error ? err.message : String(err)}`);
    continue;
  }
  const { response, enrichment } = result;
  if (!enrichment.complete && !allowIncomplete) {
    failed++;
    console.error(`${caseId}: rank NOT recorded (incomplete enrichment; rerun or pass --allow-incomplete):\n  ${enrichment.warnings.join("\n  ")}`);
    continue;
  }
  const record = {
    kind: "rank",
    format: 2,
    caseId,
    key,
    request: { observed: [...new Set(observed)].sort(), excluded: [...new Set(excluded)].sort(), limit },
    // Snapshot of a live response. recordedAt is the live retrieval time and
    // equals response.dataVersions.fetchedAt; getDemoRanking adds source "demo"
    // and dataVersions.demoCache when it serves this file.
    snapshot: true,
    recordedAt: response.dataVersions.fetchedAt,
    recordedWith: "engine/scripts/record-demo.mjs format 2 (rankCandidatesWithReport, live upstream calls)",
    providers: providerSummary(enrichment),
    enrichment,
    response,
  };
  const file = join(outDir, `${caseId}.rank.json`);
  await writeFile(file, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`${caseId}: rank recorded (${response.candidates.length} candidates, enrichment ${enrichment.complete ? "complete" : "INCOMPLETE"}) -> ${file}`);
  console.log(`  top: ${response.candidates.map((x) => `${x.rank}. ${x.diseaseId} ${x.name}`).join(" | ")}`);
}
process.exit(failed === 0 ? 0 : 1);
