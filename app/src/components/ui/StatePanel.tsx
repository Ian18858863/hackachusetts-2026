import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './StatePanel.module.css';

type StatePanelProps = {
  tone: 'neutral' | 'danger';
  icon: IconName;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  details?: ReactNode;
  role?: 'status' | 'alert';
  titleLevel?: 2 | 3 | 4;
  compact?: boolean;
  className?: string;
};

/** Shared layout for empty and error states: icon, one-line title, short text, action. */
export function StatePanel({
  tone,
  icon,
  title,
  description,
  actions,
  details,
  role,
  titleLevel = 3,
  compact = false,
  className,
}: StatePanelProps) {
  const Heading = `h${titleLevel}` as const;
  return (
    <div
      className={[styles.panel, styles[tone], compact && styles.compact, className]
        .filter(Boolean)
        .join(' ')}
      role={role}
      data-surface=""
    >
      <span className={styles.icon}>
        <Icon name={icon} size={compact ? 20 : 24} />
      </span>
      <Heading className={styles.title}>{title}</Heading>
      {description && <p className={styles.description}>{description}</p>}
      {actions && <div className={styles.actions}>{actions}</div>}
      {details && (
        <details className={styles.details}>
          <summary>Technical details</summary>
          <div className={styles.detailsBody}>{details}</div>
        </details>
      )}
    </div>
  );
}
