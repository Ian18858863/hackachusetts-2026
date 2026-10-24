import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revealingWords, validateDataset } from '../lib/validate.mjs';
import { loadAllCases, loadDictionary, loadDiseases, loadHpo } from '../lib/load.mjs';

const hpo = {
  terms: {
    'HP:0001252': { requestedId: 'HP:0001252', found: true, id: 'HP:0001252', name: 'Hypotonia', synonyms: ['Low muscle tone'] },
    'HP:0001250': { requestedId: 'HP:0001250', found: true, id: 'HP:0001250', name: 'Seizure', synonyms: [] },
    'HP:0001388': { requestedId: 'HP:0001388', found: true, id: 'HP:0001382', name: 'Joint hypermobility', synonyms: [] },
  },
};
const diseases = {
  diseases: {
    'MONDO:0000001': { id: 'MONDO:0000001', name: 'Examplar syndrome', xrefs: [] },
    'MONDO:0000002': { id: 'MONDO:0000002', name: 'Fictivus disease', xrefs: [] },
  },
};

function makeCase(over = {}) {
  const base = {
    caseId: 'DEV-01',
    split: 'dev',
    _file: 'cases/dev/DEV-01-x.json',
    source: { pmcid: 'PMC1000001', pmid: '1', doi: null, url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1000001/', title: 'T', journal: 'J', year: 2020, textAccess: 'fulltext' },
    diagnosis: {
      name: 'Examplar syndrome', mondo: 'MONDO:0000001', acceptedIds: ['MONDO:0000001'], genes: ['EXM1'],
      confirmation: { method: 'genetic', summary: 'variant', evidence: ['a pathogenic EXM1 variant was found'] },
    },
    note: { text: 'Our baby was very floppy and had a fit at two months.', voice: 'parent', author: 'test' },
    phenotypes: [
      { hpoId: 'HP:0001252', label: 'Hypotonia', evidence: 'marked hypotonia', inNote: true, notePhrase: 'very floppy' },
      { hpoId: 'HP:0001250', label: 'Seizure', evidence: 'a seizure at two months', inNote: true, notePhrase: 'had a fit' },
    ],
    uncertainty: [],
  };
  return structuredClone({ ...base, ...over });
}

function heldCase(over = {}) {
  return makeCase({
    caseId: 'HO-01', split: 'heldout', _file: 'cases/heldout/HO-01-y.json',
    source: { pmcid: 'PMC2000002', pmid: '2', doi: null, url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2000002/', title: 'U', journal: 'J', year: 2021, textAccess: 'fulltext' },
    diagnosis: {
      name: 'Fictivus disease', mondo: 'MONDO:0000002', acceptedIds: ['MONDO:0000002'], genes: ['FCT2'],
      confirmation: { method: 'genetic', summary: 'variant', evidence: ['a FCT2 variant'] },
    },
    note: { text: 'She stopped sitting up and then began having shaking episodes every morning before school.', voice: 'parent', author: 'test' },
    phenotypes: [{ hpoId: 'HP:0001250', label: 'Seizure', evidence: 'daily seizures', inNote: true, notePhrase: 'shaking episodes' }],
    ...over,
  });
}

const dictionary = (entries = [], rejected = []) => ({ verified: { entries }, rejected: { entries: rejected } });
const goodEntry = () => ({
  phrase: 'very floppy', hpoId: 'HP:0001252', label: 'Hypotonia',
  source: { type: 'dev-case', caseId: 'DEV-01', sourcePhrase: 'very floppy' }, rationale: 'lay word',
});

function run({ cases = [makeCase(), heldCase()], dict = dictionary([goodEntry()]), expectedHeldout } = {}) {
  return validateDataset({ cases, hpo, diseases, dictionary: dict, expectedHeldout });
}
const codes = (r) => r.errors.map((e) => e.code);

test('a well-formed fixture passes with no errors', () => {
  const r = run({ expectedHeldout: 1 });
  assert.deepEqual(r.errors, []);
  assert.equal(r.stats.cases, 2);
});

test('missing source and diagnosis evidence are errors', () => {
  const c = makeCase();
  delete c.source.pmcid;
  c.diagnosis.confirmation.evidence = [];
  c.phenotypes[0].evidence = '';
  const r = run({ cases: [c, heldCase()] });
  assert.ok(codes(r).includes('MISSING_FIELD'));
  assert.ok(codes(r).includes('EVIDENCE_MISSING'));
});

test('quotes over 30 words are errors', () => {
  const c = makeCase();
  c.phenotypes[0].evidence = Array.from({ length: 31 }, (_, i) => `w${i}`).join(' ');
  assert.ok(codes(run({ cases: [c, heldCase()] })).includes('QUOTE_TOO_LONG'));
});

test('HPO id and name problems are errors', () => {
  const c = makeCase();
  c.phenotypes[0].label = 'Low muscle tone';
  c.phenotypes[1].hpoId = 'HP:0001388';
  c.phenotypes[1].label = 'Joint hypermobility';
  const r = codes(run({ cases: [c, heldCase()] }));
  assert.ok(r.includes('LABEL_IS_SYNONYM'));
  assert.ok(r.includes('HPO_ALT_ID'));
});

test('duplicate phenotype inside a case is an error', () => {
  const c = makeCase();
  c.phenotypes.push({ ...c.phenotypes[0] });
  assert.ok(codes(run({ cases: [c, heldCase()] })).includes('DUPLICATE_PHENOTYPE'));
});

test('notePhrase must occur in the note', () => {
  const c = makeCase();
  c.phenotypes[0].notePhrase = 'weak muscles';
  assert.ok(codes(run({ cases: [c, heldCase()] })).includes('NOTE_PHRASE_NOT_IN_NOTE'));
});

test('diagnosis name, distinctive word or gene in the note is leakage', () => {
  const a = makeCase();
  a.note.text = 'Doctors think it is Examplar syndrome.';
  a.phenotypes = [{ hpoId: 'HP:0001252', label: 'Hypotonia', evidence: 'x', inNote: false }];
  const b = makeCase();
  b.note.text = 'They mentioned examplar and EXM1 to us.';
  b.phenotypes = a.phenotypes;
  assert.ok(codes(run({ cases: [a, heldCase()] })).includes('DIAGNOSIS_IN_NOTE'));
  const rb = codes(run({ cases: [b, heldCase()] }));
  assert.ok(rb.includes('DIAGNOSIS_WORD_IN_NOTE'));
  assert.ok(rb.includes('GENE_IN_NOTE'));
});

test('generic words of a disease name are not treated as revealing', () => {
  assert.deepEqual(revealingWords('maple syrup urine disease'), ['maple', 'syrup']);
  assert.deepEqual(revealingWords('glycogen storage disease II (late-onset Pompe disease)'), ['glycogen', 'pompe']);
});

test('same article twice is an error, across or within splits', () => {
  const h = heldCase();
  h.source = { ...makeCase().source };
  assert.ok(codes(run({ cases: [makeCase(), h] })).includes('DUPLICATE_SOURCE'));
});

test('near-identical notes across splits are leakage', () => {
  const h = heldCase();
  h.note.text = 'Our baby was very floppy and had a fit at three months.';
  h.phenotypes[0].notePhrase = 'had a fit';
  assert.ok(codes(run({ cases: [makeCase(), h] })).includes('LEAKAGE_NEAR_DUPLICATE_NOTE'));
});

test('same disease in both splits is a warning, not an error', () => {
  const h = heldCase();
  h.diagnosis.acceptedIds = ['MONDO:0000002', 'MONDO:0000001'];
  const r = run({ cases: [makeCase(), h] });
  assert.ok(r.warnings.some((w) => w.code === 'DISEASE_IN_BOTH_SPLITS'));
  assert.ok(!codes(r).includes('DISEASE_IN_BOTH_SPLITS'));
});

test('wrong number of held-out cases is an error', () => {
  assert.ok(codes(run({ expectedHeldout: 10 })).includes('HELDOUT_COUNT'));
});

test('case in the wrong split folder is an error', () => {
  const c = makeCase({ _file: 'cases/heldout/DEV-01-x.json' });
  assert.ok(codes(run({ cases: [c, heldCase()] })).includes('SPLIT_DIR'));
});

test('dictionary entries derived from held-out cases are errors', () => {
  const e = goodEntry();
  e.source.caseId = 'HO-01';
  assert.ok(codes(run({ dict: dictionary([e]) })).includes('DICT_FROM_HELDOUT'));
});

test('a dictionary phrase found only in a held-out note is an error', () => {
  const e = { ...goodEntry(), phrase: 'shaking episodes' };
  e.hpoId = 'HP:0001250';
  e.label = 'Seizure';
  assert.ok(codes(run({ dict: dictionary([e]) })).includes('DICT_PHRASE_ONLY_IN_HELDOUT'));
});

test('dictionary needs a valid label, a rationale and a real source phrase', () => {
  const e = goodEntry();
  e.label = 'Floppiness';
  delete e.rationale;
  e.source.sourcePhrase = 'not in the note';
  const r = codes(run({ dict: dictionary([e]) }));
  assert.ok(r.includes('DICT_LABEL_MISMATCH'));
  assert.ok(r.includes('DICT_NO_RATIONALE'));
  assert.ok(r.includes('DICT_SOURCE_PHRASE'));
});

test('a mapping both verified and rejected is a conflict', () => {
  const rej = { phrase: 'very floppy', hpoId: 'HP:0001252', proposedLabel: 'Hypotonia', code: 'AMBIGUOUS', reason: 'x' };
  assert.ok(codes(run({ dict: dictionary([goodEntry()], [rej]) })).includes('DICT_CONFLICT'));
});

test('rejected entries need a reason and a known code', () => {
  const rej = { phrase: 'odd', hpoId: 'HP:0001252', proposedLabel: 'Hypotonia', code: 'MAYBE' };
  const r = codes(run({ dict: dictionary([goodEntry()], [rej]) }));
  assert.ok(r.includes('REJECT_NO_REASON'));
  assert.ok(r.includes('REJECT_CODE'));
});

test('the committed dataset passes validation with 10 held-out cases', async () => {
  const r = validateDataset({
    cases: await loadAllCases(), hpo: await loadHpo(), diseases: await loadDiseases(), dictionary: await loadDictionary(), expectedHeldout: 10,
  });
  assert.deepEqual(r.errors, []);
  assert.equal(r.stats.heldout, 10);
});
