// Import the T37 lay-language CSV as UNVERIFIED candidates and pre-check each
// HP id and label against the stored JAX records. Nothing imported here is
// treated as verified; a human or Kiro review must still judge each phrase.
import { checkTerm } from './hpo-check.mjs';

const PHRASE_COLS = ['phrase', 'lay_phrase', 'lay phrase', 'lay_term', 'patient_phrase', 'expression'];
const ID_COLS = ['hpo_id', 'hpo id', 'hp_id', 'hpoid', 'id'];
const LABEL_COLS = ['hpo_label', 'hpo label', 'hpo_term', 'hpo term', 'label', 'term', 'hpo_name'];

function pick(row, names) {
  const key = Object.keys(row).find((k) => names.includes(k.toLowerCase()));
  return key ? row[key] : undefined;
}

/** Map CSV rows to candidate entries with a pre-check result each. */
export function importT37(rows, store) {
  const candidates = rows.map((row, i) => {
    const phrase = pick(row, PHRASE_COLS);
    const hpoId = (pick(row, ID_COLS) ?? '').trim();
    const label = pick(row, LABEL_COLS);
    const issue = phrase ? checkTerm(hpoId, label, store) : { code: 'MISSING_PHRASE', message: 'Row has no phrase column value' };
    return {
      row: i + 2,
      phrase: phrase ?? null,
      hpoId,
      label: label ?? null,
      status: 'unverified',
      precheck: issue ? issue.code : 'ID_AND_NAME_OK',
      precheckMessage: issue?.message ?? null,
    };
  });
  const ids = new Set(candidates.map((c) => c.hpoId).filter(Boolean));
  const byCode = {};
  for (const c of candidates) byCode[c.precheck] = (byCode[c.precheck] ?? 0) + 1;
  return { rows: candidates.length, uniqueIds: ids.size, precheck: byCode, candidates };
}
