import { useApiHealth, type HealthState } from '../../lib/useApiHealth';
import styles from './StatusIndicator.module.css';

const isLocalHost = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0|.+\.local)$/i.test(
  window.location.hostname,
);

type Description = { label: string; short: string; tone: 'pending' | 'ok' | 'off' };

/** `short` drops the "API" prefix for narrow screens; `label` is the full text. */
function describe(state: HealthState): Description {
  switch (state.status) {
    case 'checking':
      return { label: 'Checking API', short: 'Checking', tone: 'pending' };
    case 'online':
      return { label: 'API online', short: 'Online', tone: 'ok' };
    case 'offline':
      return isLocalHost
        ? { label: 'API offline (local)', short: 'Offline (local)', tone: 'off' }
        : { label: 'API offline', short: 'Offline', tone: 'off' };
  }
}

const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

/**
 * Tiny backend status pill for the top bar. GET /api/health on load and on
 * click. A failed call is a normal state here (local dev has no functions),
 * never an error that breaks the page.
 */
export function StatusIndicator() {
  const { state, isChecking, recheck } = useApiHealth();
  const { label, short, tone } = describe(state);

  const detail =
    state.status === 'offline'
      ? `${state.reason}, checked at ${timeFormat.format(state.checkedAt)}`
      : state.status === 'online'
        ? `Checked at ${timeFormat.format(state.checkedAt)}`
        : 'Contacting /api/health';

  return (
    <>
      <button
        type="button"
        className={styles.pill}
        data-tone={tone}
        data-checking={isChecking || undefined}
        onClick={recheck}
        title={`${detail}. Click to check again`}
        aria-label={`${label}. ${detail}. Check again`}
      >
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.label} aria-hidden="true">
          {label}
        </span>
        <span className={styles.short} aria-hidden="true">
          {short}
        </span>
      </button>
      {/* Announce status changes politely; a button's label is not a live region. */}
      <span className="sr-only" aria-live="polite">
        {isChecking ? '' : label}
      </span>
    </>
  );
}
