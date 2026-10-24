import type { CSSProperties, ReactNode } from 'react';
import type { Candidate, DiseaseFeature, Evidence, HpoId, OverlapLabel } from '../../shared/contract';
import { Button, Icon } from '../../shared/ui';
import { FrequencyMark } from './FrequencyMark';
import { OVERLAP_LEVEL, OVERLAP_TEXT, SOURCE_NAMES, plural } from './format';
import type { RankDelta } from './rankingChange';
import styles from './ranking.module.css';

/** Which evidence rows play the fill-in motion: all of them, some keys, or none. */
export type EnterRows = 'all' | Set<string> | null;

const MAX_STAGGER = 12;

export interface CandidateCardProps {
  candidate: Candidate;
  /** Footnote number of each patient feature, shared with the feature list. */
  footnotes: Map<HpoId, number>;
  observedCount: number;
  delta: RankDelta;
  enter: EnterRows;
  /** Position in the list, to stagger the motion card by card. */
  index: number;
  activeTerm: HpoId | null;
  onActivate(id: HpoId | null): void;
  selected: boolean;
  onSelect(): void;
}

/**
 * One possible match as a small case file: rank, name and links, the plain
 * overlap word, then its evidence (Requirements 3.3–3.5, 3.7, 12.4).
 */
export function CandidateCard({
  candidate: c,
  footnotes,
  observedCount,
  delta,
  enter,
  index,
  activeTerm,
  onActivate,
  selected,
  onSelect,
}: CandidateCardProps) {
  const titleId = `candidate-${c.rank}-title`;
  let row = 0;
  const step = () => Math.min(index * 3 + row++, MAX_STAGGER + index * 3);
  const entering = (key: string) => enter === 'all' || (enter instanceof Set && enter.has(key));

  const featureRow = (id: HpoId, key: string, label: ReactNode, frequency: DiseaseFeature['frequency'] | null, note?: ReactNode) => {
    const isEntering = entering(key);
    const i = step();
    const n = footnotes.get(id);
    return (
      <li
        key={key}
        className={styles.row}
        data-enter={isEntering || undefined}
        data-active={activeTerm === id || undefined}
        style={{ '--i': i } as CSSProperties}
        onMouseEnter={() => onActivate(id)}
        onMouseLeave={() => onActivate(null)}
      >
        <span className={styles.footnote} aria-hidden={n === undefined || undefined}>
          {n !== undefined ? <span><span className="sr-only">Feature </span>{n}</span> : ''}
        </span>
        <span className={styles.feature}>
          <span className={styles.featureLabel}>{label}</span>
          {note && <span className={styles.featureNote}>{note}</span>}
        </span>
        <FrequencyMark frequency={frequency} animate={isEntering} delay={i + 2} className={styles.rowMark} />
      </li>
    );
  };

  return (
    <article className={styles.card} data-first={c.rank === 1 || undefined} aria-labelledby={titleId}>
      <header className={styles.cardHead}>
        <span className={styles.rank} aria-hidden="true">
          {c.rank}
        </span>
        <div className={styles.cardTitle}>
          <h3 id={titleId} className={styles.name}>
            <span className="sr-only">Rank {c.rank}: </span>
            {c.name}
          </h3>
          <p className={styles.ids}>
            <span className="code">{c.diseaseId}</span>
            <CandidateLinks candidate={c} />
          </p>
        </div>
        <div className={styles.badges}>
          <OverlapBadge overlap={c.overlap} />
          <DeltaBadge delta={delta} />
        </div>
      </header>

      <p className={styles.summary}>
        Matches <strong className="num">{c.matched.length}</strong> of{' '}
        <span className="num">{plural(observedCount, 'present feature')}</span>
        {c.contradicted.length > 0 && (
          <>
            {' · '}
            <span className="num">{c.contradicted.length}</span> marked not present{' '}
            {c.contradicted.length === 1 ? 'is' : 'are'} usually present here
          </>
        )}
      </p>

      <div className={styles.evidence}>
        <section className={styles.group} aria-label={`Matched features for ${c.name}`}>
          <h4 className={styles.groupTitle}>
            <span>Matched features</span>
            <span className={styles.groupHint}>How common in this condition</span>
          </h4>
          {c.matched.length > 0 ? (
            <ul className={styles.rows}>
              {byFootnote(c.matched, (e) => e.patientTerm.id, footnotes).map((e) =>
                featureRow(e.patientTerm.id, `m:${e.patientTerm.id}`, e.patientTerm.label, e.frequency, <ViaNote evidence={e} />),
              )}
            </ul>
          ) : (
            <p className={styles.none}>None of the present features matched.</p>
          )}
        </section>

        {c.contradicted.length > 0 && (
          <section className={styles.group} aria-label={`Features marked not present that ${c.name} usually has`}>
            <h4 className={styles.groupTitle}>
              <span className={styles.titleWithIcon}>
                <NotPresentGlyph />
                Marked not present, but usually present
              </span>
            </h4>
            <ul className={styles.rows}>
              {c.contradicted.map((f) =>
                featureRow(f.term.id, `c:${f.term.id}`, f.term.label, f.frequency, 'You marked this as not present'),
              )}
            </ul>
          </section>
        )}

        {c.notReported.length > 0 && (
          <section className={styles.group} aria-label={`Features ${c.name} usually has that are not mentioned`}>
            <h4 className={styles.groupTitle}>
              <span>Usually present, not mentioned</span>
            </h4>
            <ul className={styles.rows} data-quiet>
              {c.notReported.map((f) => featureRow(f.term.id, `n:${f.term.id}`, f.term.label, f.frequency))}
            </ul>
          </section>
        )}

        {c.unmatched.length > 0 && (
          <section className={styles.group} aria-label={`Present features not matched in ${c.name}`}>
            <h4 className={styles.groupTitle}>
              <span>Not matched in this condition</span>
            </h4>
            <ul className={styles.chips}>
              {byFootnote(c.unmatched, (t) => t.id, footnotes).map((t) => {
                const n = footnotes.get(t.id);
                return (
                  <li
                    key={t.id}
                    className={styles.chip}
                    data-active={activeTerm === t.id || undefined}
                    onMouseEnter={() => onActivate(t.id)}
                    onMouseLeave={() => onActivate(null)}
                  >
                    {n !== undefined && <span className={styles.chipNumber}>{n}</span>}
                    {t.label}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <footer className={styles.cardFoot}>
        <dl className={styles.facts}>
          {c.genes.length > 0 && (
            <div>
              <dt>{c.genes.length === 1 ? 'Gene' : 'Genes'} in HPO annotations</dt>
              <dd>{c.genes.map((g) => g.symbol).join(', ')}</dd>
            </div>
          )}
          <div>
            <dt>Raw service score</dt>
            <dd className="num">{c.score}</dd>
          </div>
          <div>
            <dt>Sources</dt>
            <dd>{c.sources.map((s) => SOURCE_NAMES[s]).join(', ')}</dd>
          </div>
        </dl>
        <Button
          variant={selected ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={selected}
          onClick={onSelect}
          iconStart={<Icon name={selected ? 'check' : 'trial'} size={16} />}
        >
          {selected ? 'Studies shown below' : 'Show recruiting studies'}
        </Button>
      </footer>
    </article>
  );
}

/** Evidence rows in the same order as the numbered feature list. */
function byFootnote<T>(items: T[], idOf: (item: T) => HpoId, footnotes: Map<HpoId, number>): T[] {
  const n = (item: T) => footnotes.get(idOf(item)) ?? Number.MAX_SAFE_INTEGER;
  return [...items].sort((a, b) => n(a) - n(b));
}

function ViaNote({ evidence: e }: { evidence: Evidence }) {
  const sameTerm = e.diseaseTerm.id === e.patientTerm.id;
  if (e.via === 'exact' && sameTerm) return null;
  const parts: string[] = [];
  if (e.via === 'ancestor') {
    parts.push(e.ancestor ? `Through the broader term ${e.ancestor.label}` : 'Through a broader term');
  }
  if (!sameTerm) parts.push(`listed as ${e.diseaseTerm.label}`);
  const text = parts.join(', ');
  return <>{text.charAt(0).toUpperCase() + text.slice(1)}</>;
}

function CandidateLinks({ candidate: c }: { candidate: Candidate }) {
  const links: Array<{ name: string; href: string }> = [];
  if (c.links.orphanet) links.push({ name: 'Orphanet', href: c.links.orphanet });
  links.push({ name: 'Monarch', href: c.links.monarch });
  if (c.links.omim) links.push({ name: 'OMIM', href: c.links.omim });
  return (
    <>
      {links.map((l) => (
        <a key={l.name} className={styles.link} href={l.href} target="_blank" rel="noreferrer">
          {l.name}
          <Icon name="external" size={13} />
          <span className="sr-only">
            {' '}
            page for {c.name} (opens in a new tab)
          </span>
        </a>
      ))}
    </>
  );
}

export function OverlapBadge({ overlap }: { overlap: OverlapLabel }) {
  const level = OVERLAP_LEVEL[overlap];
  return (
    <span className={styles.overlap} data-overlap={overlap}>
      <span className={styles.overlapGlyph} aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} data-on={i <= level || undefined} />
        ))}
      </span>
      {OVERLAP_TEXT[overlap]}
    </span>
  );
}

function DeltaBadge({ delta }: { delta: RankDelta }) {
  if (delta.kind === 'none') return null;
  if (delta.kind === 'new') {
    return (
      <span className={styles.delta}>
        <Icon name="plus" size={14} />
        New in the list
      </span>
    );
  }
  return (
    <span className={styles.delta}>
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
        style={delta.kind === 'down' ? { transform: 'rotate(180deg)' } : undefined}
      >
        <path d="M12 19V5M6 11l6-6 6 6" />
      </svg>
      {delta.kind === 'up' ? 'Up' : 'Down'} from {delta.from}
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
