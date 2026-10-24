import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTerm, checkTerms } from '../lib/hpo-check.mjs';

const store = {
  terms: {
    'HP:0001252': { requestedId: 'HP:0001252', found: true, id: 'HP:0001252', name: 'Hypotonia', synonyms: ['Low muscle tone'] },
    'HP:0001388': { requestedId: 'HP:0001388', found: true, id: 'HP:0001382', name: 'Joint hypermobility', synonyms: [] },
    'HP:9999999': { requestedId: 'HP:9999999', found: false },
  },
};

test('accepts the exact official name', () => {
  assert.equal(checkTerm('HP:0001252', 'Hypotonia', store), null);
});

test('accepts an id without a label', () => {
  assert.equal(checkTerm('HP:0001252', undefined, store), null);
});

test('rejects a synonym used as the label', () => {
  assert.equal(checkTerm('HP:0001252', 'Low muscle tone', store).code, 'LABEL_IS_SYNONYM');
});

test('rejects a wrong label', () => {
  assert.equal(checkTerm('HP:0001252', 'Hypertonia', store).code, 'LABEL_MISMATCH');
});

test('rejects case-only differences from the official name', () => {
  assert.equal(checkTerm('HP:0001252', 'hypotonia', store).code, 'LABEL_MISMATCH');
});

test('rejects an alternate id that resolves elsewhere', () => {
  assert.equal(checkTerm('HP:0001388', 'Joint hypermobility', store).code, 'HPO_ALT_ID');
});

test('rejects an id the API does not know', () => {
  assert.equal(checkTerm('HP:9999999', 'x', store).code, 'HPO_NOT_FOUND');
});

test('rejects an id that was never fetched', () => {
  assert.equal(checkTerm('HP:0000001', 'All', store).code, 'HPO_NOT_FETCHED');
});

test('rejects malformed ids', () => {
  assert.equal(checkTerm('HP:123', 'x', store).code, 'HPO_ID_FORMAT');
  assert.equal(checkTerm('MONDO:0010526', 'x', store).code, 'HPO_ID_FORMAT');
});

test('checkTerms counts valid and invalid pairs', () => {
  const r = checkTerms([
    { hpoId: 'HP:0001252', label: 'Hypotonia' },
    { hpoId: 'HP:0001252', label: 'Floppy' },
  ], store);
  assert.equal(r.checked, 2);
  assert.equal(r.valid, 1);
  assert.equal(r.issues[0].code, 'LABEL_MISMATCH');
});
