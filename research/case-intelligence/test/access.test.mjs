import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAccess } from '../lib/access.mjs';

const rec = (sets, permissions, extra = '') =>
  `<record>${sets.map((s) => `<setSpec>${s}</setSpec>`).join('')}<article-meta>${extra}<permissions>${permissions}</permissions></article-meta></record>`;

test('CC BY article in the open set is oa-cc', () => {
  const a = classifyAccess(rec(['frontgene', 'pmc-open'], '<license><license-p>This is an open-access article distributed under the terms of the Creative Commons Attribution License (CC BY).</license-p></license>'));
  assert.deepEqual([a.classification, a.license], ['oa-cc', 'CC BY']);
});

test('a CC0 data waiver does not override the CC BY article licence', () => {
  const p = '<license><license-p>Open Access This article is distributed under the terms of the Creative Commons Attribution 4.0 International License (http://creativecommons.org/licenses/by/4.0/). The Creative Commons Public Domain Dedication waiver (http://creativecommons.org/publicdomain/zero/1.0/) applies to the data.</license-p></license>';
  assert.equal(classifyAccess(rec(['bmcneph', 'pmc-open'], p)).license, 'CC BY');
});

test('non-commercial variants are distinguished', () => {
  assert.equal(classifyAccess(rec(['pmc-open'], '<license xlink:href="http://creativecommons.org/licenses/by-nc/4.0/"></license>')).license, 'CC BY-NC');
  assert.equal(classifyAccess(rec(['pmc-open'], '<license-p>CC BY-NC-ND license (http://creativecommons.org/licenses/by-nc-nd/4.0/)</license-p>')).license, 'CC BY-NC-ND');
});

test('publisher copyright outside the open set is free-to-read, not open access', () => {
  const a = classifyAccess(rec(['amjtr'], '<copyright-statement>AJTR Copyright &#169; 2025</copyright-statement>'));
  assert.equal(a.classification, 'free-to-read');
  assert.equal(a.license, null);
  assert.equal(a.inPmcOpenSet, false);
});

test('an NIH author manuscript is classified as such even when in pmc-open', () => {
  const a = classifyAccess(rec(['pmc-open'], 'This file is available for text mining. It may also be used consistent with the principles of fair use under the copyright law.', '<article-id pub-id-type="manuscript-id">NIHMS2024171</article-id>'));
  assert.deepEqual([a.classification, a.license, a.manuscriptId], ['author-manuscript', null, 'NIHMS2024171']);
});
