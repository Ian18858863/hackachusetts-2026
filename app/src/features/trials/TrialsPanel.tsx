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
import { fillTemplate } from '../../components/ui/fillTemplate';
import { useLocale, useT } from '../../shared/i18n';
import trialsMessages from '../../shared/i18n/messages/trials';
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
  const t = useT(trialsMessages);

  const choices = (caseObject.lastRanking?.response.candidates ?? []).filter(isRealCondition).slice(0, MAX_CHOICES);
  const candidate = choices.find((c) => c.diseaseId === caseObject.selectedCandidateId) ?? choices[0] ?? null;

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2 id={headingId} className={styles.title}>
            {t('heading')}
          </h2>
          <p className={styles.lede}>
            {candidate
              ? t('ledeWithCandidate')
              : t('ledeNoCandidate')}
          </p>
          <p className={styles.notRecommendation}>{t('notRecommendation')}</p>
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
          title={t('beforeMatchTitle')}
          description={t('beforeMatchDescription')}
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
  const t = useT(trialsMessages);
  return (
    <fieldset className={styles.chooser}>
      <legend className={styles.chooserLegend}>{t('chooserLegend')}</legend>
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
  const t = useT(trialsMessages);
  const { locale } = useLocale();

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
            ? t('announceNone', { name: candidate.name })
            : t(n === 1 ? 'announceOne' : 'announceMany', { count: n, name: candidate.name }),
        );
      },
      (error: unknown) => {
        if (isAbortError(error) || controller.signal.aborted) return;
        setState({ status: 'error', error: toApiRequestError(error, 'trials') });
      },
    );
    return () => controller.abort();
    // The candidate object is replaced on every re-rank; only what is sent matters.
    // `t` is left out on purpose: switching language must not search again.
  }, [candidate.diseaseId, candidate.mondoId, candidate.name, attempt, announce]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (state.status === 'loading') {
    return (
      <LoadingPanel step={t('loading', { name: candidate.name })}>
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
            <>{t('noneListed', { name: candidate.name })}</>
          ) : (
            <>
              {fillTemplate(t(total === 1 ? 'countOne' : 'countMany', { name: candidate.name }), {
                shown: <span className={styles.countNumber}>{studies.length}</span>,
                total: <span className={styles.countNumber}>{total}</span>,
              })}
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
          title={t('noneTitle')}
          description={
            <>
              {t('noneLead')}
              {canChooseOther && t('noneOther')}
              {fillTemplate(t('noneSearch'), {
                link: (
                  <a href={searchUrl} target="_blank" rel="noopener noreferrer">
                    {t('noneSearchLink', { name: candidate.name })}
                    <span className="sr-only">{t('opensNewTab')}</span>
                  </a>
                ),
              })}
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
            {total > studies.length ? t('seeAll') : t('searchMore')}
            <Icon name="external" size={14} />
            <span className="sr-only">{t('opensNewTab')}</span>
          </a>
          <span className={styles.fetched}>{t('checked', { date: formatDate(data.fetchedAt, locale) })}</span>
        </p>
      )}
    </div>
  );
}

function StudyRow({ study }: { study: Trial }) {
  const t = useT(trialsMessages);
  return (
    <li className={styles.study} data-testid={`trial-${study.nctId}`}>
      <h3 className={styles.studyTitle}>
        <a href={study.url} target="_blank" rel="noopener noreferrer" className={styles.studyLink}>
          {study.title}
          <Icon name="external" size={14} className={styles.externalIcon} />
          <span className="sr-only">{t('opensCtgov')}</span>
        </a>
      </h3>
      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>{t('status')}</dt>
          <dd className={styles.status}>
            <Icon name="check" size={14} />
            Recruiting
          </dd>
        </div>
        <div className={styles.fact}>
          <dt>{t('phase')}</dt>
          <dd>{formatPhases(study.phases, t)}</dd>
        </div>
        <div className={styles.fact}>
          <dt>{t('countries')}</dt>
          <dd>{shortList(study.countries, 4, t)}</dd>
        </div>
        <div className={`${styles.fact} ${styles.factWide}`}>
          <dt>{t('conditions')}</dt>
          <dd>{shortList(study.conditions, 3, t)}</dd>
        </div>
        <div className={styles.fact}>
          <dt>{t('studyId')}</dt>
          <dd className={styles.code}>{study.nctId}</dd>
        </div>
      </dl>
    </li>
  );
}
