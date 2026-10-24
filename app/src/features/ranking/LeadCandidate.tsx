import type { MouseEvent } from 'react';
import type { Candidate } from '../../shared/contract';
import { useT } from '../../shared/i18n';
import ranking from '../../shared/i18n/messages/ranking';
import { broaderText, matchCounts, patientRows, type FeatureIndex } from './evidence';
import { OVERLAP_KEY, pick } from './format';
import {
  CandidateFacts,
  CandidateLinks,
  DeltaBadge,
  EvidenceGroups,
  IncompleteNote,
  PatientRows,
  isIncomplete,
  StudiesButton,
  type EnterRows,
  type LinkProps,
} from './parts';
import type { RankDelta } from './rankingChange';
import styles from './ranking.module.css';

/**
 * The closest overlap in one rounded panel (the proof moment of the approved
 * art direction): the name, "N of M features described" (exact matches; matches
 * through broader terms on their own quiet line), then every present
 * feature with how often it occurs in this condition, its footnote number
 * and its source sentence. Accent colour lives here and nowhere else.
 */
export function LeadCandidate({
  candidate: c,
  index,
  observedCount,
  delta,
  enter,
  selected,
  onSelect,
  ...link
}: {
  candidate: Candidate;
  index: FeatureIndex;
  observedCount: number;
  delta: RankDelta;
  enter: EnterRows;
  selected: boolean;
  onSelect(): void;
} & LinkProps) {
  const t = useT(ranking);
  const rows = patientRows(c, index);
  const { exact, broader } = matchCounts(c);
  const broaderLine = broaderText(broader, t);
  const n = observedCount;
  const contradicted = c.contradicted.length;

  return (
    <article
      className={styles.lead}
      data-testid={`candidate-${c.rank}`}
      data-enter={enter === 'all' || undefined}
      aria-labelledby="lead-title"
    >
      <div className={styles.leadHead}>
        <p className={styles.leadRank}>
          <span className={styles.leadRankN} aria-hidden="true">
            {c.rank}
          </span>
          {t('closestOverlap')}
          <DeltaBadge delta={delta} />
        </p>
        <h2 id="lead-title" className={styles.leadName}>
          <span className="sr-only">{t('srRank', { n: c.rank })}</span>
          {c.name}
        </h2>
        <p className={styles.leadScore} data-lead-score>
          <b className="num">
            {exact} <span>{t('scoreOf', { n })}</span>
          </b>
          <small>{t('scoreSmall')}</small>
        </p>
        <p className={styles.leadOverlap}>
          <b>{t(OVERLAP_KEY[c.overlap])}</b>
          {broaderLine && <span> · {broaderLine}</span>}
          {contradicted > 0 && (
            <span> · {t(pick(contradicted, 'contradictedShortOne', 'contradictedShortOther'), { n: contradicted })}</span>
          )}
        </p>
        <IncompleteNote candidate={c} />
      </div>

      <p className={styles.evHead} aria-hidden="true">
        <span>{t('featuresDescribed')}</span>
        <span>{t('howOftenIn', { name: c.name })}</span>
      </p>
      <ul className={styles.evidence} data-testid={`candidate-evidence-${c.rank}`} aria-label={t('evidenceFor', { name: c.name })}>
        <PatientRows rows={rows} tone="accent" idPrefix="lead" enter={enter} incomplete={isIncomplete(c)} {...link} />
      </ul>
      <EvidenceGroups
        candidate={c}
        index={index}
        tone="accent"
        idPrefix="lead"
        enter={enter}
        enterOffset={rows.length}
        {...link}
      />

      <div className={styles.leadFoot}>
        <p className={styles.leadLinks}>
          <a href="#compare" onClick={jumpToCompare}>
            {t('compareSideBySide')}
          </a>
          <CandidateLinks candidate={c} />
        </p>
        <CandidateFacts candidate={c} />
        <StudiesButton selected={selected} onSelect={onSelect} />
      </div>
    </article>
  );
}

// The hash drives routing, so scroll to the section without changing it.
function jumpToCompare(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  const target = document.getElementById('compare');
  if (!target) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
}
