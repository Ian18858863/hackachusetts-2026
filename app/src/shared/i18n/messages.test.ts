/// <reference types="node" />
/**
 * Checks every message area under ./messages for every locale:
 * same key set as English, no empty or whitespace-only string, the same
 * {placeholders} as English, and that common holds the safety sentence.
 *
 * Run: npm --prefix app run test:i18n
 * (node --test --experimental-strip-types; no extra dependency).
 */
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import { LOCALES } from './locales.ts';

type Dict = Record<string, string>;
type Area = Record<string, Dict>;

const dir = new URL('./messages/', import.meta.url);
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.d.ts'))
  .sort();

const areas = new Map<string, Area>();
for (const file of files) {
  const mod = (await import(new URL(file, dir).href)) as { default: Area };
  areas.set(file.replace(/\.ts$/, ''), mod.default);
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('message areas exist, including common and shell', () => {
  assert.ok(areas.has('common'), 'messages/common.ts is missing');
  assert.ok(areas.has('shell'), 'messages/shell.ts is missing');
});

for (const [area, messages] of areas) {
  test(`${area}: every locale is present and complete`, () => {
    const en = messages.en;
    assert.ok(en, `${area} has no en dictionary`);
    const enKeys = Object.keys(en).sort();
    assert.deepEqual(Object.keys(messages).sort(), [...LOCALES].sort(), `${area}: locale set`);
    for (const locale of LOCALES) {
      const dict = messages[locale];
      assert.ok(dict, `${area}.${locale} is missing`);
      assert.deepEqual(Object.keys(dict).sort(), enKeys, `${area}.${locale}: key set differs from en`);
      for (const key of enKeys) {
        const value: string | undefined = dict[key];
        assert.equal(typeof value, 'string', `${area}.${locale}.${key} is not a string`);
        assert.ok(value!.trim().length > 0, `${area}.${locale}.${key} is empty`);
        assert.deepEqual(
          placeholders(value!),
          placeholders(en[key]!),
          `${area}.${locale}.${key}: placeholders differ from en`,
        );
      }
    }
  });
}

test('common holds the contract section 13 safety sentence, split as rendered', () => {
  const common = areas.get('common')!;
  assert.equal(
    common.en!.disclaimer,
    'Decision support, not a diagnosis. These are possible matches to discuss with a doctor.',
  );
  for (const locale of LOCALES) {
    const d = common[locale]!;
    for (const key of ['disclaimer', 'disclaimerLead', 'disclaimerRest', 'medicalTermsNote', 'languageLabel']) {
      assert.ok(d[key], `common.${locale}.${key} is missing`);
    }
    assert.equal(d.disclaimerLead! + d.disclaimerRest!, d.disclaimer, `common.${locale}: lead + rest must equal disclaimer`);
  }
});
