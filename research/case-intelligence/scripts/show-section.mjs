// Research helper: print a slice of an article's cached text starting at the
// n-th match of a pattern. Usage: node scripts/show-section.mjs PMC123 "<regex>" [chars] [nth]
import { fetchFullText } from '../lib/europepmc.mjs';

const [pmcid, pattern, chars = '1800', nth = '1'] = process.argv.slice(2);
const text = (await fetchFullText(pmcid)) ?? '';
const flat = text.replace(/\s+/g, ' ');
const hits = [...flat.matchAll(new RegExp(pattern, 'gi'))];
const h = hits[Number(nth) - 1];
if (!h) {
  console.log(`${pmcid}: no match ${nth} for /${pattern}/ (${hits.length} matches)`);
} else {
  console.log(`${pmcid} [match ${nth}/${hits.length}]: ${flat.slice(h.index, h.index + Number(chars))}`);
}
