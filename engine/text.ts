// Attribution and safety strings, verbatim from CONTRACT.md section 13.
// The app and landing reuse these; do not reword them here.

/** Every result screen (ranking, questions, trials) and the brief. */
export const DISCLAIMER =
  "Decision support, not a diagnosis. These are possible matches to discuss with a doctor.";

/** Footer and brief, always. `hpoVersion` comes from DataVersions.hpo. */
export function hpoAttribution(hpoVersion: string): string {
  return `This product uses the Human Phenotype Ontology (version ${hpoVersion}). Find out more at https://hpo.jax.org`;
}

/** When Monarch results appear. */
export const MONARCH_ATTRIBUTION =
  "Ranking by the Monarch Initiative semantic similarity service (monarchinitiative.org). Monarch tools are not for diagnosis or medical decisions.";

/** When Orphanet data appear. */
export const ORPHANET_ATTRIBUTION = "Orphanet data, CC BY 4.0 (orpha.net, orphadata.com).";

/** When trials appear. */
export const CLINICAL_TRIALS_ATTRIBUTION =
  "Trial data from ClinicalTrials.gov, U.S. National Library of Medicine.";

/** When PubCaseFinder appears. */
export const PUBCASEFINDER_ATTRIBUTION = "PubCaseFinder (DBCLS), CC BY 4.0.";

/** Demo data anywhere: the per-case label. */
export function demoLabel(sourcePhenopacketId: string): string {
  return `Demo case (synthetic narrative from phenopacket-store ${sourcePhenopacketId})`;
}

/** Demo data anywhere: the dataset credit. */
export const PHENOPACKET_STORE_ATTRIBUTION = "phenopacket-store, BSD-3-Clause.";

/** Shown in `createdBy` of every exported phenopacket (CONTRACT.md 7.7). */
export const CREATED_BY = "Rare Disease Detective v0.1";

/** externalReferences description for demo phenopackets (CONTRACT.md 7.7). */
export const DEMO_PHENOPACKET_REFERENCE =
  "DEMO DATA. Synthetic narrative derived from a phenopacket-store case (BSD-3). Not a real patient.";
