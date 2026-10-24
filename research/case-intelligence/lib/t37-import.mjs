// Import the T37 lay-language CSV as UNVERIFIED candidates and pre-check each
// HP id and label against the stored JAX records. Nothing imported here is
// treated as verified; a human or Kiro review must still judge each phrase
// before it may be copied into lay-hpo.verified.json.
//
// The real T37 file uses the header:  lay phrase,HPO term name,HP id
// (UTF-8 with BOM). Headers are matched after normalisation (case, spaces,
// underscores and hyphens), so common variants are also accepted.
import { readFile } from 'node:fs/promises';
import { parseCsv } from './csv.mjs';
import { checkTerm } from './hpo-check.mjs';

export const T37_HEADER = ['lay phrase', 'HPO term name', 'HP id'];

const normHeader = (h) => String(h).replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');

const COLUMNS = {
  phrase: ['lay phrase', 'phrase', 'lay term', 'patient phrase', 'expression'],
  label: ['hpo term name', 'hpo label', 'hpo term', 'hpo name', 'term name', 'label'],
  hpoId: ['hp id', 'hpo id', 'hpoid', 'hp', 'id'],
};

/** Map each logical column to the actual header key in the rows, or null. */
export function resolveColumns(headerKeys) {
  const byNorm = new Map(headerKeys.map((k) => [normHeader(k), k]));
  const out = {};
  for (const [field, names] of Object.entries(COLUMNS)) {
    out[field] = names.map((n) => byNorm.get(n)).find((k) => k !== undefined) ?? null;
  }
  return out;
}

/** Map CSV rows to candidate entries with a pre-check result each. */
export function importT37(rows, store) {
  const headerKeys = rows.length ? Object.keys(rows[0]) : [];
  const cols = resolveColumns(headerKeys);
  const missing = Object.entries(cols).filter(([, k]) => k === null).map(([f]) => f);
  if (rows.length && missing.length) {
    const err = new Error(`T37 CSV is missing required column(s) ${missing.join(', ')}; found headers [${headerKeys.join(', ')}]`);
    err.code = 'MISSING_COLUMNS';
    throw err;
  }
  const candidates = rows.map((row, i) => {
    const phrase = (row[cols.phrase] ?? '').trim();
    const hpoId = (row[cols.hpoId] ?? '').trim();
    const label = (row[cols.label] ?? '').trim();
    const issue = phrase ? checkTerm(hpoId, label || undefined, store) : { code: 'MISSING_PHRASE', message: 'Row has no lay phrase' };
    return {
      row: i + 2,
      phrase: phrase || null,
      hpoId,
      label: label || null,
      status: 'unverified',
      precheck: issue ? issue.code : 'ID_AND_NAME_OK',
      precheckMessage: issue?.message ?? null,
    };
  });
  const ids = new Set(candidates.map((c) => c.hpoId).filter(Boolean));
  const byCode = {};
  for (const c of candidates) byCode[c.precheck] = (byCode[c.precheck] ?? 0) + 1;
  return { columns: cols, rows: candidates.length, uniqueIds: ids.size, precheck: byCode, candidates };
}

/** Read a CSV file (BOM tolerated) and import it. */
export async function importT37File(path, store) {
  return importT37(parseCsv(await readFile(path, 'utf8')), store);
}
