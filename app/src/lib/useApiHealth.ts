import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Health check for the backend.
 *
 * The API lives at the site root (/api/health), not under the app's /app/ base
 * path, so the URL is absolute on purpose. In local dev there are usually no
 * functions running; the request then fails or returns the dev server's HTML,
 * and the app shows an "offline (local)" state instead of breaking.
 */
export const HEALTH_URL = '/api/health';
const TIMEOUT_MS = 5000;

export type HealthState =
  | { status: 'checking' }
  | { status: 'online'; checkedAt: Date }
  | { status: 'offline'; checkedAt: Date; reason: string };

async function checkHealth(): Promise<HealthState> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(HEALTH_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) {
      return { status: 'offline', checkedAt: new Date(), reason: `HTTP ${res.status}` };
    }
    // A dev server or SPA fallback can answer 200 with HTML; only JSON counts.
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('application/json')) {
      return { status: 'offline', checkedAt: new Date(), reason: 'No JSON response' };
    }
    await res.json();
    return { status: 'online', checkedAt: new Date() };
  } catch {
    const reason = controller.signal.aborted ? 'Timed out' : 'Network error';
    return { status: 'offline', checkedAt: new Date(), reason };
  } finally {
    window.clearTimeout(timer);
  }
}

export function useApiHealth() {
  const [state, setState] = useState<HealthState>({ status: 'checking' });
  // True while any request is in flight; the last result stays visible meanwhile
  // so the indicator does not change width on every re-check.
  const [isChecking, setIsChecking] = useState(true);
  // Only the latest request may update state (e.g. after a quick re-check).
  const latestRequest = useRef(0);

  const recheck = useCallback(() => {
    const id = ++latestRequest.current;
    setIsChecking(true);
    void checkHealth().then((next) => {
      if (id !== latestRequest.current) return;
      setState(next);
      setIsChecking(false);
    });
  }, []);

  useEffect(() => {
    recheck();
    // Re-check when the connection comes back.
    window.addEventListener('online', recheck);
    return () => {
      window.removeEventListener('online', recheck);
      latestRequest.current++;
    };
  }, [recheck]);

  return { state, isChecking, recheck };
}
