import type { CSSProperties, ReactNode } from 'react';
import styles from './Skeleton.module.css';

type Size = number | string;

type SkeletonProps = {
  width?: Size;
  height?: Size;
  radius?: 'sm' | 'md' | 'lg' | 'pill';
  className?: string;
};

/** A single placeholder block. Decorative; wrap groups in <SkeletonGroup>. */
export function Skeleton({ width = '100%', height = '1em', radius = 'sm', className }: SkeletonProps) {
  const style: CSSProperties = { width, height };
  return (
    <span
      className={[styles.block, styles[radius], className].filter(Boolean).join(' ')}
      style={style}
      aria-hidden="true"
    />
  );
}

/** Lines of text-shaped placeholders; the last line is shorter, like real copy. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span className={[styles.text, className].filter(Boolean).join(' ')} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height="0.8em" width={i === lines - 1 && lines > 1 ? '62%' : '100%'} />
      ))}
    </span>
  );
}

/**
 * Announces loading once to assistive tech and hides the decorative blocks.
 * Give it the same size as the content it stands in for, so nothing jumps
 * when the real content arrives.
 */
export function SkeletonGroup({
  label = 'Loading',
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={[styles.group, className].filter(Boolean).join(' ')} role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
