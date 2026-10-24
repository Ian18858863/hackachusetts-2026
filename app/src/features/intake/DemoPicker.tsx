import { useId, useRef, useState, type Ref } from 'react';
import { DEMO_CASES } from '../../shared/mocks';
import { useT } from '../../shared/i18n';
import intake from '../../shared/i18n/messages/intake';
import { Button, Icon } from '../../shared/ui';
import styles from './DemoPicker.module.css';

/** Demo cases where the ranking may miss the source condition (benchmark of 2026-10-24, README "Honest evaluation"). */
const HARD_CASE_IDS: ReadonlySet<string> = new Set(['demo-dmd', 'demo-marfan', 'demo-kabuki', 'demo-cdls']);

/**
 * "Try a demo patient": the five bundled demo cases (contract section 9), in
 * picker order, each with its verbatim demo label. The cases whose source
 * condition Monarch does not rank first (README "Honest evaluation") carry a
 * "hard case" line. Choosing one replaces the
 * case in this browser, so if the user has typed their own notes we ask once
 * before replacing them.
 */
export function DemoPicker({
  hasOwnNotes,
  disabled,
  disabledReason,
  onPick,
  headingRef,
}: {
  hasOwnNotes: boolean;
  disabled?: boolean;
  /** Shown above the list when the picks are disabled for a reason the user should know. */
  disabledReason?: string;
  onPick: (caseId: string) => void;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const t = useT(intake);
  const headingId = useId();
  const [pending, setPending] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const choose = (caseId: string) => {
    if (hasOwnNotes) {
      setPending(caseId);
      // Move focus to the confirmation so keyboard users see the question.
      requestAnimationFrame(() => confirmRef.current?.focus());
      return;
    }
    onPick(caseId);
  };

  return (
    <section className={styles.picker} aria-labelledby={headingId} data-testid="demo-picker">
      <div className={styles.head}>
        <h2 id={headingId} className={styles.title} ref={headingRef} tabIndex={-1}>
          {t('pickerTitle')}
        </h2>
        <p className={styles.note}>
          {t('pickerNote')}
        </p>
      </div>

      {disabledReason && (
        <p className={styles.reason} id={`${headingId}-reason`}>
          <Icon name="cloudOff" size={16} />
          <span>{disabledReason}</span>
        </p>
      )}

      <ul className={styles.list}>
        {DEMO_CASES.map((demo, index) => {
          const present = demo.extraction.filter((t) => !t.negated).length;
          const absent = demo.extraction.length - present;
          const isPending = pending === demo.caseId;
          return (
            <li key={demo.caseId} className={styles.item}>
              <button
                type="button"
                className={styles.option}
                onClick={() => choose(demo.caseId)}
                disabled={disabled}
                aria-describedby={[`${headingId}-${demo.caseId}`, disabledReason ? `${headingId}-reason` : null]
                  .filter(Boolean)
                  .join(' ')}
                data-testid={`demo-case-${demo.caseId}`}
                data-pending={isPending || undefined}
              >
                <span className={styles.optionMain}>
                  <span className={styles.optionTitle}>
                    {demo.title}
                    {index === 0 && <span className={styles.tag}>{t('startHere')}</span>}
                  </span>
                  <span id={`${headingId}-${demo.caseId}`} className={styles.optionMeta}>
                    <span className={styles.demoLabel}>
                      <Icon name="flask" size={14} />
                      <span>{demo.label}</span>
                    </span>
                    <span className={styles.counts}>
                      {t('demoCounts', { present, absent })}
                    </span>
                    {HARD_CASE_IDS.has(demo.caseId) && (
                      <span className={styles.hardCase} data-testid={`demo-hard-${demo.caseId}`}>
                        {t('hardCase')}
                      </span>
                    )}
                  </span>
                </span>
                <Icon name="arrowRight" size={18} className={styles.arrow} />
              </button>

              {isPending && (
                <div className={styles.confirm} role="group" aria-label={t('confirmGroup')}>
                  <p>{t('confirmText')}</p>
                  <div className={styles.confirmActions}>
                    <Button size="sm" ref={confirmRef} onClick={() => onPick(demo.caseId)}>
                      {t('confirmReplace')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
                      {t('confirmKeep')}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
