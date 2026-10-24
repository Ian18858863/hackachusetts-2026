/**
 * Recorded upstream data for the primary demo case demo-npc1 (offline mocks only).
 *
 * Recorded from Monarch/JAX on 2026-10-24 13:17 ET (17:17-17:18Z):
 * - Ranking: GET https://api.monarchinitiative.org/v3/api/semsim/search/
 *   HP:0006579,HP:0007017,HP:0031987,HP:0001260,HP:0002527,HP:0001268,HP:0001251,
 *   HP:0031833,HP:0002240,HP:0001744,HP:0003651,HP:0003349/Human%20Diseases?limit=5
 *   (the 12 observed terms of contract section 9.1). Candidates, order, raw
 *   scores, MONDO ids, names, xrefs and object_best_matches are copied from it.
 * - Annotations: GET https://ontology.jax.org/api/network/annotation/<id> for each
 *   candidate's ORPHA and OMIM xref. ORPHA:480556 answered 404, so that
 *   candidate uses OMIM:617394 only. Frequencies: the ORPHA band if present,
 *   else the OMIM "n/m" value mapped to the contract section 5 band (raw kept).
 *   Rows annotated without a frequency have label null. Rows in the
 *   "Inheritance" and "Clinical course" categories (mode of inheritance, age of
 *   onset) are left out because they are not features to ask about, and those
 *   two names are left out of `categories` too, so `categories` lists organ
 *   systems only (contract 7.7 maps them to specialists).
 * - match.qualifies applies contract 7.4 step 5: the shared term must be an HPO
 *   term that is neither HP:0000118 nor one of its 23 direct children
 *   (GET https://ontology.jax.org/api/hp/terms/HP:0000118/children). Non-HPO
 *   subsumers (UPHENO:) do not qualify.
 * - Trials: GET https://clinicaltrials.gov/api/v2/studies?query.cond=Niemann-Pick%20disease%20type%20C
 *   &filter.overallStatus=RECRUITING&pageSize=5&countTotal=true&fields=... at 2026-10-24T17:18:32Z.
 *
 * Raw upstream data: app/src/shared/mocks/recorded/*.json holds the same calls,
 * trimmed to the fields used here, each with its request URL and fetchedAt
 * (re-fetched 2026-10-24T17:42:07Z-17:42:25Z). On that re-fetch every value
 * below matched the JSON (scores equal to 1e-9). The JSON files are not
 * imported by the app; they are the evidence for the values below. If you
 * change a value here, re-fetch and update the matching JSON file too.
 */
import type { FrequencyInfo, Gene, HpoId, TermRef, Trial } from '../contract';

export const NPC1_RECORDED_AT = '2026-10-24T17:17:39.000Z';
export const NPC1_TRIALS_RECORDED_AT = '2026-10-24T17:18:32.000Z';

export interface RecordedMatch {
  /** Disease term Monarch matched (match_target). */
  target: TermRef;
  /** Shared term (match_subsumer). */
  subsumer: TermRef;
  /** Passes contract 7.4 step 5. */
  qualifies: boolean;
}

export interface RecordedFeature {
  term: TermRef;
  frequency: FrequencyInfo;
}

export interface RecordedCandidate {
  diseaseId: string;
  mondoId: string;
  name: string;
  /** Raw Monarch semsim score for the 12 recorded terms. */
  score: number;
  links: { monarch: string; orphanet?: string; omim?: string };
  genes: Gene[];
  geneSources: Record<string, string>;
  categories: string[];
  /** Annotation ids that answered (feeds sources: 'hpo-annotations'). */
  annotationIds: string[];
  /** Monarch object_best_matches, keyed by patient term. */
  matches: Record<HpoId, RecordedMatch>;
  annotations: RecordedFeature[];
}

/** Monarch order (score descending). */
export const NPC1_RECORDED_CANDIDATES: readonly RecordedCandidate[] = [
  {
    diseaseId: 'OMIM:257220',
    mondoId: 'MONDO:0009757',
    name: 'Niemann-Pick disease, type C1',
    score: 13.768556970635796,
    links: { monarch: 'https://monarchinitiative.org/MONDO:0009757', omim: 'https://omim.org/entry/257220' },
    genes: [{ id: 'NCBIGene:4864', symbol: 'NPC1' }],
    geneSources: { 'NCBIGene:4864': 'OMIM:257220' },
    categories: ['Blood and blood-forming tissues', 'Cardiovascular', 'Cellular phenotype', 'Digestive System', 'Eye', 'Metabolism/Laboratory abnormality', 'Musculature', 'Nervous System', 'Prenatal and Birth'],
    annotationIds: ['OMIM:257220'],
    matches: {
      'HP:0006579': { target: { id: 'HP:0006579', label: 'Prolonged neonatal jaundice' }, subsumer: { id: 'HP:0006579', label: 'Prolonged neonatal jaundice' }, qualifies: true },
      'HP:0007017': { target: { id: 'HP:0000726', label: 'Dementia' }, subsumer: { id: 'HP:0100543', label: 'Cognitive impairment' }, qualifies: true },
      'HP:0031987': { target: { id: 'HP:0000726', label: 'Dementia' }, subsumer: { id: 'HP:0100543', label: 'Cognitive impairment' }, qualifies: true },
      'HP:0001260': { target: { id: 'HP:0001260', label: 'Dysarthria' }, subsumer: { id: 'HP:0001260', label: 'Dysarthria' }, qualifies: true },
      'HP:0002527': { target: { id: 'HP:0002066', label: 'Gait ataxia' }, subsumer: { id: 'HP:0001288', label: 'Gait disturbance' }, qualifies: true },
      'HP:0001268': { target: { id: 'HP:0000726', label: 'Dementia' }, subsumer: { id: 'HP:0001268', label: 'Mental deterioration' }, qualifies: true },
      'HP:0001251': { target: { id: 'HP:0001251', label: 'Ataxia' }, subsumer: { id: 'HP:0001251', label: 'Ataxia' }, qualifies: true },
      'HP:0031833': { target: { id: 'HP:0000511', label: 'Vertical supranuclear gaze palsy' }, subsumer: { id: 'HP:0000496', label: 'Abnormality of eye movement' }, qualifies: true },
      'HP:0002240': { target: { id: 'HP:0002240', label: 'Hepatomegaly' }, subsumer: { id: 'HP:0002240', label: 'Hepatomegaly' }, qualifies: true },
      'HP:0001744': { target: { id: 'HP:0001744', label: 'Splenomegaly' }, subsumer: { id: 'HP:0001744', label: 'Splenomegaly' }, qualifies: true },
      'HP:0003651': { target: { id: 'HP:0003640', label: 'CNS foam cells' }, subsumer: { id: 'HP:0003651', label: 'Foam cells' }, qualifies: true },
      'HP:0003349': { target: { id: 'HP:0003349', label: 'Low cholesterol esterification rate' }, subsumer: { id: 'HP:0003349', label: 'Low cholesterol esterification rate' }, qualifies: true },
    },
    annotations: [
      { term: { id: 'HP:0000511', label: 'Vertical supranuclear gaze palsy' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0001791', label: 'Fetal ascites' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0003349', label: 'Low cholesterol esterification rate' }, frequency: { label: 'Obligate', raw: '13/13', source: 'OMIM:257220' } },
      { term: { id: 'HP:6001353', label: 'Elevated circulating C-triol concentration' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0002185', label: 'Neurofibrillary tangles' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0001250', label: 'Seizure' }, frequency: { label: 'Very frequent', raw: '12/14', source: 'OMIM:257220' } },
      { term: { id: 'HP:0000709', label: 'Psychosis' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0001251', label: 'Ataxia' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0001260', label: 'Dysarthria' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0000726', label: 'Dementia' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0001263', label: 'Global developmental delay' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0001332', label: 'Dystonia' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0002529', label: 'Neuronal loss in central nervous system' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0002524', label: 'Cataplexy' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0001249', label: 'Intellectual disability' }, frequency: { label: 'Obligate', raw: '4/4', source: 'OMIM:257220' } },
      { term: { id: 'HP:0002371', label: 'Loss of speech' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0002066', label: 'Gait ataxia' }, frequency: { label: 'Obligate', raw: '4/4', source: 'OMIM:257220' } },
      { term: { id: 'HP:0003640', label: 'CNS foam cells' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0001744', label: 'Splenomegaly' }, frequency: { label: 'Frequent', raw: '4/13', source: 'OMIM:257220' } },
      { term: { id: 'HP:0003651', label: 'Foam cells' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0001290', label: 'Generalized hypotonia' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0001252', label: 'Hypotonia' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0001257', label: 'Spasticity' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0006579', label: 'Prolonged neonatal jaundice' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0002240', label: 'Hepatomegaly' }, frequency: { label: 'Frequent', raw: '7/13', source: 'OMIM:257220' } },
      { term: { id: 'HP:0002015', label: 'Dysphagia' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0006583', label: 'Fatal liver failure in infancy' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:0001982', label: 'Sea-blue histiocytosis' }, frequency: { label: 'Obligate', raw: '4/4', source: 'OMIM:257220' } },
      { term: { id: 'HP:0004333', label: 'Bone-marrow foam cells' }, frequency: { label: null, source: 'OMIM:257220' } },
      { term: { id: 'HP:6000158', label: 'Unesterified cholesterol accumulation in cultured fibroblasts' }, frequency: { label: null, source: 'OMIM:257220' } },
    ],
  },
  {
    diseaseId: 'ORPHA:2274',
    mondoId: 'MONDO:0009445',
    name: 'ichthyosis-hepatosplenomegaly-cerebellar degeneration syndrome',
    score: 13.60032992185091,
    links: { monarch: 'https://monarchinitiative.org/MONDO:0009445', orphanet: 'https://www.orpha.net/en/disease/detail/2274', omim: 'https://omim.org/entry/242520' },
    genes: [],
    geneSources: {  },
    categories: ['Cardiovascular', 'Digestive System', 'Nervous System', 'Skin, Hair, and Nails'],
    annotationIds: ['ORPHA:2274', 'OMIM:242520'],
    matches: {
      'HP:0006579': { target: { id: 'HP:0001433', label: 'Hepatosplenomegaly' }, subsumer: { id: 'HP:0001392', label: 'Abnormality of the liver' }, qualifies: true },
      'HP:0007017': { target: { id: 'HP:0000726', label: 'Dementia' }, subsumer: { id: 'HP:0100543', label: 'Cognitive impairment' }, qualifies: true },
      'HP:0031987': { target: { id: 'HP:0000726', label: 'Dementia' }, subsumer: { id: 'HP:0100543', label: 'Cognitive impairment' }, qualifies: true },
      'HP:0001260': { target: { id: 'HP:0001260', label: 'Dysarthria' }, subsumer: { id: 'HP:0001260', label: 'Dysarthria' }, qualifies: true },
      'HP:0002527': { target: { id: 'HP:0001288', label: 'Gait disturbance' }, subsumer: { id: 'HP:0001288', label: 'Gait disturbance' }, qualifies: true },
      'HP:0001268': { target: { id: 'HP:0000726', label: 'Dementia' }, subsumer: { id: 'HP:0001268', label: 'Mental deterioration' }, qualifies: true },
      'HP:0001251': { target: { id: 'HP:0001251', label: 'Ataxia' }, subsumer: { id: 'HP:0001251', label: 'Ataxia' }, qualifies: true },
      'HP:0031833': { target: { id: 'HP:0001251', label: 'Ataxia' }, subsumer: { id: 'UPHENO:0079826', label: 'behavior process phenotype' }, qualifies: false },
      'HP:0002240': { target: { id: 'HP:0001433', label: 'Hepatosplenomegaly' }, subsumer: { id: 'HP:0002240', label: 'Hepatomegaly' }, qualifies: true },
      'HP:0001744': { target: { id: 'HP:0001433', label: 'Hepatosplenomegaly' }, subsumer: { id: 'HP:0001744', label: 'Splenomegaly' }, qualifies: true },
      'HP:0003651': { target: { id: 'HP:0001433', label: 'Hepatosplenomegaly' }, subsumer: { id: 'HP:0002597', label: 'Abnormality of the vasculature' }, qualifies: true },
      'HP:0003349': { target: { id: 'HP:0000726', label: 'Dementia' }, subsumer: { id: 'HP:0000118', label: 'Phenotypic abnormality' }, qualifies: false },
    },
    annotations: [
      { term: { id: 'HP:0000726', label: 'Dementia' }, frequency: { label: 'Very frequent', source: 'ORPHA:2274' } },
      { term: { id: 'HP:0001265', label: 'Hyporeflexia' }, frequency: { label: 'Very frequent', source: 'ORPHA:2274' } },
      { term: { id: 'HP:0001251', label: 'Ataxia' }, frequency: { label: 'Very frequent', source: 'ORPHA:2274' } },
      { term: { id: 'HP:0002167', label: 'Abnormal speech pattern' }, frequency: { label: 'Very frequent', source: 'ORPHA:2274' } },
      { term: { id: 'HP:0001288', label: 'Gait disturbance' }, frequency: { label: 'Very frequent', source: 'ORPHA:2274' } },
      { term: { id: 'HP:0001744', label: 'Splenomegaly' }, frequency: { label: 'Very frequent', source: 'ORPHA:2274' } },
      { term: { id: 'HP:0002240', label: 'Hepatomegaly' }, frequency: { label: 'Very frequent', source: 'ORPHA:2274' } },
      { term: { id: 'HP:0008064', label: 'Ichthyosis' }, frequency: { label: 'Very frequent', source: 'ORPHA:2274' } },
      { term: { id: 'HP:0001260', label: 'Dysarthria' }, frequency: { label: null, source: 'OMIM:242520' } },
      { term: { id: 'HP:0001433', label: 'Hepatosplenomegaly' }, frequency: { label: null, source: 'OMIM:242520' } },
    ],
  },
  {
    diseaseId: 'OMIM:607625',
    mondoId: 'MONDO:0011873',
    name: 'Niemann-Pick disease, type C2',
    score: 13.513454282927398,
    links: { monarch: 'https://monarchinitiative.org/MONDO:0011873', omim: 'https://omim.org/entry/607625' },
    genes: [{ id: 'NCBIGene:10577', symbol: 'NPC2' }],
    geneSources: { 'NCBIGene:10577': 'OMIM:607625' },
    categories: ['Blood and blood-forming tissues', 'Cardiovascular', 'Digestive System', 'Eye', 'Metabolism/Laboratory abnormality', 'Musculature', 'Nervous System', 'Prenatal and Birth', 'Respiratory System'],
    annotationIds: ['OMIM:607625'],
    matches: {
      'HP:0006579': { target: { id: 'HP:0006579', label: 'Prolonged neonatal jaundice' }, subsumer: { id: 'HP:0006579', label: 'Prolonged neonatal jaundice' }, qualifies: true },
      'HP:0007017': { target: { id: 'HP:0000726', label: 'Dementia' }, subsumer: { id: 'HP:0100543', label: 'Cognitive impairment' }, qualifies: true },
      'HP:0031987': { target: { id: 'HP:0030223', label: 'Perseverative thought' }, subsumer: { id: 'HP:0025769', label: 'Disordered formal thought process' }, qualifies: true },
      'HP:0001260': { target: { id: 'HP:0001260', label: 'Dysarthria' }, subsumer: { id: 'HP:0001260', label: 'Dysarthria' }, qualifies: true },
      'HP:0002527': { target: { id: 'HP:0001332', label: 'Dystonia' }, subsumer: { id: 'HP:0100022', label: 'Abnormality of movement' }, qualifies: true },
      'HP:0001268': { target: { id: 'HP:0000726', label: 'Dementia' }, subsumer: { id: 'HP:0001268', label: 'Mental deterioration' }, qualifies: true },
      'HP:0001251': { target: { id: 'HP:0001251', label: 'Ataxia' }, subsumer: { id: 'HP:0001251', label: 'Ataxia' }, qualifies: true },
      'HP:0031833': { target: { id: 'HP:0000511', label: 'Vertical supranuclear gaze palsy' }, subsumer: { id: 'HP:0000496', label: 'Abnormality of eye movement' }, qualifies: true },
      'HP:0002240': { target: { id: 'HP:0002240', label: 'Hepatomegaly' }, subsumer: { id: 'HP:0002240', label: 'Hepatomegaly' }, qualifies: true },
      'HP:0001744': { target: { id: 'HP:0001744', label: 'Splenomegaly' }, subsumer: { id: 'HP:0001744', label: 'Splenomegaly' }, qualifies: true },
      'HP:0003651': { target: { id: 'HP:0003640', label: 'CNS foam cells' }, subsumer: { id: 'HP:0003651', label: 'Foam cells' }, qualifies: true },
      'HP:0003349': { target: { id: 'HP:0003349', label: 'Low cholesterol esterification rate' }, subsumer: { id: 'HP:0003349', label: 'Low cholesterol esterification rate' }, qualifies: true },
    },
    annotations: [
      { term: { id: 'HP:0000511', label: 'Vertical supranuclear gaze palsy' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0001791', label: 'Fetal ascites' }, frequency: { label: 'Occasional', raw: '1/8', source: 'OMIM:607625' } },
      { term: { id: 'HP:0001561', label: 'Polyhydramnios' }, frequency: { label: 'Occasional', raw: '1/8', source: 'OMIM:607625' } },
      { term: { id: 'HP:6001353', label: 'Elevated circulating C-triol concentration' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0003349', label: 'Low cholesterol esterification rate' }, frequency: { label: 'Obligate', raw: '8/8', source: 'OMIM:607625' } },
      { term: { id: 'HP:0000726', label: 'Dementia' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0001332', label: 'Dystonia' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0001251', label: 'Ataxia' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0001250', label: 'Seizure' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0002371', label: 'Loss of speech' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0002524', label: 'Cataplexy' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0002185', label: 'Neurofibrillary tangles' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0001263', label: 'Global developmental delay' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0000709', label: 'Psychosis' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0001249', label: 'Intellectual disability' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0001260', label: 'Dysarthria' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0030223', label: 'Perseverative thought' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0000733', label: 'Motor stereotypy' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0003640', label: 'CNS foam cells' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0001744', label: 'Splenomegaly' }, frequency: { label: 'Frequent', raw: '5/8', source: 'OMIM:607625' } },
      { term: { id: 'HP:0003651', label: 'Foam cells' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0001252', label: 'Hypotonia' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0001257', label: 'Spasticity' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0002878', label: 'Respiratory failure' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0002643', label: 'Neonatal respiratory distress' }, frequency: { label: 'Occasional', raw: '1/8', source: 'OMIM:607625' } },
      { term: { id: 'HP:0002206', label: 'Pulmonary fibrosis' }, frequency: { label: 'Obligate', raw: '1/1', source: 'OMIM:607625' } },
      { term: { id: 'HP:0002093', label: 'Respiratory insufficiency' }, frequency: { label: 'Very frequent', raw: '7/8', source: 'OMIM:607625' } },
      { term: { id: 'HP:0000952', label: 'Jaundice' }, frequency: { label: 'Frequent', raw: '5/8', source: 'OMIM:607625' } },
      { term: { id: 'HP:0002240', label: 'Hepatomegaly' }, frequency: { label: 'Frequent', raw: '5/8', source: 'OMIM:607625' } },
      { term: { id: 'HP:0006579', label: 'Prolonged neonatal jaundice' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0002015', label: 'Dysphagia' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0004333', label: 'Bone-marrow foam cells' }, frequency: { label: null, source: 'OMIM:607625' } },
      { term: { id: 'HP:0001982', label: 'Sea-blue histiocytosis' }, frequency: { label: null, source: 'OMIM:607625' } },
    ],
  },
  {
    diseaseId: 'ORPHA:480556',
    mondoId: 'MONDO:0018816',
    name: 'isolated neonatal sclerosing cholangitis',
    score: 12.105663557182051,
    links: { monarch: 'https://monarchinitiative.org/MONDO:0018816', orphanet: 'https://www.orpha.net/en/disease/detail/480556', omim: 'https://omim.org/entry/617394' },
    genes: [{ id: 'NCBIGene:51473', symbol: 'DCDC2' }],
    geneSources: { 'NCBIGene:51473': 'OMIM:617394' },
    categories: ['Cardiovascular', 'Digestive System', 'Ear', 'Genitourinary system', 'Metabolism/Laboratory abnormality', 'Nervous System', 'Skin, Hair, and Nails'],
    annotationIds: ['OMIM:617394'],
    matches: {
      'HP:0006579': { target: { id: 'HP:0000952', label: 'Jaundice' }, subsumer: { id: 'HP:0000952', label: 'Jaundice' }, qualifies: true },
      'HP:0007017': { target: { id: 'HP:0001256', label: 'Mild intellectual disability' }, subsumer: { id: 'HP:0011446', label: 'Abnormality of mental function' }, qualifies: true },
      'HP:0031987': { target: { id: 'HP:0001256', label: 'Mild intellectual disability' }, subsumer: { id: 'HP:0011446', label: 'Abnormality of mental function' }, qualifies: true },
      'HP:0001260': { target: { id: 'HP:0001256', label: 'Mild intellectual disability' }, subsumer: { id: 'HP:0011446', label: 'Abnormality of mental function' }, qualifies: true },
      'HP:0002527': { target: { id: 'HP:0000365', label: 'Hearing impairment' }, subsumer: { id: 'UPHENO:0049699', label: 'nervous system process phenotype' }, qualifies: false },
      'HP:0001268': { target: { id: 'HP:0001256', label: 'Mild intellectual disability' }, subsumer: { id: 'HP:0011446', label: 'Abnormality of mental function' }, qualifies: true },
      'HP:0001251': { target: { id: 'HP:0000365', label: 'Hearing impairment' }, subsumer: { id: 'UPHENO:0005596', label: 'decreased multicellular organismal process' }, qualifies: false },
      'HP:0031833': { target: { id: 'HP:0000365', label: 'Hearing impairment' }, subsumer: { id: 'UPHENO:0002211', label: 'sense organ physiology phenotype' }, qualifies: false },
      'HP:0002240': { target: { id: 'HP:0002240', label: 'Hepatomegaly' }, subsumer: { id: 'HP:0002240', label: 'Hepatomegaly' }, qualifies: true },
      'HP:0001744': { target: { id: 'HP:0001744', label: 'Splenomegaly' }, subsumer: { id: 'HP:0001744', label: 'Splenomegaly' }, qualifies: true },
      'HP:0003651': { target: { id: 'HP:0001409', label: 'Portal hypertension' }, subsumer: { id: 'HP:0002597', label: 'Abnormality of the vasculature' }, qualifies: true },
      'HP:0003349': { target: { id: 'HP:0030948', label: 'Elevated gamma-glutamyltransferase level' }, subsumer: { id: 'HP:0012379', label: 'Abnormal circulating enzyme concentration or activity' }, qualifies: true },
    },
    annotations: [
      { term: { id: 'HP:0011985', label: 'Acholic stools' }, frequency: { label: 'Frequent', raw: '6/11', source: 'OMIM:617394' } },
      { term: { id: 'HP:0030948', label: 'Elevated gamma-glutamyltransferase level' }, frequency: { label: 'Obligate', raw: '7/7', source: 'OMIM:617394' } },
      { term: { id: 'HP:0001256', label: 'Mild intellectual disability' }, frequency: { label: 'Occasional', raw: '1/4', source: 'OMIM:617394' } },
      { term: { id: 'HP:0001409', label: 'Portal hypertension' }, frequency: { label: 'Obligate', raw: '4/4', source: 'OMIM:617394' } },
      { term: { id: 'HP:0001744', label: 'Splenomegaly' }, frequency: { label: 'Frequent', raw: '5/7', source: 'OMIM:617394' } },
      { term: { id: 'HP:0000076', label: 'Vesicoureteral reflux' }, frequency: { label: 'Occasional', raw: '1/4', source: 'OMIM:617394' } },
      { term: { id: 'HP:0000365', label: 'Hearing impairment' }, frequency: { label: 'Excluded', raw: '0/4', source: 'OMIM:617394' } },
      { term: { id: 'HP:0000952', label: 'Jaundice' }, frequency: { label: 'Obligate', raw: '7/7', source: 'OMIM:617394' } },
      { term: { id: 'HP:0001394', label: 'Cirrhosis' }, frequency: { label: 'Frequent', raw: '3/4', source: 'OMIM:617394' } },
      { term: { id: 'HP:0001399', label: 'Hepatic failure' }, frequency: { label: 'Obligate', raw: '4/4', source: 'OMIM:617394' } },
      { term: { id: 'HP:0001541', label: 'Ascites' }, frequency: { label: 'Occasional', raw: '1/7', source: 'OMIM:617394' } },
      { term: { id: 'HP:0034294', label: 'Ductal bile plugs' }, frequency: { label: 'Frequent', raw: '4/7', source: 'OMIM:617394' } },
      { term: { id: 'HP:0030991', label: 'Sclerosing cholangitis' }, frequency: { label: 'Obligate', raw: '4/4', source: 'OMIM:617394' } },
      { term: { id: 'HP:0001408', label: 'Bile duct proliferation' }, frequency: { label: 'Frequent', raw: '6/11', source: 'OMIM:617394' } },
      { term: { id: 'HP:0006580', label: 'Portal fibrosis' }, frequency: { label: 'Obligate', raw: '4/4', source: 'OMIM:617394' } },
      { term: { id: 'HP:0001396', label: 'Cholestasis' }, frequency: { label: 'Obligate', raw: '4/4', source: 'OMIM:617394' } },
      { term: { id: 'HP:0002240', label: 'Hepatomegaly' }, frequency: { label: 'Occasional', raw: '1/7', source: 'OMIM:617394' } },
      { term: { id: 'HP:0012852', label: 'Hepatic bridging fibrosis' }, frequency: { label: 'Frequent', raw: '4/7', source: 'OMIM:617394' } },
      { term: { id: 'HP:0002613', label: 'Biliary cirrhosis' }, frequency: { label: null, source: 'OMIM:617394' } },
      { term: { id: 'HP:0000989', label: 'Pruritus' }, frequency: { label: 'Frequent', raw: '5/7', source: 'OMIM:617394' } },
    ],
  },
  {
    diseaseId: 'ORPHA:33574',
    mondoId: 'MONDO:0009259',
    name: 'gamma-glutamylcysteine synthetase deficiency',
    score: 11.585167464171132,
    links: { monarch: 'https://monarchinitiative.org/MONDO:0009259', orphanet: 'https://www.orpha.net/en/disease/detail/33574', omim: 'https://omim.org/entry/230450' },
    genes: [{ id: 'NCBIGene:2729', symbol: 'GCLC' }],
    geneSources: { 'NCBIGene:2729': 'ORPHA:33574' },
    categories: ['Blood and blood-forming tissues', 'Cardiovascular', 'Digestive System', 'Metabolism/Laboratory abnormality', 'Musculature', 'Nervous System'],
    annotationIds: ['ORPHA:33574', 'OMIM:230450'],
    matches: {
      'HP:0006579': { target: { id: 'HP:0000952', label: 'Jaundice' }, subsumer: { id: 'HP:0000952', label: 'Jaundice' }, qualifies: true },
      'HP:0007017': { target: { id: 'HP:0000709', label: 'Psychosis' }, subsumer: { id: 'HP:0011446', label: 'Abnormality of mental function' }, qualifies: true },
      'HP:0031987': { target: { id: 'HP:0001260', label: 'Dysarthria' }, subsumer: { id: 'HP:0025792', label: 'Abnormal cognitive process' }, qualifies: true },
      'HP:0001260': { target: { id: 'HP:0001260', label: 'Dysarthria' }, subsumer: { id: 'HP:0001260', label: 'Dysarthria' }, qualifies: true },
      'HP:0002527': { target: { id: 'HP:0001347', label: 'Hyperreflexia' }, subsumer: { id: 'HP:0100022', label: 'Abnormality of movement' }, qualifies: true },
      'HP:0001268': { target: { id: 'HP:0000709', label: 'Psychosis' }, subsumer: { id: 'HP:0011446', label: 'Abnormality of mental function' }, qualifies: true },
      'HP:0001251': { target: { id: 'HP:0001251', label: 'Ataxia' }, subsumer: { id: 'HP:0001251', label: 'Ataxia' }, qualifies: true },
      'HP:0031833': { target: { id: 'HP:0001251', label: 'Ataxia' }, subsumer: { id: 'UPHENO:0079826', label: 'behavior process phenotype' }, qualifies: false },
      'HP:0002240': { target: { id: 'HP:0001433', label: 'Hepatosplenomegaly' }, subsumer: { id: 'HP:0002240', label: 'Hepatomegaly' }, qualifies: true },
      'HP:0001744': { target: { id: 'HP:0001433', label: 'Hepatosplenomegaly' }, subsumer: { id: 'HP:0001744', label: 'Splenomegaly' }, qualifies: true },
      'HP:0003651': { target: { id: 'HP:0001923', label: 'Reticulocytosis' }, subsumer: { id: 'UPHENO:0079539', label: 'increased number of cell' }, qualifies: false },
      'HP:0003349': { target: { id: 'HP:0025435', label: 'Increased circulating lactate dehydrogenase concentration' }, subsumer: { id: 'HP:0012379', label: 'Abnormal circulating enzyme concentration or activity' }, qualifies: true },
    },
    annotations: [
      { term: { id: 'HP:0003355', label: 'Aminoaciduria' }, frequency: { label: 'Very frequent', source: 'ORPHA:33574' } },
      { term: { id: 'HP:0001260', label: 'Dysarthria' }, frequency: { label: 'Occasional', source: 'ORPHA:33574' } },
      { term: { id: 'HP:0002503', label: 'Spinocerebellar tract degeneration' }, frequency: { label: 'Very frequent', source: 'ORPHA:33574' } },
      { term: { id: 'HP:0009830', label: 'Peripheral neuropathy' }, frequency: { label: 'Very frequent', source: 'ORPHA:33574' } },
      { term: { id: 'HP:0001251', label: 'Ataxia' }, frequency: { label: 'Occasional', source: 'ORPHA:33574' } },
      { term: { id: 'HP:0001263', label: 'Global developmental delay' }, frequency: { label: 'Occasional', source: 'ORPHA:33574' } },
      { term: { id: 'HP:0010522', label: 'Dyslexia' }, frequency: { label: 'Occasional', source: 'ORPHA:33574' } },
      { term: { id: 'HP:0000709', label: 'Psychosis' }, frequency: { label: 'Occasional', source: 'ORPHA:33574' } },
      { term: { id: 'HP:0001347', label: 'Hyperreflexia' }, frequency: { label: 'Occasional', source: 'ORPHA:33574' } },
      { term: { id: 'HP:0001249', label: 'Intellectual disability' }, frequency: { label: 'Occasional', source: 'ORPHA:33574' } },
      { term: { id: 'HP:0001433', label: 'Hepatosplenomegaly' }, frequency: { label: 'Occasional', source: 'ORPHA:33574' } },
      { term: { id: 'HP:0003198', label: 'Myopathy' }, frequency: { label: 'Very frequent', source: 'ORPHA:33574' } },
      { term: { id: 'HP:0000952', label: 'Jaundice' }, frequency: { label: 'Occasional', source: 'ORPHA:33574' } },
      { term: { id: 'HP:0001923', label: 'Reticulocytosis' }, frequency: { label: 'Occasional', source: 'ORPHA:33574' } },
      { term: { id: 'HP:0001878', label: 'Hemolytic anemia' }, frequency: { label: 'Obligate', source: 'ORPHA:33574' } },
      { term: { id: 'HP:6000834', label: 'Elevated urinary gamma-glutamylcysteine level' }, frequency: { label: null, source: 'OMIM:230450' } },
      { term: { id: 'HP:0025435', label: 'Increased circulating lactate dehydrogenase concentration' }, frequency: { label: 'Obligate', raw: '1/1', source: 'OMIM:230450' } },
      { term: { id: 'HP:0001271', label: 'Polyneuropathy' }, frequency: { label: 'Excluded', raw: '0/1', source: 'OMIM:230450' } },
      { term: { id: 'HP:0006904', label: 'Late-onset spinocerebellar degeneration' }, frequency: { label: null, source: 'OMIM:230450' } },
      { term: { id: 'HP:6000132', label: 'Reduced erythrocyte gamma-glutamyl cysteine synthetase activity' }, frequency: { label: 'Obligate', raw: '3/3', source: 'OMIM:230450' } },
    ],
  },
];

export const NPC1_TRIALS_QUERY = 'Niemann-Pick disease type C';
/** totalCount from the recorded call. */
export const NPC1_TRIALS_TOTAL = 6;

export const NPC1_RECORDED_TRIALS: readonly Trial[] = [
  {
    nctId: 'NCT00344331',
    title: 'Evaluation of Biochemical Markers and Clinical Investigation of Niemann-Pick Disease, Type C',
    status: 'RECRUITING',
    phases: [],
    conditions: ['Niemann-Pick Disease, Type C'],
    countries: ['United States'],
    url: 'https://clinicaltrials.gov/study/NCT00344331',
  },
  {
    nctId: 'NCT07054515',
    title: 'A Study to Evaluate the Safety and Efficacy of Oral Nizubaglustat (AZ-3102) in Late-infantile and Juvenile Forms of Niemann-Pick Type C Disease, GM1 Gangliosidosis or GM2 Gangliosidosis',
    status: 'RECRUITING',
    phases: ['PHASE3'],
    conditions: ['Niemann-Pick Type C Disease', 'GM1 Gangliosidosis', 'GM2 Gangliosidosis'],
    countries: ['United States', 'Argentina', 'Australia', 'Brazil', 'Canada', 'France', 'Germany', 'India', 'Italy', 'Mexico', 'Pakistan', 'Portugal', 'Spain', 'Sweden', 'Switzerland', 'Turkey (Türkiye)', 'United Kingdom'],
    url: 'https://clinicaltrials.gov/study/NCT07054515',
  },
  {
    nctId: 'NCT04880356',
    title: 'Longitudinal Study of Ultra-rare Inherited Metabolic and Degenerative Neurological Diseases.',
    status: 'RECRUITING',
    phases: [],
    conditions: ['Inherited Disease', 'Rare Diseases', 'Metabolic Disease', 'Undiagnosed Disease', 'Neurologic Disorder', 'Neuro-Degenerative Disease'],
    countries: ['Italy'],
    url: 'https://clinicaltrials.gov/study/NCT04880356',
  },
  {
    nctId: 'NCT05163288',
    title: 'A Pivotal Study of N-Acetyl-L-Leucine on Niemann-Pick Disease Type C',
    status: 'RECRUITING',
    phases: ['PHASE3'],
    conditions: ['Niemann-Pick Disease, Type C'],
    countries: ['United States', 'Australia', 'Czechia', 'Germany', 'Netherlands', 'Slovakia', 'Switzerland', 'United Kingdom'],
    url: 'https://clinicaltrials.gov/study/NCT05163288',
  },
  {
    nctId: 'NCT05588167',
    title: 'Establishment of Genomic and Phenotypic Database for Niemann-Pick Disease, Type C',
    status: 'RECRUITING',
    phases: [],
    conditions: ['Niemann-Pick Disease, Type C'],
    countries: ['United States'],
    url: 'https://clinicaltrials.gov/study/NCT05588167',
  },
];
