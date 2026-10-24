import type { CSSProperties } from 'react';
import type { FrequencyInfo } from '../../shared/contract';
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
  className,
}: {
  frequency: FrequencyInfo | null | undefined;
  noneWord?: string;
  tone?: MarkTone;
  animate?: boolean;
  delay?: number;
  showRaw?: boolean;
  className?: string;
}) {
  const state = frequencyState(frequency, noneWord);
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
}: {
  frequency: FrequencyInfo | null | undefined;
  tone?: MarkTone;
  size?: 'matrix' | 'strip';
}) {
  const state = frequencyState(frequency);
  const level = state.kind === 'band' ? state.dots : state.kind === 'none' ? 'none' : 'unknown';
  return <i className={styles.dot} data-level={level} data-tone={tone} data-size={size} aria-hidden="true" />;
}
