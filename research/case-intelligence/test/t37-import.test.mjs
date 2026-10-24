import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../lib/csv.mjs';
import { importT37 } from '../lib/t37-import.mjs';

const store = {
  terms: {
    'HP:0001252': { requestedId: 'HP:0001252', found: true, id: 'HP:0001252', name: 'Hypotonia', synonyms: ['Low muscle tone'] },
  },
};

test('parseCsv handles quotes, embedded commas and CRLF', () => {
  const rows = parseCsv('phrase,hpo_id,hpo_label\r\n"floppy, weak",HP:0001252,Hypotonia\r\n"says ""no""",HP:0001252,Hypotonia\r\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].phrase, 'floppy, weak');
  assert.equal(rows[1].phrase, 'says "no"');
});

test('every imported row is unverified, whatever the precheck says', () => {
  const rows = parseCsv('phrase,hpo_id,hpo_label\nfloppy,HP:0001252,Hypotonia\nfloppy,HP:0001252,Low muscle tone\nx,HP:0000001,All\n');
  const r = importT37(rows, store);
  assert.equal(r.rows, 3);
  assert.ok(r.candidates.every((c) => c.status === 'unverified'));
  assert.deepEqual(r.candidates.map((c) => c.precheck), ['ID_AND_NAME_OK', 'LABEL_IS_SYNONYM', 'HPO_NOT_FETCHED']);
  assert.equal(r.uniqueIds, 2);
});

test('column names are matched case-insensitively', () => {
  const rows = parseCsv('Lay Phrase,HPO ID,HPO Term\nfloppy,HP:0001252,Hypotonia\n');
  assert.equal(importT37(rows, store).candidates[0].precheck, 'ID_AND_NAME_OK');
});

test('rows without a phrase are flagged', () => {
  const rows = parseCsv('phrase,hpo_id\n,HP:0001252\n');
  assert.equal(importT37(rows, store).candidates[0].precheck, 'MISSING_PHRASE');
});
