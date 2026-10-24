import { STEPS, stepHref, type StepId } from '../../shared/steps';
import styles from './StepNav.module.css';

/**
 * The five steps of the flow as plain links (hash routes). The current step
 * has aria-current="step". On phones only the numbers show in the row and the
 * current step's name is written out underneath.
 */
export function StepNav({ current, className }: { current: StepId | null; className?: string }) {
  const index = current ? STEPS.findIndex((s) => s.id === current) : -1;
  const currentStep = index >= 0 ? STEPS[index] : undefined;

  return (
    <nav className={[styles.nav, className].filter(Boolean).join(' ')} aria-label="Steps">
      <ol className={styles.list}>
        {STEPS.map((step, i) => {
          const state = i === index ? 'current' : i < index ? 'before' : 'after';
          return (
            <li key={step.id} className={styles.item}>
              <a
                className={styles.link}
                href={stepHref(step.id)}
                data-state={state}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                <span className={styles.number} aria-hidden="true">
                  {i + 1}
                </span>
                <span className={styles.label}>{step.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
      {currentStep && (
        <p className={styles.caption} aria-hidden="true">
          Step {index + 1} of {STEPS.length} · {currentStep.label}
        </p>
      )}
    </nav>
  );
}
