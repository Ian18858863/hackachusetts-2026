import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

type CardElement = 'div' | 'section' | 'article' | 'li';

export type CardProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  as?: CardElement;
  /** Small label above the title (category, step, status). */
  eyebrow?: ReactNode;
  title?: ReactNode;
  /** Heading level for the title, to fit the page outline. */
  titleLevel?: 2 | 3 | 4;
  description?: ReactNode;
  /** Controls aligned to the right of the header. */
  actions?: ReactNode;
  footer?: ReactNode;
  padding?: 'md' | 'lg';
  tone?: 'surface' | 'sunken';
};

/**
 * Static container. Cards are not clickable on their own; put a Button or link
 * inside instead, so nothing looks interactive without being interactive.
 */
export function Card({
  as: Element = 'div',
  eyebrow,
  title,
  titleLevel = 3,
  description,
  actions,
  footer,
  padding = 'md',
  tone = 'surface',
  className,
  children,
  ...rest
}: CardProps) {
  const Heading = `h${titleLevel}` as const;
  const hasHeader = Boolean(eyebrow || title || description || actions);

  return (
    <Element
      className={[styles.card, styles[padding], styles[tone], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {hasHeader && (
        <header className={styles.header}>
          <div className={styles.heading}>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            {title && <Heading className={styles.title}>{title}</Heading>}
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      {children !== undefined && <div className={styles.body}>{children}</div>}
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </Element>
  );
}
