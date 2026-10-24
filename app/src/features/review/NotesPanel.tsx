import { useId, useState } from 'react';
import type { HpoId } from '../../shared/contract';
import { Icon } from '../../shared/ui';
import { domKey, segmentNotes, statusWord, type NumberedTerm } from './model';
import styles from './NotesPanel.module.css';

/**
 * The parent's notes with every extracted quote highlighted and footnoted.
 * Hovering a quote, or focusing its footnote number, lights up the matching
 * feature in the list; activating the number moves focus to that feature.
 * On phone the notes start collapsed above the list.
 */
export function NotesPanel({
  notes,
  items,
  activeId,
  onActivate,
  onJump,
}: {
  notes: string;
  items: readonly NumberedTerm[];
  activeId: HpoId | null;
  onActivate: (hpoId: HpoId | null) => void;
  onJump: (hpoId: HpoId) => void;
}) {
  const headingId = useId();
  const bodyId = useId();
  const [expanded, setExpanded] = useState(false);
  const segments = segmentNotes(notes, items);
  const linked = segments.filter((s) => s.kind === 'quote').length;

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <header className={styles.head}>
        <h2 id={headingId} className={styles.title}>
          Your notes
        </h2>
        <p className={styles.meta}>
          {linked} {linked === 1 ? 'phrase' : 'phrases'} linked to features
        </p>
      </header>

      <div
        id={bodyId}
        className={styles.body}
        data-collapsed={!expanded || undefined}
        // A footnote reached with Tab must not sit in the hidden part.
        onFocus={() => setExpanded(true)}
      >
        <p className={styles.notes}>
          {segments.map((segment) => {
            if (segment.kind === 'text') return <span key={segment.key}>{segment.text}</span>;
            const { term, n } = segment.item;
            const active = activeId === term.hpoId;
            const key = domKey(term.hpoId);
            return (
              <mark
                key={segment.key}
                id={`quote-${key}`}
                className={styles.quote}
                data-status={term.status}
                data-active={active || undefined}
                onMouseEnter={() => onActivate(term.hpoId)}
                onMouseLeave={() => onActivate(null)}
              >
                {segment.text}
                <button
                  type="button"
                  className={styles.footnote}
                  aria-label={`Feature ${n}: ${term.label}, ${statusWord(term.status)}. Go to this feature`}
                  onFocus={() => onActivate(term.hpoId)}
                  onBlur={() => onActivate(null)}
                  onClick={() => onJump(term.hpoId)}
                >
                  {n}
                </button>
              </mark>
            );
          })}
        </p>
      </div>

      <button
        type="button"
        className={styles.expand}
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded((v) => !v)}
      >
        <span>{expanded ? 'Show less of the notes' : 'Show all of the notes'}</span>
        <Icon name="chevronRight" size={16} className={styles.chevron} />
      </button>

      <p className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} data-status="observed" aria-hidden="true" />
          Present
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} data-status="excluded" aria-hidden="true" />
          Not present
        </span>
      </p>
    </section>
  );
}
