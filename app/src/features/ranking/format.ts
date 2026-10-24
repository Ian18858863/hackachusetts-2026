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

/** Filled marks per HPO frequency band (5 = Obligate, 0 = Excluded). */
export const FREQUENCY_LEVEL: Record<FrequencyLabel, number> = {
  Obligate: 5,
  'Very frequent': 4,
  Frequent: 3,
  Occasional: 2,
  'Very rare': 1,
  Excluded: 0,
};

export const FREQUENCY_MARKS = 5;

/** "Very frequent", or the honest wording when no band is annotated (R3.7). */
export function frequencyWord(frequency: FrequencyInfo | null | undefined): string {
  return frequency?.label ?? 'Frequency not listed';
}

export const OVERLAP_TEXT: Record<OverlapLabel, string> = {
  strong: 'Strong overlap',
  partial: 'Partial overlap',
  weak: 'Weak overlap',
};

export const OVERLAP_LEVEL: Record<OverlapLabel, number> = { strong: 3, partial: 2, weak: 1 };

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

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Stable key for one rank request (ids already sorted and deduplicated). */
export function rankKey(req: Pick<RankRequest, 'observed' | 'excluded' | 'limit'>): string {
  return `${req.observed.join(',')}|${(req.excluded ?? []).join(',')}|${req.limit ?? ''}`;
}
