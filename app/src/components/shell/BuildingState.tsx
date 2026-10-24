import { RevealText } from '../ui';
import styles from './BuildingState.module.css';

/*
 * Placeholder for the home screen until the product exists.
 * Every line here is true today; edit PROGRESS as the build moves on, and
 * replace this whole component with the real first screen.
 */
type Step = { label: string; status: string; tone: 'done' | 'active' | 'next' };

const PROGRESS: Step[] = [
  { label: 'App shell', status: 'Ready', tone: 'done' },
  { label: 'Topic and product name', status: 'Being decided', tone: 'active' },
  { label: 'Working demo', status: 'Next', tone: 'next' },
];

export function BuildingState() {
  return (
    <section className={styles.wrap} aria-labelledby="building-title">
      <p className={styles.eyebrow}>
        <span className={styles.eyebrowDot} aria-hidden="true" />
        Work in progress
      </p>

      <h1 id="building-title" className={styles.title}>
        <RevealText text="This app is being built" delay={80} />
      </h1>

      <p className={styles.lede}>
        Our team is building it today at Hackachusetts 2026. The product, its name and its content
        will appear here once we settle on the topic.
      </p>

      <ol className={styles.progress} aria-label="Build progress">
        {PROGRESS.map((step) => (
          <li key={step.label} className={styles.step} data-tone={step.tone}>
            <span className={styles.marker} aria-hidden="true" />
            <span className={styles.stepLabel}>{step.label}</span>
            <span className={styles.stepStatus}>{step.status}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
