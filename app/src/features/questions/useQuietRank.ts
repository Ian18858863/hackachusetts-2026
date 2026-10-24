/**
 * Family mode's background ranking (T30a). Same timing as useAutoRank (rank at
 * once, then after a 600 ms pause on each term change) but it never announces:
 * useAutoRank's live-region sentence names the first match, and family mode
 * must not speak or show a disease name. The ranking is only needed for the
 * candidate ids that POST /api/next-questions takes; nothing from it is rendered.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isAbortError, rank, toApiRequestError, type ApiRequestError } from '../../shared/api';
import type { CaseRanking } from '../../shared/contract';
import { currentRankRequest, useCase, useCaseActions } from '../../shared/store';
import { useOnlineStatus } from '../../shared/ui';
import { rankKey } from '../ranking/format';
import { recordChange } from '../ranking/rankingChange';
import { RERANK_DEBOUNCE_MS, type RankPhase } from '../ranking/useAutoRank';

export interface QuietRank {
  phase: RankPhase;
  error: ApiRequestError | null;
  canRank: boolean;
  rankNow(): void;
}

export function useQuietRank(): QuietRank {
  const { caseObject } = useCase();
  const { setRanking } = useCaseActions();
  const online = useOnlineStatus();
  const { terms, lastRanking } = caseObject;
  const request = useMemo(() => currentRankRequest(caseObject), [terms]);
  const key = rankKey(request);
  const rankedKey = lastRanking ? rankKey(lastRanking.request) : null;
  const canRank = request.observed.length > 0;
  const needed = canRank && rankedKey !== key;
  const hasRanking = lastRanking !== null;

  const [run, setRun] = useState<{ phase: 'idle' | 'loading' | 'error'; error: ApiRequestError | null; key: string | null }>(
    { phase: 'idle', error: null, key: null },
  );
  const [nonce, setNonce] = useState(0);
  const immediate = useRef(false);
  const previous = useRef(lastRanking);
  previous.current = lastRanking;

  const send = useCallback(
    async (req: CaseRanking['request'], forKey: string, signal: AbortSignal) => {
      setRun({ phase: 'loading', error: null, key: forKey });
      try {
        const result = await rank(req, { signal });
        if (signal.aborted) return;
        // Keeps the clinician view's "changed place" motion correct if the user switches later.
        recordChange(result.data, previous.current?.response ?? null);
        setRanking(req, result.data, result.origin);
        setRun({ phase: 'idle', error: null, key: forKey });
      } catch (error) {
        if (isAbortError(error) || signal.aborted) return;
        setRun({ phase: 'error', error: toApiRequestError(error, 'rank'), key: forKey });
      }
    },
    [setRanking],
  );

  const failedHere = run.phase === 'error' && run.key === key;

  useEffect(() => {
    if (!needed || !online || failedHere) return;
    const controller = new AbortController();
    const delay = hasRanking && !immediate.current ? RERANK_DEBOUNCE_MS : 0;
    immediate.current = false;
    const timer = window.setTimeout(() => void send(request, key, controller.signal), delay);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // `request` follows `key`; `hasRanking` only picks the delay.
  }, [key, needed, online, failedHere, nonce, send]);

  const rankNow = useCallback(() => {
    immediate.current = true;
    setRun({ phase: 'idle', error: null, key: null });
    setNonce((n) => n + 1);
  }, []);

  let phase: RankPhase = 'idle';
  if (needed) {
    if (!online) phase = 'offline';
    else if (failedHere) phase = 'error';
    else if (run.phase === 'loading' && run.key === key) phase = 'loading';
    else phase = hasRanking ? 'scheduled' : 'loading';
  }
  return { phase, error: phase === 'error' ? run.error : null, canRank, rankNow };
}
