/**
 * Joins a candidate's evidence with the case's own features, so every row
 * can show the parent's words, its footnote number and its source sentence.
 */
import type { CaseObject, CaseTerm, Candidate, Evidence, HpoId, TermRef } from '../../shared/contract';
import { capitalise, sentenceAround } from './format';

export interface Feature {
  id: HpoId;
  /** HPO primary name. */
  label: string;
  /** Plain words first (R9.4): the parent's quote, else the HPO label for terms added by hand. */
  plain: string;
  /** Footnote number shared by every view of this feature; absent if the term left the case. */
  number?: number;
  manual: boolean;
  sentence: { before: string; quote: string; after: string } | null;
}

export type FeatureIndex = Map<HpoId, Feature>;

/** Present then not-present terms, each in note order (hand-added last), numbered from 1. */
export function indexFeatures(c: CaseObject): { index: FeatureIndex; observed: Feature[]; excluded: Feature[] } {
  const byPosition = (a: CaseTerm, b: CaseTerm) =>
    (a.start ?? Number.MAX_SAFE_INTEGER) - (b.start ?? Number.MAX_SAFE_INTEGER) || a.label.localeCompare(b.label);
  const index: FeatureIndex = new Map();
  const make = (t: CaseTerm): Feature => ({
    id: t.hpoId,
    label: t.label,
    plain: t.quote ? capitalise(t.quote) : t.label,
    number: index.size + 1,
    manual: !t.quote,
    sentence: t.quote ? sentenceAround(c.notes, t.start, t.end) : null,
  });
  const take = (status: CaseTerm['status']) =>
    c.terms
      .filter((t) => t.status === status)
      .sort(byPosition)
      .filter((t) => !index.has(t.hpoId))
      .map((t) => {
        const f = make(t);
        index.set(t.hpoId, f);
        return f;
      });
  const observed = take('observed');
  const excluded = take('excluded');
  return { index, observed, excluded };
}

export function featureFor(index: FeatureIndex, term: TermRef): Feature {
  return (
    index.get(term.id) ?? { id: term.id, label: term.label, plain: term.label, manual: true, sentence: null }
  );
}

export interface PatientRow {
  feature: Feature;
  /** null: no qualifying match in this disease (contract `unmatched`). */
  evidence: Evidence | null;
}

const byNumber = (a: PatientRow, b: PatientRow) =>
  (a.feature.number ?? Number.MAX_SAFE_INTEGER) - (b.feature.number ?? Number.MAX_SAFE_INTEGER) ||
  a.feature.label.localeCompare(b.feature.label);

/** Every present feature the ranking used, matched or not, in footnote order. */
export function patientRows(c: Candidate, index: FeatureIndex): PatientRow[] {
  return [
    ...c.matched.map((e) => ({ feature: featureFor(index, e.patientTerm), evidence: e })),
    ...c.unmatched.map((t) => ({ feature: featureFor(index, t), evidence: null })),
  ].sort(byNumber);
}

/** "Through the broader term X, listed as Y", or nothing for an exact match. */
export function viaText(e: Evidence): string | null {
  const sameTerm = e.diseaseTerm.id === e.patientTerm.id;
  if (e.via === 'exact' && sameTerm) return null;
  const parts: string[] = [];
  if (e.via === 'ancestor') parts.push(e.ancestor ? `through the broader term ${e.ancestor.label}` : 'through a broader term');
  if (!sameTerm) parts.push(`listed as ${e.diseaseTerm.label}`);
  return capitalise(parts.join(', '));
}
