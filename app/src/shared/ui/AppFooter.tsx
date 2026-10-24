import { useCase } from '../store';
import { ATTRIBUTION, hpoAttribution } from '../text';
import { Disclaimer } from './Disclaimer';
import styles from './AppFooter.module.css';

const HPO_URL = 'https://hpo.jax.org';

/**
 * Footer with the safety line and the credits required by contract section 13.
 * The HPO sentence is always shown; other credits appear only when their data
 * is on screen (Monarch and Orphanet with a ranking, phenopacket-store with a
 * demo case). The trials view shows the ClinicalTrials.gov credit itself.
 */
export function AppFooter() {
  const { caseObject, meta } = useCase();
  const candidates = caseObject.lastRanking?.response.candidates ?? [];
  const hpoVersion = meta.hpoVersion ?? 'not loaded yet';

  const credits: string[] = [];
  if (candidates.some((c) => c.sources.includes('monarch-semsim'))) credits.push(ATTRIBUTION.monarch);
  if (candidates.some((c) => c.sources.includes('orphadata') || c.diseaseId.startsWith('ORPHA:'))) {
    credits.push(ATTRIBUTION.orphanet);
  }
  if (candidates.some((c) => c.sources.includes('pubcasefinder'))) credits.push(ATTRIBUTION.pubCaseFinder);
  if (caseObject.demo) credits.push(ATTRIBUTION.phenopacketStore);

  const hpoText = hpoAttribution(hpoVersion);
  const [hpoBefore] = hpoText.split(HPO_URL);

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.safety}>
          <Disclaimer inline />
        </p>
        <ul className={styles.credits} aria-label="Data sources and credits">
          <li>
            {hpoBefore}
            <a href={HPO_URL} target="_blank" rel="noreferrer">
              {HPO_URL}
            </a>
          </li>
          {credits.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
        <p className={styles.built}>
          <b>Built at Sundai</b> · Hackachusetts 2026 · powered by Kiro
        </p>
      </div>
    </footer>
  );
}
