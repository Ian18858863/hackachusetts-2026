import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCsv } from '../lib/csv.mjs';
import { T37_HEADER, importT37, importT37File, resolveColumns } from '../lib/t37-import.mjs';
import { ROOT } from '../lib/load.mjs';

const store = {
  terms: {
    'HP:0001252': { requestedId: 'HP:0001252', found: true, id: 'HP:0001252', name: 'Hypotonia', synonyms: ['Low muscle tone'] },
    'HP:0001250': { requestedId: 'HP:0001250', found: true, id: 'HP:0001250', name: 'Seizure', synonyms: [] },
  },
};

// Exact T37 header, UTF-8 BOM, CRLF, a quoted phrase with a comma, a synonym
// used as the name, an id never fetched, a malformed id and an empty phrase.
const BOM = '\uFEFF';
const REAL_CSV = `${BOM}${T37_HEADER.join(',')}\r\n`
  + 'floppy baby,Hypotonia,HP:0001252\r\n'
  + '"had a fit, then slept",Seizure,HP:0001250\r\n'
  + 'low tone,Low muscle tone,HP:0001252\r\n'
  + 'big calves,Calf muscle pseudohypertrophy,HP:0003707\r\n'
  + 'odd id,Seizure,HP:123\r\n'
  + ',Seizure,HP:0001250\r\n';

test('the real T37 header is recognised, including the BOM', () => {
  const rows = parseCsv(REAL_CSV);
  assert.deepEqual(Object.keys(rows[0]), T37_HEADER, 'BOM is stripped from the first header');
  assert.deepEqual(resolveColumns(Object.keys(rows[0])), { phrase: 'lay phrase', label: 'HPO term name', hpoId: 'HP id' });
});

test('integration: importing a T37-format file yields usable ids and unverified candidates', async () => {
  const dir = mkdtempSync(join(tmpdir(), 't37-'));
  try {
    const csv = join(dir, 'T37_lay_language_HPO_dictionary.csv');
    writeFileSync(csv, REAL_CSV, 'utf8');
    assert.equal(readFileSync(csv)[0], 0xef, 'fixture really starts with a UTF-8 BOM');
    const r = await importT37File(csv, store);
    assert.equal(r.rows, 6);
    assert.equal(r.uniqueIds, 4);
    assert.deepEqual(r.candidates.map((c) => c.precheck), [
      'ID_AND_NAME_OK', 'ID_AND_NAME_OK', 'LABEL_IS_SYNONYM', 'HPO_NOT_FETCHED', 'HPO_ID_FORMAT', 'MISSING_PHRASE',
    ]);
    assert.equal(r.candidates[1].phrase, 'had a fit, then slept');
    assert.ok(r.candidates.every((c) => c.status === 'unverified'), 'nothing is promoted to verified');
    assert.equal(r.precheck.HPO_ID_FORMAT, 1, 'only the malformed id fails the format check');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('integration: the CLI writes candidates to --out and leaves the verified dictionary alone', () => {
  const dir = mkdtempSync(join(tmpdir(), 't37-cli-'));
  try {
    const csv = join(dir, 'in.csv');
    const out = join(dir, 'out.json');
    writeFileSync(csv, REAL_CSV, 'utf8');
    const verifiedBefore = readFileSync(join(ROOT, 'data', 'dictionary', 'lay-hpo.verified.json'));
    execFileSync(process.execPath, [join(ROOT, 'scripts', 'import-t37.mjs'), csv, '--out', out], { cwd: ROOT });
    const res = JSON.parse(readFileSync(out, 'utf8'));
    assert.equal(res.status, 'unverified');
    assert.equal(res.rows, 6);
    assert.equal(res.columns.hpoId, 'HP id');
    assert.ok(res.candidates.every((c) => c.status === 'unverified'));
    assert.deepEqual(readFileSync(join(ROOT, 'data', 'dictionary', 'lay-hpo.verified.json')), verifiedBefore);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a CSV without an id column is rejected instead of producing format failures', () => {
  const rows = parseCsv('lay phrase,HPO term name\nfloppy,Hypotonia\n');
  assert.throws(() => importT37(rows, store), (e) => e.code === 'MISSING_COLUMNS' && /hpoId/.test(e.message));
});

test('header variants are matched after normalisation', () => {
  for (const header of ['Lay_Phrase,hpo-term-name,HP_ID', 'phrase,hpo label,hpo id', 'LAY PHRASE , HPO TERM NAME , HP ID']) {
    const r = importT37(parseCsv(`${header}\nfloppy,Hypotonia,HP:0001252\n`), store);
    assert.equal(r.candidates[0].precheck, 'ID_AND_NAME_OK', header);
  }
});

test('parseCsv handles quotes, doubled quotes and CRLF', () => {
  const rows = parseCsv('lay phrase,HPO term name,HP id\r\n"says ""no""",Hypotonia,HP:0001252\r\n');
  assert.equal(rows[0]['lay phrase'], 'says "no"');
});
