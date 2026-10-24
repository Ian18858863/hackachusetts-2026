import type { CSSProperties } from 'react';
import type { FrequencyInfo } from '../../shared/contract';
import { useT } from '../../shared/i18n';
import common from '../../shared/i18n/messages/common';
import ranking from '../../shared/i18n/messages/ranking';
import styles from './FrequencyMark.module.css';
import { GLYPH_DOTS, frequencyState, type FrequencyState } from './format';

export type MarkTone = 'accent' | 'neutral';

/**
 * How often a feature occurs in a condition: the four-dot glyph of the
 * approved art direction plus the word, so the glyph never carries meaning
 * alone (R12.4). The three situations look and read differently (R3.7):
 *   band              filled dots + "Very frequent"
 *   label null        four empty dots + "Frequency not listed"
 *   frequency null    a dash + `noneWord` (default "Not listed for this condition")
 *
 * With `quietUnknown` (patient rows), "Frequency not listed" is one small
 * muted ring instead of four empty dots, followed by the word in small
 * muted text, so the state is always visible as text.
 *
 * The accent tone is for rank 1 only; every other candidate is neutral.
 * With `animate`, filled dots pop in after `delay` stagger steps (off under
 * reduced motion).
 */
export function FrequencyMark({
  frequency,
  noneWord,
  tone = 'neutral',
  animate = false,
  delay = 0,
  showRaw = false,
  quietUnknown = false,
  missing = false,
  className,
}: {
  frequency: FrequencyInfo | null | undefined;
  noneWord?: string;
  tone?: MarkTone;
  animate?: boolean;
  delay?: number;
  showRaw?: boolean;
  /** Show an unlisted frequency (label null, or null on a matched row) as one quiet ring. */
  quietUnknown?: boolean;
  /** The candidate's evidence is incomplete (T32b): a null frequency reads "Could not be loaded". */
  missing?: boolean;
  className?: string;
}) {
  const t = useT(ranking);
  const tc = useT(common);
  if (missing && frequency == null) {
    return (
      <span className={[styles.mark, className].filter(Boolean).join(' ')} data-kind="missing">
        <span className={styles.glyph} aria-hidden="true">
          <span className={styles.missingRing} />
        </span>
        <span className={styles.word}>{tc('evidenceCouldNotLoad')}</span>
      </span>
    );
  }
  const state = frequencyState(frequency, t, noneWord);
  if (quietUnknown && state.kind !== 'band') {
    // A quiet ring and a small muted word: the state is readable text, not a graphic alone (R3.7, R12.4).
    return (
      <span className={[styles.mark, className].filter(Boolean).join(' ')} data-kind="quiet">
        <span className={styles.glyph} aria-hidden="true">
          <span className={styles.ring} />
        </span>
        <span className={styles.word}>{state.word}</span>
      </span>
    );
  }
  return (
    <span
      className={[styles.mark, className].filter(Boolean).join(' ')}
      data-tone={tone}
      data-kind={state.kind}
      data-animate={animate || undefined}
      style={{ '--mark-delay': delay } as CSSProperties}
    >
      <Glyph state={state} />
      <span className={styles.word}>{state.word}</span>
      {showRaw && frequency?.raw && <span className={styles.raw}>({frequency.raw})</span>}
    </span>
  );
}

function Glyph({ state }: { state: FrequencyState }) {
  if (state.kind === 'none') {
    return (
      <span className={styles.glyph} aria-hidden="true">
        <span className={styles.dash} />
      </span>
    );
  }
  const filled = state.kind === 'band' ? state.dots : 0;
  return (
    <span className={styles.glyph} aria-hidden="true">
      {Array.from({ length: GLYPH_DOTS }, (_, i) => (
        <i key={i} data-on={i < filled || undefined} />
      ))}
    </span>
  );
}

/**
 * One dot whose size shows the band, as in the comparison matrix and the
 * side strips (larger dot, more often). Not annotated: a dash. Annotated
 * without a frequency: a small hollow ring. Decorative; callers give the
 * words to assistive tech.
 */
export function BandDot({
  frequency,
  tone = 'neutral',
  size = 'matrix',
  missing = false,
}: {
  frequency: FrequencyInfo | null | undefined;
  tone?: MarkTone;
  size?: 'matrix' | 'strip';
  /** Matched, but the frequency could not be loaded (T32b). */
  missing?: boolean;
}) {
  const t = useT(ranking);
  const state = frequencyState(frequency, t);
  const level = missing ? 'missing' : state.kind === 'band' ? state.dots : state.kind === 'none' ? 'none' : 'unknown';
  return <i className={styles.dot} data-level={level} data-tone={tone} data-size={size} aria-hidden="true" />;
}
