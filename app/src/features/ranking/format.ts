/**
 * Plain-language wording for ranking data. Everything here only names what the
 * contract fields already say; nothing adds a medical fact.
 */
import type {
  CandidateSource,
  DataVersions,
  FrequencyInfo,
  FrequencyLabel,
  OverlapLabel,
  RankRequest,
} from '../../shared/contract';

/**
 * Filled dots in the four-dot glyph of the approved art direction.
 * Obligate (100%) is the full glyph and reads "Always"; Very rare shares one
 * dot with Occasional, and the word next to the glyph tells them apart.
 * Excluded (0%) shows no filled dot.
 */
export const FREQUENCY_DOTS: Record<FrequencyLabel, number> = {
  Obligate: 4,
  'Very frequent': 3,
  Frequent: 2,
  Occasional: 1,
  'Very rare': 1,
  Excluded: 0,
};

export const GLYPH_DOTS = 4;

/** Plain word for a band. Obligate is said as "Always" (100% in HPO bands). */
export const FREQUENCY_WORD: Record<FrequencyLabel, string> = {
  Obligate: 'Always',
  'Very frequent': 'Very frequent',
  Frequent: 'Frequent',
  Occasional: 'Occasional',
  'Very rare': 'Very rare',
  Excluded: 'Excluded',
};

/** The disease annotates the feature but gives no frequency (contract: label null). */
export const FREQUENCY_NOT_LISTED = 'Frequency not listed';
/** The disease does not annotate the feature at all (contract 7.5 step 6: frequency null). */
export const NOT_LISTED_FOR_CONDITION = 'Not listed for this condition';

export type FrequencyState =
  | { kind: 'band'; label: FrequencyLabel; dots: number; word: string }
  | { kind: 'unknown'; word: string }
  | { kind: 'none'; word: string };

/**
 * Three different situations, three different words (R3.7, contract 7.5):
 * a band; annotated without a frequency; not annotated for the condition.
 */
export function frequencyState(
  frequency: FrequencyInfo | null | undefined,
  noneWord: string = NOT_LISTED_FOR_CONDITION,
): FrequencyState {
  if (!frequency) return { kind: 'none', word: noneWord };
  if (frequency.label === null) return { kind: 'unknown', word: FREQUENCY_NOT_LISTED };
  return {
    kind: 'band',
    label: frequency.label,
    dots: FREQUENCY_DOTS[frequency.label],
    word: FREQUENCY_WORD[frequency.label],
  };
}

export const OVERLAP_TEXT: Record<OverlapLabel, string> = {
  strong: 'Strong overlap',
  partial: 'Partial overlap',
  weak: 'Weak overlap',
};

export const SOURCE_NAMES: Record<CandidateSource, string> = {
  'monarch-semsim': 'Monarch semantic similarity',
  'hpo-annotations': 'HPO disease annotations',
  orphadata: 'Orphadata',
  pubcasefinder: 'PubCaseFinder',
};

/** Data versions in reading order, only those present. */
export function versionEntries(v: DataVersions): Array<{ name: string; value: string }> {
  const entries: Array<{ name: string; value: string | undefined }> = [
    { name: 'HPO', value: v.hpo },
    { name: 'Monarch', value: v.monarch },
    { name: 'Orphanet', value: v.orphanet },
    { name: 'PubCaseFinder', value: v.pubCaseFinder },
    { name: 'Demo cache', value: v.demoCache },
  ];
  return entries.filter((e): e is { name: string; value: string } => Boolean(e.value));
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
}

const SCORE_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** The raw service score with at most 2 decimals: no false precision (design steering 7). */
export function formatScore(score: number): string {
  return Number.isFinite(score) ? SCORE_FORMAT.format(score) : String(score);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Stable key for one rank request (ids already sorted and deduplicated). */
export function rankKey(req: Pick<RankRequest, 'observed' | 'excluded' | 'limit'>): string {
  return `${req.observed.join(',')}|${(req.excluded ?? []).join(',')}|${req.limit ?? ''}`;
}

/**
 * The sentence of the notes that holds notes.slice(start, end), split into
 * the text before the quote, the quote and the text after. Sentences end at
 * ".", "!" or "?" followed by a space, or at a line break.
 */
export function sentenceAround(
  notes: string,
  start: number | undefined,
  end: number | undefined,
): { before: string; quote: string; after: string } | null {
  if (start === undefined || end === undefined || start < 0 || end > notes.length || start >= end) return null;
  let from = 0;
  for (const m of notes.slice(0, start).matchAll(/[.!?]\s+|\n+/g)) from = m.index + m[0].length;
  const rest = notes.slice(end).search(/[.!?]|\n/);
  let to = rest === -1 ? notes.length : end + rest;
  if (to < notes.length && notes.charAt(to) !== '\n') to++;
  return {
    before: notes.slice(from, start).trimStart(),
    quote: notes.slice(start, end),
    after: notes.slice(end, to).trimEnd(),
  };
}

export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
