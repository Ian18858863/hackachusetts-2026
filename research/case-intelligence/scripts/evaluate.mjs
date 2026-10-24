// Score a predictions file against one split.
// Usage: node scripts/evaluate.mjs <split> <predictions.json> [name]
// Held-out guard: refuses to score the held-out split while lib/, scripts/ or
// data/ have uncommitted changes, so every held-out result maps to a commit.
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { ROOT, loadCases, loadDiseases, loadHpo, readJson } from '../lib/load.mjs';
import { evaluate } from '../lib/metrics.mjs';
import { dirtyPaths, headSha } from '../lib/git.mjs';

const [split, predFile, nameArg] = process.argv.slice(2);
if (!['dev', 'heldout'].includes(split) || !predFile) throw new Error('Usage: evaluate.mjs dev|heldout <predictions.json> [name]');

if (split === 'heldout') {
  const dirty = dirtyPaths(['lib', 'scripts', 'data']);
  if (dirty.length) {
    console.error(`Refusing to score held-out with uncommitted changes:\n${dirty.join('\n')}`);
    process.exit(3);
  }
}

const predictions = await readJson(resolve(predFile));
if (predictions.split && predictions.split !== split) throw new Error(`Predictions are for split "${predictions.split}", not "${split}"`);
const result = evaluate(predictions, await loadCases(split), { hpo: await loadHpo(), diseases: await loadDiseases() });
const name = nameArg ?? basename(predFile, '.json');
const out = {
  name,
  split,
  scoredAt: new Date().toISOString(),
  scorerGitSha: headSha(),
  predictionsGitSha: predictions.gitSha ?? null,
  extractor: predictions.extractor ?? null,
  ...result,
};
await mkdir(join(ROOT, 'results'), { recursive: true });
const outFile = join(ROOT, 'results', `eval-${name}.json`);
await writeFile(outFile, `${JSON.stringify(out, null, 2)}\n`);
const e = result.extraction;
console.log(`${name} [${split}] n=${result.n} coverage=${e.coverage} missedRate=${e.missedPhenotypeRate} precision=${e.precision} notInGold=${e.predictedNotInGold} articleOnly=${e.predictedArticleOnly} invalid=${e.invalidHpoIds} top1=${result.ranking.top1Accuracy} top5=${result.ranking.top5Recall}`);
if (result.missingPredictions.length) console.log(`missing predictions: ${result.missingPredictions.join(', ')}`);
