/**
 * Brief step (spec task 3.7, Requirement 6): the one-page specialist brief,
 * "Print or save as PDF" (the browser's print dialog with a print stylesheet) and
 * "Export phenopacket" (the GA4GH Phenopacket v2 JSON from /api/brief),
 * followed by recruiting studies for the selected match.
 *
 * The shell already renders the h1, the demo labels and the safety line.
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { BriefResponse } from '../../shared/contract';
import { useCase, useCaseActions } from '../../shared/store';
import {
  ApiErrorState,
  Button,
  EmptyState,
  Icon,
  Skeleton,
  SkeletonGroup,
  SkeletonText,
  Spinner,
  useAnnounce,
} from '../../shared/ui';
import { TrialsPanel } from '../trials';
import { fillTemplate } from '../../components/ui/fillTemplate';
import { useT } from '../../shared/i18n';
import briefMessages from '../../shared/i18n/messages/brief';
import common from '../../shared/i18n/messages/common';
import { useAudience } from '../../shared/audience';
import { BriefDocument } from './BriefDocument';
import { downloadJson, phenopacketFileName } from './download';
import { FamilyBrief } from './FamilyBrief';
import styles from './BriefStep.module.css';
import { isoDay } from './format';
import { useBrief } from './useBrief';

export { phenopacketFileName };

/** Family mode (T30a) gets "Notes for my specialist"; clinicians get the full brief. */
export function BriefStep() {
  const { isFamily } = useAudience();
  return isFamily ? <FamilyBrief /> : <ClinicianBrief />;
}

function ClinicianBrief() {
  const { caseObject } = useCase();
  const { goToStep } = useCaseActions();
  const state = useBrief();
  const announce = useAnnounce();
  const announced = useRef<BriefResponse | null>(null);
  const t = useT(briefMessages);

  const data = state.result?.data ?? null;

  useEffect(() => {
    if (state.phase !== 'ready' || !data || announced.current === data) return;
    announced.current = data;
    announce(t('announceReady', { count: data.brief.candidates.length }));
  }, [state.phase, data, announce, t]);

  if (state.phase === 'empty') {
    const hasNotes = caseObject.notes.trim().length > 0;
    return (
      <EmptyState
        icon="document"
        titleLevel={2}
        title={t('emptyTitle')}
        description={t('emptyDescription')}
        action={
          <Button
            variant="primary"
            iconEnd={<Icon name="arrowRight" size={16} />}
            onClick={() => goToStep(hasNotes ? 'features' : 'notes')}
          >
            {hasNotes ? t('checkFeatures') : t('addNotes')}
          </Button>
        }
      />
    );
  }

  if (!data) {
    if (state.phase === 'error' && state.error) {
      return <ApiErrorState error={state.error} onRetry={state.retry} />;
    }
    // Same frame as the finished step (toolbar, document, studies), so nothing moves when it arrives.
    const step = state.stepLabel || t('buildingBrief');
    return (
      <div className={styles.step}>
        <Toolbar>
          <span className={styles.updating}>
            <Spinner size={14} />
            {step}
          </span>
        </Toolbar>
        <div className={styles.layout}>
          <SkeletonGroup label={step} className={`${styles.paper} ${styles.skeleton}`}>
            <BriefSkeleton />
          </SkeletonGroup>
          <div className={styles.trials}>
            {caseObject.lastRanking ? (
              <TrialsPanel />
            ) : (
              <div className={styles.trialsSkeleton} aria-hidden="true">
                <Skeleton height="1.3em" width="60%" />
                <SkeletonText lines={2} />
                <Skeleton height="6em" radius="md" />
                <Skeleton height="6em" radius="md" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <BriefReady data={data} origin={state.result?.origin ?? 'api'} state={state} />;
}

function BriefReady({
  data,
  origin,
  state,
}: {
  data: BriefResponse;
  origin: 'api' | 'mock';
  state: ReturnType<typeof useBrief>;
}) {
  const { caseObject } = useCase();
  const announce = useAnnounce();
  const t = useT(briefMessages);
  const tc = useT(common);
  const previewId = useId();
  const [saved, setSaved] = useState<string | null>(null);
  const fileName = phenopacketFileName(data.phenopacket);
  const busy = state.updating;
  // An old brief stays readable, but nothing out of date can be printed or exported.
  const locked = state.stale;

  const docProps = {
    brief: data.brief,
    phenopacketId: data.phenopacket.id,
    offlineMock: origin === 'mock',
  };

  // While this step is open, printing shows only the brief (see BriefStep.module.css).
  useEffect(() => {
    const printing = styles.printing;
    if (!printing) return;
    document.body.classList.add(printing);
    return () => document.body.classList.remove(printing);
  }, []);

  const print = useCallback(() => {
    // Chrome and Safari suggest the document title as the PDF file name.
    const previous = document.title;
    const who = caseObject.demo ? caseObject.demo.caseId : t('printTitleCase');
    document.title = t('printTitle', { who, day: isoDay(data.brief.generatedAt) }).trim();
    const restore = () => {
      document.title = previous;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }, [caseObject.demo, data.brief.generatedAt, t]);

  const exportPhenopacket = useCallback(() => {
    downloadJson(fileName, data.phenopacket);
    setSaved(fileName);
    announce(t('announceSaved', { file: fileName }));
  }, [announce, data.phenopacket, fileName, t]);

  return (
    <div className={styles.step}>
      <Toolbar onPrint={print} onExport={exportPhenopacket} disabled={locked}>
          {busy ? (
            <span className={styles.updating}>
              <Spinner size={14} />
              {state.stepLabel || t('updatingBrief')}
            </span>
          ) : locked ? (
            <span className={styles.outdated}>
              <Icon name="alert" size={16} />
              {t('outOfDate')}
            </span>
          ) : saved ? (
            <span className={styles.saved}>
              <Icon name="check" size={16} />
              {fillTemplate(t('savedFile'), { file: <span className={styles.file}>{saved}</span> })}
            </span>
          ) : (
            <>{t('printHint')}</>
          )}
      </Toolbar>

      {state.phase === 'error' && state.error && (
        <ApiErrorState compact titleLevel={3} error={state.error} onRetry={state.retry} />
      )}
      {state.questionsSkipped && (
        <p className={styles.note}>
          <Icon name="info" size={16} />
          <span>{t('questionsSkipped')}</span>
          <Button variant="ghost" size="sm" onClick={state.retry}>
            {tc('tryAgain')}
          </Button>
        </p>
      )}

      <div className={styles.layout}>
        <div
          className={styles.paper}
          data-testid="brief"
          data-stale={locked || undefined}
          aria-busy={busy || undefined}
        >
          <BriefDocument {...docProps} idPrefix={`${previewId}-screen`} />
        </div>
        <div className={styles.trials}>
          <TrialsPanel />
        </div>
      </div>

      {createPortal(
        <div className={styles.printRoot} aria-hidden="true">
          <BriefDocument {...docProps} idPrefix={`${previewId}-print`} />
        </div>,
        document.body,
      )}
    </div>
  );
}

/** The two actions and a status line. Without handlers the buttons are shown disabled. */
function Toolbar({
  onPrint,
  onExport,
  disabled = false,
  children,
}: {
  onPrint?: () => void;
  onExport?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const t = useT(briefMessages);
  return (
    <div className={styles.toolbar}>
      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={onPrint}
          data-testid="download-pdf"
          disabled={disabled || !onPrint}
          iconStart={<Icon name="document" size={18} />}
        >
          {t('printButton')}
        </Button>
        <Button
          variant="secondary"
          onClick={onExport}
          data-testid="export-phenopacket"
          disabled={disabled || !onExport}
          iconStart={<Icon name="list" size={18} />}
        >
          {t('exportButton')}
        </Button>
      </div>
      <p className={styles.hint} role="status">
        {children}
      </p>
    </div>
  );
}

/** Placeholder lines with the brief's section rhythm (the frame is the paper itself). */
function BriefSkeleton() {
  return (
    <>
      <Skeleton height="0.9em" width="30%" />
      <Skeleton height="1.6em" width="72%" />
      <SkeletonText lines={2} />
      <div className={styles.skeletonBlock}>
        <Skeleton height="0.8em" width="18%" />
        <SkeletonText lines={6} />
      </div>
      <div className={styles.skeletonBlock}>
        <Skeleton height="0.8em" width="28%" />
        <SkeletonText lines={5} />
      </div>
      <div className={styles.skeletonBlock}>
        <Skeleton height="0.8em" width="22%" />
        <SkeletonText lines={4} />
      </div>
    </>
  );
}
