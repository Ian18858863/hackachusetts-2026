/**
 * Notes intake (spec task 3.2; requirements 1.1–1.5, 10.2, 10.6, 12.1).
 *
 * One calm column: the promise, a large notes field with the 8,000-character
 * limit, the primary action that reads the notes, and the demo patients.
 * The shell already renders the step's <h1>, lede and the demo case label.
 */
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { ApiRequestError } from '../../shared/api';
import { LIMITS } from '../../shared/contract';
import { findDemoCase } from '../../shared/mocks';
import { useCase, useCaseActions } from '../../shared/store';
import { Button, Icon, useOnlineStatus } from '../../shared/ui';
import { DemoPicker } from './DemoPicker';
import { intakeErrorCopy, type IntakeNextAction } from './errorCopy';
import styles from './IntakeStep.module.css';

const MAX = LIMITS.notesMaxChars;
const formatCount = (n: number) => n.toLocaleString('en-US');

/*
 * Text over the limit cannot go into the case (the store keeps at most
 * 8,000 characters), but it must not be lost (Requirement 1.2, contract
 * section 4). It is kept as a draft in sessionStorage for this tab, tied to
 * the case id, so leaving the step or reloading brings it back.
 */
const DRAFT_KEY = 'rdd.intake.overLimitDraft.v0.1';

function readDraft(caseId: string): string | null {
  try {
    const stored = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null') as { caseId?: unknown; text?: unknown } | null;
    return stored && stored.caseId === caseId && typeof stored.text === 'string' && stored.text.length > MAX
      ? stored.text
      : null;
  } catch {
    return null;
  }
}

function writeDraft(caseId: string, text: string | null) {
  try {
    if (text === null) sessionStorage.removeItem(DRAFT_KEY);
    else sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ caseId, text }));
  } catch {
    // Storage blocked: the draft lasts while this step is open.
  }
}

function scrollBehavior(): ScrollBehavior {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  } catch {
    return 'auto';
  }
}

type Phase = 'idle' | 'running' | 'settled';
type Problem = { kind: 'empty' } | { kind: 'tooLong' } | { kind: 'api'; error: ApiRequestError };

export function IntakeStep() {
  const { caseObject, extractStatus } = useCase();
  const { setNotes, runExtraction, loadDemoCase, goToStep } = useCaseActions();
  const online = useOnlineStatus();

  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const countId = `${fieldId}-count`;
  const problemId = `${fieldId}-problem`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerHeadingRef = useRef<HTMLHeadingElement>(null);

  // Text over the limit is kept here (and in the draft), never cut, so the
  // user can shorten it themselves (Requirement 1.2).
  const caseId = caseObject.caseId;
  const [overflow, setOverflowState] = useState<string | null>(() => readDraft(caseId));
  const setOverflow = (value: string | null) => {
    setOverflowState(value);
    writeDraft(caseId, value);
  };
  const [problem, setProblem] = useState<Problem | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  const text = overflow ?? caseObject.notes;
  const remaining = MAX - text.length;
  const isOver = remaining < 0;
  const busy = phase === 'running' || extractStatus.state === 'loading';
  const hasTerms = caseObject.terms.length > 0;
  const hasOwnNotes = caseObject.notes.trim().length > 0 && caseObject.demo === null;

  // After an extraction this step started settles: move on, or show what went wrong.
  useEffect(() => {
    if (phase !== 'settled') return;
    setPhase('idle');
    if (extractStatus.state === 'error') {
      // Spoken once, by the polite region that holds the problem.
      setProblem({ kind: 'api', error: extractStatus.error });
    } else if (extractStatus.state === 'idle') {
      goToStep('features');
    }
  }, [phase, extractStatus, goToStep]);

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    if (value.length > MAX) {
      setOverflow(value);
    } else {
      setOverflow(null);
      setNotes(value);
    }
    if (problem && problem.kind !== 'api') setProblem(null);
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy) return;
    if (text.trim().length === 0) {
      setProblem({ kind: 'empty' });
      textareaRef.current?.focus();
      return;
    }
    if (isOver) {
      setProblem({ kind: 'tooLong' });
      textareaRef.current?.focus();
      return;
    }
    setProblem(null);
    setPhase('running');
    await runExtraction(text);
    setPhase('settled');
  };

  const pickDemo = (caseId: string) => {
    setOverflow(null);
    setProblem(null);
    goToStep('features');
    void loadDemoCase(caseId);
  };

  const runNextAction = (action: IntakeNextAction) => {
    switch (action) {
      case 'retry':
        void submit();
        break;
      case 'demo':
        pickerHeadingRef.current?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
        pickerHeadingRef.current?.focus({ preventScroll: true });
        break;
      case 'manual':
        goToStep('features');
        break;
      case 'shorten':
        textareaRef.current?.focus();
        break;
    }
  };

  const describedBy = [hintId, countId, problem ? problemId : null].filter(Boolean).join(' ');
  const demoTitle = findDemoCase(caseObject.demo?.caseId)?.title;

  return (
    <div className={styles.intake}>
      <p className={styles.promise}>
        Turn scattered notes into a specialist-ready brief: possible conditions to discuss with a doctor, each with
        the evidence behind it.
      </p>

      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.field} data-invalid={problem?.kind === 'empty' || isOver || undefined}>
          <div className={styles.labelRow}>
            <label htmlFor={fieldId} className={styles.label}>
              Symptom history
            </label>
            {demoTitle && <span className={styles.loaded}>Demo patient: {demoTitle.toLowerCase()}</span>}
          </div>
          <p id={hintId} className={styles.hint}>
            Who it is about, their age, and what you have noticed and when. Things that have not happened help too,
            such as “has never had a seizure”.
          </p>
          <textarea
            ref={textareaRef}
            id={fieldId}
            className={styles.textarea}
            value={text}
            onChange={onChange}
            readOnly={busy}
            aria-describedby={describedBy}
            aria-invalid={problem?.kind === 'empty' || isOver || undefined}
            data-testid="notes-input"
            placeholder="For example: Our daughter is 3. She started walking late and falls a lot…"
            spellCheck
            rows={7}
          />
          <div className={styles.fieldFoot}>
            <p className={styles.privacy}>
              <Icon name="info" size={14} />
              <span>Your notes stay in this browser. They are sent only to find the features and are not stored on our server.</span>
            </p>
            <p id={countId} className={styles.count} data-over={isOver || undefined} data-near={remaining < 500 || undefined}>
              {isOver
                ? `${formatCount(-remaining)} characters over the ${formatCount(MAX)} limit`
                : `${formatCount(remaining)} of ${formatCount(MAX)} characters left`}
            </p>
          </div>
        </div>

        <div id={problemId} aria-live="polite" className={styles.problemSlot}>
          {problem && <ProblemView problem={problem} overBy={-remaining} onAction={runNextAction} busy={busy} />}
        </div>

        <div className={styles.actions}>
          <Button
            type="submit"
            data-testid="extract-submit"
            loading={busy}
            disabled={!online}
            iconEnd={busy ? undefined : <Icon name="arrowRight" size={16} />}
          >
            {busy ? 'Reading the notes' : 'Find the features'}
          </Button>
          {hasTerms && !busy && (
            <Button variant="ghost" onClick={() => goToStep('features')}>
              Back to the {caseObject.terms.length} features found
            </Button>
          )}
          <p className={styles.actionNote} aria-live="polite">
            {!online
              ? 'You are offline. Reconnect to read the notes.'
              : busy
                ? 'Matching phrases to medical features. This can take up to 20 seconds.'
                : 'Next you check each feature against the words it came from.'}
          </p>
        </div>
      </form>

      <div className={styles.divider} role="presentation">
        <span>or</span>
      </div>

      <DemoPicker
        hasOwnNotes={hasOwnNotes || overflow !== null}
        disabled={busy || !online}
        disabledReason={!online ? 'You are offline. Demo patients load from the server, so reconnect to open one.' : undefined}
        onPick={pickDemo}
        headingRef={pickerHeadingRef}
      />
    </div>
  );
}

function ProblemView({
  problem,
  overBy,
  onAction,
  busy,
}: {
  problem: Problem;
  overBy: number;
  onAction: (action: IntakeNextAction) => void;
  busy: boolean;
}) {
  if (problem.kind === 'empty') {
    return (
      <p className={styles.inlineProblem}>
        <Icon name="info" size={16} />
        <span>Add a few sentences about what you have noticed first. Everyday words are fine.</span>
      </p>
    );
  }
  if (problem.kind === 'tooLong') {
    return (
      <p className={styles.inlineProblem} data-tone="danger">
        <Icon name="alert" size={16} />
        <span>
          Text is too long. The limit is {formatCount(MAX)} characters
          {overBy > 0 ? `; shorten it by ${formatCount(overBy)}` : ''}. Your text is kept.
        </span>
      </p>
    );
  }

  const copy = intakeErrorCopy(problem.error);
  const labels: Record<IntakeNextAction, string> = {
    retry: 'Try again',
    demo: 'Choose a demo patient',
    manual: 'Add features by hand',
    shorten: 'Edit the notes',
  };
  return (
    <div className={styles.apiProblem} role="group" aria-label={copy.title}>
      <span className={styles.apiIcon}>
        <Icon name="alert" size={18} />
      </span>
      <div className={styles.apiBody}>
        <p className={styles.apiTitle}>{copy.title}</p>
        <p className={styles.apiText}>{copy.description}</p>
        <div className={styles.apiActions}>
          {copy.actions.map((action, i) => (
            <Button
              key={action}
              size="sm"
              variant={i === 0 ? 'secondary' : 'ghost'}
              loading={action === 'retry' && busy}
              onClick={() => onAction(action)}
              iconStart={action === 'retry' ? <Icon name="refresh" size={14} /> : undefined}
            >
              {labels[action]}
            </Button>
          ))}
        </div>
        <p className={styles.apiCode}>
          {problem.error.status === null ? 'No HTTP response' : `HTTP ${problem.error.status}`} · {problem.error.code}
        </p>
      </div>
    </div>
  );
}
