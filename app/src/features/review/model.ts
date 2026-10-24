/**
 * Pure helpers for the review step: stable footnote numbers, where each
 * term's quote sits in the notes, and the notes split into plain and
 * highlighted segments.
 */
import type { CaseTerm, HpoId } from '../../shared/contract';

export interface NumberedTerm {
  term: CaseTerm;
  /** Footnote number. Stable while the term changes status. */
  n: number;
  /** Where the quote sits in the notes, or null if it cannot be found. */
  range: { start: number; end: number } | null;
}

export type NoteSegment =
  | { kind: 'text'; text: string; key: string }
  | { kind: 'quote'; text: string; key: string; item: NumberedTerm };

/** A DOM-safe id fragment for an HPO id ("HP:0001250" → "HP-0001250"). */
export function domKey(hpoId: HpoId): string {
  return hpoId.replace(/[^A-Za-z0-9_-]/g, '-');
}

function locate(
  term: CaseTerm,
  notes: string,
  used: Array<{ start: number; end: number }>,
): NumberedTerm['range'] {
  const { quote, start, end } = term;
  if (!quote) return null;
  if (
    typeof start === 'number' &&
    typeof end === 'number' &&
    start >= 0 &&
    end <= notes.length &&
    notes.slice(start, end) === quote
  ) {
    return { start, end };
  }
  // The notes were edited after extraction: find the first free occurrence.
  let from = 0;
  while (from <= notes.length) {
    const at = notes.indexOf(quote, from);
    if (at < 0) return null;
    const range = { start: at, end: at + quote.length };
    if (!used.some((u) => range.start < u.end && u.start < range.end)) return range;
    from = at + 1;
  }
  return null;
}

/**
 * Numbers every term in reading order: quoted terms by their position in the
 * notes, then terms without a quote (added by hand) in the order they were
 * added. Removed terms keep their number so nothing renumbers on undo.
 */
export function numberTerms(terms: readonly CaseTerm[], notes: string): NumberedTerm[] {
  const used: Array<{ start: number; end: number }> = [];
  const located = terms.map((term, index) => {
    const range = locate(term, notes, used);
    if (range) used.push(range);
    return { term, range, index };
  });
  located.sort((a, b) => {
    if (a.range && b.range) return a.range.start - b.range.start || a.index - b.index;
    if (a.range) return -1;
    if (b.range) return 1;
    return a.index - b.index;
  });
  return located.map(({ term, range }, i) => ({ term, range, n: i + 1 }));
}

/** Splits the notes around the quotes of terms that are not removed. Overlaps are skipped. */
export function segmentNotes(notes: string, items: readonly NumberedTerm[]): NoteSegment[] {
  const quoted = items
    .filter((item) => item.range && item.term.status !== 'removed')
    .sort((a, b) => (a.range?.start ?? 0) - (b.range?.start ?? 0));

  const segments: NoteSegment[] = [];
  let cursor = 0;
  for (const item of quoted) {
    const range = item.range;
    if (!range || range.start < cursor) continue;
    if (range.start > cursor) {
      segments.push({ kind: 'text', text: notes.slice(cursor, range.start), key: `t${cursor}` });
    }
    segments.push({ kind: 'quote', text: notes.slice(range.start, range.end), key: `q${range.start}`, item });
    cursor = range.end;
  }
  if (cursor < notes.length) segments.push({ kind: 'text', text: notes.slice(cursor), key: `t${cursor}` });
  return segments;
}

export function statusWord(status: CaseTerm['status']): string {
  return status === 'observed' ? 'present' : status === 'excluded' ? 'not present' : 'removed';
}

// ---------------------------------------------------------------------------
// What a removed term was before removal (for Restore and Undo)
// ---------------------------------------------------------------------------

export type PresenceStatus = 'observed' | 'excluded';

const REMOVED_FROM_KEY = 'rdd.review.removedFrom.v0.1';

type RemovedFrom = { caseId: string; statuses: Record<HpoId, PresenceStatus> };

function readRemovedFrom(caseId: string): Record<HpoId, PresenceStatus> {
  try {
    const stored = JSON.parse(localStorage.getItem(REMOVED_FROM_KEY) ?? 'null') as RemovedFrom | null;
    return stored && stored.caseId === caseId && typeof stored.statuses === 'object' ? stored.statuses : {};
  } catch {
    return {};
  }
}

/** Remembers, per case, the status a term had when it was removed. Lives in this browser only. */
export function rememberRemovedFrom(caseId: string, hpoId: HpoId, status: PresenceStatus): void {
  try {
    const statuses = { ...readRemovedFrom(caseId), [hpoId]: status };
    localStorage.setItem(REMOVED_FROM_KEY, JSON.stringify({ caseId, statuses } satisfies RemovedFrom));
  } catch {
    // Storage blocked or full: restoreStatus falls back to the extraction, then asks the user.
  }
}

/**
 * The status to restore a removed term to, or null when it cannot be known
 * (then the user chooses). Never guesses "present": a feature the notes say
 * has not happened must not silently become present.
 *
 * Order: the status saved at removal (this browser), then the demo case's
 * prepared extraction (negated → not present). Otherwise null.
 */
export function restoreStatus(
  caseId: string,
  term: CaseTerm,
  demoExtraction: ReadonlyArray<{ hpoId: HpoId; negated: boolean }> | undefined,
): PresenceStatus | null {
  const saved = readRemovedFrom(caseId)[term.hpoId];
  if (saved === 'observed' || saved === 'excluded') return saved;
  const prepared = demoExtraction?.find((t) => t.hpoId === term.hpoId);
  if (prepared) return prepared.negated ? 'excluded' : 'observed';
  return null;
}

/** 'smooth' unless the user asked for reduced motion (CSS cannot stop JS scrolling). */
export function scrollBehavior(): ScrollBehavior {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  } catch {
    return 'auto';
  }
}
