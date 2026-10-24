// Relevance helpers for recruiting-trial search (T18f).
//
// ClinicalTrials.gov `query.cond` also matches intervention names and other
// free text, so a search can return studies about a different disease.
// Case checked on 2026-10-24: query.cond="Niemann-Pick disease, type C1" with
// RECRUITING returned only NCT07236190 ("Biomarker-based Trial of NPC-1 for
// Alzheimer's Pathology"; conditions Alzheimer Disease, MCI, Subjective
// Cognitive Decline), which matched the drug name NPC-1. The broader
// "Niemann-Pick disease type C" returned 6 relevant studies.

/** Words that do not identify a disease on their own. */
const GENERIC_WORDS = new Set([
  "disease", "diseases", "syndrome", "syndromes", "type", "types", "deficiency",
  "disorder", "disorders", "autosomal", "recessive", "dominant", "form", "forms",
  "congenital", "hereditary", "familial", "related", "associated", "linked",
  "of", "and", "or", "the", "with", "without", "in", "to", "for", "due", "a", "an",
]);

const ROMAN_RE = /^[ivx]+$/;
const NUMBERISH_RE = /^[a-z]?\d+[a-z]?$/; // "1", "c1", "2a": subtype codes, not distinctive

/** Distinctive lower-case words of a disease or condition name. */
export function distinctiveWords(name: string): Set<string> {
  const words = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1 && !GENERIC_WORDS.has(w) && !ROMAN_RE.test(w) && !NUMBERISH_RE.test(w));
  return new Set(words);
}

/**
 * True when at least one listed condition contains ALL distinctive words of the
 * disease name. One shared word is not enough: "pick" alone would accept Pick
 * disease (frontotemporal dementia) for Niemann-Pick, and "dystrophy" alone
 * would accept Becker or limb-girdle studies for Duchenne.
 * A name with no distinctive words cannot be checked, so every study is kept.
 */
export function isRelevantStudy(diseaseName: string, conditions: string[]): boolean {
  const wanted = distinctiveWords(diseaseName);
  if (wanted.size === 0) return true;
  return conditions.some((c) => {
    const have = distinctiveWords(c);
    return [...wanted].every((w) => have.has(w));
  });
}

/**
 * Broader search term with the subtype suffix removed, or null if there is none.
 *   "Niemann-Pick disease, type C1"   -> "Niemann-Pick disease type C"
 *   "Mucopolysaccharidosis, type II"  -> "Mucopolysaccharidosis"
 *   "Kabuki syndrome 1"               -> "Kabuki syndrome"
 */
export function broaderCondition(condition: string): string | null {
  const c = condition.trim().replace(/\s+/g, " ");
  let broader = c;
  const typeLetterDigits = /,?\s+(type\s+[A-Za-z])\d+[A-Za-z]?$/i;
  const romanSuffix = /,?\s+(?:type\s+)?[IVX]+$/;
  const digitSuffix = /,?\s+(?:type\s+)?\d+[A-Za-z]?$/i;
  if (typeLetterDigits.test(c)) broader = c.replace(typeLetterDigits, " $1");
  else if (romanSuffix.test(c)) broader = c.replace(romanSuffix, "");
  else if (digitSuffix.test(c)) broader = c.replace(digitSuffix, "");
  broader = broader.trim();
  return broader.length >= 2 && broader.toLowerCase() !== c.toLowerCase() ? broader : null;
}
