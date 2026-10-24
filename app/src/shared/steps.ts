/**
 * The five steps of the flow and their hash routes under /app/.
 * Hash routing needs no server rewrite rules (see lib/useHashRoute.ts).
 */

export type StepId = 'notes' | 'features' | 'matches' | 'questions' | 'brief';

export interface StepDef {
  id: StepId;
  /** Short label for the step navigation. */
  label: string;
  /** The view's single <h1>. One phrase, no trailing punctuation. */
  title: string;
  /** One line under the title. */
  lede: string;
  /** Result screens show the safety line (contract section 13). */
  showsResults: boolean;
}

export const STEPS: readonly StepDef[] = [
  {
    id: 'notes',
    label: 'Notes',
    title: 'Describe what you have noticed',
    lede: 'Paste a symptom history in plain words. No medical vocabulary is needed.',
    showsResults: false,
  },
  {
    id: 'features',
    label: 'Features',
    title: 'Check the features we found',
    lede: 'Each feature links to the words it came from. Keep, remove or mark it as not present.',
    showsResults: false,
  },
  {
    id: 'matches',
    label: 'Possible matches',
    title: 'Possible matches to discuss',
    lede: 'Ranked by how well the features overlap, with the evidence behind each match.',
    showsResults: true,
  },
  {
    id: 'questions',
    label: 'What to check next',
    title: 'What to check next',
    lede: 'Questions that best tell the top possible matches apart, for the next appointment.',
    showsResults: true,
  },
  {
    id: 'brief',
    label: 'Brief',
    title: 'Specialist brief',
    lede: 'One page to print or save as PDF, plus a standard file a genetics clinic can use.',
    showsResults: true,
  },
];

export const DEFAULT_STEP: StepId = 'notes';

export function stepHref(step: StepId): string {
  return `#/${step}`;
}

/** Maps a hash route ("/features", "features", "") to a step, or null for other routes. */
export function stepFromRoute(route: string): StepId | null {
  const id = route.replace(/^\/+/, '').split(/[/?]/)[0] ?? '';
  if (id === '') return DEFAULT_STEP;
  return STEPS.some((s) => s.id === id) ? (id as StepId) : null;
}

export function getStep(id: StepId): StepDef {
  const step = STEPS.find((s) => s.id === id);
  if (!step) throw new Error(`Unknown step ${id}`);
  return step;
}

export function goToStep(step: StepId): void {
  const target = stepHref(step);
  if (window.location.hash !== target) window.location.hash = target;
}
