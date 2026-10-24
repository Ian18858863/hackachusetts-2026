import { useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  Skeleton,
  SkeletonGroup,
  SkeletonText,
} from '../ui';
import styles from './PrimitivesPreview.module.css';

/**
 * Internal component kit, reachable at /app/#primitives. Not linked from the
 * product UI. Shows every primitive in its states so the team can check them
 * in both themes before building real screens.
 */
export function PrimitivesPreview() {
  const [busy, setBusy] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fakeWork = (set: (v: boolean) => void) => {
    set(true);
    window.setTimeout(() => set(false), 1600);
  };

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Internal preview</p>
        <h1 className={styles.title}>Component kit</h1>
        <p className={styles.lede}>
          Shell primitives in every state. Toggle the theme in the top bar to check dark mode.{' '}
          <a href="#">Back to the app</a>
        </p>
      </header>

      <Section title="Button">
        <div className={styles.row}>
          <Button iconEnd={<Icon name="arrowRight" size={16} />}>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <Button loading={busy} onClick={() => fakeWork(setBusy)}>
            Save changes
          </Button>
        </div>
        <div className={styles.row}>
          <Button size="sm" iconStart={<Icon name="plus" size={14} />}>
            Small
          </Button>
          <Button size="sm" variant="secondary">
            Small secondary
          </Button>
          <Button size="sm" variant="ghost">
            Small ghost
          </Button>
        </div>
      </Section>

      <Section title="Card">
        <div className={styles.grid}>
          <Card
            eyebrow="Eyebrow"
            title="Card title"
            description="A short description of what this card holds."
            actions={
              <Button size="sm" variant="ghost">
                Action
              </Button>
            }
            footer="Footer text"
          >
            <SkeletonText lines={3} />
          </Card>
          <Card tone="sunken" title="Sunken tone" description="For secondary or grouped content." />
        </div>
      </Section>

      <Section title="Loading skeleton">
        <Card>
          <SkeletonGroup label="Loading example content">
            <div className={styles.skeletonHead}>
              <Skeleton width={40} height={40} radius="pill" />
              <div className={styles.skeletonLines}>
                <Skeleton width="40%" height={14} />
                <Skeleton width="24%" height={12} />
              </div>
            </div>
            <SkeletonText lines={3} />
            <Skeleton height={120} radius="md" />
          </SkeletonGroup>
        </Card>
      </Section>

      <Section title="Empty and error states">
        <div className={styles.grid}>
          <EmptyState
            title="Nothing here yet"
            description="Items you add will show up in this list."
            action={<Button iconStart={<Icon name="plus" size={16} />}>Add the first item</Button>}
          />
          <ErrorState
            title="Could not load this section"
            description="Check your connection, then try again."
            onRetry={() => fakeWork(setRetrying)}
            retrying={retrying}
            details="GET /api/example → 503 Service Unavailable"
            announce={false}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}
