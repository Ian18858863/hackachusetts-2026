// Run the dictionary baseline extractor over one split's blind inputs.
// Usage: node scripts/run-baseline.mjs dev|heldout
// Writes results/predictions/baseline-<split>.json. The extractor never sees
// case records, only data/eval/<split>-inputs.json.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA, ROOT, loadDictionary, loadHpo, readJson } from '../lib/load.mjs';
import { assertBlind, sha256 } from '../lib/eval-inputs.mjs';
import { BASELINE_VERSION, buildLexicon, extract } from '../lib/extract-baseline.mjs';
import { headSha } from '../lib/git.mjs';

const split = process.argv[2];
if (!['dev', 'heldout'].includes(split)) throw new Error('Usage: run-baseline.mjs dev|heldout');

const file = await readJson(join(DATA, 'eval', `${split}-inputs.json`));
assertBlind(file.inputs);
const dictionary = await loadDictionary();
const lexicon = buildLexicon(dictionary, await loadHpo());

const predictions = {
  extractor: BASELINE_VERSION,
  split,
  inputsSha256: file.sha256,
  dictionarySha256: sha256(dictionary.verified),
  lexiconPhrases: lexicon.size,
  gitSha: headSha(),
  generatedAt: new Date().toISOString(),
  cases: file.inputs.map((i) => ({ caseId: i.caseId, extracted: extract(i.note, lexicon) })),
};
await mkdir(join(ROOT, 'results', 'predictions'), { recursive: true });
await writeFile(join(ROOT, 'results', 'predictions', `baseline-${split}.json`), `${JSON.stringify(predictions, null, 2)}\n`);
console.log(`${split}: ${predictions.cases.length} cases, ${lexicon.size} lexicon phrases, ${predictions.cases.reduce((n, c) => n + c.extracted.length, 0)} terms extracted`);
