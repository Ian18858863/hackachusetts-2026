/**
 * Keeps caseObject.lastRanking in step with the observed and excluded terms
 * (Requirements 3.1, 4.1–4.3).
 *
 * - No ranking yet: rank at once. Terms changed after a ranking: wait for a
 *   600 ms pause, then rank; "Update now" skips the wait.
 * - One AbortController: a newer term set cancels the request in flight.
 * - The previous results stay in the store (and on screen) until the new
 *   ones arrive; the caller shows them as updating.
 * - A failed request is not retried automatically for the same term set;
 *   the user retries, and any further term change tries again.
 *
 * Used by the matches step and by "What to check next" (yes/no answers).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { isAbortError, rank, toApiRequestError, type ApiRequestError } from '../../shared/api';
import type { CaseRanking } from '../../shared/contract';
import { currentRankRequest, useCase, useCaseActions } from '../../shared/store';
import { useT } from '../../shared/i18n';
import ranking from '../../shared/i18n/messages/ranking';
import { useAnnounce, useOnlineStatus } from '../../shared/ui';
import { rankKey } from './format';
import { describeRanking, recordChange } from './rankingChange';

export const RERANK_DEBOUNCE_MS = 600;

export type RankPhase = 'idle' | 'scheduled' | 'loading' | 'error' | 'offline';

export interface AutoRank {
  /** What the ranking is doing for the current term set. */
  phase: RankPhase;
  error: ApiRequestError | null;
  /** The shown ranking was made for a different term set. */
  stale: boolean;
  /** At least one observed term, so a ranking is possible. */
  canRank: boolean;
  /** The request that will be (or is being) sent. */
  request: CaseRanking['request'];
  /** Skip the pause, or retry after an error. */
  rankNow(): void;
}

interface RunState {
  phase: 'idle' | 'scheduled' | 'loading' | 'error';
  error: ApiRequestError | null;
  key: string | null;
}

const IDLE: RunState = { phase: 'idle', error: null, key: null };

export function useAutoRank(): AutoRank {
  const { caseObject } = useCase();
  const { setRanking } = useCaseActions();
  const announce = useAnnounce();
  // Read through a ref so a language change never restarts a ranking request.
  const t = useT(ranking);
  const tRef = useRef(t);
  useLayoutEffect(() => {
    tRef.current = t;
  }, [t]);
  const online = useOnlineStatus();

  const { terms, lastRanking } = caseObject;
  // Only the terms decide the request.
  const request = useMemo(() => currentRankRequest(caseObject), [terms]);
  const key = rankKey(request);
  const rankedKey = lastRanking ? rankKey(lastRanking.request) : null;
  const canRank = request.observed.length > 0;
  const needed = canRank && rankedKey !== key;
  const hasRanking = lastRanking !== null;

  const [run, setRun] = useState<RunState>(IDLE);
  const [nonce, setNonce] = useState(0);
  const immediate = useRef(false);
  const controller = useRef<AbortController | null>(null);

  // The ranking being replaced, read when the new one arrives.
  const rankingRef = useRef(lastRanking);
  useLayoutEffect(() => {
    rankingRef.current = lastRanking;
  }, [lastRanking]);

  const send = useCallback(
    async (req: CaseRanking['request'], forKey: string) => {
      controller.current?.abort();
      const own = new AbortController();
      controller.current = own;
      setRun({ phase: 'loading', error: null, key: forKey });
      try {
        const result = await rank(req, { signal: own.signal });
        if (own.signal.aborted) return;
        const previous = rankingRef.current?.response ?? null;
        recordChange(result.data, previous);
        setRanking(req, result.data, result.origin);
        announce(describeRanking(result.data, previous, tRef.current));
        setRun({ phase: 'idle', error: null, key: forKey });
      } catch (error) {
        if (isAbortError(error) || own.signal.aborted) return;
        setRun({ phase: 'error', error: toApiRequestError(error, 'rank'), key: forKey });
      } finally {
        if (controller.current === own) controller.current = null;
      }
    },
    [announce, setRanking],
  );

  const failedHere = run.phase === 'error' && run.key === key;

  useEffect(() => {
    if (!needed || !online || failedHere) return;
    const delay = hasRanking && !immediate.current ? RERANK_DEBOUNCE_MS : 0;
    immediate.current = false;
    if (delay > 0) setRun({ phase: 'scheduled', error: null, key });
    const timer = window.setTimeout(() => void send(request, key), delay);
    return () => {
      window.clearTimeout(timer);
      // A newer term set (or leaving the step) makes the request in flight useless.
      controller.current?.abort();
    };
    // `request` follows `key`; `hasRanking` only picks the delay.
  }, [key, needed, online, failedHere, nonce, send]);

  // Abort on unmount.
  useEffect(() => () => controller.current?.abort(), []);

  const rankNow = useCallback(() => {
    immediate.current = true;
    setRun(IDLE);
    setNonce((n) => n + 1);
  }, []);

  let phase: RankPhase = 'idle';
  if (needed) {
    if (!online) phase = 'offline';
    else if (failedHere) phase = 'error';
    else if (run.phase === 'loading' && run.key === key) phase = 'loading';
    else phase = hasRanking ? 'scheduled' : 'loading';
  }

  return {
    phase,
    error: phase === 'error' ? run.error : null,
    stale: hasRanking && rankedKey !== key,
    canRank,
    request,
    rankNow,
  };
}
