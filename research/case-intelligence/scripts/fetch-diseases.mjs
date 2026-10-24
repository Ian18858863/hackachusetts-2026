// Fetch the Monarch entity record for every accepted diagnosis id and store
// its name and OMIM / Orphanet cross-references, so rankers that return any of
// these ids can be scored. Writes data/diseases/monarch-diseases.json.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA, loadAllCases } from '../lib/load.mjs';

const API = 'https://api.monarchinitiative.org/v3/api/entity';
const cases = await loadAllCases();
const ids = [...new Set(cases.flatMap((c) => c.diagnosis.acceptedIds))].sort();
const diseases = {};
let failed = 0;

for (const id of ids) {
  try {
    const res = await fetch(`${API}/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const e = await res.json();
    const xrefs = (e.xref ?? []).filter((x) => /^(OMIM|Orphanet|ORPHA):/.test(x)).sort();
    diseases[id] = { id: e.id, name: e.name, xrefs, deprecated: Boolean(e.deprecated) };
    console.log(`${id} => ${e.name} | ${xrefs.join(', ') || 'no OMIM/Orphanet xref'}`);
  } catch (err) {
    failed += 1;
    diseases[id] = { id, error: String(err.message) };
    console.log(`${id} => ERROR ${err.message}`);
  }
}

await mkdir(join(DATA, 'diseases'), { recursive: true });
await writeFile(
  join(DATA, 'diseases', 'monarch-diseases.json'),
  `${JSON.stringify({ source: `${API}/{id}`, fetchedAt: new Date().toISOString(), diseases }, null, 2)}\n`,
);
process.exitCode = failed ? 1 : 0;
