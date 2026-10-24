/**
 * Feature review (spec task 3.3; requirements 2.1, 2.4–2.9, 9.4, 12.1, 12.4).
 *
 * The notes with every quote highlighted and footnoted, beside the numbered
 * feature list. Hovering or focusing a feature lights up its quote and the
 * other way round. Each feature can be kept as present, marked not present,
 * or removed with undo; features can be added by hand. The shell renders the
 * step's <h1>, lede and the demo label above this component.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { LIMITS, type HpoId, type TermRef } from '../../shared/contract';
import { findDemoCase, PRIMARY_DEMO_CASE_ID } from '../../shared/mocks';
import { useT } from '../../shared/i18n';
import review from '../../shared/i18n/messages/review';
import { termCounts, useCase, useCaseActions } from '../../shared/store';
import {
  ApiErrorState,
  Button,
  EmptyState,
  Icon,
  LoadingPanel,
  Skeleton,
  SkeletonText,
  useAnnounce,
  useOnlineStatus,
} from '../../shared/ui';
import { LocalIcon } from './LocalIcon';
import { ManualAdd } from './ManualAdd';
import {
  domKey,
  numberTerms,
  rememberRemovedFrom,
  restoreStatus,
  scrollBehavior,
  statusWordKey,
  type NumberedTerm,
  type PresenceStatus,
} from './model';
import { NotesPanel } from './NotesPanel';
import { rich } from './rich';
import styles from './ReviewStep.module.css';
import { TermRow } from './TermRow';

interface Removed {
  hpoId: HpoId;
  label: string;
  n: number;
  previous: PresenceStatus;
}

export function ReviewStep() {
  const { caseObject, meta, extractStatus } = useCase();
  const { runExtraction, setTermStatus, addManualTerm, goToStep, loadDemoCase } = useCaseActions();
  const announce = useAnnounce();
  const online = useOnlineStatus();
  const t = useT(review);
  const statusWord = (status: PresenceStatus) => t(statusWordKey(status));

  const [activeId, setActiveId] = useState<HpoId | null>(null);
  const [lastRemoved, setLastRemoved] = useState<Removed | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => numberTerms(caseObject.terms, caseObject.notes), [caseObject.terms, caseObject.notes]);
  const counts = termCounts(caseObject);
  const present = items.filter((i) => i.term.status === 'observed');
  const absent = items.filter((i) => i.term.status === 'excluded');
  const removed = items.filter((i) => i.term.status === 'removed');
  const demoExtraction = findDemoCase(caseObject.demo?.caseId)?.extraction;

  // Rows move between groups when their status changes; put focus back on
  // the control the user was using, in its new place.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const el = target === 'undo' ? undoRef.current : document.getElementById(target);
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: 'nearest' });
  }, [caseObject.terms, lastRemoved]);

  const radioId = (hpoId: HpoId, status: PresenceStatus) => `status-${domKey(hpoId)}-${status}`;

  const changeStatus = (item: NumberedTerm, status: PresenceStatus) => {
    setTermStatus(item.term.hpoId, status);
    pendingFocus.current = radioId(item.term.hpoId, status);
    announce(t('announceStatus', { n: item.n, label: item.term.label, status: statusWord(status) }));
  };

  const remove = (item: NumberedTerm) => {
    const previous: PresenceStatus = item.term.status === 'excluded' ? 'excluded' : 'observed';
    // Saved with the case id, so Restore still knows after leaving the step or reloading.
    rememberRemovedFrom(caseObject.caseId, item.term.hpoId, previous);
    setTermStatus(item.term.hpoId, 'removed');
    setLastRemoved({ hpoId: item.term.hpoId, label: item.term.label, n: item.n, previous });
    setActiveId(null);
    pendingFocus.current = 'undo';
    announce(t('announceRemoved', { n: item.n, label: item.term.label }));
  };

  const restore = (hpoId: HpoId, label: string, n: number, status: PresenceStatus) => {
    setTermStatus(hpoId, status);
    if (lastRemoved?.hpoId === hpoId) setLastRemoved(null);
    pendingFocus.current = radioId(hpoId, status);
    announce(t('announceRestored', { n, label, status: statusWord(status) }));
  };

  const jumpTo = (hpoId: HpoId) => {
    const term = caseObject.terms.find((t) => t.hpoId === hpoId);
    if (!term || term.status === 'removed') return;
    const el = document.getElementById(radioId(hpoId, term.status));
    el?.focus({ preventScroll: true });
    document.getElementById(`term-${domKey(hpoId)}`)?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
  };

  // ManualAdd shows its own visible confirmation; the announcement is the one spoken channel.
  const addManual = (term: TermRef, status: PresenceStatus) => {
    addManualTerm(term, status);
    announce(t('added', { label: term.label, status: statusWord(status) }));
  };

  const tryDemo = () => {
    void loadDemoCase(PRIMARY_DEMO_CASE_ID);
  };

  // ---- Loading (also the ?demo= deep link) -------------------------------
  if (extractStatus.state === 'loading') {
    return (
      <LoadingPanel step={t('loadingStep')}>
        <div className={styles.layout}>
          <div className={styles.notesCol}>
            <div className={styles.skeletonNotes}>
              <Skeleton width="40%" height="1.25em" />
              <SkeletonText lines={7} />
            </div>
          </div>
          <div className={styles.listCol}>
            <Skeleton width="50%" height="1.5em" />
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} height="var(--skeleton-row)" radius="md" />
            ))}
          </div>
        </div>
      </LoadingPanel>
    );
  }

  const error = extractStatus.state === 'error' ? extractStatus.error : null;
  const hasTerms = caseObject.terms.length > 0;

  // ---- No features yet (zero terms, failed reading, or nothing typed) -----
  if (!hasTerms) {
    const manualIntro =
      error?.code === 'LLM_UNAVAILABLE' || error?.code === 'NO_TERMS_FOUND'
        ? t('manualIntro')
        : undefined;
    const demoButton = (
      <Button variant="secondary" onClick={tryDemo} disabled={!online} data-testid="review-try-demo">
        {online ? t('tryDemo') : t('demoNeedsConnection')}
      </Button>
    );
    return (
      <div className={styles.empty}>
        {error ? (
          <ApiErrorState
            error={error}
            onRetry={() => void runExtraction()}
            actions={
              <>
                <Button variant="ghost" onClick={() => goToStep('notes')}>
                  {t('backToNotes')}
                </Button>
                {(error.code === 'LLM_UNAVAILABLE' || !error.retryable) && demoButton}
              </>
            }
          />
        ) : (
          <EmptyState
            icon="list"
            titleLevel={2}
            title={caseObject.notes.trim() ? t('emptyNoFeaturesTitle') : t('emptyNoNotesTitle')}
            description={
              caseObject.notes.trim()
                ? t('emptyNoFeaturesText')
                : t('emptyNoNotesText')
            }
            action={
              <div className={styles.emptyActions}>
                <Button onClick={() => goToStep('notes')} iconStart={<Icon name="notes" size={16} />}>
                  {caseObject.notes.trim() ? t('backToNotes') : t('writeNotes')}
                </Button>
                {demoButton}
              </div>
            }
          />
        )}
        <ManualAdd terms={caseObject.terms} onAdd={addManual} inputRef={addInputRef} intro={manualIntro} />
      </div>
    );
  }

  // ---- Review --------------------------------------------------------------
  const extraction = meta.extraction;
  const sourceLine = extraction
    ? extraction.model === 'demo-prepared'
      ? t('sourceDemo')
      : extraction.model === 'offline-mock'
        ? null
        : t('sourceModel', { model: extraction.model })
    : null;
  const warnings = extraction?.warnings ?? [];
  const hasNotes = caseObject.notes.trim().length > 0;

  const rows = (list: NumberedTerm[]) =>
    list.map((item) => (
      <TermRow
        key={item.term.hpoId}
        item={item}
        active={activeId === item.term.hpoId}
        onActivate={setActiveId}
        onStatus={changeStatus}
        onRemove={remove}
      />
    ));

  return (
    <div className={styles.review}>
      {error && (
        <ApiErrorState
          compact
          error={error}
          onRetry={() => void runExtraction()}
          actions={
            <Button variant="ghost" size="sm" onClick={() => goToStep('notes')}>
              {t('backToNotes')}
            </Button>
          }
        />
      )}

      <div className={styles.layout} data-has-notes={hasNotes || undefined}>
        {hasNotes && (
          <div className={styles.notesCol}>
            <NotesPanel
              notes={caseObject.notes}
              items={items}
              activeId={activeId}
              onActivate={setActiveId}
              onJump={jumpTo}
            />
          </div>
        )}

        <div className={styles.listCol}>
          <header className={styles.listHead}>
            <h2 className={styles.listTitle}>{t('featuresFound')}</h2>
            <p className={styles.summary}>
              {rich(t(counts.removed > 0 ? 'summaryWithRemoved' : 'summary'), {
                observed: <span className="num">{counts.observed}</span>,
                excluded: <span className="num">{counts.excluded}</span>,
                removed: <span className="num">{counts.removed}</span>,
                sep: <span aria-hidden="true"> · </span>,
              })}
            </p>
            {sourceLine && <p className={styles.source}>{sourceLine}</p>}
          </header>

          <div className={styles.groups} data-testid="term-list">
            <section className={styles.group} aria-labelledby="group-present">
              <h3 id="group-present" className={styles.groupTitle}>
                <span className={styles.groupMark} data-status="observed" aria-hidden="true" />
                {t('present')}
                <span className={styles.groupCount}>{present.length}</span>
              </h3>
              <p className={styles.groupNote}>
                {t('presentNote')}
              </p>
              {present.length > 0 ? (
                <ul className={styles.rows}>{rows(present)}</ul>
              ) : (
                <p className={styles.groupEmpty}>{t('presentEmpty')}</p>
              )}
            </section>

            <section className={styles.group} aria-labelledby="group-absent">
              <h3 id="group-absent" className={styles.groupTitle}>
                <span className={styles.groupMark} data-status="excluded" aria-hidden="true" />
                {t('notPresent')}
                <span className={styles.groupCount}>{absent.length}</span>
              </h3>
              <p className={styles.groupNote}>
                {t('absentNote')}
              </p>
              {absent.length > 0 ? (
                <ul className={styles.rows}>{rows(absent)}</ul>
              ) : (
                <p className={styles.groupEmpty}>{t('absentEmpty')}</p>
              )}
            </section>

            {removed.length > 0 && (
              <details className={styles.removed}>
                <summary className={styles.removedSummary}>
                  <Icon name="chevronRight" size={16} className={styles.chevron} />
                  {t('removedGroup')} <span className={styles.groupCount}>{removed.length}</span>
                </summary>
                <ul className={styles.removedList}>
                  {removed.map(({ term, n }) => {
                    const known = restoreStatus(caseObject.caseId, term, demoExtraction);
                    return (
                      <li key={term.hpoId} className={styles.removedItem} data-testid={`term-row-${term.hpoId}`} data-status="removed">
                        <span className={styles.removedText}>
                          <span className={styles.removedNumber}>{n}</span>
                          <span className={styles.removedQuote}>{term.quote ? `“${term.quote}”` : term.label}</span>
                          <span className={`code ${styles.removedId}`}>{term.hpoId}</span>
                        </span>
                        {known ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => restore(term.hpoId, term.label, n, known)}
                            aria-label={t('restoreAria', { n, label: term.label, status: statusWord(known) })}
                            data-testid={`term-restore-${term.hpoId}`}
                            iconStart={<LocalIcon name="undo" size={14} />}
                          >
                            {t('restoreAsStatus', { status: statusWord(known) })}
                          </Button>
                        ) : (
                          // The earlier status is unknown: the user chooses, nothing is guessed.
                          <span className={styles.restoreChoice} role="group" aria-label={t('restoreGroupAria', { n, label: term.label })}>
                            <span className={styles.restoreAsk}>{t('restoreAsAsk')}</span>
                            <Button variant="ghost" size="sm" onClick={() => restore(term.hpoId, term.label, n, 'observed')}>
                              {t('present')}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => restore(term.hpoId, term.label, n, 'excluded')}>
                              {t('notPresent')}
                            </Button>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}
          </div>

          {warnings.length > 0 && (
            <section className={styles.warnings} aria-labelledby="reading-notes">
              <h3 id="reading-notes" className={styles.warningsTitle}>
                <Icon name="info" size={16} />
                {t('readingNotes')}
              </h3>
              <ul>
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </section>
          )}

          <ManualAdd terms={caseObject.terms} onAdd={addManual} inputRef={addInputRef} />
        </div>
      </div>

      <div className={styles.actionBar}>
        <div className={styles.actionInner}>
          {/* Not a live region: every change here is already announced once by useAnnounce. */}
          <div className={styles.actionInfo}>
            {lastRemoved ? (
              <p className={styles.undo}>
                <span>{t('removedFeature', { n: lastRemoved.n, label: lastRemoved.label })}</span>
                <Button
                  ref={undoRef}
                  variant="secondary"
                  size="sm"
                  onClick={() => restore(lastRemoved.hpoId, lastRemoved.label, lastRemoved.n, lastRemoved.previous)}
                  data-testid="term-undo"
                  iconStart={<LocalIcon name="undo" size={14} />}
                >
                  {t('undo')}
                </Button>
              </p>
            ) : counts.observed === 0 ? (
              <p className={styles.hint}>{t('hintNeedOne')}</p>
            ) : counts.observed < LIMITS.rankRecommendedObserved ? (
              <p className={styles.hint}>
                {t('hintRecommended', { min: LIMITS.rankRecommendedObserved })}
              </p>
            ) : (
              <p className={styles.hint}>
                {rich(t('hintCompare'), {
                  observed: <span className="num">{counts.observed}</span>,
                  excluded: <span className="num">{counts.excluded}</span>,
                })}
              </p>
            )}
          </div>
          <Button
            className={styles.cta}
            onClick={() => goToStep('matches')}
            disabled={counts.observed === 0}
            data-testid="see-matches"
            iconEnd={<Icon name="arrowRight" size={16} />}
          >
            {t('seeMatches')}
          </Button>
        </div>
      </div>
    </div>
  );
}
