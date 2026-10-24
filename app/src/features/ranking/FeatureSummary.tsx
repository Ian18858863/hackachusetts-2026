import { useState } from 'react';
import { Button, Icon } from '../../shared/ui';
import type { Feature } from './evidence';
import { NotPresentGlyph, type LinkProps } from './parts';
import styles from './ranking.module.css';

/**
 * The features the ranking uses, numbered like footnotes, folded by default
 * under the comparison. Plain words first, the HPO term second (R9.4).
 */
export function FeatureSummary({
  observed,
  excluded,
  onEdit,
  activeTerm,
  onActivate,
}: {
  observed: Feature[];
  excluded: Feature[];
  onEdit(): void;
} & LinkProps) {
  const [open, setOpen] = useState(false);

  const item = (f: Feature, absent: boolean) => (
    <li
      key={f.id}
      className={styles.term}
      data-active={activeTerm === f.id || undefined}
      onMouseEnter={() => onActivate(f.id)}
      onMouseLeave={() => onActivate(null)}
    >
      <span className={styles.fn}>{f.number}</span>
      <span className={styles.termText}>
        <span className={styles.termPlain}>{f.plain}</span>
        <span className={styles.termLabel}>
          {f.label} · {f.id}
          {f.manual && ' · added by hand'}
        </span>
      </span>
      {absent && (
        <span className={styles.absent}>
          <NotPresentGlyph />
          <span className="sr-only">Not present</span>
        </span>
      )}
    </li>
  );

  return (
    <section className={styles.summary} aria-labelledby="features-used-title">
      <div className={styles.summaryHead}>
        <h2 id="features-used-title" className={styles.summaryTitle}>
          Features used
        </h2>
        <p className={styles.summaryCount}>
          {observed.length} present{excluded.length > 0 && ` · ${excluded.length} not present`}
        </p>
        <button
          type="button"
          className={styles.disclose}
          aria-expanded={open}
          aria-controls="features-used-list"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Hide the list' : 'Show the list'}
          <Icon name="chevronRight" size={16} className={styles.discloseIcon} />
        </button>
        <Button variant="secondary" size="sm" onClick={onEdit} iconStart={<Icon name="list" size={16} />}>
          Change features
        </Button>
      </div>
      <div id="features-used-list" className={styles.summaryBody} hidden={!open}>
        <div>
          <h3 className={styles.summarySub}>Present</h3>
          <ol className={styles.terms}>{observed.map((f) => item(f, false))}</ol>
        </div>
        {excluded.length > 0 && (
          <div>
            <h3 className={styles.summarySub}>Not present</h3>
            <ol className={styles.terms}>{excluded.map((f) => item(f, true))}</ol>
          </div>
        )}
      </div>
    </section>
  );
}
