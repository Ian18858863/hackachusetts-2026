import { useEffect, useId, useRef, useState } from 'react';
import { useT } from '../../shared/i18n';
import common from '../../shared/i18n/messages/common';
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
 * Header from the approved specimen: brand on the left, the steps as plain
 * text links and the black pill that opens the brief. No bar, no border:
 * whitespace separates it. The demo chip, the audience switch and the
 * language select sit in one compact utility row under it, so nothing can
 * cover the step links at any width or in any language.
 *
 * The demo chip is the app's one demo notice (T34): its popover carries the
 * demo case title and the provenance (contract section 13, localized from
 * v0.1.6; the phenopacket-store id stays verbatim).
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
        {showBrief && (
          <div className={styles.end}>
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
        <div className={styles.utility}>
          {caseObject.demo && <DemoChip caseId={caseObject.demo.caseId} sourceId={caseObject.demo.sourcePhenopacketId} />}
          <AudienceSwitch />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}

function DemoChip({ caseId, sourceId }: { caseId: string; sourceId: string }) {
  const t = useT(shell);
  const tc = useT(common);
  const popId = useId();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  // Tap or click toggles; Escape and a press outside close it (no hover needed on touch).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);
  const titleKey = `demoTitle_${caseId}` as Parameters<typeof tc>[0];
  const title = tc(titleKey);
  return (
    <span className={styles.chipWrap} ref={wrapRef} data-open={open || undefined}>
      <button
        type="button"
        className={styles.chip}
        aria-describedby={popId}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        data-demo-notice
        data-testid="demo-chip"
      >
        {t('demoChip')}
      </button>
      <span id={popId} role="tooltip" className={styles.chipPop}>
        {title !== titleKey && <span className={styles.chipPopTitle}>{title}</span>}
        <span>{tc('demoCaseLabel', { id: sourceId })}</span>
      </span>
    </span>
  );
}
