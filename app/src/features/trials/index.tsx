/**
 * STUB owned by the trials feature task (spec task 3.6). Replace this file.
 * Contract: export `TrialsPanel` with no props. It shows recruiting studies
 * for caseObject.selectedCandidateId via api.trials(), with the
 * ClinicalTrials.gov credit (ATTRIBUTION.clinicalTrials). The ranking step
 * renders it below the candidate list.
 */
import { FeatureStub } from '../../shared/ui';

export function TrialsPanel() {
  return (
    <FeatureStub
      feature="trials"
      specTask="3.6"
      icon="trial"
      title="Recruiting studies are coming next"
      description="For the selected possible match, up to five recruiting studies from ClinicalTrials.gov, to ask the doctor about."
    />
  );
}
