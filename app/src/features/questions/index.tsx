/**
 * STUB owned by the questions feature task (spec task 3.5). Replace this file.
 * Contract: export `QuestionsStep` with no props. Call api.nextQuestions()
 * with the top candidates from caseObject.lastRanking, then setQuestions().
 * Yes/No answers use addManualTerm(term, 'observed' | 'excluded').
 */
import { FeatureStub } from '../../shared/ui';

export function QuestionsStep() {
  return (
    <FeatureStub
      feature="questions"
      specTask="3.5"
      icon="question"
      title="Questions for the appointment are coming next"
      description="Up to five plain questions about features that best tell the top possible matches apart, each with the reason it was chosen."
    />
  );
}
