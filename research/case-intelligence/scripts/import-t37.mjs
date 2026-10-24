// Import the T37 CSV as unverified candidates.
// Usage: node scripts/import-t37.mjs [csv] [--out file]
//   default csv: %USERPROFILE%\Downloads\T37_lay_language_HPO_dictionary.csv
//   default out: data/dictionary/t37-candidates.json
// Exit codes: 0 imported, 2 CSV not found, 4 missing required columns.
// Candidates are never promoted to verified by this script. Run fetch-hpo
// afterwards (it also collects candidate ids) and import again so ids that
// were HPO_NOT_FETCHED get a real id/name precheck.
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { DATA, loadHpo } from '../lib/load.mjs';
import { importT37File } from '../lib/t37-import.mjs';

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? resolve(args[outIdx + 1]) : join(DATA, 'dictionary', 't37-candidates.json');
const positional = args.filter((a, i) => a !== '--out' && i !== outIdx + 1);
const path = positional[0] ?? join(homedir(), 'Downloads', 'T37_lay_language_HPO_dictionary.csv');

if (!existsSync(path)) {
  console.log(`T37 CSV not found at ${path}. Import remains PENDING.`);
  process.exit(2);
}
let result;
try {
  result = await importT37File(path, await loadHpo());
} catch (err) {
  if (err.code === 'MISSING_COLUMNS') { console.error(err.message); process.exit(4); }
  throw err;
}
await writeFile(out, `${JSON.stringify({
  importedFrom: path,
  importedAt: new Date().toISOString(),
  status: 'unverified',
  note: 'Candidates only. None of these is verified; each needs a phrase-level review before moving to lay-hpo.verified.json.',
  ...result,
}, null, 2)}\n`);
console.log(`rows=${result.rows} uniqueIds=${result.uniqueIds} columns=${JSON.stringify(result.columns)} precheck=${JSON.stringify(result.precheck)} -> ${out}`);
