import { useState } from 'react';
import { useT } from '../../shared/i18n';
import ranking from '../../shared/i18n/messages/ranking';
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
  const t = useT(ranking);
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
          {f.manual && ` · ${t('addedByHand')}`}
        </span>
      </span>
      {absent && (
        <span className={styles.absent}>
          <NotPresentGlyph />
          <span className="sr-only">{t('notPresent')}</span>
        </span>
      )}
    </li>
  );

  return (
    <section className={styles.summary} aria-labelledby="features-used-title">
      <div className={styles.summaryHead}>
        <h2 id="features-used-title" className={styles.summaryTitle}>
          {t('featuresUsed')}
        </h2>
        <p className={styles.summaryCount}>
          {excluded.length > 0
            ? t('summaryCountExcluded', { n: observed.length, m: excluded.length })
            : t('summaryCount', { n: observed.length })}
        </p>
        <button
          type="button"
          className={styles.disclose}
          aria-expanded={open}
          aria-controls="features-used-list"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? t('hideList') : t('showList')}
          <Icon name="chevronRight" size={16} className={styles.discloseIcon} />
        </button>
        <Button variant="secondary" size="sm" onClick={onEdit} iconStart={<Icon name="list" size={16} />}>
          {t('changeFeatures')}
        </Button>
      </div>
      <div id="features-used-list" className={styles.summaryBody} hidden={!open}>
        <div>
          <h3 className={styles.summarySub}>{t('present')}</h3>
          <ol className={styles.terms}>{observed.map((f) => item(f, false))}</ol>
        </div>
        {excluded.length > 0 && (
          <div>
            <h3 className={styles.summarySub}>{t('notPresent')}</h3>
            <ol className={styles.terms}>{excluded.map((f) => item(f, true))}</ol>
          </div>
        )}
      </div>
    </section>
  );
}
