/**
 * STUB owned by the intake feature task (spec task 3.2). Replace this file.
 * Contract: export `IntakeStep` with no props; read and write the case with
 * useCase() / useCaseActions() from shared/store. The shell renders the
 * view's <h1>, lede and data labels above this component.
 */
import { DEMO_CASES, PRIMARY_DEMO_CASE_ID } from '../../shared/mocks';
import { useCase, useCaseActions } from '../../shared/store';
import { Button, FeatureStub, Icon } from '../../shared/ui';

export function IntakeStep() {
  const { caseObject } = useCase();
  const { loadDemoCase, goToStep } = useCaseActions();
  const primary = DEMO_CASES.find((c) => c.caseId === PRIMARY_DEMO_CASE_ID);

  const tryDemo = () => {
    goToStep('features');
    void loadDemoCase(PRIMARY_DEMO_CASE_ID);
  };

  return (
    <FeatureStub
      feature="intake"
      specTask="3.2"
      icon="notes"
      title="The notes input is coming next"
      description="You will paste a symptom history here, up to 8,000 characters. For now, load the demo case to see the flow."
      action={
        <Button onClick={tryDemo} iconEnd={<Icon name="arrowRight" size={16} />}>
          Try a demo example
        </Button>
      }
    >
      {primary && <p>Demo example: {primary.title.toLowerCase()}.</p>}
      {caseObject.notes && <p>Current notes: {caseObject.notes.length.toLocaleString('en-US')} characters saved in this browser.</p>}
    </FeatureStub>
  );
}
