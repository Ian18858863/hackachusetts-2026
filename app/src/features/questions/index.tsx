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
import { useMemo, useState } from 'react';
import type { Candidate, DiseaseId, HpoId, Question, TermStatus } from '../../shared/contract';
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
import { NOT_LISTED_FOR_CONDITION, plural } from '../ranking/format';
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
  const { caseObject } = useCase();
  const { goToStep, addManualTerm, setTermStatus } = useCaseActions();
  const announce = useAnnounce();
  const auto = useAutoRank();
  const sync = useQuestionsSync();
  const [answers, setAnswers] = useState<Record<HpoId, Answer>>({});

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
    setAnswers((a) => ({ ...a, [q.hpoId]: { status, previous: statusOf.get(q.hpoId) ?? null } }));
    addManualTerm({ id: q.hpoId, label: q.label }, status);
    announce(
      `Recorded ${q.label} as ${status === 'observed' ? 'present' : 'not present'}. The ranking will update in a moment.`,
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
    announce(`Answer for ${q.label} undone.`);
  };

  // ---- States before there is anything to ask -----------------------------

  if (!auto.canRank) {
    return (
      <EmptyState
        icon="question"
        title="No features to compare yet"
        description="Questions appear once at least one feature is kept as present and the possible matches are ranked."
        action={
          <Button onClick={() => goToStep('features')} iconEnd={<Icon name="arrowRight" size={18} />}>
            Review the features
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
      <LoadingPanel step={`Ranking ${plural(auto.request.observed.length, 'present feature')} first`}>
        <QuestionsSkeleton />
      </LoadingPanel>
    );
  }

  if (sync.phase === 'too-few') {
    return (
      <EmptyState
        icon="compare"
        title="Not enough possible matches to compare"
        description="Questions need at least two possible matches to tell apart. Adding more features from the notes may help."
        action={
          <Button variant="secondary" onClick={() => goToStep('matches')}>
            See the possible matches
          </Button>
        }
      />
    );
  }

  const questions = caseObject.questions;
  const top = topCandidateIds(ranking)
    .map((id) => candidates.get(id))
    .filter((c): c is Candidate => Boolean(c));

  if (questions.length === 0) {
    if (sync.phase === 'error' && sync.error) return <ApiErrorState error={sync.error} onRetry={sync.retry} />;
    if (sync.phase !== 'ready') {
      return (
        <LoadingPanel step={`Finding the features that best tell the top ${top.length} possible matches apart`}>
          <QuestionsSkeleton />
        </LoadingPanel>
      );
    }
    return (
      <EmptyState
        icon="question"
        title="No clear question to ask"
        description="The top possible matches list similar features in HPO annotations, so no single feature tells them apart well. They are still worth discussing with a doctor."
        action={
          <Button variant="secondary" onClick={() => goToStep('matches')}>
            See the possible matches
          </Button>
        }
      />
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
            Updating the ranking with your answers
          </span>
        ) : auto.phase === 'error' ? (
          <span className={styles.statusText}>
            <Icon name="alert" size={16} />
            The ranking could not update. These questions are for the earlier features
            <Button variant="ghost" size="sm" onClick={auto.rankNow}>
              Try again
            </Button>
          </span>
        ) : sync.phase === 'loading' ? (
          <span className={styles.statusText}>
            <Spinner size={14} />
            Finding new questions for the updated ranking
          </span>
        ) : sync.phase === 'error' ? (
          <span className={styles.statusText}>
            <Icon name="alert" size={16} />
            New questions could not be loaded
            <Button variant="ghost" size="sm" onClick={sync.retry}>
              Try again
            </Button>
          </span>
        ) : (
          <span className={styles.statusText}>
            <Icon name="check" size={16} />
            Comparing the top {plural(top.length, 'possible match', 'possible matches')}
          </span>
        )}
      </div>

      <ol className={styles.list} aria-busy={refreshing || undefined}>
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

      <p className={styles.footnote}>
        Each question names a feature from HPO disease annotations. “Not listed for this condition” means the
        annotations do not list the feature for that condition, not that it never occurs there. “Frequency not
        listed” means the feature is listed without a frequency.
      </p>
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
  const titleId = `question-${q.hpoId.replace(':', '-')}`;
  const answered = status === 'observed' || status === 'excluded';

  return (
    <li className={styles.item} data-answered={answered || undefined} data-testid={`question-${q.hpoId}`}>
      <span className={styles.number} aria-hidden="true">
        {index + 1}
      </span>
      <div className={styles.main}>
        <h2 id={titleId} className={styles.question}>
          {q.question}
        </h2>
        <p className={styles.term}>
          HPO term: {q.label} <span className="code">{q.hpoId}</span>
        </p>
        <p className={styles.why}>
          <span className={styles.whyLabel}>Why this question</span>
          {q.why}
        </p>

        <div className={styles.answers} role="group" aria-label={`Answer: ${q.question}`}>
          {answered ? (
            <>
              <span className={styles.recorded}>
                <Icon name="check" size={16} />
                {status === 'observed' ? 'Recorded as present' : 'Recorded as not present'}
              </span>
              {canUndo && (
                <Button variant="ghost" size="sm" onClick={onUndo}>
                  Undo
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => onAnswer('observed')} data-testid={`answer-yes-${q.hpoId}`}>
                Yes
              </Button>
              <Button variant="secondary" onClick={() => onAnswer('excluded')} data-testid={`answer-no-${q.hpoId}`}>
                No
              </Button>
              <span className={styles.answerHint}>Yes adds it as present, No as not present</span>
            </>
          )}
        </div>
      </div>

      <div className={styles.compare}>
        <h3 className={styles.compareTitle}>How common in each possible match</h3>
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
                  noneWord={NOT_LISTED_FOR_CONDITION}
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

function QuestionsSkeleton() {
  return (
    <div className={styles.skeleton}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.skeletonItem}>
          <span className={styles.skeletonMain}>
            <Skeleton width="80%" height="1.4em" />
            <Skeleton width="40%" height="0.9em" />
            <SkeletonText lines={2} />
            <Skeleton width="var(--space-32)" height="var(--control-height-md)" radius="md" />
          </span>
          <SkeletonText lines={4} />
        </div>
      ))}
    </div>
  );
}
