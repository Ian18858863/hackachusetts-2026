// Research helper: list open-access case reports from Europe PMC for a title
// term. Usage: node scripts/search-cases.mjs "Gaucher disease" [limit]
const term = process.argv[2];
const limit = Number(process.argv[3] ?? 8);
if (!term) throw new Error('Usage: search-cases.mjs "<title term>" [limit]');
const q = `TITLE:"${term}" AND PUB_TYPE:"Case Reports" AND OPEN_ACCESS:y AND IN_EPMC:y AND FIRST_PDATE:[2016-01-01 TO 2026-12-31]`;
const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(q)}&format=json&pageSize=${limit}&sort=${encodeURIComponent('CITED desc')}`;
const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
const body = await res.json();
console.log(`${term}: ${body.hitCount} hits`);
for (const r of body.resultList?.result ?? []) {
  console.log(`  ${r.pmcid} | ${r.pubYear} | ${r.journalTitle} | ${r.title.slice(0, 120)}`);
}
