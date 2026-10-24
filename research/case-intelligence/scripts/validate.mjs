// Validate the committed dataset offline. Exit 1 on any error.
// Writes results/validation.json.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, loadAllCases, loadDictionary, loadDiseases, loadHpo } from '../lib/load.mjs';
import { validateDataset } from '../lib/validate.mjs';

const result = validateDataset({
  cases: await loadAllCases(),
  hpo: await loadHpo(),
  diseases: await loadDiseases(),
  dictionary: await loadDictionary(),
  expectedHeldout: 10,
});

for (const e of result.errors) console.log(`ERROR   ${e.code}  ${e.where}  ${e.message}`);
for (const w of result.warnings) console.log(`warning ${w.code}  ${w.where}  ${w.message}`);
console.log(JSON.stringify({ ...result.stats, errors: result.errors.length, warnings: result.warnings.length }));

await mkdir(join(ROOT, 'results'), { recursive: true });
await writeFile(join(ROOT, 'results', 'validation.json'), `${JSON.stringify(result, null, 2)}\n`);
process.exitCode = result.errors.length ? 1 : 0;
