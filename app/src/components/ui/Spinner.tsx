import styles from './Spinner.module.css';

type SpinnerProps = {
  size?: number;
  /** Accessible label. Omit when a parent already announces the busy state. */
  label?: string;
};

export function Spinner({ size = 16, label }: SpinnerProps) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size }}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
