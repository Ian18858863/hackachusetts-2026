import { useT } from '../../shared/i18n';
import shell from '../../shared/i18n/messages/shell';
import { termCounts, useCase } from '../../shared/store';
import { stepHref, type StepId } from '../../shared/steps';
import { PRODUCT_NAME } from '../../shared/text';
import { ButtonLink } from '../ui';
import { AudienceSwitch } from './AudienceSwitch';
import { LanguageSwitcher } from './LanguageSwitcher';
import { StepNav } from './StepNav';
import styles from './TopBar.module.css';

/**
 * Header from the approved specimen: brand on the left, the five steps as
 * plain text links, and on the right a quiet demo chip and the black pill
 * that opens the brief, then the language switcher. No bar, no border:
 * whitespace separates it.
 */
export function TopBar({ current }: { current: StepId | null }) {
  const { caseObject } = useCase();
  const { observed } = termCounts(caseObject);
  const t = useT(shell);
  // The brief needs a ranking (POST /api/brief requires lastRanking), so the pill waits for one.
  const showBrief = observed > 0 && caseObject.lastRanking !== null && current !== 'brief';

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <a className={styles.brand} href={stepHref('notes')} aria-label={t('brandStartLabel', { name: PRODUCT_NAME })}>
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.name}>{PRODUCT_NAME}</span>
        </a>
        <StepNav current={current} className={styles.steps} />
        {(caseObject.demo || showBrief) && (
          <div className={styles.end}>
            {caseObject.demo && <span className={styles.chip}>{t('demoChip')}</span>}
            {showBrief && (
              <ButtonLink href={stepHref('brief')} aria-label={t('prepareBrief')} data-testid="prepare-brief">
                <span className={styles.wide} aria-hidden="true">
                  {t('prepareBrief')}
                </span>
                <span className={styles.narrow} aria-hidden="true">
                  {t('briefShort')}
                </span>
              </ButtonLink>
            )}
          </div>
        )}
        <AudienceSwitch className={styles.audience} />
        <LanguageSwitcher className={styles.lang} />
      </div>
    </header>
  );
}
