// Text helpers shared by validation, evidence checks and the baseline extractor.

/** Lowercase, strip accents, turn every non-alphanumeric run into one space. */
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Unique word tokens of a string after normalisation. */
export function tokenSet(s) {
  return new Set(normalize(s).split(' ').filter(Boolean));
}

/** Jaccard similarity of two token sets (0..1). Two empty strings count as 0. */
export function jaccard(a, b) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

/** True when `needle` occurs in `haystack` as whole normalised words. */
export function containsPhrase(haystack, needle) {
  const h = ` ${normalize(haystack)} `;
  const n = normalize(needle);
  if (!n) return false;
  return h.includes(` ${n} `);
}

/** Word count, used to keep article quotes short. */
export function wordCount(s) {
  const n = normalize(s);
  return n ? n.split(' ').length : 0;
}
