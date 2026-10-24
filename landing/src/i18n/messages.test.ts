/**
 * Checks every landing message area under ./messages for every locale: same key set
 * as English, no empty or whitespace-only string, the same {placeholders} as English.
 * Also checks that the shared strings in messages/common.ts still equal the app's
 * (app/src/shared/i18n/messages/common.ts), and that the locale list and storage key
 * match the app's, so a choice made on the landing page carries into the app.
 *
 * Run: npm --prefix landing run test:i18n
 * (node --test --experimental-strip-types; no extra dependency). Excluded from tsc
 * because the landing has no Node types.
 */
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import { LOCALES, LOCALE_META, LOCALE_STORAGE_KEY } from './locales.ts';
import * as appLocales from '../../../app/src/shared/i18n/locales.ts';
import appCommon from '../../../app/src/shared/i18n/messages/common.ts';
import landingCommon from './messages/common.ts';
import landing from './messages/landing.ts';

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

test('message areas exist: common and landing', () => {
  assert.deepEqual([...areas.keys()].sort(), ['common', 'landing']);
});

for (const [area, messages] of areas) {
  test(`${area}: every locale is present and complete`, () => {
    const en = messages.en!;
    const enKeys = Object.keys(en).sort();
    assert.deepEqual(Object.keys(messages).sort(), [...LOCALES].sort(), `${area}: locale set`);
    for (const locale of LOCALES) {
      const dict = messages[locale];
      assert.ok(dict, `${area}.${locale} is missing`);
      assert.deepEqual(Object.keys(dict).sort(), enKeys, `${area}.${locale}: key set differs from en`);
      for (const key of enKeys) {
        const value = dict[key];
        assert.equal(typeof value, 'string', `${area}.${locale}.${key} is not a string`);
        assert.ok(value!.trim().length > 0, `${area}.${locale}.${key} is empty`);
        assert.deepEqual(placeholders(value!), placeholders(en[key]!), `${area}.${locale}.${key}: placeholders differ`);
      }
    }
  });
}

test('locales and storage key match the app', () => {
  assert.deepEqual([...LOCALES], [...appLocales.LOCALES]);
  assert.deepEqual(LOCALE_META, appLocales.LOCALE_META);
  assert.equal(LOCALE_STORAGE_KEY, 'rdd.lang.v1');
  assert.equal(LOCALE_STORAGE_KEY, appLocales.LOCALE_STORAGE_KEY);
});

test('shared strings equal the app common.ts exactly (safety sentence, medical-terms note, language label)', () => {
  const app = appCommon as unknown as Area;
  const mine = landingCommon as unknown as Area;
  for (const locale of LOCALES) {
    for (const key of Object.keys(mine.en!)) {
      assert.equal(mine[locale]![key], app[locale]![key], `common.${locale}.${key} differs from the app`);
    }
    assert.equal(mine[locale]!.disclaimerLead! + mine[locale]!.disclaimerRest!, mine[locale]!.disclaimer);
  }
});

test('English landing copy keeps the verbatim evaluation sentence', () => {
  assert.equal(
    landing.en.ownResult,
    'On 10 published cases selected by a fixed rule, the correct condition ranked first in 5 and in the top 3 in 6 (our own small evaluation).',
  );
});
