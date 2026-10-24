import type { CaseTerm, HpoId } from '../../shared/contract';
import { LIMITS } from '../../shared/contract';
import { Button, Icon } from '../../shared/ui';
import { NotPresentGlyph } from './CandidateCard';
import styles from './ranking.module.css';

/**
 * The features the ranking uses, numbered like footnotes. The parent's own
 * words come first and the HPO term second (R9.4). Hovering an item and an
 * evidence row highlights the other.
 */
export function FeatureAside({
  observed,
  excluded,
  footnotes,
  activeTerm,
  onActivate,
  onEdit,
}: {
  observed: CaseTerm[];
  excluded: CaseTerm[];
  footnotes: Map<HpoId, number>;
  activeTerm: HpoId | null;
  onActivate(id: HpoId | null): void;
  onEdit(): void;
}) {
  const few = observed.length > 0 && observed.length < LIMITS.rankRecommendedObserved;

  const item = (t: CaseTerm, absent: boolean) => (
    <li
      key={t.hpoId}
      className={styles.term}
      data-active={activeTerm === t.hpoId || undefined}
      onMouseEnter={() => onActivate(t.hpoId)}
      onMouseLeave={() => onActivate(null)}
    >
      <span className={styles.termNumber}>{footnotes.get(t.hpoId)}</span>
      <span className={styles.termText}>
        {t.quote ? (
          <>
            <span className={styles.quote}>“{t.quote}”</span>
            <span className={styles.termLabel}>
              {t.label} <span className="code">{t.hpoId}</span>
            </span>
          </>
        ) : (
          <>
            <span className={styles.quote} data-manual>
              {t.label}
            </span>
            <span className={styles.termLabel}>
              Added by hand · <span className="code">{t.hpoId}</span>
            </span>
          </>
        )}
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
    <aside className={styles.aside} aria-labelledby="ranking-features-title">
      <div className={styles.asideHead}>
        <h2 id="ranking-features-title" className={styles.asideTitle}>
          Features used
        </h2>
        <p className={styles.asideCount}>
          {observed.length} present
          {excluded.length > 0 && ` · ${excluded.length} not present`}
        </p>
      </div>

      {few && (
        <p className={styles.note}>
          <Icon name="info" size={18} />
          <span>
            With fewer than {LIMITS.rankRecommendedObserved} present features, matches are usually less useful. Adding
            more features from the notes can help.
          </span>
        </p>
      )}

      {observed.length > 0 && <ol className={styles.terms}>{observed.map((t) => item(t, false))}</ol>}

      {excluded.length > 0 && (
        <>
          <h3 className={styles.asideSub}>Not present</h3>
          <ol className={styles.terms}>{excluded.map((t) => item(t, true))}</ol>
        </>
      )}

      <Button variant="secondary" onClick={onEdit} iconStart={<Icon name="list" size={18} />}>
        Change features
      </Button>

      <p className={styles.explain}>
        Overlap compares these features with the features listed for each condition in HPO annotations. Strong,
        partial and weak are plain labels, not probabilities.
      </p>
    </aside>
  );
}
