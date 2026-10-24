// Baseline lay-text -> HPO extractor (v0.1). A deliberately simple reference
// point for future extractors, not a product component:
//  - lexicon = verified dictionary phrases + the official HPO name and synonyms
//    of every HP id that appears in the verified dictionary;
//  - whole-word, case-insensitive matching after normalisation;
//  - no negation, no context, no ranking.
// Rejected dictionary entries are never used.
import { containsPhrase, normalize } from './text.mjs';

export const BASELINE_VERSION = 'dictionary-baseline-v0.1';

export function buildLexicon(dictionary, hpoStore) {
  const lex = new Map(); // normalised phrase -> Set(hpoId)
  const add = (phrase, id) => {
    const n = normalize(phrase);
    if (!n) return;
    if (!lex.has(n)) lex.set(n, new Set());
    lex.get(n).add(id);
  };
  const ids = new Set();
  for (const e of dictionary?.verified?.entries ?? []) {
    add(e.phrase, e.hpoId);
    ids.add(e.hpoId);
  }
  for (const id of ids) {
    const rec = hpoStore?.terms?.[id];
    if (!rec?.found || rec.id !== id) continue;
    add(rec.name, id);
    for (const s of rec.synonyms ?? []) add(s, id);
  }
  return lex;
}

/** Extract HP ids from one note. Returns [{ hpoId, matched: [phrases] }]. */
export function extract(note, lexicon) {
  const hits = new Map();
  for (const [phrase, ids] of lexicon) {
    if (!containsPhrase(note, phrase)) continue;
    for (const id of ids) {
      if (!hits.has(id)) hits.set(id, []);
      hits.get(id).push(phrase);
    }
  }
  return [...hits].map(([hpoId, matched]) => ({ hpoId, matched: matched.sort() })).sort((a, b) => a.hpoId.localeCompare(b.hpoId));
}
