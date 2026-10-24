import { Icon } from '../../components/ui';
import type { DataOrigin } from '../api';
import type { DataVersions, Source } from '../contract';
import { OFFLINE_MOCK_LABEL, demoCaseLabel } from '../text';
import styles from './DemoLabel.module.css';

/**
 * "Demo case (synthetic narrative from phenopacket-store <id>)", verbatim from
 * contract section 13. Show it near the notes, the results and the exports
 * whenever the case is a demo case.
 */
export function DemoCaseLabel({ sourcePhenopacketId }: { sourcePhenopacketId: string }) {
  return (
    <span className={styles.label} data-tone="demo">
      <Icon name="flask" size={14} className={styles.icon} />
      <span>{demoCaseLabel(sourcePhenopacketId)}</span>
    </span>
  );
}

/** The payload came from the app's bundled offline mocks, not the server. */
export function OfflineMockLabel() {
  return (
    <span className={styles.label} data-tone="mock">
      <Icon name="cloudOff" size={14} className={styles.icon} />
      <span>{OFFLINE_MOCK_LABEL}</span>
    </span>
  );
}

/** The server answered from its recorded demo cache (source: "demo"). */
export function DemoCacheLabel({ recorded }: { recorded?: string }) {
  return (
    <span className={styles.label} data-tone="demo">
      <Icon name="flask" size={14} className={styles.icon} />
      <span>{recorded ? `Demo data (recorded ${recorded})` : 'Demo data (recorded)'}</span>
    </span>
  );
}

/**
 * Picks the right label for one payload, or nothing for live data.
 * Offline mock beats demo cache, because it is the stronger warning.
 */
export function DataOriginLabel({
  origin,
  source,
  dataVersions,
}: {
  origin: DataOrigin | null | undefined;
  source?: Source | null;
  dataVersions?: DataVersions | null;
}) {
  if (origin === 'mock') return <OfflineMockLabel />;
  if (source === 'demo') return <DemoCacheLabel recorded={dataVersions?.demoCache} />;
  return null;
}
