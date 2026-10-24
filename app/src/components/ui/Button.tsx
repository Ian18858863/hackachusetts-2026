import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  PointerEvent,
  ReactNode,
  Ref,
} from 'react';
import styles from './Button.module.css';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks clicks without changing the button's size. */
  loading?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

export type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
};

/**
 * Pill button. Primary is the black pill from the approved specimen; the
 * hover fill spreads from where the pointer entered and retreats towards
 * where it left.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconStart,
  iconEnd,
  type = 'button',
  className,
  children,
  disabled,
  onClick,
  onPointerEnter,
  onPointerLeave,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classes(variant, size, className)}
      disabled={disabled}
      // Keep a loading button focusable so keyboard users do not lose their place.
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      onClick={loading ? (event) => event.preventDefault() : onClick}
      onPointerEnter={(event) => {
        setFillOrigin(event, true);
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        setFillOrigin(event, false);
        onPointerLeave?.(event);
      }}
      {...rest}
    >
      <span className={styles.fill} aria-hidden="true" />
      <span className={styles.content}>
        {loading ? <Spinner size={size === 'sm' ? 14 : 16} /> : iconStart}
        <span className={styles.label}>{children}</span>
        {iconEnd}
      </span>
    </button>
  );
}

/** A link that looks like a Button, for actions that navigate (for example to a step). */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  iconStart,
  iconEnd,
  className,
  children,
  onPointerEnter,
  onPointerLeave,
  ...rest
}: ButtonLinkProps) {
  return (
    <a
      className={classes(variant, size, className)}
      onPointerEnter={(event) => {
        setFillOrigin(event, true);
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        setFillOrigin(event, false);
        onPointerLeave?.(event);
      }}
      {...rest}
    >
      <span className={styles.fill} aria-hidden="true" />
      <span className={styles.content}>
        {iconStart}
        <span className={styles.label}>{children}</span>
        {iconEnd}
      </span>
    </a>
  );
}

function classes(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return [styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ');
}

function setFillOrigin(event: PointerEvent<HTMLElement>, entering: boolean) {
  // Touch has no hover; the :active style gives tap feedback instead.
  if (event.pointerType === 'touch') return;
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--fill-x', `${event.clientX - rect.left}px`);
  el.style.setProperty('--fill-y', `${event.clientY - rect.top}px`);
  // Twice the diagonal covers the button from any origin point.
  el.style.setProperty('--fill-size', `${Math.ceil(Math.hypot(rect.width, rect.height) * 2)}px`);
  if (entering) el.dataset.hover = '';
  else delete el.dataset.hover;
}
