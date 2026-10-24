import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.credit}>Built at Sundai</p>
        <p className={styles.meta}>Hackachusetts 2026 · powered by Kiro</p>
      </div>
    </footer>
  );
}
