// Import the T37 CSV as unverified candidates.
// Usage: node scripts/import-t37.mjs [path]   (default: %USERPROFILE%\Downloads\T37_lay_language_HPO_dictionary.csv)
// Writes data/dictionary/t37-candidates.json. Run fetch-hpo afterwards for any
// ids reported as HPO_NOT_FETCHED, then run this script again.
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsv } from '../lib/csv.mjs';
import { DATA, loadHpo } from '../lib/load.mjs';
import { importT37 } from '../lib/t37-import.mjs';

const path = process.argv[2] ?? join(homedir(), 'Downloads', 'T37_lay_language_HPO_dictionary.csv');
if (!existsSync(path)) {
  console.log(`T37 CSV not found at ${path}. Import remains PENDING.`);
  process.exit(2);
}
const result = importT37(parseCsv(await readFile(path, 'utf8')), await loadHpo());
await writeFile(join(DATA, 'dictionary', 't37-candidates.json'), `${JSON.stringify({ importedFrom: path, importedAt: new Date().toISOString(), ...result }, null, 2)}\n`);
console.log(`rows=${result.rows} uniqueIds=${result.uniqueIds} precheck=${JSON.stringify(result.precheck)}`);
