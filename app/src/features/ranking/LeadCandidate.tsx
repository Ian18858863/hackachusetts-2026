import type { MouseEvent } from 'react';
import type { Candidate } from '../../shared/contract';
import { broaderText, matchCounts, patientRows, type FeatureIndex } from './evidence';
import { OVERLAP_TEXT, plural } from './format';
import {
  CandidateFacts,
  CandidateLinks,
  DeltaBadge,
  EvidenceGroups,
  PatientRows,
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
  const rows = patientRows(c, index);
  const { exact, broader } = matchCounts(c);
  const broaderLine = broaderText(broader);

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
          Closest overlap
          <DeltaBadge delta={delta} />
        </p>
        <h2 id="lead-title" className={styles.leadName}>
          <span className="sr-only">Rank {c.rank}: </span>
          {c.name}
        </h2>
        <p className={styles.leadOverlap}>
          <b>{OVERLAP_TEXT[c.overlap]}.</b>{' '}
          {exact === observedCount && observedCount > 0
            ? `All ${plural(observedCount, 'present feature')} appear in this condition.`
            : `${exact} of ${plural(observedCount, 'present feature')} appear in this condition`}
          {exact < observedCount && (broaderLine ? `, ${broaderLine}.` : '.')}
          {c.contradicted.length > 0 &&
            ` ${plural(c.contradicted.length, 'feature')} marked not present ${c.contradicted.length === 1 ? 'is' : 'are'} usually present here.`}
        </p>
        <p className={styles.leadScore}>
          <b className="num">
            {exact} <span>of {observedCount}</span>
          </b>
          <small>features described</small>
          {broaderLine && <small className={styles.leadBroader}>{broaderLine}</small>}
        </p>
      </div>

      <p className={styles.evHead} aria-hidden="true">
        <span>Features described</span>
        <span>How often in {c.name}</span>
      </p>
      <ul className={styles.evidence} data-testid={`candidate-evidence-${c.rank}`} aria-label={`Evidence for ${c.name}`}>
        <PatientRows rows={rows} tone="accent" idPrefix="lead" enter={enter} {...link} />
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
        <p className={styles.hint}>Hover, focus or tap a feature to read the sentence it came from.</p>
        <p className={styles.leadLinks}>
          <a href="#compare" onClick={jumpToCompare}>
            Compare side by side
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
