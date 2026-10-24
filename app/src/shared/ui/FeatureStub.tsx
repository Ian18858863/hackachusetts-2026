import type { ReactNode } from 'react';
import { EmptyState, type IconName } from '../ui';
import styles from './FeatureStub.module.css';

/**
 * Placeholder used by the feature stubs in src/features/<name>/index.tsx until
 * each feature task replaces its stub. Not for use in finished features.
 */
export function FeatureStub({
  feature,
  specTask,
  icon,
  title,
  description,
  action,
  children,
}: {
  /** Folder name, e.g. "intake". */
  feature: string;
  /** Spec task in .kiro/specs/rare-disease-detective/tasks.md, e.g. "3.2". */
  specTask: string;
  icon: IconName;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  /** Optional short summary of what the store already holds for this step. */
  children?: ReactNode;
}) {
  return (
    <section className={styles.stub} aria-label={`${title} (placeholder)`}>
      <EmptyState icon={icon} title={title} description={description} action={action} titleLevel={2} />
      {children && <div className={styles.summary}>{children}</div>}
      <p className={styles.tag}>
        Placeholder for <span className="code">src/features/{feature}/</span> · spec task {specTask}
      </p>
    </section>
  );
}
