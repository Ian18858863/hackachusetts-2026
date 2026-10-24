/// <reference types="node" />
// Run: node --test --experimental-strip-types app/src/features/brief/familyNames.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { familyFileName, familyPrintTitle, neutralPhenopacket } from './familyNames.ts';

const AT = '2026-10-24T20:23:08.123Z';
const CASE_IDS = ['demo-npc1', 'demo-dmd', 'demo-marfan', 'demo-kabuki', 'demo-cdls'];
const pp = {
  id: 'rdd-demo-marfan-20261024T202308Z',
  subject: { id: 'DEMO-synthetic-demo-marfan', sex: 'UNKNOWN_SEX' as const },
  phenotypicFeatures: [{ type: { id: 'HP:0001166', label: 'Arachnodactyly' } }],
  metaData: { created: AT, createdBy: 'Rare Disease Detective v0.1', resources: [], phenopacketSchemaVersion: '2.0' as const },
};

test('file name and print title never hold a case id or a disease word', () => {
  for (const s of [familyFileName(AT), familyFileName('bad'), familyPrintTitle('Notes for my specialist', '2026-10-24')]) {
    for (const id of CASE_IDS) assert.ok(!s.includes(id), `${s} contains ${id}`);
    assert.ok(!/marfan|npc|dmd|kabuki|cdls/i.test(s), s);
  }
  assert.equal(familyFileName(AT), 'notes-for-my-specialist-20261024T202308Z.json');
  assert.equal(familyPrintTitle('Notes for my specialist', ''), 'Notes for my specialist');
});

test('neutralPhenopacket changes only id and subject.id', () => {
  const out = neutralPhenopacket(pp as never, AT);
  assert.equal(out.id, 'notes-20261024T202308Z');
  assert.equal(out.subject.id, 'notes-20261024T202308Z');
  assert.equal(out.subject.sex, 'UNKNOWN_SEX');
  assert.deepEqual(out.phenotypicFeatures, pp.phenotypicFeatures);
  assert.deepEqual(out.metaData, pp.metaData);
  assert.equal(pp.id, 'rdd-demo-marfan-20261024T202308Z', 'input not mutated');
  assert.ok(!JSON.stringify({ id: out.id, s: out.subject }).includes('marfan'));
});
