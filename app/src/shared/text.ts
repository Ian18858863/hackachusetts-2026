/**
 * User-facing safety and attribution text, verbatim from docs/CONTRACT.md
 * section 13. The engine will export the same strings from engine/text.ts;
 * until the app imports them from there, keep these identical.
 */

export const DISCLAIMER =
  'Decision support, not a diagnosis. These are possible matches to discuss with a doctor.';

export function hpoAttribution(version: string): string {
  return `This product uses the Human Phenotype Ontology (version ${version}). Find out more at https://hpo.jax.org`;
}

export const ATTRIBUTION = {
  monarch:
    'Ranking by the Monarch Initiative semantic similarity service (monarchinitiative.org). Monarch tools are not for diagnosis or medical decisions.',
  orphanet: 'Orphanet data, CC BY 4.0 (orpha.net, orphadata.com).',
  clinicalTrials: 'Trial data from ClinicalTrials.gov, U.S. National Library of Medicine.',
  pubCaseFinder: 'PubCaseFinder (DBCLS), CC BY 4.0.',
  phenopacketStore: 'phenopacket-store, BSD-3-Clause.',
} as const;

export function demoCaseLabel(sourcePhenopacketId: string): string {
  return `Demo case (synthetic narrative from phenopacket-store ${sourcePhenopacketId})`;
}

/** Shown on every view whose data came from the app's bundled offline mocks. */
export const OFFLINE_MOCK_LABEL = 'Demo data (offline mock)';

export const PRODUCT_NAME = 'Rare Disease Detective';
