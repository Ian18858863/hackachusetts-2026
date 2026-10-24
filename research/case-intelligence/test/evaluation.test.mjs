import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { acceptedDiseaseIds, evaluate } from '../lib/metrics.mjs';
import { buildLexicon, extract } from '../lib/extract-baseline.mjs';
import { assertBlind, blindInputs } from '../lib/eval-inputs.mjs';
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

test('a missing prediction counts as zero coverage and is reported', () => {
  const r = evaluate({ cases: [] }, [caseA], { hpo, diseases });
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
