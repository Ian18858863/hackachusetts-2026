// Fetch the official JAX ontology record for every HP id used by the cases and
// the dictionary, and store id, name and synonyms in data/hpo/hpo-terms.json.
// A requested id that resolves to a different primary id (alternate or
// obsolete id) is stored with both ids so the offline check can fail it.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA, collectHpoIds, loadAllCases, loadDictionary } from '../lib/load.mjs';

const API = 'https://ontology.jax.org/api/hp/terms';
const RELEASES = 'https://api.github.com/repos/obophenotype/human-phenotype-ontology/releases/latest';

const ids = collectHpoIds(await loadAllCases(), await loadDictionary());
const terms = {};
let failed = 0;

for (const id of ids) {
  try {
    const res = await fetch(`${API}/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(20000) });
    if (res.status === 404) {
      terms[id] = { requestedId: id, found: false };
      console.log(`${id} => NOT FOUND`);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const t = await res.json();
    terms[id] = { requestedId: id, found: true, id: t.id, name: t.name, synonyms: t.synonyms ?? [] };
    console.log(`${id} => ${t.name}${t.id === id ? '' : `  (RESOLVES TO ${t.id})`}`);
  } catch (err) {
    failed += 1;
    console.log(`${id} => ERROR ${err.message}`);
  }
}

// The JAX API does not report which HPO release it serves. Record the latest
// GitHub release tag at fetch time as context only.
let latestRelease = null;
try {
  const r = await fetch(RELEASES, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'rdd-case-intelligence' } });
  if (r.ok) latestRelease = (await r.json()).tag_name ?? null;
} catch { /* context only */ }

await mkdir(join(DATA, 'hpo'), { recursive: true });
await writeFile(
  join(DATA, 'hpo', 'hpo-terms.json'),
  `${JSON.stringify({
    source: `${API}/{id}`,
    fetchedAt: new Date().toISOString(),
    latestGithubReleaseAtFetch: latestRelease,
    releaseNote: 'The JAX ontology API does not state which HPO release it serves; latestGithubReleaseAtFetch is context only.',
    attribution: 'This product uses the Human Phenotype Ontology. Find out more at https://hpo.jax.org',
    terms,
  }, null, 2)}\n`,
);
console.log(`${ids.length} ids, ${failed} errors, latest GitHub release: ${latestRelease}`);
process.exitCode = failed ? 1 : 0;
