// Blind evaluation inputs: only the case id and the note text, nothing that
// could reveal the diagnosis or the gold phenotypes.
import { createHash } from 'node:crypto';

export function blindInputs(cases) {
  return cases
    .map((c) => ({ caseId: c.caseId, note: c.note.text }))
    .sort((a, b) => a.caseId.localeCompare(b.caseId));
}

export function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}

/** Throws if an inputs file carries anything beyond caseId and note. */
export function assertBlind(inputs) {
  for (const i of inputs) {
    const keys = Object.keys(i).sort().join(',');
    if (keys !== 'caseId,note') throw new Error(`Input ${i.caseId} has fields [${keys}]; only caseId and note are allowed`);
  }
}
