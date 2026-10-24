import type { HpoId } from '../../shared/contract';
import { useT } from '../../shared/i18n';
import review from '../../shared/i18n/messages/review';
import { Button } from '../../shared/ui';
import { LocalIcon } from './LocalIcon';
import { domKey, type NumberedTerm } from './model';
import { StatusToggle, type PresenceStatus } from './StatusToggle';
import styles from './TermRow.module.css';

/**
 * One feature: footnote number, the parent's own words first, then the HPO
 * label and id in a quieter style (Requirement 9.4), and its controls.
 * Rows are separated by hairlines, not boxed.
 */
export function TermRow({
  item,
  active,
  onActivate,
  onStatus,
  onRemove,
}: {
  item: NumberedTerm;
  active: boolean;
  onActivate: (hpoId: HpoId | null) => void;
  onStatus: (item: NumberedTerm, status: PresenceStatus) => void;
  onRemove: (item: NumberedTerm) => void;
}) {
  const t = useT(review);
  const { term, n, range } = item;
  const key = domKey(term.hpoId);
  const status: PresenceStatus = term.status === 'excluded' ? 'excluded' : 'observed';
  const plain = term.quote ? `“${term.quote}”` : term.label;
  const lessCertain = term.confidence === 'low' || term.confidence === 'medium';

  return (
    <li
      id={`term-${key}`}
      data-testid={`term-row-${term.hpoId}`}
      className={styles.row}
      data-status={term.status}
      data-active={active || undefined}
      onMouseEnter={() => onActivate(term.hpoId)}
      onMouseLeave={() => onActivate(null)}
      onFocus={() => onActivate(term.hpoId)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onActivate(null);
      }}
    >
      <span className={styles.number} data-status={term.status} aria-hidden="true">
        {n}
      </span>

      <div className={styles.text}>
        <p className={styles.plain}>
          <span className="sr-only">{t('srFeature', { n })}</span>
          {plain}
        </p>
        <p className={styles.term}>
          {status === 'excluded' && <span className={styles.absentTag}>{t('notPresent')}</span>}
          {term.quote ? <span className={styles.label}>{term.label}</span> : <span>{t('addedByYou')}</span>}
          <span className={`code ${styles.id}`}>{term.hpoId}</span>
          {term.quote && !range && <span className={styles.flag}>{t('notInNotes')}</span>}
          {lessCertain && <span className={styles.flag}>{t('lessCertain')}</span>}
        </p>
      </div>

      <StatusToggle
        name={`status-${key}`}
        idPrefix={`status-${key}`}
        value={status}
        legend={t('toggleLegend', { n, text: term.quote ?? term.label })}
        onChange={(next) => onStatus(item, next)}
        testIds={{ observed: `term-keep-${term.hpoId}`, excluded: `term-absent-${term.hpoId}` }}
      />
      <Button
        variant="ghost"
        size="sm"
        className={styles.remove}
        onClick={() => onRemove(item)}
        aria-label={t('removeAria', { n, label: term.label })}
        data-testid={`term-remove-${term.hpoId}`}
        iconStart={<LocalIcon name="close" size={14} />}
      >
        {t('remove')}
      </Button>
    </li>
  );
}
