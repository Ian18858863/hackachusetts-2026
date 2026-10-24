/**
 * What to check next (spec task 3.5; Requirements 5.1–5.5).
 *
 * Questions come from POST /api/next-questions for the top candidates of the
 * current ranking (useQuestionsSync). The feature, its "why" line and the
 * per-candidate frequencies are shown as the API returns them; nothing is
 * reworded into new facts. A Yes or No answer adds the feature as present or
 * not present (provenance manual) and the ranking updates after a short pause
 * (useAutoRank), then the questions refresh.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { LIMITS, type Candidate, type DiseaseId, type HpoId, type Question, type TermStatus } from '../../shared/contract';
import { useT } from '../../shared/i18n';
import questionsMessages from '../../shared/i18n/messages/questions';
import rankingMessages from '../../shared/i18n/messages/ranking';
import { useCase, useCaseActions } from '../../shared/store';
import {
  ApiErrorState,
  Button,
  EmptyState,
  Icon,
  LoadingPanel,
  Skeleton,
  SkeletonText,
  Spinner,
  useAnnounce,
} from '../../shared/ui';
import { FrequencyMark } from '../ranking/FrequencyMark';
import { pick } from '../ranking/format';
import { useAutoRank } from '../ranking/useAutoRank';
import styles from './questions.module.css';
import { topCandidateIds, useQuestionsSync } from './useQuestionsSync';

type Answer = { status: 'observed' | 'excluded'; previous: TermStatus | null };

export function QuestionsStep() {
  return (
    <div data-testid="questions">
      <QuestionsBody />
    </div>
  );
}

function QuestionsBody() {
  const t = useT(questionsMessages);
  const { caseObject } = useCase();
  const { goToStep, addManualTerm, setTermStatus } = useCaseActions();
  const announce = useAnnounce();
  const auto = useAutoRank();
  const sync = useQuestionsSync();
  const [answers, setAnswers] = useState<Record<HpoId, Answer>>({});
  // After an answer the ranking and then the questions refresh, and the answered
  // question usually leaves the list. If focus went with it, put it on the list,
  // or, when no question remains, on the heading of the state shown instead.
  // While a loading panel is shown, wait for the next phase.
  const listRef = useRef<HTMLOListElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);
  const lastAnswered = useRef<HpoId | null>(null);
  const questionIds = caseObject.questions.map((q) => q.hpoId).join(',');
  useEffect(() => {
    const id = lastAnswered.current;
    if (!id || questionIds.split(',').includes(id)) return;
    const active = document.activeElement;
    if (active && active !== document.body) {
      lastAnswered.current = null;
      return;
    }
    if (listRef.current) {
      lastAnswered.current = null;
      listRef.current.focus();
      return;
    }
    const heading = stateRef.current?.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6');
    if (heading) {
      lastAnswered.current = null;
      heading.tabIndex = -1;
      heading.focus();
    }
  }, [questionIds, sync.phase, auto.phase]);

  const ranking = caseObject.lastRanking;
  const candidates = useMemo(() => {
    const map = new Map<DiseaseId, Candidate>();
    for (const c of ranking?.response.candidates ?? []) map.set(c.diseaseId, c);
    return map;
  }, [ranking]);
  const statusOf = useMemo(() => {
    const map = new Map<HpoId, TermStatus>();
    for (const t of caseObject.terms) map.set(t.hpoId, t.status);
    return map;
  }, [caseObject.terms]);

  const answer = (q: Question, status: 'observed' | 'excluded') => {
    lastAnswered.current = q.hpoId;
    setAnswers((a) => ({ ...a, [q.hpoId]: { status, previous: statusOf.get(q.hpoId) ?? null } }));
    addManualTerm({ id: q.hpoId, label: q.label }, status);
    announce(
      t('recorded', { label: q.label, status: t(status === 'observed' ? 'statusPresent' : 'statusNotPresent') }),
    );
  };

  const undo = (q: Question) => {
    const previous = answers[q.hpoId]?.previous ?? null;
    setTermStatus(q.hpoId, previous ?? 'removed');
    setAnswers((a) => {
      const next = { ...a };
      delete next[q.hpoId];
      return next;
    });
    announce(t('undone', { label: q.label }));
  };

  // ---- States before there is anything to ask -----------------------------

  if (!auto.canRank) {
    return (
      <EmptyState
        icon="question"
        title={t('emptyTitle')}
        description={t('emptyDesc')}
        action={
          <Button onClick={() => goToStep('features')} iconEnd={<Icon name="arrowRight" size={18} />}>
            {t('reviewFeatures')}
          </Button>
        }
      />
    );
  }

  if (!ranking) {
    if (auto.phase === 'error' && auto.error) {
      return <ApiErrorState error={auto.error} onRetry={auto.rankNow} />;
    }
    return (
      <LoadingPanel
        step={t(pick(auto.request.observed.length, 'rankingFirstOne', 'rankingFirstOther'), {
          n: auto.request.observed.length,
        })}
      >
        <QuestionsSkeleton />
      </LoadingPanel>
    );
  }

  if (sync.phase === 'too-few') {
    return (
      <div ref={stateRef}>
        <EmptyState
          icon="compare"
          title={t('tooFewTitle')}
          description={t('tooFewDesc')}
          action={
            <Button variant="secondary" onClick={() => goToStep('matches')}>
              {t('seeMatches')}
            </Button>
          }
        />
      </div>
    );
  }

  const questions = caseObject.questions;
  const top = topCandidateIds(ranking)
    .map((id) => candidates.get(id))
    .filter((c): c is Candidate => Boolean(c));

  if (questions.length === 0) {
    if (sync.phase === 'error' && sync.error) {
      return (
        <div ref={stateRef}>
          <ApiErrorState error={sync.error} onRetry={sync.retry} />
        </div>
      );
    }
    if (sync.phase !== 'ready') {
      return (
        <LoadingPanel step={t('finding', { n: top.length })}>
          <QuestionsSkeleton compared={top.length} />
        </LoadingPanel>
      );
    }
    return (
      <div ref={stateRef}>
        <EmptyState
          icon="question"
          title={t('noneTitle')}
          description={t('noneDesc')}
          action={
            <Button variant="secondary" onClick={() => goToStep('matches')}>
              {t('seeMatches')}
            </Button>
          }
        />
      </div>
    );
  }

  // ---- Questions ----------------------------------------------------------

  const refreshing =
    auto.phase === 'loading' || auto.phase === 'scheduled' || sync.phase === 'loading' || sync.phase === 'waiting';

  return (
    <div className={styles.page}>
      <div className={styles.status} data-busy={refreshing || undefined}>
        {auto.phase === 'loading' || auto.phase === 'scheduled' ? (
          <span className={styles.statusText}>
            <Spinner size={14} />
            {t('updatingRanking')}
          </span>
        ) : auto.phase === 'error' ? (
          <span className={styles.statusText}>
            <Icon name="alert" size={16} />
            {t('rankFailed')}
            <Button variant="ghost" size="sm" onClick={auto.rankNow}>
              {t('tryAgain')}
            </Button>
          </span>
        ) : sync.phase === 'loading' ? (
          <span className={styles.statusText}>
            <Spinner size={14} />
            {t('findingNew')}
          </span>
        ) : sync.phase === 'error' ? (
          <span className={styles.statusText}>
            <Icon name="alert" size={16} />
            {t('newFailed')}
            <Button variant="ghost" size="sm" onClick={sync.retry}>
              {t('tryAgain')}
            </Button>
          </span>
        ) : (
          <span className={styles.statusText}>
            <Icon name="check" size={16} />
            {t(pick(top.length, 'comparingOne', 'comparingOther'), { n: top.length })}
          </span>
        )}
      </div>

      <ol
        ref={listRef}
        className={styles.list}
        aria-busy={refreshing || undefined}
        aria-label={t('listLabel')}
        tabIndex={-1}
      >
        {questions.map((q, index) => (
          <QuestionItem
            key={q.hpoId}
            question={q}
            index={index}
            candidates={candidates}
            status={statusOf.get(q.hpoId) ?? null}
            canUndo={Boolean(answers[q.hpoId])}
            onAnswer={(s) => answer(q, s)}
            onUndo={() => undo(q)}
          />
        ))}
      </ol>

    </div>
  );
}

// ---------------------------------------------------------------------------

function QuestionItem({
  question: q,
  index,
  candidates,
  status,
  canUndo,
  onAnswer,
  onUndo,
}: {
  question: Question;
  index: number;
  candidates: Map<DiseaseId, Candidate>;
  status: TermStatus | null;
  canUndo: boolean;
  onAnswer(status: 'observed' | 'excluded'): void;
  onUndo(): void;
}) {
  const t = useT(questionsMessages);
  const tr = useT(rankingMessages);
  const titleId = `question-${q.hpoId.replace(':', '-')}`;
  const answered = status === 'observed' || status === 'excluded';
  // The answer buttons are replaced on click, so move focus to what replaces them
  // (Undo, else the question item; Yes after an undo). The live region announces.
  const itemRef = useRef<HTMLLIElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const yesRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<'undo' | 'yes' | null>(null);
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    if (target === 'undo' && answered) {
      pendingFocus.current = null;
      (undoRef.current ?? itemRef.current)?.focus();
    } else if (target === 'yes' && !answered) {
      pendingFocus.current = null;
      (yesRef.current ?? itemRef.current)?.focus();
    }
  }, [answered, canUndo]);
  const answerWith = (s: 'observed' | 'excluded') => {
    pendingFocus.current = 'undo';
    onAnswer(s);
  };
  const undo = () => {
    pendingFocus.current = 'yes';
    onUndo();
  };

  return (
    <li
      ref={itemRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      className={styles.item}
      data-answered={answered || undefined}
      data-testid={`question-${q.hpoId}`}
    >
      <span className={styles.number} aria-hidden="true">
        {index + 1}
      </span>
      <div className={styles.main}>
        <h2 id={titleId} className={styles.question}>
          {q.question}
        </h2>
        <p className={styles.term}>
          {t('hpoTerm', { label: q.label })}
          <span className="code">{q.hpoId}</span>
        </p>
        <p className={styles.why}>
          <span className={styles.whyLabel}>{t('why')}</span>
          {q.why}
        </p>

        <div className={styles.answers} role="group" aria-label={t('answerLabel', { question: q.question })}>
          {answered ? (
            <>
              <span className={styles.recorded}>
                <Icon name="check" size={16} />
                {status === 'observed' ? t('recordedPresent') : t('recordedNotPresent')}
              </span>
              {canUndo && (
                <Button ref={undoRef} variant="ghost" size="sm" onClick={undo}>
                  {t('undo')}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                ref={yesRef}
                variant="secondary"
                onClick={() => answerWith('observed')}
                data-testid={`answer-yes-${q.hpoId}`}
              >
                {t('yes')}
              </Button>
              <Button variant="secondary" onClick={() => answerWith('excluded')} data-testid={`answer-no-${q.hpoId}`}>
                {t('no')}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className={styles.compare}>
        <h3 className={styles.compareTitle}>{t('howCommon')}</h3>
        <ul className={styles.compareList}>
          {q.discriminates.map((d) => {
            const c = candidates.get(d.diseaseId);
            return (
              <li key={d.diseaseId} className={styles.compareRow}>
                <span className={styles.compareName}>
                  {c && (
                    <span className={styles.comparedRank} data-first={c.rank === 1 || undefined}>
                      {c.rank}
                    </span>
                  )}
                  {c?.name ?? d.diseaseId}
                </span>
                <FrequencyMark
                  frequency={d.frequency}
                  noneWord={tr('notListedForCondition')}
                  tone={c?.rank === 1 ? 'accent' : 'neutral'}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}

/**
 * Stands in for the question list at about its final size (T38): one row per
 * question the API returns by default, and in each row one name-and-frequency
 * pair per compared candidate, so the page does not grow when the list arrives.
 */
function QuestionsSkeleton({ compared = LIMITS.questionsCandidatesMax }: { compared?: number }) {
  return (
    <div className={styles.skeleton} data-testid="questions-skeleton">
      {Array.from({ length: LIMITS.questionsDefaultLimit }, (_, i) => (
        <div key={i} className={styles.skeletonItem}>
          <span className={styles.skeletonMain}>
            <Skeleton width="80%" height="1.4em" />
            <Skeleton width="40%" height="0.9em" />
            <SkeletonText lines={2} />
            <Skeleton width="var(--space-32)" height="var(--control-height-md)" radius="md" />
          </span>
          <span className={styles.skeletonCompare}>
            {Array.from({ length: Math.max(compared, LIMITS.questionsCandidatesMin) }, (_, j) => (
              <SkeletonText key={j} lines={2} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
