import { termCounts, useCase } from '../../shared/store';
import { stepHref, type StepId } from '../../shared/steps';
import { PRODUCT_NAME } from '../../shared/text';
import { ButtonLink } from '../ui';
import { StepNav } from './StepNav';
import styles from './TopBar.module.css';

/**
 * Header from the approved specimen: brand on the left, the five steps as
 * plain text links, and on the right a quiet demo chip and the black pill
 * that opens the brief. No bar, no border: whitespace separates it.
 */
export function TopBar({ current }: { current: StepId | null }) {
  const { caseObject } = useCase();
  const { observed } = termCounts(caseObject);
  const showBrief = observed > 0 && current !== 'brief';

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <a className={styles.brand} href={stepHref('notes')} aria-label={`${PRODUCT_NAME}, start`}>
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.name}>{PRODUCT_NAME}</span>
        </a>
        <StepNav current={current} className={styles.steps} />
        {(caseObject.demo || showBrief) && (
          <div className={styles.end}>
            {caseObject.demo && <span className={styles.chip}>Demo case</span>}
            {showBrief && (
              <ButtonLink href={stepHref('brief')} aria-label="Prepare brief" data-testid="prepare-brief">
                <span className={styles.wide} aria-hidden="true">
                  Prepare brief
                </span>
                <span className={styles.narrow} aria-hidden="true">
                  Brief
                </span>
              </ButtonLink>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
