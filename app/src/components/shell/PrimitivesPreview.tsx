import { useState, type ReactNode } from 'react';
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  Skeleton,
  SkeletonGroup,
  SkeletonText,
} from '../ui';
import styles from './PrimitivesPreview.module.css';

/** Swatches from the token sheet in docs/ART_DIRECTION.md, with measured contrast on white. */
const SWATCHES: Array<{ token: string; use: string; ratio: string }> = [
  { token: '--ink', use: 'Text, primary pill', ratio: '18.1:1' },
  { token: '--ink-2', use: 'Secondary text', ratio: '8.9:1' },
  { token: '--ink-3', use: 'Labels, captions', ratio: '6.0:1' },
  { token: '--accent', use: 'Rank 1, footnotes, focus', ratio: '6.6:1' },
  { token: '--mark-none', use: 'Control borders, dashes', ratio: '4.0:1' },
  { token: '--surface', use: 'Panels', ratio: 'surface' },
  { token: '--accent-soft', use: 'Accent tint', ratio: 'tint' },
  { token: '--hair', use: 'Hairlines', ratio: 'decorative' },
];

/**
 * Internal component kit, reachable at /app/#primitives. Not linked from the
 * product UI. Shows the type scale, the palette and every primitive in its
 * states so the team can check them against the approved token sheet.
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
        <p className={styles.kicker}>
          <b>Internal preview</b> · not part of the product
        </p>
        <h1 className={styles.title}>Component kit</h1>
        <p className={styles.lede}>
          Shell primitives in every state, drawn from the token sheet in{' '}
          <span className="code">docs/ART_DIRECTION.md</span>. <a href="#/notes">Back to the app</a>
        </p>
      </header>

      <Section title="Type">
        <div className={styles.type}>
          <p className={styles.typeRow}>
            <span className={styles.typeMeta}>Newsreader 500 · 44 (34 on phone)</span>
            <span className={styles.t2xl}>Possible matches to discuss</span>
          </p>
          <p className={styles.typeRow}>
            <span className={styles.typeMeta}>Newsreader 500 · 34 (30 on phone)</span>
            <span className={styles.txl}>Duchenne muscular dystrophy</span>
          </p>
          <p className={styles.typeRow}>
            <span className={styles.typeMeta}>Newsreader 500 · 21</span>
            <span className={styles.tside}>Becker muscular dystrophy</span>
          </p>
          <p className={styles.typeRow}>
            <span className={styles.typeMeta}>Newsreader 400 · 19</span>
            <q className={styles.tquote}>His calves are big and firm</q>
          </p>
          <p className={styles.typeRow}>
            <span className={styles.typeMeta}>Newsreader 500 · 44 tabular</span>
            <span className={styles.tnum}>
              12 <span>of 12</span>
            </span>
          </p>
          <p className={styles.typeRow}>
            <span className={styles.typeMeta}>Source Sans 3 · 19</span>
            <span className={styles.tmd}>Ranked by how closely the features overlap with each condition.</span>
          </p>
          <p className={styles.typeRow}>
            <span className={styles.typeMeta}>Source Sans 3 · 17 (16 on phone)</span>
            <span>
              <b>Calf muscle pseudohypertrophy</b> · body text with <span className="code">HP:0003707</span>
            </span>
          </p>
          <p className={styles.typeRow}>
            <span className={styles.typeMeta}>Source Sans 3 · 14</span>
            <span className={styles.txs}>Labels and captions in the tertiary ink</span>
          </p>
        </div>
      </Section>

      <Section title="Colour">
        <ul className={styles.swatches}>
          {SWATCHES.map((s) => (
            <li key={s.token} className={styles.swatch}>
              <span className={styles.chip} style={{ background: `var(${s.token})` }} aria-hidden="true" />
              <span className={styles.swatchText}>
                <span className="code">{s.token}</span>
                <span>{s.use}</span>
                <span className={styles.ratio}>{s.ratio}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Button">
        <div className={styles.row}>
          <Button iconEnd={<Icon name="arrowRight" size={16} />}>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <Button loading={busy} onClick={() => fakeWork(setBusy)}>
            Save changes
          </Button>
          <ButtonLink href="#primitives">Link as button</ButtonLink>
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
            padding="lg"
            eyebrow="Eyebrow"
            title="Surface panel"
            description="The rounded focal panel. One per screen holds the main result."
            actions={
              <Button size="sm" variant="ghost">
                Action
              </Button>
            }
            footer="Footer text"
          >
            <SkeletonText lines={3} />
          </Card>
          <Card tone="sunken" title="Quiet panel" description="White with a hairline, for secondary grouped content." />
        </div>
      </Section>

      <Section title="Loading skeleton">
        <Card padding="lg">
          <SkeletonGroup label="Loading example content">
            <div className={styles.skeletonHead}>
              <Skeleton width={24} height={24} radius="pill" />
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
