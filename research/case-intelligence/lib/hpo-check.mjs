// Offline HPO checks against the stored JAX records (data/hpo/hpo-terms.json).

export const HP_ID = /^HP:\d{7}$/;

/**
 * Check one (id, label) pair against the store.
 * Returns null when valid, otherwise { code, message }.
 * A label passes only if it equals the official name exactly; a synonym is
 * reported as LABEL_IS_SYNONYM, anything else as LABEL_MISMATCH.
 */
export function checkTerm(hpoId, label, store) {
  if (!HP_ID.test(String(hpoId))) return { code: 'HPO_ID_FORMAT', message: `"${hpoId}" is not an HP id` };
  const rec = store?.terms?.[hpoId];
  if (!rec) return { code: 'HPO_NOT_FETCHED', message: `${hpoId} has no stored JAX record; run fetch-hpo` };
  if (rec.found === false) return { code: 'HPO_NOT_FOUND', message: `${hpoId} does not exist in the JAX ontology API` };
  if (rec.id !== hpoId) return { code: 'HPO_ALT_ID', message: `${hpoId} is an alternate or obsolete id of ${rec.id} (${rec.name})` };
  if (label === undefined || label === null) return null;
  if (label === rec.name) return null;
  const syn = (rec.synonyms ?? []).some((s) => s.toLowerCase() === String(label).toLowerCase());
  return syn
    ? { code: 'LABEL_IS_SYNONYM', message: `${hpoId} label "${label}" is a synonym; official name is "${rec.name}"` }
    : { code: 'LABEL_MISMATCH', message: `${hpoId} label "${label}" differs from official name "${rec.name}"` };
}

/** Summarise a list of { hpoId, label } pairs: counts and issues. */
export function checkTerms(pairs, store) {
  const issues = [];
  for (const p of pairs) {
    const r = checkTerm(p.hpoId, p.label, store);
    if (r) issues.push({ ...r, hpoId: p.hpoId, where: p.where });
  }
  return { checked: pairs.length, valid: pairs.length - issues.length, issues };
}
