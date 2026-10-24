/**
 * Possible matches with evidence (spec task 3.4; Requirements 3, 4, 9.2, 12.4).
 *
 * The ranking follows the feature set by itself (useAutoRank): first ranking at
 * once, later changes after a short pause, previous results kept visible and
 * marked as updating. Signature motion: evidence rows fill in behind each
 * case file and the case files slide to their new order (useFlip); under
 * reduced motion the final state appears at once.
 *
 * The shell already renders the h1, the safety line, the demo and mock labels
 * and the footer credits; TrialsPanel renders below this component.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CaseRanking, CaseTerm, HpoId } from '../../shared/contract';
import { useCase, useCaseActions } from '../../shared/store';
import {
  ApiErrorState,
  Button,
  EmptyState,
  Icon,
  LoadingPanel,
  Skeleton,
  Spinner,
} from '../../shared/ui';
import { useQuestionsSync } from '../questions/useQuestionsSync';
import { CandidateCard, type EnterRows } from './CandidateCard';
import { FeatureAside } from './FeatureAside';
import { SOURCE_NAMES, formatDateTime, formatTime, plural, versionEntries } from './format';
import { changeFor, evidenceKeys, rankDelta } from './rankingChange';
import styles from './ranking.module.css';
import { useAutoRank, type AutoRank } from './useAutoRank';
import { useFlip } from './useFlip';

export function RankingStep() {
  const { caseObject, extractStatus } = useCase();
  const { goToStep, selectCandidate } = useCaseActions();
  const auto = useAutoRank();
  // Keep "What to check next" (and so the brief) in step with each ranking.
  useQuestionsSync();
  const [activeTerm, setActiveTerm] = useState<HpoId | null>(null);

  const { observed, excluded, footnotes } = useMemo(() => featureLists(caseObject.terms), [caseObject.terms]);
  const ranking = caseObject.lastRanking;

  if (!auto.canRank) {
    if (extractStatus.state === 'loading') {
      return (
        <LoadingPanel step="Reading the notes and finding features">
          <ResultsSkeleton />
        </LoadingPanel>
      );
    }
    return (
      <EmptyState
        icon="compare"
        title="No present features to match yet"
        description="Possible matches appear here once at least one feature is kept as present."
        action={
          <Button variant="primary" onClick={() => goToStep('features')} iconEnd={<Icon name="arrowRight" size={18} />}>
            Review the features
          </Button>
        }
      />
    );
  }

  const updating = auto.phase === 'loading' || auto.phase === 'scheduled';

  return (
    <div className={styles.layout}>
      <section className={styles.results} aria-labelledby="ranking-results-title" aria-busy={updating || undefined}>
        <h2 id="ranking-results-title" className="sr-only">
          Possible matches, ranked
        </h2>
        {ranking && <RankStatus auto={auto} ranking={ranking} />}

        {ranking ? (
          <>
            {auto.phase === 'error' && auto.error && (
              <ApiErrorState error={auto.error} onRetry={auto.rankNow} compact titleLevel={3} />
            )}
            <CandidateList
              ranking={ranking}
              footnotes={footnotes}
              observedCount={ranking.request.observed.length}
              activeTerm={activeTerm}
              onActivate={setActiveTerm}
              selectedId={caseObject.selectedCandidateId}
              onSelect={selectCandidate}
              stale={auto.stale}
            />
            <RankingSources ranking={ranking} />
          </>
        ) : auto.phase === 'error' && auto.error ? (
          <ApiErrorState
            error={auto.error}
            onRetry={auto.rankNow}
            actions={
              <Button variant="secondary" onClick={() => goToStep('features')}>
                Review the features
              </Button>
            }
          />
        ) : auto.phase === 'offline' ? (
          <EmptyState
            icon="cloudOff"
            title="Ranking needs a connection"
            description="Your features are saved in this browser. The ranking starts when you are back online."
          />
        ) : (
          <LoadingPanel step={`Matching ${plural(auto.request.observed.length, 'present feature')} with known conditions`}>
            <ResultsSkeleton />
          </LoadingPanel>
        )}
      </section>

      <FeatureAside
        observed={observed}
        excluded={excluded}
        footnotes={footnotes}
        activeTerm={activeTerm}
        onActivate={setActiveTerm}
        onEdit={() => goToStep('features')}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function CandidateList({
  ranking,
  footnotes,
  observedCount,
  activeTerm,
  onActivate,
  selectedId,
  onSelect,
  stale,
}: {
  ranking: CaseRanking;
  footnotes: Map<HpoId, number>;
  observedCount: number;
  activeTerm: HpoId | null;
  onActivate(id: HpoId | null): void;
  selectedId: string | null;
  onSelect(id: string): void;
  stale: boolean;
}) {
  const { response } = ranking;
  const change = changeFor(response);

  // Decide once per ranking whether its evidence motion plays, so later
  // re-renders (hover, selection) never cut an animation short.
  const [entry, setEntry] = useState(() => ({ response, animate: Boolean(change && !change.motionPlayed) }));
  let current = entry;
  if (entry.response !== response) {
    current = { response, animate: Boolean(change && !change.motionPlayed) };
    setEntry(current);
  }
  useEffect(() => {
    const played = changeFor(response);
    if (played) played.motionPlayed = true;
  }, [response]);

  const listRef = useRef<HTMLOListElement>(null);
  useFlip(listRef, response);

  if (response.candidates.length === 0) {
    return (
      <EmptyState
        icon="compare"
        title="No possible matches found"
        description="The ranking service found no conditions for these features. Adding more features from the notes may help."
        titleLevel={3}
      />
    );
  }

  return (
    <ol ref={listRef} className={styles.list} data-stale={stale || undefined}>
      {response.candidates.map((c, index) => {
        let enter: EnterRows = null;
        if (current.animate) {
          const before = change?.previousEvidence?.get(c.diseaseId);
          enter = before ? new Set([...evidenceKeys(c)].filter((k) => !before.has(k))) : 'all';
        }
        return (
          <li key={c.diseaseId} data-flip-id={c.diseaseId} className={styles.item}>
            <CandidateCard
              candidate={c}
              footnotes={footnotes}
              observedCount={observedCount}
              delta={rankDelta(change, c)}
              enter={enter}
              index={index}
              activeTerm={activeTerm}
              onActivate={onActivate}
              selected={selectedId === c.diseaseId}
              onSelect={() => onSelect(c.diseaseId)}
            />
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------

function RankStatus({ auto, ranking }: { auto: AutoRank; ranking: CaseRanking }) {
  const { observed, excluded } = auto.request;
  const counts =
    excluded.length > 0
      ? `${plural(observed.length, 'present feature')} and ${excluded.length} not present`
      : plural(observed.length, 'present feature');

  let body;
  switch (auto.phase) {
    case 'loading':
      body = (
        <span className={styles.statusText}>
          <Spinner size={14} />
          Updating the ranking for {counts}
        </span>
      );
      break;
    case 'scheduled':
      body = (
        <>
          <span className={styles.statusText}>
            <Icon name="refresh" size={16} />
            Features changed. The ranking updates in a moment
          </span>
          <Button variant="ghost" size="sm" onClick={auto.rankNow}>
            Update ranking
          </Button>
        </>
      );
      break;
    case 'error':
      body = (
        <span className={styles.statusText}>
          <Icon name="alert" size={16} />
          These results are for the earlier features
        </span>
      );
      break;
    case 'offline':
      body = (
        <span className={styles.statusText}>
          <Icon name="cloudOff" size={16} />
          Offline. The ranking updates when you reconnect
        </span>
      );
      break;
    default:
      body = (
        <span className={styles.statusText}>
          <Icon name="check" size={16} />
          Ranked at {formatTime(ranking.rankedAt)} on {counts}
        </span>
      );
  }

  return (
    <div className={styles.status} data-phase={auto.phase}>
      {body}
    </div>
  );
}

function RankingSources({ ranking }: { ranking: CaseRanking }) {
  const { response } = ranking;
  const sources = [...new Set(response.candidates.flatMap((c) => c.sources))].map((s) => SOURCE_NAMES[s]);
  const versions = versionEntries(response.dataVersions);
  return (
    <section className={styles.sources} aria-labelledby="ranking-sources-title">
      <h3 id="ranking-sources-title" className={styles.sourcesTitle}>
        Data behind this ranking
      </h3>
      <dl className={styles.sourcesList}>
        {sources.length > 0 && (
          <div>
            <dt>Sources</dt>
            <dd>{sources.join(', ')}</dd>
          </div>
        )}
        {versions.map((v) => (
          <div key={v.name}>
            <dt>{v.name}</dt>
            <dd>{v.value}</dd>
          </div>
        ))}
        <div>
          <dt>Fetched</dt>
          <dd>{formatDateTime(response.dataVersions.fetchedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}

function ResultsSkeleton() {
  return (
    <div className={styles.skeletonList}>
      {[12, 6, 6].map((rows, i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={styles.skeletonHead}>
            <Skeleton width="var(--space-10)" height="var(--space-10)" radius="md" />
            <span className={styles.skeletonTitle}>
              <Skeleton width="60%" height="1.25em" />
              <Skeleton width="40%" height="0.85em" />
            </span>
            <Skeleton width="var(--space-32)" height="var(--size-label-min)" radius="pill" />
          </div>
          {Array.from({ length: rows }, (_, r) => (
            <Skeleton key={r} height="1em" width={r % 3 === 2 ? '72%' : '100%'} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Present and not-present terms in note order (manual terms last), numbered as footnotes. */
function featureLists(terms: CaseTerm[]) {
  const byPosition = (a: CaseTerm, b: CaseTerm) =>
    (a.start ?? Number.MAX_SAFE_INTEGER) - (b.start ?? Number.MAX_SAFE_INTEGER) || a.label.localeCompare(b.label);
  const observed = terms.filter((t) => t.status === 'observed').sort(byPosition);
  const excluded = terms.filter((t) => t.status === 'excluded').sort(byPosition);
  const footnotes = new Map<HpoId, number>();
  [...observed, ...excluded].forEach((t) => {
    if (!footnotes.has(t.hpoId)) footnotes.set(t.hpoId, footnotes.size + 1);
  });
  return { observed, excluded, footnotes };
}
