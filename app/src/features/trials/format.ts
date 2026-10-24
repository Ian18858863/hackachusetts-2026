/** Display helpers for ClinicalTrials.gov values (contract section 5, Trial). */

const PHASE_NAMES: Record<string, string> = {
  EARLY_PHASE1: 'Early phase 1',
  PHASE1: 'Phase 1',
  PHASE2: 'Phase 2',
  PHASE3: 'Phase 3',
  PHASE4: 'Phase 4',
  NA: 'Not applicable',
};

/** ["PHASE1", "PHASE2"] → "Phase 1 and 2"; [] → "Phase not listed". */
export function formatPhases(phases: readonly string[]): string {
  if (phases.length === 0) return 'Phase not listed';
  const numbered = phases.map((p) => /^PHASE(\d)$/.exec(p)?.[1]);
  if (phases.length > 1 && numbered.every(Boolean)) return `Phase ${numbered.join(' and ')}`;
  return phases.map((p) => PHASE_NAMES[p] ?? p).join(', ');
}

/** First `max` items, then "and N more" so a registry with 300 conditions stays one line. */
export function shortList(items: readonly string[], max: number): string {
  if (items.length === 0) return 'Not listed';
  if (items.length <= max) return items.join(', ');
  return `${items.slice(0, max).join(', ')} and ${items.length - max} more`;
}

/** The ClinicalTrials.gov search page for recruiting studies on a condition. */
export function trialsSearchUrl(condition: string): string {
  const params = new URLSearchParams({ cond: condition, aggFilters: 'status:rec' });
  return `https://clinicaltrials.gov/search?${params.toString()}`;
}

/** "2026-10-24T16:43:12.246Z" → "Oct 24, 2026". */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
