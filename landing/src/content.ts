// All landing copy that carries a fact, a number or a link lives here, next to its source.
// Sources: docs/research/health-visions.md, BRIEFING.md section 4, docs/CONTRACT.md section 13,
// README.md "Honest evaluation". Do not add a number without a source.

export const PRODUCT_NAME = 'Rare Disease Detective';

/** Every call to action opens the app with the primary demo case preloaded (CONTRACT 0.1.1, R10.6). */
export const DEMO_HREF = '/app/?demo=demo-npc1';

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
export interface Stat {
  value: string;
  label: string;
  source: string;
  href: string;
}

const WAKAP = {
  source: 'Nguengang Wakap et al., Eur J Hum Genet 2020',
  href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6974615/',
};
const FAYE = {
  source: 'Faye et al., Eur J Hum Genet 2024',
  href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11369105/',
};

export const STATS: Stat[] = [
  { value: '263–446 million', label: 'people worldwide live with a rare disease', ...WAKAP },
  { value: '4.7 years', label: 'mean time to diagnosis (the median is 0.8 years)', ...FAYE },
  { value: '73%', label: 'of patients were misdiagnosed at least once', ...FAYE },
];

export const SURVEY_NOTE =
  'Time to diagnosis and misdiagnosis come from the Rare Barometer survey of 6,507 patients in 41 European countries, run in 2022.';

// ---- How it works (README "What it does", CONTRACT section 1) -----------------
export interface Step {
  title: string;
  body: string;
}

export const STEPS: Step[] = [
  {
    title: 'Notes',
    body: 'Paste a symptom history in plain words, or open the demo case.',
  },
  {
    title: 'Features with their source sentence',
    body: 'Each medical feature (an HPO term) sits next to the exact words it came from. Things the notes say are absent, such as “I do not get headaches”, go into a Not present group. You keep, remove or add features.',
  },
  {
    title: 'Possible matches with evidence',
    body: 'Rare conditions ranked by how well the features overlap. Each shows which features match, which do not, and how often each occurs in that condition according to HPO annotations. Overlap is a word (strong, partial, weak), never a percentage.',
  },
  {
    title: 'What to check next',
    body: 'The features that best separate the top matches, written as plain questions for the appointment.',
  },
  {
    title: 'Brief, phenopacket and trials',
    body: 'A one-page brief to print or save as PDF, a GA4GH Phenopacket file with the features and no diagnosis inside, and recruiting studies from ClinicalTrials.gov.',
  },
];

// ---- Evidence (health-visions.md "Design argument from the evidence") ---------
export interface Study {
  claim: string;
  detail: string;
  source: string;
  href: string;
}

export const STUDIES: Study[] = [
  {
    claim: 'A language model and an ontology tool together beat either alone',
    detail:
      'In 424 patients of the Undiagnosed Diseases Network, GPT-4o with the Exomiser ranking tool reached 30% differential accuracy, against 22.4% for GPT-4o and 13.9% for Exomiser on their own.',
    source: 'Stud Health Technol Inform 2025',
    href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13075642/',
  },
  {
    claim: 'An agent with ontology tools and traceable evidence leads the field',
    detail:
      'DeepRare, an LLM agent that calls more than 40 tools and shows its reasoning, ranked the right disease first in 57% of cases on average across HPO-based benchmarks.',
    source: 'Zhao et al., Nature 2026',
    href: 'https://www.nature.com/articles/s41586-025-10097-9',
  },
];

/** README "Honest evaluation", verbatim. */
export const OWN_EVALUATION =
  'On 10 published cases selected by a fixed rule, the correct condition ranked first in 5 and in the top 3 in 6 (our own small evaluation).';
