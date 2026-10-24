/**
 * Possible matches with evidence (spec task 3.4; Requirements 3, 4, 9.2, 12.4),
 * laid out as in docs/art-direction/final.html: the closest overlap in one
 * rounded panel with its full evidence, candidates 2 to 5 quieter at the side,
 * "Compare side by side" below, then the features used (folded).
 *
 * The ranking follows the feature set by itself (useAutoRank): first ranking at
 * once, later changes after a short pause, previous results kept visible with
 * an "Updating" status line of fixed height. Signature motion: evidence rows
 * line up behind rank 1 and side entries slide to their new order; under
 * reduced motion the final state appears at once.
 *
 * The shell already renders the h1, the safety line, the demo and mock labels
 * and the footer credits; TrialsPanel renders below this component.
 */
import { useEffect, useMemo, useState } from 'react';
import { LIMITS, type CaseRanking, type HpoId, type RankResponse } from '../../shared/contract';
import { useLocale, useT } from '../../shared/i18n';
import rankingMessages from '../../shared/i18n/messages/ranking';
import { useCase, useCaseActions } from '../../shared/store';
import { ApiErrorState, Button, EmptyState, Icon, LoadingPanel, Skeleton, Spinner } from '../../shared/ui';
import { useQuestionsSync } from '../questions/useQuestionsSync';
import { CompareMatrix } from './CompareMatrix';
import { FeatureSummary } from './FeatureSummary';
import { LeadCandidate } from './LeadCandidate';
import { OtherCandidates } from './OtherCandidates';
import { indexFeatures } from './evidence';
import { formatDateTime, formatTime, pick, sourceName, versionEntries, type RankingT } from './format';
import type { EnterRows } from './parts';
import { changeFor, evidenceKeys, rankDelta, type RankingChange } from './rankingChange';
import styles from './ranking.module.css';
import { useAutoRank, type AutoRank } from './useAutoRank';

export function RankingStep() {
  const t = useT(rankingMessages);
  const { caseObject, extractStatus } = useCase();
  const { goToStep, selectCandidate } = useCaseActions();
  const auto = useAutoRank();
  // Keep "What to check next" (and so the brief) in step with each ranking.
  useQuestionsSync();
  const [activeTerm, setActiveTerm] = useState<HpoId | null>(null);
  const features = useMemo(() => indexFeatures(caseObject), [caseObject]);
  const ranking = caseObject.lastRanking;

  if (!auto.canRank) {
    if (extractStatus.state === 'loading') {
      return (
        <div data-testid="ranking">
          <LoadingPanel step={t('loadingReading')}>
            <ResultsSkeleton />
          </LoadingPanel>
        </div>
      );
    }
    return (
      <div data-testid="ranking">
        <EmptyState
          icon="compare"
          title={t('emptyTitle')}
          description={t('emptyDesc')}
          action={
            <Button onClick={() => goToStep('features')} iconEnd={<Icon name="arrowRight" size={18} />}>
              {t('reviewFeatures')}
            </Button>
          }
        />
      </div>
    );
  }

  const updating = auto.phase === 'loading' || auto.phase === 'scheduled';
  const few = features.observed.length < LIMITS.rankRecommendedObserved;
  const link = { activeTerm, onActivate: setActiveTerm };

  return (
    <div className={styles.page} data-testid="ranking" aria-busy={updating || undefined}>
      {ranking && <RankStatus auto={auto} ranking={ranking} />}
      {few && (
        <p className={styles.note}>
          <Icon name="info" size={18} />
          <span>{t('fewNote', { n: LIMITS.rankRecommendedObserved })}</span>
        </p>
      )}

      {ranking ? (
        <>
          {auto.phase === 'error' && auto.error && (
            <ApiErrorState error={auto.error} onRetry={auto.rankNow} compact titleLevel={3} />
          )}
          <Results
            ranking={ranking}
            features={features}
            selectedId={caseObject.selectedCandidateId}
            onSelect={selectCandidate}
            {...link}
          />
          <FeatureSummary
            observed={features.observed}
            excluded={features.excluded}
            onEdit={() => goToStep('features')}
            {...link}
          />
          <RankingSources ranking={ranking} />
          <NextStep onNext={() => goToStep('questions')} />
        </>
      ) : auto.phase === 'error' && auto.error ? (
        <ApiErrorState
          error={auto.error}
          onRetry={auto.rankNow}
          actions={
            <Button variant="secondary" onClick={() => goToStep('features')}>
              {t('reviewFeatures')}
            </Button>
          }
        />
      ) : auto.phase === 'offline' ? (
        <EmptyState
          icon="cloudOff"
          title={t('offlineTitle')}
          description={t('offlineDesc')}
        />
      ) : (
        <LoadingPanel
          step={t(pick(auto.request.observed.length, 'matchingOne', 'matchingOther'), {
            n: auto.request.observed.length,
          })}
        >
          <ResultsSkeleton />
        </LoadingPanel>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Results({
  ranking,
  features,
  selectedId,
  onSelect,
  activeTerm,
  onActivate,
}: {
  ranking: CaseRanking;
  features: ReturnType<typeof indexFeatures>;
  selectedId: string | null;
  onSelect(id: string): void;
  activeTerm: HpoId | null;
  onActivate(id: HpoId | null): void;
}) {
  const t = useT(rankingMessages);
  const { response } = ranking;
  const animate = useMotionOnce(response);
  const change = changeFor(response);
  const link = { activeTerm, onActivate };
  const [lead, ...others] = response.candidates;

  if (!lead) {
    return (
      <EmptyState
        icon="compare"
        title={t('noMatchesTitle')}
        description={t('noMatchesDesc')}
        titleLevel={2}
      />
    );
  }

  const observedCount = ranking.request.observed.length;
  return (
    <>
      <section className={styles.results} aria-label={t('resultsLabel')}>
        <LeadCandidate
          candidate={lead}
          index={features.index}
          observedCount={observedCount}
          delta={rankDelta(change, lead)}
          enter={animate ? enterFor(change, lead.diseaseId, response, true) : null}
          selected={selectedId === lead.diseaseId}
          onSelect={() => onSelect(lead.diseaseId)}
          {...link}
        />
        <OtherCandidates
          entries={others.map((c) => ({
            candidate: c,
            delta: rankDelta(change, c),
            enter: animate ? enterFor(change, c.diseaseId, response, false) : null,
          }))}
          response={response}
          index={features.index}
          observedCount={observedCount}
          selectedId={selectedId}
          onSelect={onSelect}
          {...link}
        />
      </section>
      {response.candidates.length > 1 && (
        <CompareMatrix
          candidates={response.candidates}
          observed={ranking.request.observed}
          index={features.index}
          {...link}
        />
      )}
    </>
  );
}

/**
 * Decide once per ranking whether its motion plays, so later re-renders
 * (hover, selection) never cut it short, and revisiting the step does not
 * replay it.
 */
function useMotionOnce(response: RankResponse): boolean {
  const make = () => ({ response, animate: Boolean(changeFor(response) && !changeFor(response)?.motionPlayed) });
  const [entry, setEntry] = useState(make);
  let current = entry;
  if (entry.response !== response) {
    current = make();
    setEntry(current);
  }
  useEffect(() => {
    const played = changeFor(response);
    if (played) played.motionPlayed = true;
  }, [response]);
  return current.animate;
}

/** New rows only; everything when the candidate is new here or newly first. */
function enterFor(change: RankingChange | undefined, id: string, response: RankResponse, isLead: boolean): EnterRows {
  if (!change) return null;
  const before = change.previousEvidence?.get(id);
  const wasLead = change.previousRanks?.get(id) === 1;
  if (!before || (isLead && !wasLead)) return 'all';
  const candidate = response.candidates.find((c) => c.diseaseId === id);
  if (!candidate) return null;
  return new Set([...evidenceKeys(candidate)].filter((k) => !before.has(k)));
}

// ---------------------------------------------------------------------------

function RankStatus({ auto, ranking }: { auto: AutoRank; ranking: CaseRanking }) {
  const t = useT(rankingMessages);
  const { locale } = useLocale();
  const counts = countsText(auto.request.observed.length, auto.request.excluded.length, t);

  let body;
  switch (auto.phase) {
    case 'loading':
      body = (
        <span className={styles.statusText}>
          <Spinner size={14} />
          {t('statusUpdating', { counts })}
        </span>
      );
      break;
    case 'scheduled':
      body = (
        <>
          <span className={styles.statusText}>
            <Icon name="refresh" size={16} />
            {t('statusScheduled')}
          </span>
          <Button variant="ghost" size="sm" onClick={auto.rankNow}>
            {t('updateRanking')}
          </Button>
        </>
      );
      break;
    case 'error':
      body = (
        <span className={styles.statusText}>
          <Icon name="alert" size={16} />
          {t('statusStale')}
        </span>
      );
      break;
    case 'offline':
      body = (
        <span className={styles.statusText}>
          <Icon name="cloudOff" size={16} />
          {t('statusOffline')}
        </span>
      );
      break;
    default:
      body = (
        <span className={styles.statusText}>
          <Icon name="check" size={16} />
          {t('statusRanked', { time: formatTime(ranking.rankedAt, locale), counts })}
        </span>
      );
  }

  return (
    <div className={styles.status} data-phase={auto.phase}>
      {body}
    </div>
  );
}

/** "12 present features", or "12 present features and 1 not present". */
function countsText(observed: number, excluded: number, t: RankingT): string {
  return excluded > 0
    ? t(
        observed === 1
          ? pick(excluded, 'countsExcludedOneOne', 'countsExcludedOneOther')
          : pick(excluded, 'countsExcludedOtherOne', 'countsExcludedOtherOther'),
        { n: observed, m: excluded },
      )
    : t(pick(observed, 'countsOne', 'countsOther'), { n: observed });
}

function RankingSources({ ranking }: { ranking: CaseRanking }) {
  const t = useT(rankingMessages);
  const { locale } = useLocale();
  const { response } = ranking;
  const sources = [...new Set(response.candidates.flatMap((c) => c.sources))].map((s) => sourceName(s, t));
  const versions = versionEntries(response.dataVersions, t);
  return (
    <section className={styles.sources} aria-labelledby="ranking-sources-title">
      <h3 id="ranking-sources-title" className={styles.sourcesTitle}>
        {t('sourcesTitle')}
      </h3>
      <dl className={styles.sourcesList}>
        {sources.length > 0 && (
          <div>
            <dt>{t('sources')}</dt>
            <dd>{sources.join(t('listSep'))}</dd>
          </div>
        )}
        {versions.map((v) => (
          <div key={v.name}>
            <dt>{v.name}</dt>
            <dd>{v.value}</dd>
          </div>
        ))}
        <div>
          <dt>{t('fetched')}</dt>
          <dd>{formatDateTime(response.dataVersions.fetchedAt, locale)}</dd>
        </div>
      </dl>
    </section>
  );
}

/** In-content route to the next step, styled like "See possible matches" on the features step. */
function NextStep({ onNext }: { onNext(): void }) {
  const t = useT(rankingMessages);
  return (
    <div className={styles.next}>
      <p className={styles.nextHint}>{t('nextHint')}</p>
      <Button
        className={styles.nextCta}
        onClick={onNext}
        data-testid="go-questions"
        iconEnd={<Icon name="arrowRight" size={16} />}
      >
        {t('nextCta')}
      </Button>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className={styles.results}>
      <div className={styles.skeletonLead}>
        <Skeleton width="var(--space-32)" height="var(--s-5)" radius="pill" />
        <Skeleton width="70%" height="var(--t-xl)" />
        <Skeleton width="55%" height="var(--t-md)" />
        {Array.from({ length: 8 }, (_, r) => (
          <Skeleton key={r} height="var(--s-6)" radius="sm" />
        ))}
      </div>
      <div className={styles.skeletonOthers}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeletonAlt}>
            <Skeleton width="80%" height="var(--t-lg)" />
            <Skeleton width="65%" height="var(--t-sm)" />
            <Skeleton width="90%" height="var(--s-5)" />
          </div>
        ))}
      </div>
    </div>
  );
}
