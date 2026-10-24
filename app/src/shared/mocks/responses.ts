/**
 * Deterministic offline mocks for every /api/* endpoint (docs/CONTRACT.md v0.1).
 *
 * Used ONLY by shared/api.ts in development (import.meta.env.DEV) when an
 * endpoint is unreachable or not built yet, or anywhere when the URL has
 * ?mock=1. Production never falls back to these. Every view that shows a
 * mocked payload must display OFFLINE_MOCK_LABEL. Never use these to hide a
 * real 4xx validation error.
 *
 * What is real and what is illustrative:
 * - Demo narratives and prepared extractions: verbatim from contract section 9.
 * - The first candidate for each demo case: disease id, MONDO id, name, genes,
 *   annotation categories and every feature frequency were recorded from JAX
 *   on 2026-10-24 (GET https://ontology.jax.org/api/network/annotation/<id>).
 *   Frequencies prefer the ORPHA band, else the OMIM "n/m" value mapped to the
 *   contract section 5 band. A feature annotated without a frequency has
 *   label null ("frequency not listed"). Features the disease does not
 *   annotate are not invented: they appear as unmatched.
 * - Scores and therefore the order are ILLUSTRATIVE; nothing here came from
 *   Monarch, so no mock candidate lists "monarch-semsim" in its sources.
 *   Exception: demo-npc1 (the primary case) uses recordedNpc1.ts, where the
 *   five candidates, their order, raw scores and matches were recorded from a
 *   real Monarch semsim call and every frequency from real JAX annotation
 *   calls on 2026-10-24 (raw JSON in mocks/recorded/). The recorded order
 *   and raw scores are used only when observed and excluded equal the
 *   prepared set (12 observed, Headache excluded). For any other set the
 *   evidence is recomputed, candidates are ordered by overlap label, then
 *   matched count, then fewer contradictions, then diseaseId, score is 0
 *   and dataVersions.monarch is NPC1_REORDERED_NOTE, so no raw service
 *   score is claimed for terms Monarch never ranked.
 * - Comparison candidates are placeholders named "Mock comparison condition",
 *   with MOCK: ids, no genes and no frequencies (frequency null), so no
 *   disease fact is invented.
 * - Trials: the mock returns no studies, except for Niemann-Pick disease
 *   type C, where the recruiting studies recorded from ClinicalTrials.gov on
 *   2026-10-24 are returned. No trial id is invented.
 * - dataVersions.demoCache holds the recording date, as the contract asks;
 *   the response-level source stays "demo" (the contract has no "mock"
 *   value) and the app shows OFFLINE_MOCK_LABEL, which outranks the
 *   demo-cache label.
 */
import {
  CONTRACT_VERSION,
  type ApiError,
  type BriefResponse,
  type Candidate,
  type CaseObject,
  type DataVersions,
  type DemoCase,
  type DiseaseFeature,
  type Evidence,
  type ExtractRequest,
  type ExtractResponse,
  type FrequencyInfo,
  type Gene,
  type HpoId,
  type HpoTerm,
  type NextQuestionsRequest,
  type NextQuestionsResponse,
  type OverlapLabel,
  type Phenopacket,
  type Question,
  type RankRequest,
  type RankResponse,
  type TermRef,
  type TermsQuery,
  type TermsResponse,
  type TrialsQuery,
  type TrialsResponse,
} from '../contract';
import { ATTRIBUTION, DISCLAIMER, hpoAttribution } from '../text';
import { DEMO_CASES, verifyDemoCase } from './demoCases';
import {
  NPC1_RECORDED_AT,
  NPC1_RECORDED_CANDIDATES,
  NPC1_RECORDED_TRIALS,
  NPC1_TRIALS_QUERY,
  NPC1_TRIALS_RECORDED_AT,
  NPC1_TRIALS_TOTAL,
  type RecordedCandidate,
} from './recordedNpc1';

export const MOCK_RECORDED_AT = '2026-10-24T16:05:00.000Z';
export const MOCK_HPO_VERSION = 'unknown (offline mock)';
/** Date the JAX values below were recorded (contract: demoCache is a date). */
export const MOCK_RECORDED_DATE = '2026-10-24';

function mockDataVersions(extra: Partial<DataVersions> = {}): DataVersions {
  return { hpo: MOCK_HPO_VERSION, demoCache: MOCK_RECORDED_DATE, fetchedAt: MOCK_RECORDED_AT, ...extra };
}

/** Thrown by a mock to answer with a contract error; shared/api.ts converts it. */
export class MockContractError extends Error {
  readonly status: number;
  readonly error: ApiError['error'];
  constructor(status: number, error: ApiError['error']) {
    super(error.message);
    this.name = 'MockContractError';
    this.status = status;
    this.error = error;
  }
}

// ---------------------------------------------------------------------------
// Per-case mock profiles
// ---------------------------------------------------------------------------

interface MockDisease {
  diseaseId: string;
  mondoId: string;
  name: string;
  links: Candidate['links'];
  genes: Gene[];
  /** Annotation id each gene came from (TestSuggestion.source). */
  geneSources: Record<string, string>;
  categories: string[];
}

/** One annotated feature of a disease; frequency null = no frequency info at all. */
interface MockFeature {
  term: TermRef;
  frequency: FrequencyInfo | null;
}

interface MockProfile {
  caseId: string;
  disease: MockDisease;
  /**
   * Features recorded from JAX on 2026-10-24: every narrative term the disease
   * annotates, plus a few annotated terms the narrative does not mention
   * (used for "not reported" and the questions).
   */
  annotations: MockFeature[];
}

/** Shorthand for a recorded annotation row. */
function row(id: HpoId, label: string, frequency: FrequencyInfo): MockFeature {
  return { term: { id, label }, frequency };
}

// Recorded from JAX on 2026-10-24 (ontology.jax.org/api/network/annotation/<id>).
const PROFILES: MockProfile[] = [
  {
    caseId: 'demo-dmd',
    disease: {
      diseaseId: 'ORPHA:98896',
      mondoId: 'MONDO:0010679',
      name: 'Duchenne muscular dystrophy',
      links: {
        monarch: 'https://monarchinitiative.org/MONDO:0010679',
        orphanet: 'https://www.orpha.net/en/disease/detail/98896',
        omim: 'https://omim.org/entry/310200',
      },
      genes: [
        { id: 'NCBIGene:1756', symbol: 'DMD' },
        { id: 'NCBIGene:8425', symbol: 'LTBP4' },
      ],
      geneSources: { 'NCBIGene:1756': 'OMIM:310200', 'NCBIGene:8425': 'ORPHA:98896' },
      categories: [
        'Cardiovascular', 'Clinical course', 'Connective tissue', 'Inheritance', 'Limbs',
        'Metabolism/Laboratory abnormality', 'Musculature', 'Nervous System', 'Respiratory System',
        'Skeletal system',
      ],
    },
    annotations: [
      row('HP:0001270', 'Motor delay', { label: 'Very frequent', source: 'ORPHA:98896' }),
      row('HP:0003551', 'Difficulty climbing stairs', { label: 'Obligate', raw: '1/1', source: 'OMIM:310200' }),
      row('HP:0003391', 'Gowers sign', { label: null, source: 'OMIM:310200' }),
      row('HP:0003707', 'Calf muscle pseudohypertrophy', { label: null, source: 'OMIM:310200' }),
      row('HP:0002515', 'Waddling gait', { label: 'Very frequent', source: 'ORPHA:98896' }),
      row('HP:0003202', 'Skeletal muscle atrophy', { label: 'Very frequent', source: 'ORPHA:98896' }),
      row('HP:0001644', 'Dilated cardiomyopathy', { label: null, source: 'OMIM:310200' }),
    ],
  },
  {
    caseId: 'demo-marfan',
    disease: {
      diseaseId: 'ORPHA:558',
      mondoId: 'MONDO:0007947',
      name: 'Marfan syndrome',
      links: {
        monarch: 'https://monarchinitiative.org/MONDO:0007947',
        orphanet: 'https://www.orpha.net/en/disease/detail/558',
        omim: 'https://omim.org/entry/154700',
      },
      genes: [{ id: 'NCBIGene:2200', symbol: 'FBN1' }],
      geneSources: { 'NCBIGene:2200': 'OMIM:154700' },
      categories: [
        'Cardiovascular', 'Connective tissue', 'Constitutional Symptom', 'Eye', 'Growth', 'Head and neck',
        'Inheritance', 'Limbs', 'Musculature', 'Nervous System', 'Other', 'Respiratory System',
        'Skeletal system', 'Skin, Hair, and Nails',
      ],
    },
    annotations: [
      row('HP:0001166', 'Arachnodactyly', { label: 'Very frequent', source: 'ORPHA:558' }),
      row('HP:0000218', 'High palate', { label: 'Frequent', raw: '34/53', source: 'OMIM:154700' }),
      row('HP:0001065', 'Striae distensae', { label: 'Very frequent', source: 'ORPHA:558' }),
      row('HP:0001083', 'Ectopia lentis', { label: 'Frequent', source: 'ORPHA:558' }),
      row('HP:0000268', 'Dolichocephaly', { label: 'Occasional', source: 'ORPHA:558' }),
      row('HP:0000278', 'Retrognathia', { label: 'Occasional', source: 'ORPHA:558' }),
      row('HP:0000490', 'Deeply set eye', { label: 'Frequent', raw: '25/63', source: 'OMIM:154700' }),
      row('HP:0002107', 'Pneumothorax', { label: 'Occasional', raw: '6/53', source: 'OMIM:154700' }),
      row('HP:0002650', 'Scoliosis', { label: 'Frequent', source: 'ORPHA:558' }),
      row('HP:0001519', 'Disproportionate tall stature', { label: 'Very frequent', source: 'ORPHA:558' }),
      row('HP:0000545', 'Myopia', { label: 'Frequent', source: 'ORPHA:558' }),
      row('HP:0001634', 'Mitral valve prolapse', { label: 'Frequent', source: 'ORPHA:558' }),
    ],
  },
  {
    caseId: 'demo-kabuki',
    disease: {
      diseaseId: 'OMIM:147920',
      mondoId: 'MONDO:0007843',
      name: 'Kabuki syndrome 1',
      links: {
        monarch: 'https://monarchinitiative.org/MONDO:0007843',
        omim: 'https://omim.org/entry/147920',
      },
      genes: [
        { id: 'NCBIGene:7403', symbol: 'KDM6A' },
        { id: 'NCBIGene:8085', symbol: 'KMT2D' },
      ],
      geneSources: { 'NCBIGene:7403': 'OMIM:147920', 'NCBIGene:8085': 'OMIM:147920' },
      categories: [
        'Blood and blood-forming tissues', 'Breast', 'Cardiovascular', 'Cellular phenotype', 'Clinical course',
        'Connective tissue', 'Digestive System', 'Ear', 'Endocrine', 'Eye', 'Genitourinary system', 'Growth',
        'Head and neck', 'Immunology', 'Inheritance', 'Limbs', 'Metabolism/Laboratory abnormality',
        'Musculature', 'Neoplasm', 'Nervous System', 'Other', 'Prenatal and Birth', 'Respiratory System',
        'Skeletal system', 'Skin, Hair, and Nails', 'Voice',
      ],
    },
    annotations: [
      row('HP:0001252', 'Hypotonia', { label: 'Frequent', raw: '22/32', source: 'OMIM:147920' }),
      row('HP:0001263', 'Global developmental delay', { label: 'Very frequent', raw: '40/42', source: 'OMIM:147920' }),
      row('HP:0004322', 'Short stature', { label: 'Frequent', raw: '11/20', source: 'OMIM:147920' }),
      row('HP:0000637', 'Long palpebral fissure', { label: 'Very frequent', raw: '27/31', source: 'OMIM:147920' }),
      row('HP:0007655', 'Eversion of lateral third of lower eyelids', { label: 'Very frequent', raw: '19/22', source: 'OMIM:147920' }),
      row('HP:0002553', 'Highly arched eyebrow', { label: 'Frequent', raw: '22/30', source: 'OMIM:147920' }),
      row('HP:0005338', 'Sparse lateral eyebrow', { label: 'Obligate', raw: '11/11', source: 'OMIM:147920' }),
      row('HP:0000431', 'Wide nasal bridge', { label: 'Very frequent', raw: '14/17', source: 'OMIM:147920' }),
      row('HP:0000437', 'Depressed nasal tip', { label: 'Frequent', raw: '38/49', source: 'OMIM:147920' }),
      row('HP:0000592', 'Blue sclerae', { label: 'Frequent', raw: '7/17', source: 'OMIM:147920' }),
      row('HP:0000400', 'Macrotia', { label: 'Very frequent', raw: '24/30', source: 'OMIM:147920' }),
      row('HP:0001212', 'Prominent fingertip pads', { label: 'Frequent', raw: '31/39', source: 'OMIM:147920' }),
      row('HP:0040019', 'Finger clinodactyly', { label: 'Obligate', raw: '10/10', source: 'OMIM:147920' }),
      row('HP:0011626', 'Scimitar anomaly', { label: 'Very rare', raw: '1/30', source: 'OMIM:147920' }),
      row('HP:0001250', 'Seizure', { label: 'Occasional', raw: '4/25', source: 'OMIM:147920' }),
      row('HP:0000365', 'Hearing impairment', { label: 'Frequent', raw: '22/43', source: 'OMIM:147920' }),
      row('HP:0000175', 'Cleft palate', { label: 'Frequent', raw: '40/69', source: 'OMIM:147920' }),
      row('HP:0000369', 'Low-set ears', { label: 'Frequent', raw: '3/6', source: 'OMIM:147920' }),
      row('HP:0001256', 'Mild intellectual disability', { label: 'Frequent', raw: '5/13', source: 'OMIM:147920' }),
    ],
  },
  {
    caseId: 'demo-cdls',
    disease: {
      diseaseId: 'OMIM:122470',
      mondoId: 'MONDO:0007387',
      name: 'Cornelia de Lange syndrome 1',
      links: {
        monarch: 'https://monarchinitiative.org/MONDO:0007387',
        omim: 'https://omim.org/entry/122470',
      },
      genes: [{ id: 'NCBIGene:25836', symbol: 'NIPBL' }],
      geneSources: { 'NCBIGene:25836': 'OMIM:122470' },
      categories: [
        'Blood and blood-forming tissues', 'Breast', 'Cardiovascular', 'Clinical course', 'Connective tissue',
        'Digestive System', 'Ear', 'Eye', 'Genitourinary system', 'Growth', 'Head and neck', 'Immunology',
        'Inheritance', 'Limbs', 'Metabolism/Laboratory abnormality', 'Musculature', 'Nervous System', 'Other',
        'Skeletal system', 'Skin, Hair, and Nails', 'Voice',
      ],
    },
    annotations: [
      row('HP:0001511', 'Intrauterine growth retardation', { label: 'Frequent', raw: '39/52', source: 'OMIM:122470' }),
      row('HP:0008897', 'Postnatal growth retardation', { label: 'Very frequent', raw: '29/30', source: 'OMIM:122470' }),
      row('HP:0001263', 'Global developmental delay', { label: 'Very frequent', raw: '42/46', source: 'OMIM:122470' }),
      row('HP:0001249', 'Intellectual disability', { label: 'Very frequent', raw: '34/40', source: 'OMIM:122470' }),
      row('HP:0001007', 'Hirsutism', { label: 'Frequent', raw: '39/56', source: 'OMIM:122470' }),
      row('HP:0000028', 'Cryptorchidism', { label: 'Frequent', raw: '15/25', source: 'OMIM:122470' }),
      row('HP:0001159', 'Syndactyly', { label: 'Frequent', raw: '5/12', source: 'OMIM:122470' }),
      row('HP:0001156', 'Brachydactyly', { label: 'Occasional', raw: '3/11', source: 'OMIM:122470' }),
      row('HP:0030148', 'Heart murmur', { label: 'Frequent', raw: '5/11', source: 'OMIM:122470' }),
      row('HP:0001250', 'Seizure', { label: 'Frequent', raw: '12/37', source: 'OMIM:122470' }),
      row('HP:0011968', 'Feeding difficulties', { label: 'Frequent', raw: '11/19', source: 'OMIM:122470' }),
      row('HP:0000664', 'Synophrys', { label: 'Very frequent', raw: '46/49', source: 'OMIM:122470' }),
      row('HP:0000347', 'Micrognathia', { label: 'Frequent', raw: '27/46', source: 'OMIM:122470' }),
      row('HP:0002020', 'Gastroesophageal reflux', { label: 'Frequent', raw: '25/40', source: 'OMIM:122470' }),
    ],
  },
];

const COMPARISON_NAMES = ['B', 'C', 'D', 'E'].map((letter) => `Mock comparison condition ${letter}`);

// Fail loudly in development if a demo offset ever drifts.
if (import.meta.env.DEV) {
  const problems = DEMO_CASES.flatMap(verifyDemoCase);
  if (problems.length > 0) console.error('[mocks] demo case offsets are wrong:', problems);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortedUnique(ids: readonly string[] | undefined): string[] {
  return [...new Set(ids ?? [])].sort();
}

/** Same rule as contract 7.4 step 8 (draft thresholds), for mock labels only. */
function overlapLabel(matched: number, observed: number, contradicted: number): OverlapLabel {
  const order: OverlapLabel[] = ['weak', 'partial', 'strong'];
  const coverage = observed === 0 ? 0 : matched / observed;
  let level = coverage >= 0.6 ? 2 : coverage >= 0.3 ? 1 : 0;
  level = Math.max(0, level - contradicted);
  return order[level] ?? 'weak';
}

type Band = NonNullable<FrequencyInfo['label']>;

const BAND_ORDER: Band[] = ['Obligate', 'Very frequent', 'Frequent', 'Occasional', 'Very rare', 'Excluded'];

/** Contract 7.5 step 2 midpoints; annotated without a frequency 0.5, not annotated 0. */
const MIDPOINT: Record<Band, number> = {
  Obligate: 1,
  'Very frequent': 0.9,
  Frequent: 0.55,
  Occasional: 0.17,
  'Very rare': 0.025,
  Excluded: 0,
};

function midpoint(f: MockFeature | undefined): number {
  if (!f || !f.frequency) return 0;
  return f.frequency.label ? MIDPOINT[f.frequency.label] : 0.5;
}

/** Obligate, Very frequent or Frequent (contract 7.4 steps 6 and 7). */
function isUsual(f: MockFeature): f is MockFeature & { frequency: FrequencyInfo } {
  const label = f.frequency?.label;
  return label === 'Obligate' || label === 'Very frequent' || label === 'Frequent';
}

function profileFor(diseaseId: string): MockProfile | undefined {
  return PROFILES.find((p) => p.disease.diseaseId === diseaseId);
}

function recordedFor(diseaseId: string): RecordedCandidate | undefined {
  return NPC1_RECORDED_CANDIDATES.find((c) => c.diseaseId === diseaseId);
}

/** Recorded annotation rows of a disease (profile or recorded Monarch candidate). */
function annotationsFor(diseaseId: string): MockFeature[] {
  return profileFor(diseaseId)?.annotations ?? recordedFor(diseaseId)?.annotations ?? [];
}

/** Annotation id a gene came from, when the mocks know it. */
function geneSourceFor(diseaseId: string, geneId: string): string | undefined {
  return (profileFor(diseaseId)?.disease ?? recordedFor(diseaseId))?.geneSources[geneId];
}

/** All verified terms the mocks know, for /api/terms and label lookups. */
const KNOWN_TERMS: Map<HpoId, TermRef> = (() => {
  const map = new Map<HpoId, TermRef>();
  for (const c of DEMO_CASES) for (const t of c.extraction) map.set(t.hpoId, { id: t.hpoId, label: t.label });
  for (const p of PROFILES) for (const f of p.annotations) map.set(f.term.id, f.term);
  for (const c of NPC1_RECORDED_CANDIDATES) {
    for (const f of c.annotations) map.set(f.term.id, f.term);
    for (const m of Object.values(c.matches)) {
      map.set(m.target.id, m.target);
      if (m.subsumer.id.startsWith('HP:')) map.set(m.subsumer.id, m.subsumer);
    }
  }
  return map;
})();

function termRef(id: HpoId): TermRef {
  return KNOWN_TERMS.get(id) ?? { id, label: id };
}

/**
 * The demo case whose prepared terms overlap the request most (ties: picker
 * order). profile is undefined for demo-npc1, which uses recorded data.
 */
function closestDemoCase(observed: readonly HpoId[]): { demo: DemoCase; profile?: MockProfile } | null {
  let best: { demo: DemoCase; profile?: MockProfile; hits: number } | null = null;
  for (const demo of DEMO_CASES) {
    const profile = PROFILES.find((p) => p.caseId === demo.caseId);
    if (!profile && demo.caseId !== 'demo-npc1') continue;
    const ids = new Set(demo.extraction.filter((t) => !t.negated).map((t) => t.hpoId));
    const hits = observed.filter((id) => ids.has(id)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { demo, profile, hits };
  }
  return best;
}

// ---------------------------------------------------------------------------
// /api/extract
// ---------------------------------------------------------------------------

export function mockExtract(req: ExtractRequest): ExtractResponse {
  const demo = DEMO_CASES.find((c) => c.narrative === req.text);
  // Non-demo text: answer like a server without the Workers AI binding (contract 7.2 step 3).
  if (!demo) {
    throw new MockContractError(503, {
      code: 'LLM_UNAVAILABLE',
      message: 'Live extraction is not available here. Try one of the demo cases, or add terms by hand.',
      retryable: false,
    });
  }
  return {
    version: CONTRACT_VERSION,
    source: 'demo',
    terms: demo.extraction.map((t) => ({ ...t })),
    warnings: [],
    model: 'demo-prepared',
    dataVersions: mockDataVersions(),
  };
}

// ---------------------------------------------------------------------------
// /api/terms
// ---------------------------------------------------------------------------

export function mockTerms(query: TermsQuery): TermsResponse {
  const q = query.q.trim().toLowerCase();
  const limit = Math.min(Math.max(query.limit ?? 8, 1), 20);
  const words = q.split(/\s+/).filter(Boolean);
  const terms: HpoTerm[] = [...KNOWN_TERMS.values()]
    .filter((t) => {
      const label = t.label.toLowerCase();
      return t.id.toLowerCase() === q || words.every((w) => label.includes(w));
    })
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((t) => ({ id: t.id, label: t.label }));
  return { version: CONTRACT_VERSION, source: 'demo', terms, dataVersions: mockDataVersions() };
}

// ---------------------------------------------------------------------------
// /api/rank
// ---------------------------------------------------------------------------

function buildCandidate(
  disease: MockDisease,
  observed: HpoId[],
  excluded: HpoId[],
  annotations: MockFeature[],
  options: { score: number; sources: Candidate['sources'] },
): Omit<Candidate, 'rank'> {
  const featureById = new Map(annotations.map((f) => [f.term.id, f]));
  const matched: Evidence[] = [];
  const unmatched: TermRef[] = [];
  for (const id of observed) {
    const feature = featureById.get(id);
    if (feature) {
      matched.push({
        patientTerm: termRef(id),
        diseaseTerm: feature.term,
        via: 'exact',
        frequency: feature.frequency,
      });
    } else {
      unmatched.push(termRef(id));
    }
  }
  const byBandThenId = (a: DiseaseFeature, b: DiseaseFeature) =>
    BAND_ORDER.indexOf(a.frequency.label as Band) - BAND_ORDER.indexOf(b.frequency.label as Band) ||
    a.term.id.localeCompare(b.term.id);
  const usual = annotations.filter(isUsual);
  const contradicted: DiseaseFeature[] = usual
    .filter((f) => excluded.includes(f.term.id))
    .map((f) => ({ term: f.term, frequency: f.frequency }));
  const notReported: DiseaseFeature[] = usual
    .filter((f) => !observed.includes(f.term.id) && !excluded.includes(f.term.id))
    .map((f) => ({ term: f.term, frequency: f.frequency }))
    .sort(byBandThenId)
    .slice(0, 8);

  return {
    diseaseId: disease.diseaseId,
    mondoId: disease.mondoId,
    name: disease.name,
    overlap: overlapLabel(matched.length, observed.length, contradicted.length),
    score: options.score,
    matched,
    unmatched,
    notReported,
    contradicted,
    categories: disease.categories,
    genes: disease.genes,
    links: disease.links,
    sources: options.sources,
  };
}

function placeholderDisease(index: number, caseKey: string): MockDisease {
  const letter = String.fromCharCode(66 + index); // B, C, D, E
  return {
    diseaseId: `MOCK:${caseKey}-${letter}`,
    mondoId: `MOCK:${caseKey}-${letter}`,
    name: COMPARISON_NAMES[index] ?? `Mock comparison condition ${letter}`,
    links: { monarch: 'https://monarchinitiative.org/' },
    genes: [],
    geneSources: {},
    categories: [],
  };
}

const OVERLAP_ORDER: OverlapLabel[] = ['weak', 'partial', 'strong'];

/**
 * Shown as dataVersions.monarch when demo-npc1's terms were edited: the
 * matches are recorded Monarch data, but Monarch never ranked this term set.
 * The UI must not show a "raw service score" for these candidates.
 */
export const NPC1_REORDERED_NOTE =
  'v3 API, recorded matches only: the terms differ from the recorded demo set, so the order follows the matched features and there is no raw service score';

/** The prepared demo-npc1 term set the Monarch call was recorded for (contract 9.1). */
function isNpc1RecordedSet(observed: readonly HpoId[], excluded: readonly HpoId[]): boolean {
  const demo = DEMO_CASES.find((c) => c.caseId === 'demo-npc1');
  if (!demo) return false;
  const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  const recObserved = sortedUnique(demo.extraction.filter((t) => !t.negated).map((t) => t.hpoId));
  const recExcluded = sortedUnique(demo.extraction.filter((t) => t.negated).map((t) => t.hpoId));
  return same(observed, recObserved) && same(excluded, recExcluded);
}

/**
 * A candidate from the recorded Monarch call (demo-npc1). Evidence follows
 * contract 7.4 steps 5-8 over the recorded matches and annotations.
 */
function recordedCandidate(rc: RecordedCandidate, observed: HpoId[], excluded: HpoId[]): Omit<Candidate, 'rank'> {
  const featureById = new Map(rc.annotations.map((f) => [f.term.id, f]));
  const matched: Evidence[] = [];
  const unmatched: TermRef[] = [];
  for (const id of observed) {
    const m = rc.matches[id];
    if (!m || !m.qualifies) {
      unmatched.push(termRef(id));
      continue;
    }
    const exact = m.target.id === id;
    matched.push({
      patientTerm: termRef(id),
      diseaseTerm: m.target,
      via: exact ? 'exact' : 'ancestor',
      ...(exact ? {} : { ancestor: m.subsumer }),
      frequency: featureById.get(m.target.id)?.frequency ?? null,
    });
  }
  const matchedTargets = new Set(matched.map((e) => e.diseaseTerm.id));
  const byBandThenId = (a: DiseaseFeature, b: DiseaseFeature) =>
    BAND_ORDER.indexOf(a.frequency.label as Band) - BAND_ORDER.indexOf(b.frequency.label as Band) ||
    a.term.id.localeCompare(b.term.id);
  const usual = rc.annotations.filter(isUsual);
  const contradicted: DiseaseFeature[] = usual
    .filter((f) => excluded.includes(f.term.id))
    .map((f) => ({ term: f.term, frequency: f.frequency }));
  const notReported: DiseaseFeature[] = usual
    .filter((f) => !matchedTargets.has(f.term.id) && !observed.includes(f.term.id) && !excluded.includes(f.term.id))
    .map((f) => ({ term: f.term, frequency: f.frequency }))
    .sort(byBandThenId)
    .slice(0, 8);

  return {
    diseaseId: rc.diseaseId,
    mondoId: rc.mondoId,
    name: rc.name,
    overlap: overlapLabel(matched.length, observed.length, contradicted.length),
    score: rc.score,
    matched,
    unmatched,
    notReported,
    contradicted,
    categories: rc.categories,
    genes: rc.genes,
    links: rc.links,
    sources: rc.annotationIds.length > 0 ? ['monarch-semsim', 'hpo-annotations'] : ['monarch-semsim'],
  };
}

export function mockRank(req: RankRequest): RankResponse {
  const observed = sortedUnique(req.observed);
  const excluded = sortedUnique(req.excluded);
  const limit = Math.min(Math.max(req.limit ?? 5, 1), 10);
  const match = closestDemoCase(observed);
  const caseKey = match?.demo.caseId.replace(/^demo-/, '') ?? 'manual';

  if (match && !match.profile) {
    const built = NPC1_RECORDED_CANDIDATES.map((rc) => recordedCandidate(rc, observed, excluded));
    const exact = isNpc1RecordedSet(observed, excluded);
    // Recorded set: Monarch order and raw scores as recorded (score desc, then diseaseId).
    // Any other set: Monarch never scored it, so order by the recomputed
    // evidence and carry no raw score (0, flagged in dataVersions.monarch).
    const ordered = exact
      ? built.sort((a, b) => b.score - a.score || a.diseaseId.localeCompare(b.diseaseId))
      : built
          .map((c) => ({ ...c, score: 0 }))
          .sort(
            (a, b) =>
              OVERLAP_ORDER.indexOf(b.overlap) - OVERLAP_ORDER.indexOf(a.overlap) ||
              b.matched.length - a.matched.length ||
              a.contradicted.length - b.contradicted.length ||
              a.diseaseId.localeCompare(b.diseaseId),
          );
    const candidates: Candidate[] = ordered.slice(0, limit).map((c, i) => ({ ...c, rank: i + 1 }));
    return {
      version: CONTRACT_VERSION,
      source: 'demo',
      candidates,
      dataVersions: mockDataVersions({
        monarch: exact ? 'v3 API' : NPC1_REORDERED_NOTE,
        fetchedAt: NPC1_RECORDED_AT,
      }),
    };
  }

  const all: Array<Omit<Candidate, 'rank'>> = [];

  if (match?.profile) {
    // Real disease: only the annotation rows recorded from JAX (see PROFILES).
    // Score is illustrative. Sources: the frequencies really are HPO annotations;
    // nothing came from Monarch.
    all.push(
      buildCandidate(match.profile.disease, observed, excluded, match.profile.annotations, {
        score: 14.2,
        sources: ['hpo-annotations'],
      }),
    );
  }

  // Fictional comparison conditions share a shrinking slice of the observed
  // terms, with no frequency (null), so nothing about them reads as a fact.
  for (let i = 0; all.length < limit && i < 4; i++) {
    const share = Math.max(1, Math.floor(observed.length * (0.5 - i * 0.1)));
    const features: MockFeature[] = observed
      .slice(i, i + share)
      .map((id) => ({ term: termRef(id), frequency: null }));
    all.push(
      buildCandidate(placeholderDisease(i, caseKey), observed, excluded, features, {
        score: Number((11.6 - i * 1.3).toFixed(1)),
        sources: [],
      }),
    );
  }

  const candidates: Candidate[] = all
    .sort((a, b) => b.score - a.score || a.diseaseId.localeCompare(b.diseaseId))
    .slice(0, limit)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  return {
    version: CONTRACT_VERSION,
    source: 'demo',
    candidates,
    dataVersions: mockDataVersions(),
  };
}

// ---------------------------------------------------------------------------
// /api/next-questions (contract 7.5 method over the recorded annotations)
// ---------------------------------------------------------------------------

function frequencyWords(f: MockFeature | undefined): string | null {
  if (!f?.frequency) return null;
  return f.frequency.label ?? 'Listed without a frequency';
}

export function mockNextQuestions(req: NextQuestionsRequest): NextQuestionsResponse {
  const observed = new Set(req.observed);
  const excluded = new Set(req.excluded ?? []);
  const limit = Math.min(Math.max(req.limit ?? 5, 1), 8);
  const candidateIds = req.candidates;
  const annotationsOf = (id: string) => new Map(annotationsFor(id).map((f) => [f.term.id, f]));
  const perCandidate = candidateIds.map((id) => ({ id, rows: annotationsOf(id) }));
  const nameOf = (id: string) =>
    profileFor(id)?.disease.name ??
    recordedFor(id)?.name ??
    (id.startsWith('MOCK:') ? `Mock comparison condition ${id.slice(-1)}` : id);

  const allIds = [...new Set(perCandidate.flatMap((c) => [...c.rows.keys()]))];
  const questions: Question[] = allIds
    .filter((id) => !observed.has(id) && !excluded.has(id))
    .map((hpoId) => {
      const cells = perCandidate.map((c) => ({ diseaseId: c.id, row: c.rows.get(hpoId) }));
      const mids = cells.map((c) => midpoint(c.row));
      const score = Number((Math.max(...mids) - Math.min(...mids)).toFixed(3));
      const term = cells.find((c) => c.row)?.row?.term ?? termRef(hpoId);
      const listed = cells.filter((c) => c.row?.frequency);
      const notListed = cells.filter((c) => !c.row?.frequency);
      const why = [
        ...listed.map((c) => `${frequencyWords(c.row)} in ${nameOf(c.diseaseId)}`),
        notListed.length > 0 ? `not listed for ${notListed.map((c) => nameOf(c.diseaseId)).join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('; ');
      return {
        hpoId,
        label: term.label,
        question: `Has anyone noticed ${term.label.toLowerCase()}?`,
        discriminates: cells.map((c) => ({ diseaseId: c.diseaseId, frequency: c.row?.frequency ?? null })),
        why,
        score,
      };
    })
    .filter((q) => q.score >= 0.35)
    .sort((a, b) => b.score - a.score || a.hpoId.localeCompare(b.hpoId))
    .slice(0, limit);

  return { version: CONTRACT_VERSION, source: 'demo', questions, dataVersions: mockDataVersions() };
}

// ---------------------------------------------------------------------------
// /api/trials
// ---------------------------------------------------------------------------

/** Conditions answered with the recorded Niemann-Pick type C studies. */
function isNiemannPickC(condition: string): boolean {
  return /niemann[- ]pick/i.test(condition) && /type\s*c/i.test(condition);
}

export function mockTrials(query: TrialsQuery): TrialsResponse {
  if (isNiemannPickC(query.condition)) {
    // query.condition is the query that was actually recorded, not the request.
    return {
      version: CONTRACT_VERSION,
      source: 'demo',
      studies: NPC1_RECORDED_TRIALS.map((t) => ({ ...t })),
      query: { condition: NPC1_TRIALS_QUERY, ids: query.ids, status: 'RECRUITING' },
      total: NPC1_TRIALS_TOTAL,
      fetchedAt: NPC1_TRIALS_RECORDED_AT,
      dataVersions: { fetchedAt: NPC1_TRIALS_RECORDED_AT, demoCache: MOCK_RECORDED_DATE },
    };
  }
  return {
    version: CONTRACT_VERSION,
    source: 'demo',
    studies: [],
    query: { condition: query.condition, ids: query.ids, status: 'RECRUITING' },
    total: 0,
    fetchedAt: MOCK_RECORDED_AT,
    dataVersions: { fetchedAt: MOCK_RECORDED_AT, demoCache: MOCK_RECORDED_DATE },
  };
}

// ---------------------------------------------------------------------------
// /api/brief (same grounding rules as contract 7.7)
// ---------------------------------------------------------------------------

export function mockBrief(c: CaseObject, now: Date = new Date(MOCK_RECORDED_AT)): BriefResponse {
  const generatedAt = now.toISOString();
  const live = c.terms.filter((t) => t.status !== 'removed');
  const toFeature = (t: (typeof live)[number]) => ({
    id: t.hpoId,
    label: t.label,
    quote: t.quote,
    provenance: t.provenance,
  });
  const observed = live.filter((t) => t.status === 'observed').map(toFeature);
  const excluded = live.filter((t) => t.status === 'excluded').map(toFeature);
  const candidates = c.lastRanking?.response.candidates.slice(0, 5) ?? [];
  const top3 = candidates.slice(0, 3);
  const hpoVersion = c.lastRanking?.response.dataVersions.hpo ?? MOCK_HPO_VERSION;

  const attributions = [hpoAttribution(hpoVersion)];
  if (candidates.some((x) => x.sources.includes('monarch-semsim'))) attributions.push(ATTRIBUTION.monarch);
  if (candidates.some((x) => x.sources.includes('orphadata'))) attributions.push(ATTRIBUTION.orphanet);
  if (c.demo) attributions.push(ATTRIBUTION.phenopacketStore);

  const stamp = generatedAt.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const subjectId = c.demo ? `DEMO-synthetic-${c.demo.caseId}` : 'rdd-subject-1';

  const phenopacket: Phenopacket = {
    id: `rdd-${c.demo?.caseId ?? 'case'}-${stamp}`,
    subject: { id: subjectId, sex: 'UNKNOWN_SEX' },
    phenotypicFeatures: [
      ...observed.map((f) => ({ type: { id: f.id, label: f.label }, ...(f.quote ? { description: f.quote } : {}) })),
      ...excluded.map((f) => ({
        type: { id: f.id, label: f.label },
        excluded: true,
        ...(f.quote ? { description: f.quote } : {}),
      })),
    ],
    metaData: {
      created: generatedAt,
      createdBy: 'Rare Disease Detective v0.1',
      resources: [
        {
          id: 'hp',
          name: 'human phenotype ontology',
          url: 'http://purl.obolibrary.org/obo/hp.owl',
          version: hpoVersion,
          namespacePrefix: 'HP',
          iriPrefix: 'http://purl.obolibrary.org/obo/HP_',
        },
      ],
      phenopacketSchemaVersion: '2.0',
      ...(c.demo
        ? {
            externalReferences: [
              {
                id: `phenopacket-store:${c.demo.sourcePhenopacketId}`,
                description:
                  'DEMO DATA. Synthetic narrative derived from a phenopacket-store case (BSD-3). Not a real patient.',
              },
            ],
          }
        : {}),
    },
  };

  return {
    version: CONTRACT_VERSION,
    source: 'demo',
    brief: {
      title: 'Specialist brief: features and possible matches to discuss',
      generatedAt,
      patientSummary: { demo: c.demo !== null, ...(c.demo ? { demoLabel: c.demo.label } : {}) },
      features: { observed, excluded },
      candidates,
      questions: c.questions,
      specialists: [], // No mapping table in the app; contract 7.7 says omit when not grounded.
      // source = the annotation set the gene came from (e.g. OMIM:154700, not ORPHA:558).
      // Genes whose source the mocks do not know are left out (not traceable).
      testsToAsk: top3.flatMap((cand) =>
        cand.genes.flatMap((gene) => {
          const source = geneSourceFor(cand.diseaseId, gene.id);
          if (!source) return [];
          return [
            {
              text: `Ask whether genetic testing that includes ${gene.symbol} is appropriate (gene associated with ${cand.name} in HPO annotations)`,
              gene,
              diseaseId: cand.diseaseId,
              source,
            },
          ];
        }),
      ),
      disclaimer: DISCLAIMER,
      attributions,
      dataVersions: mockDataVersions(),
    },
    phenopacket,
  };
}
