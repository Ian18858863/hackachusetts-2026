// Check the licence of every case article via the PMC OAI-PMH API
// (https://pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/, metadataPrefix=pmc_fm).
// The legacy PMC OA Web Service (oa.fcgi) was retired in August 2026.
// Usage: node scripts/check-access.mjs [--fix]
//   --fix writes source.access into each case file (classification, licence,
//   statement, check date). It never removes an existing accessException.
// Writes results/source-access.json. Exit 1 if a non-oa-cc case has no
// documented accessException.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA, ROOT, loadAllCases } from '../lib/load.mjs';
import { classifyAccess } from '../lib/access.mjs';

const OAI = 'https://pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/';
const FIX = process.argv.includes('--fix');
const report = { checkedAt: new Date().toISOString(), source: `${OAI}?verb=GetRecord&metadataPrefix=pmc_fm`, cases: [] };
let undocumented = 0;

for (const c of await loadAllCases()) {
  const url = `${OAI}?verb=GetRecord&identifier=oai:pubmedcentral.nih.gov:${c.source.pmcid.slice(3)}&metadataPrefix=pmc_fm`;
  const res = await fetch(url, { signal: AbortSignal.timeout(40000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const a = classifyAccess(await res.text());
  const access = { ...a, checkedVia: 'PMC OAI-PMH pmc_fm', checkedAt: report.checkedAt.slice(0, 10) };
  const exception = c.source.accessException ?? null;
  if (a.classification !== 'oa-cc' && !exception) undocumented += 1;
  report.cases.push({ caseId: c.caseId, pmcid: c.source.pmcid, ...a, accessException: exception });
  console.log(`${c.caseId} ${c.source.pmcid} ${a.classification}${a.license ? ` (${a.license})` : ''}${a.manuscriptId ? ` ${a.manuscriptId}` : ''}${a.classification !== 'oa-cc' ? ` | exception documented: ${Boolean(exception)}` : ''}`);
  if (FIX) {
    const { _file, ...rest } = c;
    rest.source.access = access;
    await writeFile(join(DATA, _file), `${JSON.stringify(rest, null, 2)}\n`);
  }
  await new Promise((r) => setTimeout(r, 400));
}

await mkdir(join(ROOT, 'results'), { recursive: true });
await writeFile(join(ROOT, 'results', 'source-access.json'), `${JSON.stringify(report, null, 2)}\n`);
const counts = report.cases.reduce((m, x) => ({ ...m, [x.classification]: (m[x.classification] ?? 0) + 1 }), {});
console.log(JSON.stringify({ ...counts, undocumentedExceptions: undocumented }));
process.exitCode = undocumented ? 1 : 0;
