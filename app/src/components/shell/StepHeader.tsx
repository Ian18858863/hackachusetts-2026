import { useOfflineMockEndpoints, type DataOrigin } from '../../shared/api';
import type { DataVersions, Source } from '../../shared/contract';
import { useAudience } from '../../shared/audience';
import { useLocale, useT } from '../../shared/i18n';
import audienceMessages from '../../shared/i18n/messages/audience';
import common from '../../shared/i18n/messages/common';
import shell from '../../shared/i18n/messages/shell';
import { getStep, stepsFor, type StepId } from '../../shared/steps';
import { useCase } from '../../shared/store';
import { DataOriginLabel, Disclaimer, OfflineMockLabel } from '../../shared/ui';
import { headingText, useFitHeading } from '../ui/useFitHeading';
import styles from './StepHeader.module.css';

interface PayloadInfo {
  origin: DataOrigin | null;
  source: Source | null;
  dataVersions: DataVersions | null;
}

/**
 * The view's intro: a quiet step line and the single <h1>. Result steps add
 * the contract section 13 safety line, once and compact; there is no
 * explainer paragraph (T34). The demo notice lives only in the top bar chip;
 * data-origin labels (demo cache, offline mock) follow when they apply.
 */
export function StepHeader({ step }: { step: StepId }) {
  const def = getStep(step);
  const { audience, isFamily } = useAudience();
  const steps = stepsFor(audience);
  const index = steps.findIndex((s) => s.id === step);
  const { caseObject, meta } = useCase();
  const t = useT(shell);
  const ta = useT(audienceMessages);
  const tc = useT(common);
  const { locale } = useLocale();
  // Chinese and Japanese sentences need no space after the full stop.
  const gap = locale === 'zh' || locale === 'ja' ? '' : ' ';
  // Family mode has its own wording for the questions and brief steps.
  const familyText = isFamily && (step === 'questions' || step === 'brief');
  const title = headingText(familyText ? ta(`${step}Title`) : t(`${step}Title`));
  const titleRef = useFitHeading<HTMLHeadingElement>(title);
  const mockEndpoints = useOfflineMockEndpoints();

  const payload = payloadFor(step, caseObject.lastRanking?.response, meta);
  const showGlobalMock = mockEndpoints.length > 0 && payload.origin !== 'mock';
  const hasLabels = payload.origin === 'mock' || payload.source === 'demo' || showGlobalMock;

  return (
    <header className={styles.header}>
      <p className={styles.kicker}>{t('stepOf', { n: index + 1, total: steps.length })}</p>
      <h1 ref={titleRef} className={styles.title}>
        {title}
      </h1>
      {isFamily ? (
        // Contract section 13 v0.1.5 (family mode only): "Decision support, not a diagnosis." verbatim,
        // followed by "This view prepares your notes for a clinician. It does not suggest conditions."
        <p className={styles.safety} data-testid="family-banner">
          <strong className={styles.familyLead}>{tc('disclaimerLead')}</strong>
          {gap}
          {ta('banner')}
        </p>
      ) : (
        def.showsResults && <Disclaimer className={styles.safety} />
      )}
      {hasLabels && (
        <div className={styles.labels}>
          <DataOriginLabel {...payload} />
          {showGlobalMock && <OfflineMockLabel />}
        </div>
      )}
    </header>
  );
}

function payloadFor(
  step: StepId,
  ranking: { source: Source; dataVersions: DataVersions } | undefined,
  meta: ReturnType<typeof useCase>['meta'],
): PayloadInfo {
  switch (step) {
    case 'features':
      return {
        origin: meta.extraction?.origin ?? null,
        // A demo case's prepared extraction is already covered by the demo case label.
        source: null,
        dataVersions: meta.extraction?.dataVersions ?? null,
      };
    case 'matches':
    case 'brief':
      return {
        origin: meta.rankingOrigin,
        source: ranking?.source ?? null,
        dataVersions: ranking?.dataVersions ?? null,
      };
    case 'questions':
      return {
        origin: meta.questions?.origin ?? null,
        source: meta.questions?.source ?? null,
        dataVersions: meta.questions?.dataVersions ?? null,
      };
    default:
      return { origin: null, source: null, dataVersions: null };
  }
}
