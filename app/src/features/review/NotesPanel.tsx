import { useId, useState } from 'react';
import type { HpoId } from '../../shared/contract';
import { useT } from '../../shared/i18n';
import review from '../../shared/i18n/messages/review';
import { Icon } from '../../shared/ui';
import { domKey, segmentNotes, statusWordKey, type NumberedTerm } from './model';
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
  const t = useT(review);
  const headingId = useId();
  const bodyId = useId();
  const [expanded, setExpanded] = useState(false);
  const segments = segmentNotes(notes, items);
  const linked = segments.filter((s) => s.kind === 'quote').length;

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <header className={styles.head}>
        <h2 id={headingId} className={styles.title}>
          {t('yourNotes')}
        </h2>
        <p className={styles.meta}>
          {t(linked === 1 ? 'linkedOne' : 'linkedOther', { count: linked })}
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
          {segments.map((segment, i) => {
            if (segment.kind === 'text') {
              // Leading punctuation was already drawn with the quote before it.
              const prev = segments[i - 1];
              const text = prev?.kind === 'quote' ? segment.text.slice(trailingPunctuation(segment.text).length) : segment.text;
              return text ? <span key={segment.key}>{text}</span> : null;
            }
            const { term, n } = segment.item;
            const active = activeId === term.hpoId;
            const key = domKey(term.hpoId);
            const next = segments[i + 1];
            const punctuation = next?.kind === 'text' ? trailingPunctuation(next.text) : '';
            const { head, last } = splitLastWord(segment.text);
            return (
              // The last word, its footnote number and any punctuation right after
              // it stay on one line, so no line starts with the number or with ". ".
              <span key={segment.key} className={styles.glue}>
                <mark
                  id={`quote-${key}`}
                  className={styles.quote}
                  data-status={term.status}
                  data-active={active || undefined}
                  onMouseEnter={() => onActivate(term.hpoId)}
                  onMouseLeave={() => onActivate(null)}
                >
                  {head && <span className={styles.wrap}>{head}</span>}
                  {last}
                  <button
                    type="button"
                    className={styles.footnote}
                    aria-label={t('footnoteAria', { n, label: term.label, status: t(statusWordKey(term.status)) })}
                    onFocus={() => onActivate(term.hpoId)}
                    onBlur={() => onActivate(null)}
                    onClick={() => onJump(term.hpoId)}
                  >
                    {n}
                  </button>
                </mark>
                {punctuation}
              </span>
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
        <span>{expanded ? t('showLess') : t('showAll')}</span>
        <Icon name="chevronRight" size={16} className={styles.chevron} />
      </button>

      <p className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} data-status="observed" aria-hidden="true" />
          {t('present')}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} data-status="excluded" aria-hidden="true" />
          {t('notPresent')}
        </span>
      </p>
    </section>
  );
}

/** Closing punctuation at the very start of the text after a quote (".", ",", ")", "。"…). */
function trailingPunctuation(text: string): string {
  return /^[\p{Po}\p{Pe}\p{Pf}]+/u.exec(text)?.[0] ?? '';
}

/** "stayed yellow for a newborn" → head "stayed yellow for a ", last "newborn". */
function splitLastWord(text: string): { head: string; last: string } {
  const at = text.search(/\S+\s*$/);
  return at <= 0 ? { head: '', last: text } : { head: text.slice(0, at), last: text.slice(at) };
}
