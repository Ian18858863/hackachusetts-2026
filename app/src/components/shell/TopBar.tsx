import { StatusIndicator } from './StatusIndicator';
import { ThemeToggle } from './ThemeToggle';
import styles from './TopBar.module.css';

/** Placeholder brand until the team picks the product name. */
const PRODUCT_NAME = 'Project name';

export function TopBar() {
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <a className={styles.brand} href="#" aria-label="Project name TBD, home">
          <BrandMark />
          <span className={styles.name}>{PRODUCT_NAME}</span>
          <span className={styles.tbd}>TBD</span>
        </a>
        <div className={styles.tools}>
          <StatusIndicator />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/** Dashed frame: a mark that reads as "logo goes here". */
function BrandMark() {
  return (
    <svg className={styles.mark} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <rect
        x="8.5"
        y="8.5"
        width="15"
        height="15"
        rx="3"
        fill="none"
        stroke="var(--color-accent-contrast)"
        strokeWidth="2.5"
        strokeDasharray="3 3"
      />
    </svg>
  );
}
