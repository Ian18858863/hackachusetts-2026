import { PRODUCT_NAME } from '../../shared/text';
import { stepHref, type StepId } from '../../shared/steps';
import { StepNav } from './StepNav';
import styles from './TopBar.module.css';

/** White top bar: brand on the left, the five steps on the right (below on narrow screens). */
export function TopBar({ current }: { current: StepId | null }) {
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <a className={styles.brand} href={stepHref('notes')} aria-label={`${PRODUCT_NAME}, start`}>
          <BrandMark />
          <span className={styles.name}>{PRODUCT_NAME}</span>
        </a>
        <StepNav current={current} className={styles.steps} />
      </div>
    </header>
  );
}

/** Provisional mark: a lens over three evidence points (same as favicon.svg). */
function BrandMark() {
  return (
    <svg className={styles.mark} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <g stroke="var(--color-accent-contrast)" strokeWidth="2.25" fill="none" strokeLinecap="round">
        <circle cx="14" cy="14" r="6.5" />
        <path d="m19 19 5 5" />
      </g>
      <g fill="var(--color-accent-contrast)">
        <circle cx="11.5" cy="14" r="1.25" />
        <circle cx="14" cy="11.5" r="1.25" />
        <circle cx="16.5" cy="14" r="1.25" />
      </g>
    </svg>
  );
}
