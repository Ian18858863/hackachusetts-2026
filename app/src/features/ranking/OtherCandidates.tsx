import { useRef, useState } from 'react';
import type { Candidate, RankResponse } from '../../shared/contract';
import { Icon } from '../../shared/ui';
import { BandDot } from './FrequencyMark';
import { broaderText, matchCounts, patientRows, type FeatureIndex } from './evidence';
import { OVERLAP_TEXT, frequencyState } from './format';
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
import { useFlip } from './useFlip';

export interface OtherEntry {
  candidate: Candidate;
  delta: RankDelta;
  enter: EnterRows;
}

/**
 * Candidates 2 to 5, quieter at the side: name, one overlap line and a small
 * dot strip (one dot per present feature, in footnote order). Each can open
 * its full evidence in place. Entries slide to their new order on re-rank.
 */
export function OtherCandidates({
  entries,
  response,
  index,
  observedCount,
  selectedId,
  onSelect,
  ...link
}: {
  entries: OtherEntry[];
  response: RankResponse;
  index: FeatureIndex;
  observedCount: number;
  selectedId: string | null;
  onSelect(id: string): void;
} & LinkProps) {
  const listRef = useRef<HTMLOListElement>(null);
  useFlip(listRef, response);

  return (
    <section className={styles.others} aria-labelledby="others-title">
      <h2 id="others-title" className={styles.othersTitle}>
        Also worth discussing
      </h2>
      {entries.length === 0 ? (
        <p className={styles.othersNone}>The ranking returned no other possible matches for these features.</p>
      ) : (
        <ol ref={listRef} className={styles.altList}>
          {entries.map((e) => (
            <li key={e.candidate.diseaseId} data-flip-id={e.candidate.diseaseId}>
              <OtherCandidate
                entry={e}
                index={index}
                observedCount={observedCount}
                selected={selectedId === e.candidate.diseaseId}
                onSelect={() => onSelect(e.candidate.diseaseId)}
                {...link}
              />
            </li>
          ))}
        </ol>
      )}
      <p className={styles.key}>
        Numbers follow the features in order. A larger dot means the feature occurs more often in the condition, a
        ring that it matched without a listed frequency, and a dash that it did not match. The order is phenotype
        overlap, not a probability.
      </p>
    </section>
  );
}

function OtherCandidate({
  entry: { candidate: c, delta, enter },
  index,
  observedCount,
  selected,
  onSelect,
  ...link
}: {
  entry: OtherEntry;
  index: FeatureIndex;
  observedCount: number;
  selected: boolean;
  onSelect(): void;
} & LinkProps) {
  const [open, setOpen] = useState(false);
  const rows = patientRows(c, index);
  const regionId = `alt-evidence-${c.rank}`;
  const { exact, broader } = matchCounts(c);
  const broaderLine = broaderText(broader);
  const titleId = `alt-title-${c.rank}`;

  const stripLabel = `How often the ${observedCount} present features occur in ${c.name}: ${rows
    .map((r) => (r.evidence ? frequencyState(r.evidence.frequency, 'frequency not listed').word : 'not matched'))
    .join(', ')
    .toLowerCase()}`;

  return (
    <article className={styles.alt} data-testid={`candidate-${c.rank}`} aria-labelledby={titleId}>
      <div className={styles.altTop}>
        <span className={styles.altN} aria-hidden="true">
          {c.rank}
        </span>
        <h3 id={titleId} className={styles.altName}>
          <span className="sr-only">Rank {c.rank}: </span>
          {c.name}
        </h3>
      </div>
      <p className={styles.altLine}>
        <b>{OVERLAP_TEXT[c.overlap]}.</b> {exact} of {observedCount} described
        {broaderLine ? `, ${broaderLine}.` : '.'}
        {c.contradicted.length > 0 && ` ${c.contradicted.length} marked not present usually occur here.`}
      </p>
      {delta.kind !== 'none' && (
        <p className={styles.altDelta}>
          <DeltaBadge delta={delta} />
        </p>
      )}
      <div className={styles.strip} role="img" aria-label={stripLabel}>
        {rows.map((r) => (
          <span key={r.feature.id} data-active={link.activeTerm === r.feature.id || undefined}>
            <BandDot frequency={r.evidence ? (r.evidence.frequency ?? { label: null, source: c.diseaseId }) : null} size="strip" />
            {r.feature.number ?? ''}
          </span>
        ))}
      </div>
      <p className={styles.altMeta}>
        <span>{c.diseaseId}</span>
        <button
          type="button"
          className={styles.disclose}
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Hide evidence' : 'Show evidence'}
          <Icon name="chevronRight" size={16} className={styles.discloseIcon} />
        </button>
      </p>
      <div id={regionId} className={styles.altEvidence} hidden={!open}>
        <ul className={styles.evidence} data-testid={`candidate-evidence-${c.rank}`} aria-label={`Evidence for ${c.name}`}>
          <PatientRows rows={rows} tone="neutral" idPrefix={`alt${c.rank}`} enter={open ? enter : null} {...link} />
        </ul>
        <EvidenceGroups
          candidate={c}
          index={index}
          tone="neutral"
          idPrefix={`alt${c.rank}`}
          enter={open ? enter : null}
          enterOffset={rows.length}
          headingLevel={4}
          {...link}
        />
        <div className={styles.altFoot}>
          <CandidateLinks candidate={c} />
          <CandidateFacts candidate={c} />
          <StudiesButton selected={selected} onSelect={onSelect} />
        </div>
      </div>
    </article>
  );
}
