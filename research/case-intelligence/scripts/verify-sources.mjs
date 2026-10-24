// Verify every case against its source article.
//  - Metadata (PMID, title, journal, year, open-access flag) from Europe PMC.
//  - Every evidence quote must occur in the article text (normalised).
// Articles whose full text cannot be downloaded are reported as "manual".
// Usage: node scripts/verify-sources.mjs [--fix]   (--fix writes metadata into the case files)
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fetchFullText, fetchMeta, cachedTextSource } from '../lib/europepmc.mjs';
import { DATA, ROOT, loadAllCases } from '../lib/load.mjs';
import { containsPhrase, wordCount } from '../lib/text.mjs';

const FIX = process.argv.includes('--fix');
const MAX_QUOTE_WORDS = 30;
const stripTags = (s) => String(s ?? '').replace(/<[^>]+>/g, '').trim();

const report = { generatedAt: new Date().toISOString(), cases: [], totals: {} };
let found = 0, missing = 0, manual = 0, long = 0, metaDiffs = 0;

for (const c of await loadAllCases()) {
  const meta = await fetchMeta(c.source.pmcid);
  const text = await fetchFullText(c.source.pmcid);
  const textSource = text ? await cachedTextSource(c.source.pmcid) : null;
  const diffs = [];
  const expect = { pmid: meta.pmid, title: stripTags(meta.title), journal: meta.journal, year: meta.year };
  for (const [k, v] of Object.entries(expect)) {
    if ((c.source[k] ?? null) !== (v ?? null)) diffs.push({ field: k, case: c.source[k] ?? null, europepmc: v ?? null });
  }
  metaDiffs += diffs.length;

  const quotes = [
    ...c.diagnosis.confirmation.evidence.map((q) => ({ kind: 'diagnosis', quote: q })),
    ...c.phenotypes.map((p) => ({ kind: p.hpoId, quote: p.evidence })),
  ];
  const results = quotes.map(({ kind, quote }) => {
    const words = wordCount(quote);
    if (words > MAX_QUOTE_WORDS) long += 1;
    if (!text) { manual += 1; return { kind, status: 'manual', words }; }
    const ok = containsPhrase(text, quote) || containsPhrase(stripTags(meta.abstractText), quote);
    if (ok) found += 1; else missing += 1;
    return { kind, status: ok ? 'found' : 'NOT_FOUND', words, ...(ok ? {} : { quote }) };
  });

  report.cases.push({
    caseId: c.caseId,
    pmcid: c.source.pmcid,
    isOpenAccess: meta.isOpenAccess,
    license: meta.license,
    textSource: textSource ?? 'none (manual check of the public PMC page)',
    metadataDiffs: diffs,
    quotes: results,
  });

  if (FIX && diffs.length) {
    const { _file, ...rest } = c;
    for (const d of diffs) rest.source[d.field] = d.europepmc;
    await writeFile(join(DATA, _file), `${JSON.stringify(rest, null, 2)}\n`);
  }
  const bad = results.filter((r) => r.status === 'NOT_FOUND');
  console.log(`${c.caseId} ${c.source.pmcid} text=${textSource ?? 'manual'} quotes=${results.length} notFound=${bad.length} metaDiffs=${diffs.length}`);
  for (const b of bad) console.log(`   NOT FOUND [${b.kind}]: ${b.quote}`);
  for (const d of diffs) console.log(`   META ${d.field}: case=${JSON.stringify(d.case)} europepmc=${JSON.stringify(d.europepmc)}`);
}

report.totals = { quotesFound: found, quotesNotFound: missing, quotesManual: manual, quotesOverWordLimit: long, metadataDiffs: FIX ? 0 : metaDiffs };
await mkdir(join(ROOT, 'results'), { recursive: true });
await writeFile(join(ROOT, 'results', 'source-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.totals));
process.exitCode = missing || long || (!FIX && metaDiffs) ? 1 : 0;
