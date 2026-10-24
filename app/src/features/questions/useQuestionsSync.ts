/**
 * Keeps caseObject.questions in step with the latest ranking (R5.1): after
 * each ranking with at least 2 candidates, POST /api/next-questions with the
 * same observed and excluded ids and the top candidates (up to 5).
 *
 * Questions are only refreshed for a ranking that matches the current
 * features, so a stale ranking is never paired with new answers. The key of
 * the last synced ranking lives at module scope, so moving between steps does
 * not refetch; a page reload fetches once.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbortError, nextQuestions, toApiRequestError, type ApiRequestError } from '../../shared/api';
import { LIMITS, type CaseRanking } from '../../shared/contract';
import { isRankingStale, useCase, useCaseActions } from '../../shared/store';
import { useOnlineStatus } from '../../shared/ui';

export type QuestionsPhase = 'waiting' | 'loading' | 'ready' | 'error' | 'too-few';

let syncedKey: string | null = null;

export function questionsKey(ranking: CaseRanking): string {
  const ids = topCandidateIds(ranking);
  return `${ranking.request.observed.join(',')}|${ranking.request.excluded.join(',')}|${ids.join(',')}`;
}

export function topCandidateIds(ranking: CaseRanking): string[] {
  return ranking.response.candidates.slice(0, LIMITS.questionsCandidatesMax).map((c) => c.diseaseId);
}

export interface QuestionsSync {
  phase: QuestionsPhase;
  error: ApiRequestError | null;
  retry(): void;
}

export function useQuestionsSync(): QuestionsSync {
  const { caseObject, meta } = useCase();
  const { setQuestions } = useCaseActions();
  const online = useOnlineStatus();
  const ranking = caseObject.lastRanking;
  const stale = isRankingStale(caseObject);

  const ids = ranking ? topCandidateIds(ranking) : [];
  const enough = ids.length >= LIMITS.questionsCandidatesMin;
  const key = ranking && enough && !stale ? questionsKey(ranking) : null;

  const [state, setState] = useState<{ key: string | null; loading: boolean; error: ApiRequestError | null }>({
    key: null,
    loading: false,
    error: null,
  });
  const [nonce, setNonce] = useState(0);
  const rankingRef = useRef(ranking);
  rankingRef.current = ranking;

  const failedHere = state.error !== null && state.key === key;

  useEffect(() => {
    const current = rankingRef.current;
    if (!key || !current || key === syncedKey || failedHere || !online) return;
    const controller = new AbortController();
    setState({ key, loading: true, error: null });
    nextQuestions(
      {
        observed: current.request.observed,
        excluded: current.request.excluded,
        candidates: topCandidateIds(current),
        limit: LIMITS.questionsDefaultLimit,
      },
      { signal: controller.signal },
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        syncedKey = key;
        setQuestions(result.data.questions, {
          origin: result.origin,
          source: result.data.source,
          dataVersions: result.data.dataVersions,
        });
        setState({ key, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || controller.signal.aborted) return;
        setState({ key, loading: false, error: toApiRequestError(error, 'nextQuestions') });
      });
    return () => controller.abort();
  }, [key, failedHere, online, nonce, setQuestions]);

  // A ranking with fewer than 2 candidates has nothing to tell apart: clear old questions.
  const hasQuestions = caseObject.questions.length > 0;
  useEffect(() => {
    if (!ranking || stale || enough || !hasQuestions) return;
    syncedKey = null;
    setQuestions([], {
      origin: meta.rankingOrigin ?? 'api',
      source: ranking.response.source,
      dataVersions: ranking.response.dataVersions,
    });
  }, [ranking, stale, enough, hasQuestions, meta.rankingOrigin, setQuestions]);

  const retry = useCallback(() => {
    setState({ key: null, loading: false, error: null });
    setNonce((n) => n + 1);
  }, []);

  let phase: QuestionsPhase;
  if (ranking && !stale && !enough) phase = 'too-few';
  else if (!key || (!online && key !== syncedKey)) phase = 'waiting';
  else if (failedHere) phase = 'error';
  else if (key === syncedKey && !(state.loading && state.key === key)) phase = 'ready';
  else phase = 'loading';

  return { phase, error: phase === 'error' ? state.error : null, retry };
}
