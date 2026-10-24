import { useLayoutEffect, useRef } from 'react';
import { STEPS, stepHref, type StepId } from '../../shared/steps';
import styles from './StepNav.module.css';

/**
 * The five steps of the flow as plain text links (hash routes), like the
 * specimen's header: quiet grey, the current step in ink and semibold, with
 * aria-current="step". When the row is narrower than the labels (phones) it
 * scrolls sideways inside its own box and keeps the current step in view.
 */
export function StepNav({ current, className }: { current: StepId | null; className?: string }) {
  const index = current ? STEPS.findIndex((s) => s.id === current) : -1;
  const listRef = useRef<HTMLOListElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    const link = list.querySelector<HTMLElement>('[aria-current="step"]');
    if (!link) {
      list.scrollLeft = 0;
      return;
    }
    const start = link.offsetLeft - list.offsetLeft;
    const end = start + link.offsetWidth;
    if (start < list.scrollLeft || end > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = Math.max(0, start - (list.clientWidth - link.offsetWidth) / 2);
    }
  }, [index]);

  return (
    <nav className={[styles.nav, className].filter(Boolean).join(' ')} aria-label="Steps">
      <ol ref={listRef} className={styles.list}>
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
                {/* data-text reserves the semibold width, so the row never shifts. */}
                <span className={styles.label} data-text={step.label}>
                  {step.label}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
