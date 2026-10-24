/**
 * STUB owned by the ranking feature task (spec task 3.4). Replace this file.
 * Contract: export `RankingStep` with no props. Call api.rank() with
 * currentRankRequest(caseObject) and an AbortSignal, then setRanking().
 * The shell shows the safety line and data labels, and renders TrialsPanel
 * (features/trials) below this component.
 */
import { termCounts, useCase, useCaseActions } from '../../shared/store';
import { Button, FeatureStub } from '../../shared/ui';

export function RankingStep() {
  const { caseObject } = useCase();
  const { goToStep } = useCaseActions();
  const { observed } = termCounts(caseObject);

  return (
    <FeatureStub
        feature="ranking"
        specTask="3.4"
        icon="compare"
        title="The ranked list is coming next"
        description="Up to five possible matches, each with the features that matched, the ones that did not, and how common each one is in that condition."
        action={
          observed === 0 ? (
            <Button variant="secondary" onClick={() => goToStep('features')}>
              Review the features first
            </Button>
          ) : undefined
        }
      >
        {observed > 0 && <p>{observed} present features are ready to match.</p>}
    </FeatureStub>
  );
}
