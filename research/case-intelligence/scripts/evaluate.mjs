// Score a predictions file against one split.
// Usage: node scripts/evaluate.mjs dev|heldout <predictions.json> [name] [--exploratory]
//
// Formal (default): the submission must be complete (one prediction per
// expected case, no unknown or duplicate ids, ranking on all or none) and its
// provenance must match the frozen inputs (split, extractor, full gitSha in
// HEAD's history, inputsSha256 = committed inputs = current notes = inputs at
// gitSha). Exit 5 if rejected.
// Exploratory: scores whatever is present, labelled EXPLORATORY; never an
// official Top-1/Top-5. Writes results/eval-<name>.exploratory.json.
// Held-out guard (both modes): refuses while lib/, scripts/ or data/ have
// uncommitted changes (exit 3).
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { DATA, ROOT, loadCases, loadDiseases, loadHpo, readJson } from '../lib/load.mjs';
import { SubmissionError, evaluate } from '../lib/metrics.mjs';
import { checkProvenance } from '../lib/submission.mjs';
import { dirtyPaths, headSha, isAncestor, showAt } from '../lib/git.mjs';

const args = process.argv.slice(2);
const exploratory = args.includes('--exploratory');
const [split, predFile, nameArg] = args.filter((a) => !a.startsWith('--'));
if (!['dev', 'heldout'].includes(split) || !predFile) throw new Error('Usage: evaluate.mjs dev|heldout <predictions.json> [name] [--exploratory]');
const mode = exploratory ? 'exploratory' : 'formal';

if (split === 'heldout') {
  const dirty = dirtyPaths(['lib', 'scripts', 'data']);
  if (dirty.length) {
    console.error(`Refusing to score held-out with uncommitted changes:\n${dirty.join('\n')}`);
    process.exit(3);
  }
}

const reject = (what, issues) => {
  console.error(`REJECTED (${mode}) ${what}:`);
  for (const i of issues) console.error(`  ${i.code}${i.caseId ? ` [${i.caseId}]` : ''}: ${i.message}`);
  process.exit(5);
};

const predictions = await readJson(resolve(predFile));
const cases = await loadCases(split);
const inputsPath = `data/eval/${split}-inputs.json`;
let provenance = null;
if (mode === 'formal') {
  provenance = checkProvenance(predictions, split, {
    cases,
    inputsFile: await readJson(join(DATA, 'eval', `${split}-inputs.json`)),
    inputsPath,
    isAncestor,
    gitShow: showAt,
  });
  if (!provenance.ok) reject('provenance', provenance.issues);
}

let result;
try {
  result = evaluate(predictions, cases, { hpo: await loadHpo(), diseases: await loadDiseases(), mode });
} catch (err) {
  if (err instanceof SubmissionError) reject('submission', err.issues);
  throw err;
}

const name = nameArg ?? basename(predFile, '.json');
const out = {
  name,
  split,
  status: mode,
  scoredAt: new Date().toISOString(),
  scorerGitSha: headSha(),
  predictionsGitSha: predictions.gitSha ?? null,
  extractor: predictions.extractor ?? null,
  inputsSha256: predictions.inputsSha256 ?? null,
  provenance,
  ...result,
};
await mkdir(join(ROOT, 'results'), { recursive: true });
const outFile = join(ROOT, 'results', `eval-${name}${mode === 'exploratory' ? '.exploratory' : ''}.json`);
await writeFile(outFile, `${JSON.stringify(out, null, 2)}\n`);
const e = result.extraction;
const r = result.ranking;
const rank = mode === 'formal' ? `top1=${r.top1Accuracy} top5=${r.top5Recall}` : `top1(ranked)=${r.top1OverRankedCases} top1(all)=${r.top1OverAllCases}`;
console.log(`${name} [${split}, ${mode.toUpperCase()}] n=${result.n} coverage=${e.coverage} missedRate=${e.missedPhenotypeRate} precision=${e.precision} notInGold=${e.predictedNotInGold} articleOnly=${e.predictedArticleOnly} invalid=${e.invalidHpoIds} ${rank} -> ${outFile}`);
if (result.submissionIssues.length) console.log(`submission issues: ${result.submissionIssues.map((i) => i.code).join(', ')}`);
