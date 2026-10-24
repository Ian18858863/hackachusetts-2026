import type { CSSProperties } from 'react';
import type { FrequencyInfo } from '../../shared/contract';
import styles from './FrequencyMark.module.css';
import { FREQUENCY_LEVEL, FREQUENCY_MARKS, frequencyWord } from './format';

/**
 * How common a feature is in a condition: five marks filled to the HPO band
 * (Obligate 5 … Very rare 1, Excluded 0) plus the band's word, so the glyph
 * never carries meaning alone (R12.4). Not annotated: a flat line and
 * "Frequency not listed" (R3.7). The raw source value, when given, follows
 * quietly, e.g. "(112/140)".
 *
 * With `animate`, the filled marks grow in one after another, starting after
 * `delay` stagger steps (CSS: --stagger-item; instant under reduced motion).
 */
export function FrequencyMark({
  frequency,
  animate = false,
  delay = 0,
  showRaw = true,
  className,
}: {
  frequency: FrequencyInfo | null | undefined;
  animate?: boolean;
  delay?: number;
  showRaw?: boolean;
  className?: string;
}) {
  const label = frequency?.label ?? null;
  const level = label === null ? null : FREQUENCY_LEVEL[label];
  const style = { '--mark-delay': delay } as CSSProperties;

  return (
    <span
      className={[styles.mark, className].filter(Boolean).join(' ')}
      data-animate={animate || undefined}
      data-listed={level !== null || undefined}
      style={style}
    >
      <span className={styles.bars} aria-hidden="true">
        {level === null ? (
          <span className={styles.unlisted} />
        ) : (
          Array.from({ length: FREQUENCY_MARKS }, (_, i) => (
            <span
              key={i}
              className={styles.bar}
              data-on={i < level || undefined}
              style={{ '--bar': i } as CSSProperties}
            />
          ))
        )}
      </span>
      <span className={styles.word}>{frequencyWord(frequency)}</span>
      {showRaw && frequency?.raw && <span className={styles.raw}>({frequency.raw})</span>}
    </span>
  );
}
