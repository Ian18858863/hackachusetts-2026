import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { SubmissionError, acceptedDiseaseIds, evaluate } from '../lib/metrics.mjs';
import { checkProvenance, checkSubmission } from '../lib/submission.mjs';
import { buildLexicon, extract } from '../lib/extract-baseline.mjs';
import { assertBlind, blindInputs, sha256 } from '../lib/eval-inputs.mjs';
import { DATA, loadCases, readJson } from '../lib/load.mjs';

const hpo = {
  terms: {
    'HP:0001252': { requestedId: 'HP:0001252', found: true, id: 'HP:0001252', name: 'Hypotonia', synonyms: ['Low muscle tone'] },
    'HP:0001250': { requestedId: 'HP:0001250', found: true, id: 'HP:0001250', name: 'Seizure', synonyms: ['Epileptic seizure'] },
    'HP:0004322': { requestedId: 'HP:0004322', found: true, id: 'HP:0004322', name: 'Short stature', synonyms: [] },
  },
};
const diseases = { diseases: { 'MONDO:0000001': { id: 'MONDO:0000001', name: 'Examplar syndrome', xrefs: ['OMIM:100001', 'Orphanet:42'] } } };
const caseA = {
  caseId: 'HO-01',
  diagnosis: { acceptedIds: ['MONDO:0000001'] },
  phenotypes: [
    { hpoId: 'HP:0001252', inNote: true },
    { hpoId: 'HP:0001250', inNote: true },
    { hpoId: 'HP:0004322', inNote: false },
  ],
};

test('extraction coverage, missed rate and precision come from the predictions', () => {
  const r = evaluate({ cases: [{ caseId: 'HO-01', extracted: [{ hpoId: 'HP:0001252' }, { hpoId: 'HP:0004322' }, { hpoId: 'HP:0009999' }] }] }, [caseA], { hpo, diseases });
  assert.equal(r.extraction.goldInNoteTerms, 2);
  assert.equal(r.extraction.truePositives, 1);
  assert.equal(r.extraction.coverage, 0.5);
  assert.equal(r.extraction.missedPhenotypeRate, 0.5);
  assert.equal(r.extraction.precision, 0.333);
  assert.equal(r.extraction.predictedArticleOnly, 1);
  assert.equal(r.extraction.predictedNotInGold, 1);
  assert.equal(r.extraction.invalidHpoIds, 1);
  assert.deepEqual(r.perCase[0].missed, ['HP:0001250']);
});

test('exploratory mode: a missing prediction counts as zero coverage and is reported', () => {
  const r = evaluate({ cases: [] }, [caseA], { hpo, diseases, mode: 'exploratory' });
  assert.equal(r.status, 'exploratory');
  assert.equal(r.extraction.coverage, 0);
  assert.deepEqual(r.missingPredictions, ['HO-01']);
});

test('ranking metrics use ids, including OMIM and Orphanet xrefs', () => {
  assert.ok(acceptedDiseaseIds(caseA, diseases).has('ORPHA:42'));
  const mk = (ranking) => evaluate({ cases: [{ caseId: 'HO-01', extracted: [], ranking }] }, [caseA], { hpo, diseases }).ranking;
  assert.equal(mk(['MONDO:0000001']).top1Accuracy, 1);
  assert.equal(mk(['MONDO:9', 'OMIM:100001']).top1Accuracy, 0);
  assert.equal(mk(['MONDO:9', 'OMIM:100001']).top5Recall, 1);
  assert.equal(mk(['A', 'B', 'C', 'D', 'E', 'ORPHA:42']).top5Recall, 0);
  assert.equal(mk(['Examplar syndrome']).top1Accuracy, 0, 'names are not matched');
});

test('ranking metrics are not computed without a ranking', () => {
  const r = evaluate({ cases: [{ caseId: 'HO-01', extracted: [] }] }, [caseA], { hpo, diseases });
  assert.equal(r.ranking.casesWithRanking, 0);
  assert.equal(r.ranking.top1Accuracy, null);
});

test('baseline extractor matches whole words only and ignores rejected entries', () => {
  const dict = {
    verified: { entries: [{ phrase: 'floppy', hpoId: 'HP:0001252' }, { phrase: 'had a fit', hpoId: 'HP:0001250' }] },
    rejected: { entries: [{ phrase: 'small', hpoId: 'HP:0004322' }] },
  };
  const lex = buildLexicon(dict, hpo);
  assert.deepEqual(extract('She was floppy and had a fit.', lex).map((x) => x.hpoId), ['HP:0001250', 'HP:0001252']);
  assert.deepEqual(extract('The floppydisk was small.', lex), []);
  assert.deepEqual(extract('Doctors noted low muscle tone.', lex).map((x) => x.hpoId), ['HP:0001252'], 'HPO synonyms of dictionary ids are used');
});

test('blind inputs carry only caseId and note', () => {
  const inputs = blindInputs([{ caseId: 'X', note: { text: 'n' }, diagnosis: { name: 'secret' } }]);
  assert.deepEqual(inputs, [{ caseId: 'X', note: 'n' }]);
  assert.throws(() => assertBlind([{ caseId: 'X', note: 'n', diagnosis: 'secret' }]));
});

test('committed eval inputs match the case notes exactly and are blind', async () => {
  for (const split of ['dev', 'heldout']) {
    const file = await readJson(join(DATA, 'eval', `${split}-inputs.json`));
    assertBlind(file.inputs);
    assert.deepEqual(file.inputs, blindInputs(await loadCases(split)));
  }
});

// ---- Submission completeness (formal vs exploratory) ----

const tenCases = Array.from({ length: 10 }, (_, i) => ({ ...caseA, caseId: `HO-${String(i + 1).padStart(2, '0')}` }));
const full = (extra = {}) => ({ cases: tenCases.map((c) => ({ caseId: c.caseId, extracted: [], ...extra })) });
const codesOf = (fn) => {
  try { fn(); } catch (e) { assert.ok(e instanceof SubmissionError, String(e)); return e.issues.map((i) => i.code); }
  assert.fail('expected a SubmissionError');
};

test('formal: 9 missing cases with one correct ranking is rejected, not Top-1 = 1.0', () => {
  const partial = { cases: [{ caseId: 'HO-01', extracted: [], ranking: ['MONDO:0000001'] }] };
  const codes = codesOf(() => evaluate(partial, tenCases, { hpo, diseases }));
  assert.equal(codes.filter((c) => c === 'MISSING_CASE').length, 9);
  const ex = evaluate(partial, tenCases, { hpo, diseases, mode: 'exploratory' });
  assert.equal(ex.ranking.top1OverRankedCases, 1);
  assert.equal(ex.ranking.top1OverAllCases, 0.1, 'missing cases count as wrong over all cases');
  assert.match(ex.ranking.note, /EXPLORATORY/);
  assert.equal(ex.ranking.top1Accuracy, undefined, 'no official Top-1 field in exploratory output');
});

test('formal: a complete submission is accepted and Top-1 is over all expected cases', () => {
  const sub = { cases: tenCases.map((c, i) => ({ caseId: c.caseId, extracted: [], ranking: i < 3 ? ['MONDO:0000001'] : ['MONDO:9'] })) };
  const r = evaluate(sub, tenCases, { hpo, diseases });
  assert.equal(r.status, 'formal');
  assert.equal(r.ranking.top1Accuracy, 0.3);
  assert.deepEqual(r.submissionIssues, []);
});

test('duplicate case ids are rejected in both modes', () => {
  const sub = full();
  sub.cases.push({ caseId: 'HO-03', extracted: [{ hpoId: 'HP:0001252' }] });
  assert.ok(codesOf(() => evaluate(sub, tenCases, { hpo, diseases })).includes('DUPLICATE_CASE_ID'));
  assert.ok(codesOf(() => evaluate(sub, tenCases, { hpo, diseases, mode: 'exploratory' })).includes('DUPLICATE_CASE_ID'));
});

test('unknown case ids are rejected formally and reported exploratorily', () => {
  const sub = full();
  sub.cases.push({ caseId: 'HO-99', extracted: [] });
  assert.ok(codesOf(() => evaluate(sub, tenCases, { hpo, diseases })).includes('UNKNOWN_CASE_ID'));
  const ex = evaluate(sub, tenCases, { hpo, diseases, mode: 'exploratory' });
  assert.deepEqual(ex.unknownPredictionIds, ['HO-99']);
});

test('partial ranking output is rejected formally', () => {
  const sub = full();
  sub.cases[0].ranking = ['MONDO:0000001'];
  assert.deepEqual(codesOf(() => evaluate(sub, tenCases, { hpo, diseases })), ['PARTIAL_RANKING']);
  const ex = evaluate(sub, tenCases, { hpo, diseases, mode: 'exploratory' });
  assert.equal(ex.ranking.casesWithRanking, 1);
  assert.equal(ex.ranking.top1OverAllCases, 0.1);
});

test('malformed predictions are rejected in both modes', () => {
  const sub = full();
  sub.cases[0].ranking = 'MONDO:0000001';
  sub.cases[1].extracted = ['HP:0001252'];
  for (const mode of ['formal', 'exploratory']) {
    const codes = codesOf(() => evaluate(sub, tenCases, { hpo, diseases, mode }));
    assert.ok(codes.includes('MALFORMED_RANKING') && codes.includes('MALFORMED_EXTRACTED'), mode);
  }
});

test('checkSubmission reports completeness without scoring', () => {
  assert.deepEqual(checkSubmission(full(), tenCases), { complete: true, issues: [], hasRanking: false });
  assert.equal(checkSubmission({}, tenCases).issues[0].code, 'NO_CASES');
});

// ---- Held-out provenance ----

const provCases = [{ caseId: 'HO-01', note: { text: 'n1' } }, { caseId: 'HO-02', note: { text: 'n2' } }];
const inputsHash = sha256(blindInputs(provCases));
const SHA = 'a'.repeat(40);
const goodPred = () => ({ split: 'heldout', extractor: 'x', gitSha: SHA, inputsSha256: inputsHash, cases: [] });
const deps = (over = {}) => ({
  cases: provCases,
  inputsFile: { sha256: inputsHash },
  inputsPath: 'data/eval/heldout-inputs.json',
  isAncestor: (s) => s === SHA,
  gitShow: () => JSON.stringify({ sha256: inputsHash }),
  ...over,
});
const provCodes = (p, d = deps()) => checkProvenance(p, 'heldout', d).issues.map((i) => i.code);

test('provenance: matching split, extractor, hash and revision is accepted', () => {
  assert.deepEqual(checkProvenance(goodPred(), 'heldout', deps()), { ok: true, issues: [] });
});

test('provenance: missing fields are rejected, not silently accepted', () => {
  const p = goodPred();
  delete p.split; delete p.extractor; delete p.gitSha; delete p.inputsSha256;
  assert.deepEqual(provCodes(p).sort(), ['NO_EXTRACTOR', 'NO_GIT_SHA', 'NO_INPUTS_HASH', 'SPLIT_MISMATCH']);
});

test('provenance: wrong split, wrong input hash and short or unknown SHAs are rejected', () => {
  assert.ok(provCodes({ ...goodPred(), split: 'dev' }).includes('SPLIT_MISMATCH'));
  assert.ok(provCodes({ ...goodPred(), inputsSha256: 'b'.repeat(64) }).includes('INPUTS_HASH_MISMATCH'));
  assert.ok(provCodes({ ...goodPred(), gitSha: 'aaaaaaa' }).includes('GIT_SHA_FORMAT'));
  assert.ok(provCodes({ ...goodPred(), gitSha: 'c'.repeat(40) }).includes('GIT_SHA_UNKNOWN'));
});

test('provenance: inputs absent or different at the recorded revision are rejected', () => {
  assert.ok(provCodes(goodPred(), deps({ gitShow: () => null })).includes('INPUTS_NOT_AT_SHA'));
  assert.ok(provCodes(goodPred(), deps({ gitShow: () => JSON.stringify({ sha256: 'x' }) })).includes('INPUTS_CHANGED_SINCE_SHA'));
});

test('provenance: a stale committed inputs file is rejected', () => {
  assert.ok(provCodes(goodPred(), deps({ inputsFile: { sha256: 'stale' } })).includes('INPUTS_FILE_STALE'));
});

test('provenance of the committed held-out baseline predictions passes against real git history', async () => {
  const { isAncestor, showAt } = await import('../lib/git.mjs');
  const pred = await readJson(join(DATA, '..', 'results', 'predictions', 'baseline-heldout.json'));
  const r = checkProvenance(pred, 'heldout', {
    cases: await loadCases('heldout'),
    inputsFile: await readJson(join(DATA, 'eval', 'heldout-inputs.json')),
    inputsPath: 'data/eval/heldout-inputs.json',
    isAncestor,
    gitShow: showAt,
  });
  assert.deepEqual(r.issues, []);
});

test('provenance of the historical dev baseline fails: it ran before its inputs were committed', async () => {
  const { isAncestor, showAt } = await import('../lib/git.mjs');
  const pred = await readJson(join(DATA, '..', 'results', 'predictions', 'baseline-dev.json'));
  const r = checkProvenance(pred, 'dev', {
    cases: await loadCases('dev'),
    inputsFile: await readJson(join(DATA, 'eval', 'dev-inputs.json')),
    inputsPath: 'data/eval/dev-inputs.json',
    isAncestor,
    gitShow: showAt,
  });
  assert.deepEqual(r.issues.map((i) => i.code), ['INPUTS_NOT_AT_SHA']);
});
