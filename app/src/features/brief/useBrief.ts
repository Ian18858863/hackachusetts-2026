/**
 * Gets everything the brief needs, in the order the server needs it:
 *
 *   1. a ranking for the current terms (POST /api/rank, only if missing or stale),
 *   2. questions for the current top matches (POST /api/next-questions, only if
 *      missing or out of date; optional, a failure leaves them out),
 *   3. the brief and phenopacket (POST /api/brief with the case object).
 *
 * Steps 1 and 2 write to the case store with the shared actions, so the matches
 * and questions steps show the same results. The brief response stays local:
 * the case object has no field for it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, isAbortError, toApiRequestError, type ApiRequestError, type DataOrigin } from '../../shared/api';
import { LIMITS, type BriefResponse, type CaseObject } from '../../shared/contract';
import { useT } from '../../shared/i18n';
import briefMessages from '../../shared/i18n/messages/brief';
import { currentRankRequest, isRankingStale, useCase, useCaseActions } from '../../shared/store';

export type BriefPhase = 'empty' | 'reading' | 'ranking' | 'questions' | 'building' | 'ready' | 'error';

export interface BriefState {
  phase: BriefPhase;
  /** Real step in progress, for the loading panel (Requirement 11.1). */
  stepLabel: string;
  /** Latest brief; kept on screen while a newer one is being built. */
  result: { data: BriefResponse; origin: DataOrigin } | null;
  /** A newer brief is being prepared for the current case. */
  updating: boolean;
  /**
   * `result` no longer matches the current case (still updating, or the update
   * failed). Print and export must stay disabled so nothing out of date leaves
   * the app (Requirement 6.2).
   */
  stale: boolean;
  error: ApiRequestError | null;
  /** Questions could not be loaded; the brief is built without them. */
  questionsSkipped: boolean;
  retry: () => void;
}

/** Ids of the matches that questions should compare (contract 7.5: 2 to 5). */
function questionCandidates(c: CaseObject): string[] {
  return (c.lastRanking?.response.candidates ?? []).slice(0, LIMITS.questionsCandidatesMax).map((x) => x.diseaseId);
}

/** Questions are out of date if they ask about a term already answered or compare other matches. */
function questionsOutdated(c: CaseObject): boolean {
  if (c.questions.length === 0) return true;
  const answered = new Set(c.terms.filter((t) => t.status !== 'removed').map((t) => t.hpoId));
  if (c.questions.some((q) => answered.has(q.hpoId))) return true;
  // The questions step may compare the top 3 instead of 5; any 2+ of the current top matches is fine.
  const wanted = new Set(questionCandidates(c));
  const asked = new Set(c.questions[0]?.discriminates.map((d) => d.diseaseId) ?? []);
  return asked.size < LIMITS.questionsCandidatesMin || [...asked].some((id) => !wanted.has(id));
}

export function useBrief(): BriefState {
  const { caseObject: c, extractStatus } = useCase();
  const { setRanking, setQuestions } = useCaseActions();
  const t = useT(briefMessages);
  const [attempt, setAttempt] = useState(0);
  /** The failed request, the attempt and the case it failed for: a new attempt or a changed case clears it. */
  const [error, setError] = useState<{ error: ApiRequestError; attempt: number; key: string } | null>(null);
  const [result, setResult] = useState<{ key: string; data: BriefResponse; origin: DataOrigin } | null>(null);
  /** Question keys already tried (true: answered, false: failed), so an empty answer does not loop. */
  const [questionsTried, setQuestionsTried] = useState<Readonly<Record<string, boolean>>>({});

  const request = useMemo(() => currentRankRequest(c), [c]);
  const rankKey = `${request.observed.join(',')}|${request.excluded.join(',')}|${request.limit}`;
  const hasObserved = request.observed.length > 0;
  const needsRank = hasObserved && (!c.lastRanking || isRankingStale(c));

  const candidateIds = questionCandidates(c);
  const questionsKey = `${c.lastRanking?.rankedAt ?? ''}|${candidateIds.join(',')}`;
  const canAskQuestions = candidateIds.length >= LIMITS.questionsCandidatesMin;
  const needsQuestions =
    !needsRank && canAskQuestions && questionsOutdated(c) && !(questionsKey in questionsTried);

  const termsKey = c.terms.map((t) => `${t.hpoId}:${t.status}`).join(',');
  const briefKey = `${c.lastRanking?.rankedAt ?? ''}|${termsKey}|${c.questions.map((q) => q.hpoId).join(',')}`;
  const ready = hasObserved && !needsRank && !needsQuestions;
  const caseKey = `${rankKey}#${briefKey}`;
  const blocked = error !== null && error.attempt === attempt && error.key === caseKey;

  // 1. Ranking
  useEffect(() => {
    if (!needsRank || blocked) return;
    const controller = new AbortController();
    const body = currentRankRequest(c);
    api.rank(body, { signal: controller.signal }).then(
      (res) => {
        if (!controller.signal.aborted) setRanking(body, res.data, res.origin);
      },
      (e: unknown) => {
        if (isAbortError(e) || controller.signal.aborted) return;
        setError({ error: toApiRequestError(e, 'rank'), attempt, key: caseKey });
      },
    );
    return () => controller.abort();
    // rankKey captures the request; `c` itself changes on every edit.
  }, [needsRank, rankKey, caseKey, attempt, blocked, setRanking]);

  // 2. Questions (optional)
  useEffect(() => {
    if (!needsQuestions || blocked) return;
    const controller = new AbortController();
    const key = questionsKey;
    api
      .nextQuestions(
        {
          observed: request.observed,
          excluded: request.excluded,
          candidates: candidateIds,
          limit: LIMITS.questionsDefaultLimit,
        },
        { signal: controller.signal },
      )
      .then(
        (res) => {
          if (controller.signal.aborted) return;
          setQuestionsTried((tried) => ({ ...tried, [key]: true }));
          setQuestions(res.data.questions, {
            origin: res.origin,
            source: res.data.source,
            dataVersions: res.data.dataVersions,
          });
        },
        (e: unknown) => {
          if (isAbortError(e) || controller.signal.aborted) return;
          setQuestionsTried((tried) => ({ ...tried, [key]: false }));
        },
      );
    return () => controller.abort();
    // questionsKey captures the ranking and candidates the request is built from.
  }, [needsQuestions, questionsKey, blocked, setQuestions]);

  // 3. Brief
  useEffect(() => {
    if (!ready || blocked || result?.key === briefKey) return;
    const controller = new AbortController();
    const key = briefKey;
    api.brief(c, { signal: controller.signal }).then(
      (res) => {
        if (!controller.signal.aborted) setResult({ key, data: res.data, origin: res.origin });
      },
      (e: unknown) => {
        if (isAbortError(e) || controller.signal.aborted) return;
        setError({ error: toApiRequestError(e, 'brief'), attempt, key: caseKey });
      },
    );
    return () => controller.abort();
    // briefKey captures every part of the case the brief is built from.
  }, [ready, briefKey, caseKey, blocked, attempt]);

  const retry = useCallback(() => {
    setQuestionsTried({});
    setAttempt((n) => n + 1);
  }, []);

  const observedCount = request.observed.length;
  let phase: BriefPhase;
  let stepLabel = '';
  if (blocked) phase = 'error';
  else if (!hasObserved && extractStatus.state === 'loading') {
    phase = 'reading';
    stepLabel = t('readingNotes');
  } else if (!hasObserved) phase = 'empty';
  else if (needsRank) {
    phase = 'ranking';
    stepLabel = t(observedCount === 1 ? 'matchingOne' : 'matchingMany', { count: observedCount });
  } else if (needsQuestions) {
    phase = 'questions';
    stepLabel = t('choosingQuestions');
  } else if (result?.key !== briefKey) {
    phase = 'building';
    stepLabel = t('buildingBrief');
  } else phase = 'ready';

  const questionsSkipped =
    canAskQuestions && questionsTried[questionsKey] === false;

  return {
    phase,
    stepLabel,
    result: result ? { data: result.data, origin: result.origin } : null,
    updating: result !== null && phase !== 'ready' && phase !== 'error',
    stale: result !== null && phase !== 'ready',
    error: blocked ? error.error : null,
    questionsSkipped,
    retry,
  };
}
