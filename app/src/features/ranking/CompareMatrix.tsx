import type { Candidate, FrequencyInfo, HpoId } from '../../shared/contract';
import { BandDot } from './FrequencyMark';
import { broaderText, featureFor, matchCounts, type Feature, type FeatureIndex } from './evidence';
import { OVERLAP_TEXT, frequencyState } from './format';
import type { LinkProps } from './parts';
import styles from './ranking.module.css';

const MATRIX_CANDIDATES = 3;

type Cell = { matched: false } | { matched: true; broader: boolean; frequency: FrequencyInfo | null };

/**
 * "Compare side by side": the B2 dot matrix in the final type. Rows are the
 * present features, columns the top 3 possible matches; a larger dot means
 * the feature occurs more often there. Hover or focus a row to read its
 * source sentence in a reserved line under the table (no layout shift).
 */
export function CompareMatrix({
  candidates,
  observed,
  index,
  activeTerm,
  onActivate,
}: {
  candidates: Candidate[];
  observed: HpoId[];
  index: FeatureIndex;
} & LinkProps) {
  const top = candidates.slice(0, MATRIX_CANDIDATES);
  const features: Feature[] = observed
    .map((id) => featureFor(index, { id, label: labelFor(id, candidates) }))
    .sort((a, b) => (a.number ?? Number.MAX_SAFE_INTEGER) - (b.number ?? Number.MAX_SAFE_INTEGER));
  const cell = (c: Candidate, id: HpoId): Cell => {
    const e = c.matched.find((m) => m.patientTerm.id === id);
    return e ? { matched: true, broader: e.via === 'ancestor', frequency: e.frequency } : { matched: false };
  };
  const cellWord = (x: Cell) =>
    x.matched
      ? `${frequencyState(x.frequency, 'Frequency not listed').word}${x.broader ? ', through a broader term' : ''}`
      : 'Not matched';
  const active = features.find((f) => f.id === activeTerm && f.sentence);

  return (
    <section id="compare" className={styles.compare} aria-labelledby="compare-title" tabIndex={-1}>
      <div className={styles.compareHead}>
        <h2 id="compare-title" className={styles.compareTitle}>
          Compare side by side
        </h2>
        <p className={styles.compareDek}>
          How often each present feature occurs in the top {top.length} possible matches. Larger dot, more often.
          Decision support, not a diagnosis.
        </p>
      </div>

      <div className={styles.cmp}>
        <figure className={styles.cmpFigure}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <caption className="sr-only">
                {features.length} present features against {top.length} possible matches, with how often each feature
                occurs in each condition
              </caption>
              <colgroup>
                <col />
                {top.map((c) => (
                  <col key={c.diseaseId} className={styles.colCand} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Feature</span>
                  </th>
                  {top.map((c) => (
                    <th key={c.diseaseId} scope="col" data-first={c.rank === 1 || undefined}>
                      <span className={styles.candN}>{c.rank}</span>
                      <span className={styles.candName}>{c.name}</span>
                      <span className={styles.candOv}>{OVERLAP_TEXT[c.overlap]}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((f) => (
                  <tr
                    key={f.id}
                    tabIndex={0}
                    data-active={activeTerm === f.id || undefined}
                    aria-describedby={f.sentence ? `cmp-src-${f.id.replace(':', '')}` : undefined}
                    onMouseEnter={() => onActivate(f.id)}
                    onMouseLeave={() => onActivate(null)}
                    onFocus={() => onActivate(f.id)}
                    onBlur={() => onActivate(null)}
                    onClick={(event) => event.currentTarget.focus()}
                  >
                    <th scope="row">
                      <span className={styles.fPlain}>
                        {f.plain}
                        {f.number !== undefined && <span className={styles.fn}>{f.number}</span>}
                      </span>
                      <span className={styles.fTerm}>{f.label}</span>
                    </th>
                    {top.map((c) => {
                      const x = cell(c, f.id);
                      return (
                        <td
                          key={c.diseaseId}
                          data-first={c.rank === 1 || undefined}
                          data-broader={(x.matched && x.broader) || undefined}
                        >
                          <BandDot
                            frequency={x.matched ? (x.frequency ?? { label: null, source: c.diseaseId }) : null}
                            tone={c.rank === 1 ? 'accent' : 'neutral'}
                          />
                          <span className="sr-only">{cellWord(x)}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Features described</th>
                  {top.map((c) => {
                    const { exact, broader } = matchCounts(c);
                    const line = broaderText(broader);
                    return (
                      <td key={c.diseaseId} data-first={c.rank === 1 || undefined}>
                        <b className="num">
                          {exact} of {features.length}
                        </b>
                        {line && <span className={styles.footBroader}>{line}</span>}
                        <span>{c.diseaseId}</span>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
          <div className={styles.source}>
            <p data-shown={!active || undefined} aria-hidden="true">
              Hover or focus a feature to read the sentence it came from.
            </p>
            {features
              .filter((f) => f.sentence)
              .map((f) => (
                <p key={f.id} id={`cmp-src-${f.id.replace(':', '')}`} data-shown={active?.id === f.id || undefined}>
                  <span>From the notes</span>
                  <q>
                    {f.sentence?.before}
                    <mark>{f.sentence?.quote}</mark>
                    {f.sentence?.after}
                  </q>
                </p>
              ))}
          </div>
        </figure>

        <aside className={styles.notes} aria-label="How to read the comparison">
          <div className={styles.legendNote}>
            <h3>Reading the dots</h3>
            <p>How often the feature is reported in people with the condition, from HPO annotations.</p>
            <p className={styles.legendHint}>
              “Features described” counts exact matches. A dot with a dotted ring matched only through a broader
              term, and is counted as “plus N through broader terms”.
            </p>
            <dl className={styles.legend}>
              {LEGEND.map((l) => (
                <div key={l.word}>
                  <dt>
                    <BandDot frequency={l.frequency} />
                  </dt>
                  <dd>{l.word}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}

const LEGEND: Array<{ word: string; frequency: FrequencyInfo | null }> = [
  { word: 'Always', frequency: { label: 'Obligate', source: '' } },
  { word: 'Very frequent', frequency: { label: 'Very frequent', source: '' } },
  { word: 'Frequent', frequency: { label: 'Frequent', source: '' } },
  { word: 'Occasional or very rare', frequency: { label: 'Occasional', source: '' } },
  { word: 'Matched, frequency not listed', frequency: { label: null, source: '' } },
  { word: 'Not matched', frequency: null },
];

function labelFor(id: HpoId, candidates: Candidate[]): string {
  for (const c of candidates) {
    const hit = c.matched.find((m) => m.patientTerm.id === id)?.patientTerm ?? c.unmatched.find((t) => t.id === id);
    if (hit) return hit.label;
  }
  return id;
}
