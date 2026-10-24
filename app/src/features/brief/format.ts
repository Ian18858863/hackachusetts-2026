/** Display helpers for the brief. Wording only; every value comes from the brief response. */
import type { Candidate, DataVersions, FrequencyInfo, OverlapLabel } from '../../shared/contract';

const OVERLAP_WORDS: Record<OverlapLabel, string> = {
  strong: 'Strong overlap',
  partial: 'Partial overlap',
  weak: 'Weak overlap',
};

export function overlapWords(label: OverlapLabel): string {
  return OVERLAP_WORDS[label];
}

/** "very frequent", "very frequent, 112/140", or "frequency not listed" (Requirement 3.7). */
export function frequencyText(frequency: FrequencyInfo | null | undefined): string {
  if (!frequency || !frequency.label) {
    return frequency?.raw ? `frequency ${frequency.raw}` : 'frequency not listed';
  }
  const band = frequency.label.toLowerCase();
  return frequency.raw ? `${band}, ${frequency.raw}` : band;
}

/** "Oct 24, 2026, 12:50 PM" in the reader's time zone. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "2026-10-24" for the print file name. */
export function isoDay(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}/.exec(iso)?.[0] ?? '';
}

/** Ids shown under a candidate name: the disease id, then MONDO. */
export function candidateIds(c: Candidate): string[] {
  return [...new Set([c.diseaseId, c.mondoId].filter((id) => id && !id.startsWith('MOCK:')))];
}

/** "HPO 2025-11-24 · Monarch v3 API · …" pairs for the data versions line. */
export function versionPairs(v: DataVersions): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  if (v.hpo) pairs.push(['HPO', v.hpo]);
  if (v.monarch) pairs.push(['Monarch', v.monarch]);
  if (v.orphanet) pairs.push(['Orphanet', v.orphanet]);
  if (v.clinicalTrials) pairs.push(['ClinicalTrials.gov', v.clinicalTrials]);
  if (v.pubCaseFinder) pairs.push(['PubCaseFinder', v.pubCaseFinder]);
  if (v.demoCache) pairs.push(['Demo cache', v.demoCache]);
  pairs.push(['Fetched', formatDateTime(v.fetchedAt)]);
  return pairs;
}

/** Safe file name part: letters, digits, dot, dash, underscore. */
export function fileSafe(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'case';
}
