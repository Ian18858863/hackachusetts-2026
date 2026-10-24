// Research helper: print an article's metadata and short snippets around
// keyword hits, so a reviewer can confirm a finding without reading the paper
// end to end. Usage: node scripts/find-evidence.mjs PMC123 [keyword ...] [--abstract]
import { fetchFullText, fetchMeta } from '../lib/europepmc.mjs';

const args = process.argv.slice(2);
const pmcid = args.shift();
const showAbstract = args.includes('--abstract');
const opt = (name, dflt) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? Number(a.split('=')[1]) : dflt;
};
const maxHits = opt('hits', 2);
const ctx = opt('ctx', 90);
const keywords = args.filter((a) => !a.startsWith('--'));

const meta = await fetchMeta(pmcid);
console.log(`${meta.pmcid} | PMID ${meta.pmid} | ${meta.year} | ${meta.journal}`);
console.log(`Title: ${meta.title}`);
console.log(`Open access: ${meta.isOpenAccess} | licence: ${meta.license} | types: ${meta.pubTypes.join('; ')}`);
if (showAbstract) console.log(`Abstract: ${meta.abstractText.replace(/<[^>]+>/g, '')}`);

const full = await fetchFullText(pmcid);
console.log(full ? `Full text: ${full.length} chars` : 'Full text: NOT AVAILABLE (searching abstract only)');
const text = full ?? meta.abstractText.replace(/<[^>]+>/g, '');
const flat = text.replace(/\s+/g, ' ');
for (const kw of keywords) {
  const re = new RegExp(kw, 'gi');
  const all = [...flat.matchAll(re)];
  console.log(`[${kw}] ${all.length} hit(s)`);
  for (const h of all.slice(0, maxHits)) {
    const s = Math.max(0, h.index - ctx);
    console.log(`  ...${flat.slice(s, h.index + h[0].length + ctx)}...`);
  }
}
