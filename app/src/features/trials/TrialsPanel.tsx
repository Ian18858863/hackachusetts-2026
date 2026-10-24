/**
 * Recruiting studies for one possible match (spec task 3.6, Requirement 7).
 *
 * - Asks GET /api/trials (through shared/api) for the selected candidate, or
 *   the top one. Mock placeholder candidates ("MOCK:" ids) are never searched.
 * - Shows at most 5 RECRUITING studies with title, phase, conditions,
 *   countries and a link to ClinicalTrials.gov (7.1, 7.3); an empty state with
 *   a ClinicalTrials.gov search link (7.2); and the credit line (8.2).
 * - When ClinicalTrials.gov fails, /api/trials answers from the engine demo
 *   cache (source "demo") and the panel labels it; the app keeps no trial data.
 *
 * Rendered by the shell on the matches step and by the brief step. The safety
 * line comes from the step header.
 */
import { useCallback, useEffect, useId, useState } from 'react';
import { api, isAbortError, toApiRequestError, type ApiRequestError, type DataOrigin } from '../../shared/api';
import type { Candidate, Trial, TrialsResponse } from '../../shared/contract';
import { useCase, useCaseActions } from '../../shared/store';
import { ATTRIBUTION } from '../../shared/text';
import {
  ApiErrorState,
  DataOriginLabel,
  EmptyState,
  Icon,
  LoadingPanel,
  Skeleton,
  SkeletonText,
  useAnnounce,
} from '../../shared/ui';
import { formatDate, formatPhases, shortList, trialsSearchUrl } from './format';
import styles from './TrialsPanel.module.css';

/** Candidates offered in the chooser: every real ranked match (the ranking shows at most 5). */
const MAX_CHOICES = 5;
const MAX_STUDIES = 5;

type Loaded = { data: TrialsResponse; origin: DataOrigin };

type State =
  | { status: 'loading' }
  | { status: 'ready'; result: Loaded }
  | { status: 'error'; error: ApiRequestError };

function isRealCondition(c: Candidate): boolean {
  return !c.diseaseId.startsWith('MOCK:') && c.name.trim().length >= 2;
}

async function loadTrials(candidate: Candidate, signal: AbortSignal): Promise<Loaded> {
  const ids = [...new Set([candidate.diseaseId, candidate.mondoId].filter(Boolean))];
  const result = await api.trials({ condition: candidate.name, ids }, { signal });
  return { data: result.data, origin: result.origin };
}

export function TrialsPanel() {
  const { caseObject } = useCase();
  const { selectCandidate } = useCaseActions();
  const headingId = useId();

  const choices = (caseObject.lastRanking?.response.candidates ?? []).filter(isRealCondition).slice(0, MAX_CHOICES);
  const candidate = choices.find((c) => c.diseaseId === caseObject.selectedCandidateId) ?? choices[0] ?? null;

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2 id={headingId} className={styles.title}>
            Recruiting studies
          </h2>
          <p className={styles.lede}>
            {candidate
              ? 'Studies looking for participants now. Ask the doctor whether any could be relevant.'
              : 'Studies looking for participants now, for a possible match.'}
          </p>
        </div>
        {choices.length > 1 && candidate && (
          <CandidateChooser
            choices={choices}
            selectedId={candidate.diseaseId}
            onSelect={(id) => selectCandidate(id)}
          />
        )}
      </header>

      {candidate ? (
        <TrialsForCandidate key={candidate.diseaseId} candidate={candidate} canChooseOther={choices.length > 1} />
      ) : (
        <EmptyState
          compact
          icon="trial"
          titleLevel={3}
          title="Studies appear after matching"
          description="Once there are possible matches, this shows up to five recruiting studies from ClinicalTrials.gov for one of them."
        />
      )}

      <p className={styles.credit}>{ATTRIBUTION.clinicalTrials}</p>
    </section>
  );
}

function CandidateChooser({
  choices,
  selectedId,
  onSelect,
}: {
  choices: Candidate[];
  selectedId: string;
  onSelect: (diseaseId: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className={styles.chooser}>
      <legend className={styles.chooserLegend}>Show studies for</legend>
      <div className={styles.options}>
        {choices.map((c) => (
          <label key={c.diseaseId} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={c.diseaseId}
              checked={c.diseaseId === selectedId}
              onChange={() => onSelect(c.diseaseId)}
              className={styles.radio}
            />
            <span className={styles.optionText}>{c.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TrialsForCandidate({ candidate, canChooseOther }: { candidate: Candidate; canChooseOther: boolean }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const announce = useAnnounce();

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    loadTrials(candidate, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        setState({ status: 'ready', result });
        const n = result.data.studies.length;
        announce(
          n === 0
            ? `No recruiting studies found for ${candidate.name}`
            : `${n} recruiting ${n === 1 ? 'study' : 'studies'} for ${candidate.name}`,
        );
      },
      (error: unknown) => {
        if (isAbortError(error) || controller.signal.aborted) return;
        setState({ status: 'error', error: toApiRequestError(error, 'trials') });
      },
    );
    return () => controller.abort();
    // The candidate object is replaced on every re-rank; only what is sent matters.
  }, [candidate.diseaseId, candidate.mondoId, candidate.name, attempt, announce]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (state.status === 'loading') {
    return (
      <LoadingPanel step={`Looking for recruiting studies on ${candidate.name}`}>
        <ul className={styles.list} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className={`${styles.study} ${styles.studySkeleton}`}>
              <Skeleton height="1.1em" width="78%" />
              <SkeletonText lines={2} />
            </li>
          ))}
        </ul>
      </LoadingPanel>
    );
  }

  if (state.status === 'error') {
    return <ApiErrorState compact titleLevel={3} error={state.error} onRetry={retry} />;
  }

  const { data, origin } = state.result;
  const studies = data.studies.slice(0, MAX_STUDIES);
  // One number for the count and its noun, so "1 of 1 study" never reads "studies".
  const total = Math.max(data.total, studies.length);
  const searchUrl = trialsSearchUrl(candidate.name);
  const label = <DataOriginLabel origin={origin} source={data.source} dataVersions={data.dataVersions} />;

  return (
    <div className={styles.result} data-testid="trials">
      <div className={styles.summary}>
        <p className={styles.count}>
          {studies.length === 0 ? (
            <>No recruiting studies listed for {candidate.name}</>
          ) : (
            <>
              <span className={styles.countNumber}>{studies.length}</span> of{' '}
              <span className={styles.countNumber}>{total}</span> recruiting {total === 1 ? 'study' : 'studies'}{' '}
              for {candidate.name}
            </>
          )}
        </p>
        {label}
      </div>

      {studies.length === 0 ? (
        <EmptyState
          compact
          icon="trial"
          titleLevel={3}
          title="No recruiting studies found"
          description={
            <>
              ClinicalTrials.gov lists no study recruiting now under this name.
              {canChooseOther && ' Another possible match above may have studies.'} Studies may also be listed
              under a related name; you can{' '}
              <a href={searchUrl} target="_blank" rel="noopener noreferrer">
                search ClinicalTrials.gov for {candidate.name}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              .
            </>
          }
        />
      ) : (
        <ol className={styles.list}>
          {studies.map((study) => (
            <StudyRow key={study.nctId} study={study} />
          ))}
        </ol>
      )}

      {studies.length > 0 && (
        <p className={styles.more}>
          <a href={searchUrl} target="_blank" rel="noopener noreferrer" className={styles.moreLink}>
            {total > studies.length ? 'See all recruiting studies' : 'Search'} on ClinicalTrials.gov
            <Icon name="external" size={14} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <span className={styles.fetched}>Checked {formatDate(data.fetchedAt)}</span>
        </p>
      )}
    </div>
  );
}

function StudyRow({ study }: { study: Trial }) {
  return (
    <li className={styles.study} data-testid={`trial-${study.nctId}`}>
      <h3 className={styles.studyTitle}>
        <a href={study.url} target="_blank" rel="noopener noreferrer" className={styles.studyLink}>
          {study.title}
          <Icon name="external" size={14} className={styles.externalIcon} />
          <span className="sr-only"> (opens ClinicalTrials.gov in a new tab)</span>
        </a>
      </h3>
      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>Status</dt>
          <dd className={styles.status}>
            <Icon name="check" size={14} />
            Recruiting
          </dd>
        </div>
        <div className={styles.fact}>
          <dt>Phase</dt>
          <dd>{formatPhases(study.phases)}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Countries</dt>
          <dd>{shortList(study.countries, 4)}</dd>
        </div>
        <div className={`${styles.fact} ${styles.factWide}`}>
          <dt>Conditions</dt>
          <dd>{shortList(study.conditions, 3)}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Study ID</dt>
          <dd className={styles.code}>{study.nctId}</dd>
        </div>
      </dl>
    </li>
  );
}
