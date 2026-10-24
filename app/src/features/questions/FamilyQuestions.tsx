/**
 * "Questions to ask your doctor" in family mode (T30a).
 *
 * Same data as "What to check next" (POST /api/next-questions for the top
 * candidates of a background ranking), but only the question sentence and one
 * neutral reason are shown. The server's "why" line, the per-candidate
 * frequencies, candidate names, ranks and counts are never rendered or
 * announced: family mode never names a disease. Yes or No still adds the
 * feature as present or not present (provenance manual) and the questions
 * refresh after the quiet re-rank.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { LIMITS, type HpoId, type Question, type TermStatus } from '../../shared/contract';
import { useT } from '../../shared/i18n';
import audienceMessages from '../../shared/i18n/messages/audience';
import questionsMessages from '../../shared/i18n/messages/questions';
import { useCase, useCaseActions } from '../../shared/store';
import {
  ApiErrorState,
  Button,
  EmptyState,
  Icon,
  LoadingPanel,
  Skeleton,
  Spinner,
  useAnnounce,
} from '../../shared/ui';
import family from './FamilyQuestions.module.css';
import styles from './questions.module.css';
import { useQuestionsSync } from './useQuestionsSync';
import { useQuietRank } from './useQuietRank';

type Answer = { previous: TermStatus | null };

export function FamilyQuestions() {
  return (
    <div data-testid="family-questions">
      <FamilyQuestionsBody />
    </div>
  );
}

function FamilyQuestionsBody() {
  const t = useT(audienceMessages);
  const tq = useT(questionsMessages);
  const { caseObject } = useCase();
  const { goToStep, addManualTerm, setTermStatus } = useCaseActions();
  const announce = useAnnounce();
  const rank = useQuietRank();
  const sync = useQuestionsSync();
  const [answers, setAnswers] = useState<Record<HpoId, Answer>>({});
  const listRef = useRef<HTMLOListElement>(null);
  const lastAnswered = useRef<HpoId | null>(null);

  const statusOf = useMemo(() => {
    const map = new Map<HpoId, TermStatus>();
    for (const term of caseObject.terms) map.set(term.hpoId, term.status);
    return map;
  }, [caseObject.terms]);

  // An answered question leaves the list after the refresh; keep focus on the list.
  const questionIds = caseObject.questions.map((q) => q.hpoId).join(',');
  useEffect(() => {
    const id = lastAnswered.current;
    if (!id || questionIds.split(',').includes(id)) return;
    const active = document.activeElement;
    lastAnswered.current = null;
    if (active && active !== document.body) return;
    listRef.current?.focus();
  }, [questionIds]);

  const answer = (q: Question, status: 'observed' | 'excluded') => {
    lastAnswered.current = q.hpoId;
    setAnswers((a) => ({ ...a, [q.hpoId]: { previous: statusOf.get(q.hpoId) ?? null } }));
    addManualTerm({ id: q.hpoId, label: q.label }, status);
    announce(t('recorded', { label: q.label, status: t(status === 'observed' ? 'statusPresent' : 'statusNotPresent') }));
  };

  const undo = (q: Question) => {
    setTermStatus(q.hpoId, answers[q.hpoId]?.previous ?? 'removed');
    setAnswers((a) => {
      const next = { ...a };
      delete next[q.hpoId];
      return next;
    });
    announce(tq('undone', { label: q.label }));
  };

  if (!rank.canRank) {
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

  const questions = caseObject.questions;
  const ranking = caseObject.lastRanking;

  if (questions.length === 0) {
    if (!ranking && rank.phase === 'error' && rank.error) {
      return <ApiErrorState error={rank.error} onRetry={rank.rankNow} />;
    }
    if (sync.phase === 'error' && sync.error) {
      return <ApiErrorState error={sync.error} onRetry={sync.retry} />;
    }
    if (!ranking || sync.phase === 'loading' || sync.phase === 'waiting') {
      return (
        <LoadingPanel step={t('preparing')}>
          <FamilySkeleton />
        </LoadingPanel>
      );
    }
    // 'too-few' or 'ready' with nothing to ask: one neutral state, no counts.
    return (
      <EmptyState
        icon="question"
        title={t('noneTitle')}
        description={t('noneDesc')}
        action={
          <Button variant="secondary" onClick={() => goToStep('brief')}>
            {t('openBrief')}
          </Button>
        }
      />
    );
  }

  const refreshing = rank.phase === 'loading' || rank.phase === 'scheduled' || sync.phase === 'loading';

  return (
    <div className={styles.page}>
      <div className={styles.status} data-busy={refreshing || undefined}>
        {refreshing ? (
          <span className={styles.statusText}>
            <Spinner size={14} />
            {t('updating')}
          </span>
        ) : rank.phase === 'error' || sync.phase === 'error' ? (
          <span className={styles.statusText}>
            <Icon name="alert" size={16} />
            {t('loadFailed')}
            <Button variant="ghost" size="sm" onClick={rank.phase === 'error' ? rank.rankNow : sync.retry}>
              {t('tryAgain')}
            </Button>
          </span>
        ) : (
          <span className={styles.statusText}>
            <Icon name="check" size={16} />
            {t('ready')}
          </span>
        )}
      </div>

      <ol
        ref={listRef}
        className={`${styles.list} ${family.list}`}
        aria-busy={refreshing || undefined}
        aria-label={t('listLabel')}
        tabIndex={-1}
      >
        {questions.map((q, index) => (
          <FamilyQuestionItem
            key={q.hpoId}
            question={q}
            index={index}
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

function FamilyQuestionItem({
  question: q,
  index,
  status,
  canUndo,
  onAnswer,
  onUndo,
}: {
  question: Question;
  index: number;
  status: TermStatus | null;
  canUndo: boolean;
  onAnswer(status: 'observed' | 'excluded'): void;
  onUndo(): void;
}) {
  const tq = useT(questionsMessages);
  const titleId = `family-question-${q.hpoId.replace(':', '-')}`;
  const answered = status === 'observed' || status === 'excluded';
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

  return (
    <li
      ref={itemRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      className={styles.item}
      data-answered={answered || undefined}
      data-testid={`family-question-${q.hpoId}`}
    >
      <span className={styles.number} aria-hidden="true">
        {index + 1}
      </span>
      <div className={styles.main}>
        <h2 id={titleId} className={styles.question}>
          {q.question}
        </h2>
        <div className={styles.answers} role="group" aria-label={tq('answerLabel', { question: q.question })}>
          {answered ? (
            <>
              <span className={styles.recorded}>
                <Icon name="check" size={16} />
                {status === 'observed' ? tq('recordedPresent') : tq('recordedNotPresent')}
              </span>
              {canUndo && (
                <Button
                  ref={undoRef}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    pendingFocus.current = 'yes';
                    onUndo();
                  }}
                >
                  {tq('undo')}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                ref={yesRef}
                variant="secondary"
                onClick={() => {
                  pendingFocus.current = 'undo';
                  onAnswer('observed');
                }}
                data-testid={`answer-yes-${q.hpoId}`}
              >
                {tq('yes')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  pendingFocus.current = 'undo';
                  onAnswer('excluded');
                }}
                data-testid={`answer-no-${q.hpoId}`}
              >
                {tq('no')}
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

/** One row per question the API returns by default, so the list does not grow when it arrives (T38). */
function FamilySkeleton() {
  return (
    <div className={styles.skeleton} data-testid="family-questions-skeleton">
      {Array.from({ length: LIMITS.questionsDefaultLimit }, (_, i) => (
        <div key={i} className={`${styles.skeletonItem} ${family.skeletonItem}`}>
          <span className={styles.skeletonMain}>
            <Skeleton width="80%" height="1.4em" />
            <Skeleton width="55%" height="1.4em" />
            <Skeleton width="var(--space-32)" height="var(--control-height-md)" radius="md" />
          </span>
        </div>
      ))}
    </div>
  );
}
