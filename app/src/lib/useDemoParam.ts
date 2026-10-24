import { useEffect, useState } from 'react';
import { findDemoCase } from '../shared/mocks';
import { stepHref } from '../shared/steps';
import { useCaseActions } from '../shared/store';

// Module scope: the address is read once per page load, even though React
// StrictMode runs initializers and effects twice in development.
let consumed: { caseId: string | null } | null = null;
let loaded = false;

/**
 * Reads ?demo=<caseId> once and rewrites the address before anything reads
 * the hash: a known id becomes #/features, and ?demo= is removed so a reload
 * keeps the user's edits instead of resetting the case. Other query
 * parameters (e.g. ?mock=1) are kept. Uses replaceState, so Back does not
 * return to the ?demo= address.
 */
function consumeDemoParam(): string | null {
  if (consumed) return consumed.caseId;
  const url = new URL(window.location.href);
  const requested = url.searchParams.get('demo');
  const caseId = requested && findDemoCase(requested) ? requested : null;
  if (requested !== null) {
    url.searchParams.delete('demo');
    if (caseId) url.hash = stepHref('features');
    window.history.replaceState(window.history.state, '', url);
  }
  consumed = { caseId };
  return caseId;
}

/**
 * Deep link from the landing page: /app/?demo=<caseId> (Requirement 10.6)
 * loads that demo case and opens the Features step.
 *
 * Call it in the shell BEFORE useHashRoute(), so the first route read
 * already sees #/features.
 */
export function useDemoParam(): void {
  const [caseId] = useState(consumeDemoParam);
  const { loadDemoCase } = useCaseActions();

  useEffect(() => {
    if (!caseId || loaded) return;
    loaded = true;
    void loadDemoCase(caseId);
  }, [caseId, loadDemoCase]);
}
