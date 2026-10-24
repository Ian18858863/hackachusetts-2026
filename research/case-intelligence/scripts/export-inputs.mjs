// Write the exact blind evaluation inputs for each split:
// data/eval/<split>-inputs.json with { caseId, note } only, plus a hash.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA, loadCases } from '../lib/load.mjs';
import { assertBlind, blindInputs, sha256 } from '../lib/eval-inputs.mjs';

await mkdir(join(DATA, 'eval'), { recursive: true });
for (const split of ['dev', 'heldout']) {
  const inputs = blindInputs(await loadCases(split));
  assertBlind(inputs);
  const file = join(DATA, 'eval', `${split}-inputs.json`);
  await writeFile(file, `${JSON.stringify({ split, count: inputs.length, sha256: sha256(inputs), inputs }, null, 2)}\n`);
  console.log(`${split}: ${inputs.length} inputs, sha256 ${sha256(inputs)}`);
}
