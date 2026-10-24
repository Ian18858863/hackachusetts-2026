import { useOfflineMockEndpoints, type DataOrigin } from '../../shared/api';
import type { DataVersions, Source } from '../../shared/contract';
import { findDemoCase } from '../../shared/mocks';
import { getStep, STEPS, type StepId } from '../../shared/steps';
import { useCase } from '../../shared/store';
import { DataOriginLabel, DemoCaseLabel, Disclaimer, OfflineMockLabel } from '../../shared/ui';
import styles from './StepHeader.module.css';

interface PayloadInfo {
  origin: DataOrigin | null;
  source: Source | null;
  dataVersions: DataVersions | null;
}

/**
 * The view's intro, laid out like the specimen: a quiet kicker line, the
 * single <h1> in Newsreader, then one lead paragraph. On result steps the
 * lead paragraph opens with the safety line in semibold. Every label the step
 * needs (demo case, demo cache, offline mock) follows, so no feature can
 * forget them.
 */
export function StepHeader({ step }: { step: StepId }) {
  const def = getStep(step);
  const index = STEPS.findIndex((s) => s.id === step);
  const { caseObject, meta } = useCase();
  const mockEndpoints = useOfflineMockEndpoints();
  const demoTitle = caseObject.demo ? findDemoCase(caseObject.demo.caseId)?.title : undefined;

  const payload = payloadFor(step, caseObject.lastRanking?.response, meta);
  const showGlobalMock = mockEndpoints.length > 0 && payload.origin !== 'mock';
  const hasLabels = Boolean(caseObject.demo) || payload.origin === 'mock' || payload.source === 'demo' || showGlobalMock;

  return (
    <header className={styles.header}>
      <p className={styles.kicker}>
        Step {index + 1} of {STEPS.length}
        {caseObject.demo && (
          <>
            {' · '}
            {demoTitle && (
              <>
                <b>{demoTitle}</b>
                {' · '}
              </>
            )}
            demo case, not a real patient
          </>
        )}
      </p>
      <h1 className={styles.title}>{def.title}</h1>
      <p className={styles.lede}>
        {def.showsResults && (
          <>
            <Disclaimer inline />{' '}
          </>
        )}
        {def.lede}
      </p>
      {hasLabels && (
        <div className={styles.labels}>
          {caseObject.demo && <DemoCaseLabel sourcePhenopacketId={caseObject.demo.sourcePhenopacketId} />}
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
