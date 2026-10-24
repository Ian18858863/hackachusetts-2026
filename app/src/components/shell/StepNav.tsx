import { useLayoutEffect, useRef } from 'react';
import { useAudience } from '../../shared/audience';
import { useT } from '../../shared/i18n';
import audienceMessages from '../../shared/i18n/messages/audience';
import shell from '../../shared/i18n/messages/shell';
import { stepHref, stepsFor, type StepId } from '../../shared/steps';
import styles from './StepNav.module.css';

/**
 * The five steps of the flow as plain text links (hash routes), like the
 * specimen's header: quiet grey, the current step in ink and semibold, with
 * aria-current="step". When the row is narrower than the labels (phones) it
 * scrolls sideways inside its own box and keeps the current step in view.
 */
export function StepNav({ current, className }: { current: StepId | null; className?: string }) {
  const { audience, isFamily } = useAudience();
  const steps = stepsFor(audience);
  const index = current ? steps.findIndex((s) => s.id === current) : -1;
  const listRef = useRef<HTMLOListElement>(null);
  const t = useT(shell);
  const ta = useT(audienceMessages);

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
  }, [index, audience]);

  return (
    <nav className={[styles.nav, className].filter(Boolean).join(' ')} aria-label={t('stepsNavLabel')}>
      <ol ref={listRef} className={styles.list}>
        {steps.map((step, i) => {
          const state = i === index ? 'current' : i < index ? 'before' : 'after';
          const label =
            isFamily && (step.id === 'questions' || step.id === 'brief') ? ta(`${step.id}Label`) : t(`${step.id}Label`);
          return (
            <li key={step.id} className={styles.item}>
              <a
                className={styles.link}
                href={stepHref(step.id)}
                data-state={state}
                // Stable ids for the scripted demo video. Never rename.
                data-testid={`step-nav-${step.id}`}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                {/* data-text reserves the semibold width, so the row never shifts. */}
                <span className={styles.label} data-text={label}>
                  {label}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
