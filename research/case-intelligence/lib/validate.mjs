// Offline integrity and leakage checks for the case corpus and dictionary.
// Pure: takes loaded data, returns { errors, warnings, stats }. No network.
import { checkTerm } from './hpo-check.mjs';
import { containsPhrase, jaccard, normalize, wordCount } from './text.mjs';

export const MAX_QUOTE_WORDS = 30;
export const NEAR_DUPLICATE_JACCARD = 0.6;
const SPLITS = { dev: 'DEV-', heldout: 'HO-' };
const DICT_SOURCE_TYPES = new Set(['dev-case', 'hpo-synonym']);
const REJECT_CODES = new Set(['NOT_EQUIVALENT', 'AMBIGUOUS', 'TOO_SPECIFIC', 'TOO_GENERAL', 'WRONG_TERM', 'HPO_INVALID']);
// Generic words that may appear in a disease name without revealing it.
const GENERIC = new Set([
  'disease', 'syndrome', 'disorder', 'severe', 'attenuated', 'classic', 'atypical', 'juvenile',
  'adult', 'onset', 'linked', 'hereditary', 'complex', 'deficiency', 'urine', 'storage', 'presentation',
  'myelopathy', 'nephropathic', 'type', 'form', 'late',
]);

/** Words of a disease name that would reveal it if found in a note. */
export function revealingWords(name) {
  return [...new Set(normalize(name).split(' '))].filter((w) => w.length > 4 && !GENERIC.has(w) && !/^\d+$/.test(w));
}

function push(list, code, where, message) {
  list.push({ code, where, message });
}

function checkCase(c, ctx, errors, warnings) {
  const id = c.caseId ?? c._file ?? '(no caseId)';
  const need = (cond, field) => { if (!cond) push(errors, 'MISSING_FIELD', id, `missing or empty: ${field}`); };
  need(c.caseId, 'caseId');
  need(SPLITS[c.split], 'split (dev|heldout)');
  if (c.caseId && SPLITS[c.split] && !c.caseId.startsWith(SPLITS[c.split])) push(errors, 'SPLIT_PREFIX', id, `caseId should start with ${SPLITS[c.split]}`);
  if (ctx.dirSplit && c.split !== ctx.dirSplit) push(errors, 'SPLIT_DIR', id, `split "${c.split}" but file is in ${ctx.dirSplit}/`);

  const s = c.source ?? {};
  need(/^PMC\d+$/.test(s.pmcid ?? ''), 'source.pmcid');
  need(/^https:\/\/pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC\d+\/$/.test(s.url ?? ''), 'source.url (PMC article URL)');
  if (s.pmcid && s.url && !s.url.includes(s.pmcid)) push(errors, 'URL_PMCID_MISMATCH', id, `${s.url} does not contain ${s.pmcid}`);
  need(s.title, 'source.title');
  need(Number.isInteger(s.year), 'source.year');
  need(['fulltext', 'html-manual'].includes(s.textAccess), 'source.textAccess');

  // Licence: publicly readable is not the same as open-access licensed.
  const acc = s.access;
  if (!acc?.classification) push(errors, 'ACCESS_UNCHECKED', id, 'source.access is missing; run check-access --fix');
  else if (acc.classification !== 'oa-cc') {
    if (c.split === 'dev') push(errors, 'DEV_NOT_OPEN_ACCESS', id, `development cases must be open-access licensed; this one is ${acc.classification}`);
    const ex = s.accessException;
    if (!ex?.reason || !ex?.decision) push(errors, 'ACCESS_EXCEPTION_UNDOCUMENTED', id, `${acc.classification} source needs source.accessException with reason and decision`);
    else push(warnings, 'ACCESS_EXCEPTION', id, `${acc.classification}: ${ex.decision.split(':')[0]}; human confirmation ${ex.humanConfirmation ?? 'not recorded'}`);
  }

  const d = c.diagnosis ?? {};
  need(d.name, 'diagnosis.name');
  need(/^MONDO:\d{7}$/.test(d.mondo ?? ''), 'diagnosis.mondo');
  need(Array.isArray(d.acceptedIds) && d.acceptedIds.includes(d.mondo), 'diagnosis.acceptedIds (must include mondo)');
  for (const a of d.acceptedIds ?? []) {
    const rec = ctx.diseases?.diseases?.[a];
    if (!rec) push(errors, 'DISEASE_NOT_FETCHED', id, `${a} has no stored Monarch record; run fetch-diseases`);
    else if (rec.error || rec.deprecated) push(errors, 'DISEASE_INVALID', id, `${a}: ${rec.error ?? 'deprecated in Monarch'}`);
  }
  const conf = d.confirmation ?? {};
  need(conf.method, 'diagnosis.confirmation.method');
  need(conf.summary, 'diagnosis.confirmation.summary');
  need(Array.isArray(conf.evidence) && conf.evidence.length > 0, 'diagnosis.confirmation.evidence');
  for (const q of conf.evidence ?? []) {
    if (wordCount(q) > MAX_QUOTE_WORDS) push(errors, 'QUOTE_TOO_LONG', id, `diagnosis evidence has ${wordCount(q)} words`);
  }

  const note = c.note ?? {};
  need(note.text, 'note.text');
  need(note.author, 'note.author');

  // Diagnosis leakage: the blind note must not reveal the answer.
  if (note.text) {
    const names = [d.name, ...(d.acceptedIds ?? []).map((a) => ctx.diseases?.diseases?.[a]?.name).filter(Boolean)];
    for (const n of names) {
      if (containsPhrase(note.text, n)) push(errors, 'DIAGNOSIS_IN_NOTE', id, `note contains the diagnosis name "${n}"`);
      for (const w of revealingWords(n)) {
        if (containsPhrase(note.text, w)) push(errors, 'DIAGNOSIS_WORD_IN_NOTE', id, `note contains "${w}" from "${n}"`);
      }
    }
    for (const g of d.genes ?? []) {
      if (new RegExp(`\\b${g}\\b`).test(note.text)) push(errors, 'GENE_IN_NOTE', id, `note contains gene symbol ${g}`);
    }
  }

  const phen = c.phenotypes ?? [];
  need(phen.length > 0, 'phenotypes');
  const seen = new Set();
  for (const p of phen) {
    const where = `${id} ${p.hpoId}`;
    if (seen.has(p.hpoId)) push(errors, 'DUPLICATE_PHENOTYPE', where, 'listed twice in this case');
    seen.add(p.hpoId);
    const t = checkTerm(p.hpoId, p.label, ctx.hpo);
    if (t) push(errors, t.code, where, t.message);
    if (p.t33Label !== undefined) {
      const t2 = checkTerm(p.hpoId, p.t33Label, ctx.hpo);
      if (t2) push(warnings, `T33_${t2.code}`, where, t2.message);
    }
    if (!p.evidence) push(errors, 'EVIDENCE_MISSING', where, 'no article evidence quote');
    else if (wordCount(p.evidence) > MAX_QUOTE_WORDS) push(errors, 'QUOTE_TOO_LONG', where, `evidence has ${wordCount(p.evidence)} words`);
    if (typeof p.inNote !== 'boolean') push(errors, 'IN_NOTE_FLAG', where, 'inNote must be true or false');
    if (p.inNote === true) {
      if (!p.notePhrase) push(errors, 'NOTE_PHRASE_MISSING', where, 'inNote is true but notePhrase is empty');
      else if (!String(note.text ?? '').toLowerCase().includes(p.notePhrase.toLowerCase())) {
        push(errors, 'NOTE_PHRASE_NOT_IN_NOTE', where, `"${p.notePhrase}" is not in the note`);
      }
    }
  }
  if (phen.length && !phen.some((p) => p.inNote === true)) push(warnings, 'NO_NOTE_PHENOTYPES', id, 'no phenotype is expressed in the note');
  if (s.textAccess === 'html-manual') push(warnings, 'MANUAL_SOURCE_CHECK', id, 'quotes were checked by hand; verify-sources cannot re-check them');
}

function checkCorpus(cases, ctx, errors, warnings) {
  const by = (key) => {
    const m = new Map();
    for (const c of cases) {
      const v = key(c);
      if (!v) continue;
      if (!m.has(v)) m.set(v, []);
      m.get(v).push(c.caseId);
    }
    return m;
  };
  for (const [k, ids] of by((c) => c.caseId)) if (ids.length > 1) push(errors, 'DUPLICATE_CASE_ID', k, `${ids.length} records`);
  for (const [k, ids] of by((c) => c.source?.pmcid)) if (ids.length > 1) push(errors, 'DUPLICATE_SOURCE', k, `same article in ${ids.join(', ')}`);
  for (const [k, ids] of by((c) => c.source?.pmid)) if (ids.length > 1) push(errors, 'DUPLICATE_SOURCE', `PMID:${k}`, `same PMID in ${ids.join(', ')}`);
  for (const [k, ids] of by((c) => c.source?.doi)) if (ids.length > 1) push(errors, 'DUPLICATE_SOURCE', `DOI:${k}`, `same DOI in ${ids.join(', ')}`);

  for (let i = 0; i < cases.length; i += 1) {
    for (let j = i + 1; j < cases.length; j += 1) {
      const a = cases[i];
      const b = cases[j];
      const sim = jaccard(a.note?.text, b.note?.text);
      if (sim >= NEAR_DUPLICATE_JACCARD) {
        push(errors, a.split === b.split ? 'NEAR_DUPLICATE_NOTE' : 'LEAKAGE_NEAR_DUPLICATE_NOTE', `${a.caseId}~${b.caseId}`, `note token Jaccard ${sim.toFixed(2)}`);
      }
      if (a.split !== b.split) {
        const shared = (a.diagnosis?.acceptedIds ?? []).filter((x) => (b.diagnosis?.acceptedIds ?? []).includes(x));
        if (shared.length) push(warnings, 'DISEASE_IN_BOTH_SPLITS', `${a.caseId}~${b.caseId}`, `shared diagnosis ids ${shared.join(', ')}`);
      }
    }
  }
  const heldout = cases.filter((c) => c.split === 'heldout').length;
  if (ctx.expectedHeldout !== undefined && heldout !== ctx.expectedHeldout) {
    push(errors, 'HELDOUT_COUNT', 'heldout', `expected ${ctx.expectedHeldout} held-out cases, found ${heldout}`);
  }
}

function checkDictionary(dictionary, cases, ctx, errors, warnings) {
  const dev = new Map(cases.filter((c) => c.split === 'dev').map((c) => [c.caseId, c]));
  const held = cases.filter((c) => c.split === 'heldout');
  const keys = new Set();
  for (const e of dictionary?.verified?.entries ?? []) {
    const where = `verified "${e.phrase}" -> ${e.hpoId}`;
    if (!e.phrase || !normalize(e.phrase)) push(errors, 'DICT_PHRASE_EMPTY', where, 'empty phrase');
    const t = checkTerm(e.hpoId, e.label, ctx.hpo);
    if (t) push(errors, `DICT_${t.code}`, where, t.message);
    if (!e.rationale) push(errors, 'DICT_NO_RATIONALE', where, 'verified entry needs a rationale');
    const key = `${normalize(e.phrase)}|${e.hpoId}`;
    if (keys.has(key)) push(errors, 'DICT_DUPLICATE', where, 'same phrase and id twice');
    keys.add(key);
    const src = e.source ?? {};
    if (!DICT_SOURCE_TYPES.has(src.type)) push(errors, 'DICT_SOURCE_TYPE', where, `source.type must be one of ${[...DICT_SOURCE_TYPES].join(', ')}`);
    if (src.type === 'dev-case') {
      const c = dev.get(src.caseId);
      if (!c) {
        const isHeld = held.some((h) => h.caseId === src.caseId);
        push(errors, isHeld ? 'DICT_FROM_HELDOUT' : 'DICT_SOURCE_UNKNOWN', where, `source case ${src.caseId} is ${isHeld ? 'held-out' : 'not a development case'}`);
      } else {
        if (!src.sourcePhrase || !String(c.note?.text ?? '').toLowerCase().includes(src.sourcePhrase.toLowerCase())) {
          push(errors, 'DICT_SOURCE_PHRASE', where, `sourcePhrase is not in ${src.caseId}'s note`);
        }
        const inSource = containsPhrase(c.note?.text, e.phrase);
        const inHeld = held.filter((h) => containsPhrase(h.note?.text, e.phrase)).map((h) => h.caseId);
        if (!inSource && inHeld.length) {
          push(errors, 'DICT_PHRASE_ONLY_IN_HELDOUT', where, `phrase is not in ${src.caseId} but appears in held-out ${inHeld.join(', ')}`);
        }
      }
    }
  }
  for (const e of dictionary?.rejected?.entries ?? []) {
    const where = `rejected "${e.phrase}" -> ${e.hpoId}`;
    if (!e.reason) push(errors, 'REJECT_NO_REASON', where, 'rejected entry needs a reason');
    if (!REJECT_CODES.has(e.code)) push(errors, 'REJECT_CODE', where, `code must be one of ${[...REJECT_CODES].join(', ')}`);
    if (keys.has(`${normalize(e.phrase)}|${e.hpoId}`)) push(errors, 'DICT_CONFLICT', where, 'same phrase and id are both verified and rejected');
    if (e.hpoId) {
      const t = checkTerm(e.hpoId, e.proposedLabel, ctx.hpo);
      if (t && t.code !== 'LABEL_MISMATCH') push(warnings, `REJECT_${t.code}`, where, t.message);
    }
  }
}

/**
 * Validate the whole dataset.
 * @param {{cases: object[], hpo: object, diseases: object, dictionary: object, expectedHeldout?: number}} data
 */
export function validateDataset({ cases, hpo, diseases, dictionary, expectedHeldout }) {
  const errors = [];
  const warnings = [];
  const ctx = { hpo, diseases, expectedHeldout };
  for (const c of cases) {
    const dirSplit = c._file?.match(/^cases\/(dev|heldout)\//)?.[1];
    checkCase(c, { ...ctx, dirSplit }, errors, warnings);
  }
  checkCorpus(cases, ctx, errors, warnings);
  checkDictionary(dictionary, cases, ctx, errors, warnings);
  const stats = {
    cases: cases.length,
    dev: cases.filter((c) => c.split === 'dev').length,
    heldout: cases.filter((c) => c.split === 'heldout').length,
    phenotypes: cases.reduce((n, c) => n + (c.phenotypes?.length ?? 0), 0),
    notePhenotypes: cases.reduce((n, c) => n + (c.phenotypes ?? []).filter((p) => p.inNote).length, 0),
    dictionaryVerified: dictionary?.verified?.entries?.length ?? 0,
    dictionaryRejected: dictionary?.rejected?.entries?.length ?? 0,
  };
  return { errors, warnings, stats };
}
