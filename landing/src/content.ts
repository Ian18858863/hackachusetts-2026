// All landing copy that carries a fact, a number or a link lives here, next to its source.
// Sources: docs/research/health-visions.md, BRIEFING.md section 4, docs/CONTRACT.md section 13,
// README.md "Honest evaluation". Do not add a number without a source.

export const PRODUCT_NAME = 'Rare Disease Detective';

/** Every call to action opens the app with the primary demo case preloaded (CONTRACT 0.1.1, R10.6). */
export const DEMO_HREF = '/app/?demo=demo-npc1';

/** DEMO_HREF in English; other languages add &lang=<code> so the app opens in the same language. */
export function demoHref(locale: string): string {
  return locale === 'en' ? DEMO_HREF : `${DEMO_HREF}&lang=${encodeURIComponent(locale)}`;
}

/**
 * The family entry point (T30): the same demo case in the app's family mode, which never
 * shows disease names. Other languages add &lang=<code>, as for DEMO_HREF.
 */
export const FAMILY_HREF = `${DEMO_HREF}&audience=family`;

export function familyHref(locale: string): string {
  return locale === 'en' ? FAMILY_HREF : `${FAMILY_HREF}&lang=${encodeURIComponent(locale)}`;
}

export const REPO_URL = 'https://github.com/Ian18858863/hackachusetts-2026';
export const README_URL = `${REPO_URL}#readme`;
export const BENCHMARK_URL = `${REPO_URL}/blob/main/docs/research/ranking-benchmark.md`;

/** Source phenopacket of demo-npc1 (CONTRACT section 9.1). */
export const DEMO_SOURCE_ID = 'PMID_27900365_patient';

/**
 * HPO release named in the footer attribution. 2026-09-01 is the latest HPO
 * GitHub release (tag v2026-09-01, checked 2026-10-24). Keep it in step with
 * the release the engine reports in dataVersions.hpo.
 */
export const HPO_VERSION = '2026-09-01';

// ---- Contract section 13, verbatim -------------------------------------------
export const DISCLAIMER =
  'Decision support, not a diagnosis. These are possible matches to discuss with a doctor.';
export const MONARCH_ATTRIBUTION =
  'Ranking by the Monarch Initiative semantic similarity service (monarchinitiative.org). Monarch tools are not for diagnosis or medical decisions.';
export const ORPHANET_ATTRIBUTION = 'Orphanet data, CC BY 4.0 (orpha.net, orphadata.com).';
export const CLINICAL_TRIALS_ATTRIBUTION =
  'Trial data from ClinicalTrials.gov, U.S. National Library of Medicine.';
export const DEMO_LABEL = `Demo case (synthetic narrative from phenopacket-store ${DEMO_SOURCE_ID})`;
export const PHENOPACKET_STORE_ATTRIBUTION = 'phenopacket-store, BSD-3-Clause.';

// ---- Problem (health-visions.md, "The problem in numbers") --------------------
// The numbers and their captions are translated in i18n/messages/landing.ts
// (stat1Value ... stat3Label); source titles and links stay here, in English.
export interface Cite {
  source: string;
  href: string;
}

const WAKAP: Cite = {
  source: 'Nguengang Wakap et al., Eur J Hum Genet 2020',
  href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6974615/',
};
const FAYE: Cite = {
  source: 'Faye et al., Eur J Hum Genet 2024',
  href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11369105/',
};

/** Cites for stat1, stat2 and stat3, in order. */
export const STAT_CITES: Cite[] = [WAKAP, FAYE, FAYE];

// ---- Evidence (health-visions.md "Design argument from the evidence") ---------
// Claims and details are in i18n/messages/landing.ts (study1Claim ... study2Detail).
// The own-evaluation sentence (ownResult) is the README "Honest evaluation" sentence, verbatim in English.

/** Cites for study1 and study2, in order. */
export const STUDY_CITES: Cite[] = [
  { source: 'Stud Health Technol Inform 2025', href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13075642/' },
  { source: 'Zhao et al., Nature 2026', href: 'https://www.nature.com/articles/s41586-025-10097-9' },
];
