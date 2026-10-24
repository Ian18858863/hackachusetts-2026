import type { CSSProperties, ReactNode } from 'react';
import type { Candidate, DiseaseFeature, HpoId } from '../../shared/contract';
import { useT } from '../../shared/i18n';
import ranking from '../../shared/i18n/messages/ranking';
import { Button, Icon } from '../../shared/ui';
import { FrequencyMark, type MarkTone } from './FrequencyMark';
import { featureFor, viaText, type Feature, type FeatureIndex, type PatientRow } from './evidence';
import { formatScore, sourceName } from './format';
import type { RankDelta } from './rankingChange';
import styles from './ranking.module.css';

/** Which rows play the line-up motion: all, some keys, or none. */
export type EnterRows = 'all' | Set<string> | null;

export function isEntering(enter: EnterRows, key: string): boolean {
  return enter === 'all' || (enter instanceof Set && enter.has(key));
}

export interface LinkProps {
  activeTerm: HpoId | null;
  onActivate(id: HpoId | null): void;
}

/**
 * One feature of the patient against one condition. Focusable when it has a
 * source sentence: hover, focus or tap shows that sentence in a card that
 * floats above the row, so nothing below it moves (footnote linking).
 */
export function EvidenceRow({
  feature,
  detail,
  mark,
  idPrefix,
  enterIndex,
  activeTerm,
  onActivate,
  quiet = false,
}: {
  feature: Feature;
  detail?: ReactNode;
  mark: ReactNode;
  idPrefix: string;
  /** Stagger slot for the line-up motion, or null for no motion. */
  enterIndex: number | null;
  quiet?: boolean;
} & LinkProps) {
  const t = useT(ranking);
  const popId = `${idPrefix}-src-${feature.id.replace(':', '')}`;
  const focusable = feature.sentence !== null;
  return (
    <li className={styles.evItem}>
      <div
        className={styles.ev}
        data-quiet={quiet || undefined}
        data-active={activeTerm === feature.id || undefined}
        data-enter={enterIndex !== null || undefined}
        style={enterIndex !== null ? ({ '--i': enterIndex } as CSSProperties) : undefined}
        tabIndex={focusable ? 0 : undefined}
        aria-describedby={focusable ? popId : undefined}
        onMouseEnter={() => onActivate(feature.id)}
        onMouseLeave={() => onActivate(null)}
        onFocus={() => onActivate(feature.id)}
        onBlur={() => onActivate(null)}
        // Tap: focus the row so touch shows the same source card.
        onClick={focusable ? (event) => event.currentTarget.focus() : undefined}
      >
        <span className={styles.evText}>
          <span className={styles.evName}>
            {feature.plain}
            {feature.number !== undefined && (
              <span className={styles.fn}>
                <span className="sr-only">{t('srFeatureNumber')}</span>
                {feature.number}
              </span>
            )}
          </span>
          <span className={styles.evTerm}>
            {feature.manual ? `${feature.label} · ${t('addedByHand')}` : feature.label}
            {detail && <> · {detail}</>}
          </span>
        </span>
        <span className={styles.evMark}>{mark}</span>
      </div>
      {feature.sentence && (
        <p id={popId} className={styles.pop} role="tooltip">
          <span>{t('fromNotes')}</span>
          <q>
            {feature.sentence.before}
            <mark>{feature.sentence.quote}</mark>
            {feature.sentence.after}
          </q>
        </p>
      )}
    </li>
  );
}

/** The patient's present features, matched or not, with how often each occurs. */
export function PatientRows({
  rows,
  tone,
  idPrefix,
  enter,
  enterOffset = 0,
  ...link
}: {
  rows: PatientRow[];
  tone: MarkTone;
  idPrefix: string;
  enter: EnterRows;
  enterOffset?: number;
} & LinkProps) {
  const t = useT(ranking);
  return (
    <>
      {rows.map((row, i) => {
        const key = row.evidence ? `m:${row.feature.id}` : `u:${row.feature.id}`;
        const entering = isEntering(enter, key);
        return (
          <EvidenceRow
            key={row.feature.id}
            feature={row.feature}
            idPrefix={idPrefix}
            detail={row.evidence ? viaText(row.evidence, t) : null}
            enterIndex={entering ? enterOffset + i : null}
            quiet={!row.evidence}
            mark={
              row.evidence ? (
                <FrequencyMark
                  frequency={row.evidence.frequency}
                  noneWord={t('freqNotListed')}
                  quietUnknown
                  tone={tone}
                  animate={entering}
                  delay={enterOffset + i}
                />
              ) : (
                <FrequencyMark frequency={null} noneWord={t('notMatched')} />
              )
            }
            {...link}
          />
        );
      })}
    </>
  );
}

/** Excluded features the condition usually has, and frequent features not described. */
export function EvidenceGroups({
  candidate: c,
  index,
  tone,
  idPrefix,
  enter,
  enterOffset,
  headingLevel = 3,
  ...link
}: {
  candidate: Candidate;
  index: FeatureIndex;
  tone: MarkTone;
  idPrefix: string;
  enter: EnterRows;
  enterOffset: number;
  /** One level below the candidate's name: 3 under the lead's h2, 4 under a side entry's h3. */
  headingLevel?: 3 | 4;
} & LinkProps) {
  const t = useT(ranking);
  const Heading = headingLevel === 4 ? 'h4' : 'h3';
  let slot = enterOffset;
  const rows = (items: DiseaseFeature[], prefix: 'c' | 'n', note?: string) =>
    items.map((f) => {
      const entering = isEntering(enter, `${prefix}:${f.term.id}`);
      const i = slot++;
      const feature =
        prefix === 'c'
          ? featureFor(index, f.term)
          : { id: f.term.id, label: f.term.label, plain: f.term.label, manual: false, sentence: null };
      return (
        <EvidenceRow
          key={f.term.id}
          feature={prefix === 'n' ? { ...feature, label: f.term.id } : feature}
          idPrefix={idPrefix}
          detail={note}
          quiet={prefix === 'n'}
          enterIndex={entering ? i : null}
          mark={<FrequencyMark frequency={f.frequency} tone={tone} animate={entering} delay={i} />}
          {...link}
        />
      );
    });

  return (
    <>
      {c.contradicted.length > 0 && (
        <div className={styles.group}>
          <Heading className={styles.groupTitle}>
            <NotPresentGlyph />
            {t('contradictedTitle')}
          </Heading>
          <ul className={styles.evidence}>{rows(c.contradicted, 'c', t('contradictedNote'))}</ul>
        </div>
      )}
      {c.notReported.length > 0 && (
        <div className={styles.group}>
          <Heading className={styles.groupTitle}>{t('notReportedTitle')}</Heading>
          <ul className={styles.evidence}>{rows(c.notReported, 'n')}</ul>
        </div>
      )}
    </>
  );
}

export function CandidateLinks({ candidate: c }: { candidate: Candidate }) {
  const t = useT(ranking);
  const links: Array<{ name: string; href: string }> = [];
  if (c.links.orphanet) links.push({ name: 'Orphanet', href: c.links.orphanet });
  links.push({ name: 'Monarch', href: c.links.monarch });
  if (c.links.omim) links.push({ name: 'OMIM', href: c.links.omim });
  return (
    <span className={styles.links}>
      {links.map((l) => (
        <a key={l.name} className={styles.link} href={l.href} target="_blank" rel="noreferrer">
          {l.name}
          <Icon name="external" size={13} />
          <span className="sr-only">{t('linkSr', { name: c.name })}</span>
        </a>
      ))}
    </span>
  );
}

/** Genes, raw service score and sources: quiet details under the evidence. */
export function CandidateFacts({ candidate: c }: { candidate: Candidate }) {
  const t = useT(ranking);
  return (
    <dl className={styles.facts}>
      <div>
        <dt>{t('factId')}</dt>
        <dd>{c.diseaseId}</dd>
      </div>
      {c.genes.length > 0 && (
        <div>
          <dt>{t(c.genes.length === 1 ? 'genesOne' : 'genesOther')}</dt>
          <dd>{c.genes.map((g) => g.symbol).join(', ')}</dd>
        </div>
      )}
      <div>
        <dt>{t('rawScore')}</dt>
        <dd className="num">{formatScore(c.score)}</dd>
      </div>
      <div>
        <dt>{t('sources')}</dt>
        <dd>{c.sources.map((s) => sourceName(s, t)).join(t('listSep'))}</dd>
      </div>
    </dl>
  );
}

export function StudiesButton({ selected, onSelect }: { selected: boolean; onSelect(): void }) {
  const t = useT(ranking);
  return (
    <Button
      variant="secondary"
      size="sm"
      aria-pressed={selected}
      onClick={onSelect}
      iconStart={<Icon name={selected ? 'check' : 'trial'} size={16} />}
    >
      {selected ? t('studiesShown') : t('studiesShow')}
    </Button>
  );
}

export function DeltaBadge({ delta }: { delta: RankDelta }) {
  const t = useT(ranking);
  if (delta.kind === 'none') return null;
  return (
    <span className={styles.delta}>
      {delta.kind === 'new' ? (
        <Icon name="plus" size={14} />
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
          data-down={delta.kind === 'down' || undefined}
        >
          <path d="M12 19V5M6 11l6-6 6 6" />
        </svg>
      )}
      {delta.kind === 'new'
        ? t('deltaNew')
        : t(delta.kind === 'up' ? 'deltaUp' : 'deltaDown', { n: delta.from })}
    </span>
  );
}

/** A circle with a bar: "marked not present". Always paired with text. */
export function NotPresentGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="8.25" />
      <path d="M8 12h8" />
    </svg>
  );
}
