/**
 * The five steps of the flow and their hash routes under /app/.
 * Hash routing needs no server rewrite rules (see lib/useHashRoute.ts).
 */

export type StepId = 'notes' | 'features' | 'matches' | 'questions' | 'brief';

export interface StepDef {
  id: StepId;
  /** Result screens show the safety line (contract section 13). */
  showsResults: boolean;
}

/**
 * Step labels, titles (the view's single <h1>) and ledes live in
 * shared/i18n/messages/shell.ts as `<id>Label`, `<id>Title` and `<id>Lede`.
 */
export const STEPS: readonly StepDef[] = [
  { id: 'notes', showsResults: false },
  { id: 'features', showsResults: false },
  { id: 'matches', showsResults: true },
  { id: 'questions', showsResults: true },
  { id: 'brief', showsResults: true },
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
