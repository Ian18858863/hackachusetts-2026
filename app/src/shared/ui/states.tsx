import { useSyncExternalStore, type ReactNode } from 'react';
import { ErrorState, Icon, SkeletonGroup, Spinner } from '../../components/ui';
import type { ApiRequestError } from '../api';
import styles from './states.module.css';

// ---------------------------------------------------------------------------
// Loading: the real step in progress above a skeleton of the final layout
// ---------------------------------------------------------------------------

/**
 * Wrap a skeleton that has the final size of the content it stands in for,
 * and name the real step ("Matching 9 features"). The label is announced
 * once to assistive tech; the skeleton is decorative.
 */
export function LoadingPanel({ step, children }: { step: string; children: ReactNode }) {
  return (
    <SkeletonGroup label={step} className={styles.loading}>
      <p className={styles.step} aria-hidden="true">
        <Spinner size={14} />
        <span>{step}</span>
      </p>
      {children}
    </SkeletonGroup>
  );
}

// ---------------------------------------------------------------------------
// Error: contract error shape → plain words, retry when retryable
// ---------------------------------------------------------------------------

const TITLES: Partial<Record<ApiRequestError['code'], string>> = {
  TIMEOUT: 'The service is slow right now',
  UPSTREAM_TIMEOUT: 'A data service is slow right now',
  UPSTREAM_ERROR: 'A data service did not answer',
  RATE_LIMITED: 'Too many requests for a moment',
  OFFLINE: 'You are offline',
  UNREACHABLE: 'The service could not be reached',
  NO_TERMS_FOUND: 'No features found in this text',
  TEXT_TOO_LONG: 'Text is too long',
  LLM_UNAVAILABLE: 'Reading notes is not available here',
  INVALID_REQUEST: 'This request could not be sent',
  BAD_RESPONSE: 'The answer could not be read',
};

/**
 * Shows an ApiRequestError. The message comes from the contract and already
 * says what the user can do; "Try again" appears only when retryable. The
 * caller keeps all user input (Requirement 11.3).
 */
export function ApiErrorState({
  error,
  onRetry,
  retrying,
  actions,
  compact,
  titleLevel = 2,
}: {
  error: ApiRequestError;
  onRetry?: () => void;
  retrying?: boolean;
  /** Other next steps, e.g. "Try a demo example" or "Add terms by hand". */
  actions?: ReactNode;
  compact?: boolean;
  titleLevel?: 2 | 3 | 4;
}) {
  const status = error.status === null ? 'no HTTP response' : `HTTP ${error.status}`;
  return (
    <div className={styles.errorWrap}>
      <ErrorState
        title={TITLES[error.code] ?? 'Something went wrong'}
        description={error.message}
        onRetry={error.retryable ? onRetry : undefined}
        retrying={retrying}
        details={`${error.endpoint} · ${status} · ${error.code}`}
        compact={compact}
        titleLevel={titleLevel}
      />
      {actions && <div className={styles.errorActions}>{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Offline
// ---------------------------------------------------------------------------

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/** navigator.onLine as React state. Disable network actions while false. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

/** Calm notice shown under the top bar while the browser is offline. */
export function OfflineNotice() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className={styles.offline} role="status">
      <div className={styles.offlineInner}>
        <Icon name="cloudOff" size={18} />
        <p>
          You are offline. Your case is saved in this browser. Actions that need the network are paused until
          you reconnect.
        </p>
      </div>
    </div>
  );
}
