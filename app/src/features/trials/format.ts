/**
 * Display helpers for ClinicalTrials.gov values (contract section 5, Trial).
 * Phase and status words are translated (T34); registry text (titles, conditions, countries) stays as published.
 */
import { intlLocale } from '../../components/ui/fillTemplate';
import type { FormatVars, Locale, MessageKey } from '../../shared/i18n';
import type trialsMessages from '../../shared/i18n/messages/trials';

type TrialsT = (key: MessageKey<typeof trialsMessages>, vars?: FormatVars) => string;

const PHASE_KEYS = {
  EARLY_PHASE1: 'phaseEarly1',
  NA: 'phaseNotApplicable',
} as const satisfies Record<string, MessageKey<typeof trialsMessages>>;

/** ["PHASE1", "PHASE2"] → "Phase 1 and 2"; [] → "Phase not listed". */
export function formatPhases(phases: readonly string[], t: TrialsT): string {
  if (phases.length === 0) return t('phaseNotListed');
  const numbered = phases.map((p) => /^PHASE(\d)$/.exec(p)?.[1]);
  if (phases.length > 1 && numbered.every(Boolean)) return t('phaseNumbers', { list: numbered.join(t('phaseJoin')) });
  return phases
    .map((p) => {
      const n = /^PHASE(\d)$/.exec(p)?.[1];
      if (n) return t('phaseNumbers', { list: n });
      const key = PHASE_KEYS[p as keyof typeof PHASE_KEYS];
      return key ? t(key) : p;
    })
    .join(t('listSep'));
}

/** First `max` items, then "and N more" so a registry with 300 conditions stays one line. */
export function shortList(items: readonly string[], max: number, t: TrialsT): string {
  if (items.length === 0) return t('notListed');
  if (items.length <= max) return items.join(', ');
  return t('andMore', { list: items.slice(0, max).join(', '), count: items.length - max });
}

/** The ClinicalTrials.gov search page for recruiting studies on a condition. */
export function trialsSearchUrl(condition: string): string {
  const params = new URLSearchParams({ cond: condition, aggFilters: 'status:rec' });
  return `https://clinicaltrials.gov/search?${params.toString()}`;
}

/** "2026-10-24T16:43:12.246Z" → "Oct 24, 2026". */
export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(intlLocale(locale), { month: 'short', day: 'numeric', year: 'numeric' });
}
