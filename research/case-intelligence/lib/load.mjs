// Load committed data files. No network.
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = join(ROOT, 'data');

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

/** All case records of one split ('dev' | 'heldout'), each with its file name. */
export async function loadCases(split, dataDir = DATA) {
  const dir = join(dataDir, 'cases', split);
  if (!existsSync(dir)) return [];
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  return Promise.all(files.map(async (f) => ({ ...(await readJson(join(dir, f))), _file: `cases/${split}/${f}` })));
}

export async function loadAllCases(dataDir = DATA) {
  return [...(await loadCases('dev', dataDir)), ...(await loadCases('heldout', dataDir))];
}

async function optionalJson(file, fallback) {
  return existsSync(file) ? readJson(file) : fallback;
}

export async function loadHpo(dataDir = DATA) {
  return optionalJson(join(dataDir, 'hpo', 'hpo-terms.json'), { terms: {} });
}

export async function loadDiseases(dataDir = DATA) {
  return optionalJson(join(dataDir, 'diseases', 'monarch-diseases.json'), { diseases: {} });
}

export async function loadDictionary(dataDir = DATA) {
  return {
    verified: await optionalJson(join(dataDir, 'dictionary', 'lay-hpo.verified.json'), { entries: [] }),
    rejected: await optionalJson(join(dataDir, 'dictionary', 'lay-hpo.rejected.json'), { entries: [] }),
    // Unverified T37 candidates (present only after import-t37 has run).
    candidates: await optionalJson(join(dataDir, 'dictionary', 't37-candidates.json'), { candidates: [] }),
  };
}

/** Every HP id referenced by cases and dictionary files. */
export function collectHpoIds(cases, dictionary) {
  const ids = new Set();
  for (const c of cases) for (const p of c.phenotypes ?? []) ids.add(p.hpoId);
  for (const e of dictionary?.verified?.entries ?? []) ids.add(e.hpoId);
  for (const e of dictionary?.rejected?.entries ?? []) if (e.hpoId) ids.add(e.hpoId);
  // Well-formed ids of unverified candidates, so their precheck can be completed.
  for (const c of dictionary?.candidates?.candidates ?? []) if (/^HP:\d{7}$/.test(c.hpoId ?? '')) ids.add(c.hpoId);
  return [...ids].sort();
}
