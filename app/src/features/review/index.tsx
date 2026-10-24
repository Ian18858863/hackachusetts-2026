/**
 * STUB owned by the review feature task (spec task 3.3). Replace this file.
 * Contract: export `ReviewStep` with no props. Extraction status is in
 * useCase().extractStatus; terms are caseObject.terms.
 */
import { termCounts, useCase, useCaseActions } from '../../shared/store';
import {
  ApiErrorState,
  Button,
  FeatureStub,
  Icon,
  LoadingPanel,
  Skeleton,
  SkeletonText,
} from '../../shared/ui';

export function ReviewStep() {
  const { caseObject, extractStatus } = useCase();
  const { runExtraction, goToStep } = useCaseActions();
  const counts = termCounts(caseObject);

  if (extractStatus.state === 'loading') {
    return (
      <LoadingPanel step="Reading the notes and finding features">
        <SkeletonText lines={4} />
        <Skeleton height={220} radius="lg" />
      </LoadingPanel>
    );
  }

  if (extractStatus.state === 'error') {
    return (
      <ApiErrorState
        error={extractStatus.error}
        onRetry={() => void runExtraction()}
        actions={
          <Button variant="ghost" onClick={() => goToStep('notes')}>
            Back to the notes
          </Button>
        }
      />
    );
  }

  return (
    <FeatureStub
      feature="review"
      specTask="3.3"
      icon="list"
      title="Feature review is coming next"
      description="Each feature will show the words it came from, with controls to keep it, remove it or mark it as not present."
      action={
        counts.observed > 0 ? (
          <Button onClick={() => goToStep('matches')} iconEnd={<Icon name="arrowRight" size={16} />}>
            See possible matches
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => goToStep('notes')}>
            Add notes first
          </Button>
        )
      }
    >
      {caseObject.terms.length > 0 && (
        <p>
          This case holds {counts.observed} present and {counts.excluded} not present features
          {counts.removed > 0 ? `, plus ${counts.removed} removed` : ''}.
        </p>
      )}
    </FeatureStub>
  );
}
