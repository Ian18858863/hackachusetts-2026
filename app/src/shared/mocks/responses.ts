/**
 * Deterministic offline mocks for every /api/* endpoint (docs/CONTRACT.md v0.1).
 *
 * Used ONLY by shared/api.ts when an endpoint is unreachable or not built yet
 * (network error, 404, 501, or a non-JSON answer). Every view that shows a
 * mocked payload must display OFFLINE_MOCK_LABEL. Never use these to hide a
 * real 4xx validation error.
 *
 * What is real and what is illustrative:
 * - Demo narratives and prepared extractions: verbatim from contract section 9.
 * - The first candidate for each demo case: disease id, MONDO id, name, genes
 *   and annotation categories were read on 2026-10-24 from the Monarch v3
 *   search API and the JAX HPO annotation API.
 * - Extra HPO terms used for "not reported" features and questions were
 *   confirmed with GET https://ontology.jax.org/api/hp/terms/{id} on 2026-10-24.
 * - ALL frequencies, scores and overlap labels are ILLUSTRATIVE, not real data.
 * - Comparison candidates are placeholders named "Mock comparison condition",
 *   not real diseases, so no disease fact is invented.
 * - Trials: the mock returns no studies; no trial id is invented.
 */
import {
  CONTRACT_VERSION,
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
  type FrequencyLabel,
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
import { DEMO_CASES, findDemoCase, verifyDemoCase } from './demoCases';

export const MOCK_RECORDED_AT = '2026-10-24T16:05:00.000Z';
export const MOCK_HPO_VERSION = 'unknown (offline mock)';

function mockDataVersions(extra: Partial<DataVersions> = {}): DataVersions {
  return { hpo: MOCK_HPO_VERSION, demoCache: 'offline mock', fetchedAt: MOCK_RECORDED_AT, ...extra };
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
  categories: string[];
}

interface MockProfile {
  caseId: string;
  disease: MockDisease;
  /** Verified HPO terms not in the narrative; frequencies are illustrative. */
  otherFeatures: Array<{ term: TermRef; frequency: FrequencyLabel }>;
}

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
      genes: [{ id: 'NCBIGene:1756', symbol: 'DMD' }],
      categories: ['Musculature', 'Nervous System', 'Cardiovascular', 'Metabolism/Laboratory abnormality'],
    },
    otherFeatures: [
      { term: { id: 'HP:0002515', label: 'Waddling gait' }, frequency: 'Very frequent' },
      { term: { id: 'HP:0003202', label: 'Skeletal muscle atrophy' }, frequency: 'Very frequent' },
      { term: { id: 'HP:0001644', label: 'Dilated cardiomyopathy' }, frequency: 'Frequent' },
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
      categories: ['Cardiovascular', 'Eye', 'Skeletal system', 'Skin, Hair, and Nails'],
    },
    otherFeatures: [
      { term: { id: 'HP:0001519', label: 'Disproportionate tall stature' }, frequency: 'Very frequent' },
      { term: { id: 'HP:0000545', label: 'Myopia' }, frequency: 'Frequent' },
      { term: { id: 'HP:0001634', label: 'Mitral valve prolapse' }, frequency: 'Frequent' },
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
      genes: [{ id: 'NCBIGene:8085', symbol: 'KMT2D' }],
      categories: ['Head and neck', 'Eye', 'Growth', 'Cardiovascular', 'Limbs'],
    },
    otherFeatures: [
      { term: { id: 'HP:0000175', label: 'Cleft palate' }, frequency: 'Frequent' },
      { term: { id: 'HP:0000369', label: 'Low-set ears' }, frequency: 'Frequent' },
      { term: { id: 'HP:0001256', label: 'Mild intellectual disability' }, frequency: 'Very frequent' },
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
      categories: ['Growth', 'Limbs', 'Head and neck', 'Skin, Hair, and Nails', 'Genitourinary system'],
    },
    otherFeatures: [
      { term: { id: 'HP:0000664', label: 'Synophrys' }, frequency: 'Very frequent' },
      { term: { id: 'HP:0000347', label: 'Micrognathia' }, frequency: 'Frequent' },
      { term: { id: 'HP:0002020', label: 'Gastroesophageal reflux' }, frequency: 'Frequent' },
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

function freq(label: FrequencyLabel, source: string): FrequencyInfo {
  return { label, source };
}

/** All verified terms the mocks know, for /api/terms and label lookups. */
const KNOWN_TERMS: Map<HpoId, TermRef> = (() => {
  const map = new Map<HpoId, TermRef>();
  for (const c of DEMO_CASES) for (const t of c.extraction) map.set(t.hpoId, { id: t.hpoId, label: t.label });
  for (const p of PROFILES) for (const f of p.otherFeatures) map.set(f.term.id, f.term);
  return map;
})();

function termRef(id: HpoId): TermRef {
  return KNOWN_TERMS.get(id) ?? { id, label: id };
}

/** The demo case whose prepared terms overlap the request most (ties: picker order). */
function closestDemoCase(observed: readonly HpoId[]): { demo: DemoCase; profile: MockProfile } | null {
  let best: { demo: DemoCase; profile: MockProfile; hits: number } | null = null;
  for (const profile of PROFILES) {
    const demo = findDemoCase(profile.caseId);
    if (!demo) continue;
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
  return {
    version: CONTRACT_VERSION,
    source: 'demo',
    terms: demo ? demo.extraction.map((t) => ({ ...t })) : [],
    warnings: demo
      ? []
      : ['Offline mock: only the bundled demo narratives can be read without the server. Add terms by hand instead.'],
    model: demo ? 'demo-prepared' : 'offline-mock',
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
  diseaseFeatures: Array<{ term: TermRef; frequency: FrequencyLabel }>,
  options: { score: number; sources: Candidate['sources'] },
): Omit<Candidate, 'rank'> {
  const featureById = new Map(diseaseFeatures.map((f) => [f.term.id, f]));
  const matched: Evidence[] = [];
  const unmatched: TermRef[] = [];
  for (const id of observed) {
    const feature = featureById.get(id);
    if (feature) {
      matched.push({
        patientTerm: termRef(id),
        diseaseTerm: feature.term,
        via: 'exact',
        frequency: freq(feature.frequency, disease.diseaseId),
      });
    } else {
      unmatched.push(termRef(id));
    }
  }
  const usual = (f: { frequency: FrequencyLabel }) =>
    f.frequency === 'Obligate' || f.frequency === 'Very frequent' || f.frequency === 'Frequent';
  const contradicted: DiseaseFeature[] = diseaseFeatures
    .filter((f) => usual(f) && excluded.includes(f.term.id))
    .map((f) => ({ term: f.term, frequency: freq(f.frequency, disease.diseaseId) }));
  const notReported: DiseaseFeature[] = diseaseFeatures
    .filter((f) => usual(f) && !observed.includes(f.term.id) && !excluded.includes(f.term.id))
    .slice(0, 8)
    .map((f) => ({ term: f.term, frequency: freq(f.frequency, disease.diseaseId) }));

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
    categories: [],
  };
}

export function mockRank(req: RankRequest): RankResponse {
  const observed = sortedUnique(req.observed);
  const excluded = sortedUnique(req.excluded);
  const limit = Math.min(Math.max(req.limit ?? 5, 1), 10);
  const match = closestDemoCase(observed);
  const caseKey = match?.demo.caseId.replace(/^demo-/, '') ?? 'manual';

  const all: Array<Omit<Candidate, 'rank'>> = [];

  if (match) {
    const prepared = match.demo.extraction.filter((t) => !t.negated);
    // Illustrative: the source patient's own features, alternating bands.
    const features = [
      ...prepared.map((t, i) => ({
        term: { id: t.hpoId, label: t.label },
        frequency: (i % 3 === 2 ? 'Frequent' : 'Very frequent') as FrequencyLabel,
      })),
      ...match.profile.otherFeatures,
    ];
    all.push(
      buildCandidate(match.profile.disease, observed, excluded, features, {
        score: 14.2,
        sources: ['monarch-semsim', 'hpo-annotations'],
      }),
    );
  }

  // Placeholder comparison conditions share a shrinking slice of the observed terms.
  for (let i = 0; all.length < limit && i < 4; i++) {
    const share = Math.max(1, Math.floor(observed.length * (0.5 - i * 0.1)));
    const features = observed
      .slice(i, i + share)
      .map((id) => ({ term: termRef(id), frequency: (i % 2 ? 'Occasional' : 'Frequent') as FrequencyLabel }));
    all.push(
      buildCandidate(placeholderDisease(i, caseKey), observed, excluded, features, {
        score: Number((11.6 - i * 1.3).toFixed(1)),
        sources: ['monarch-semsim'],
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
    dataVersions: mockDataVersions({ monarch: 'offline mock' }),
  };
}

// ---------------------------------------------------------------------------
// /api/next-questions
// ---------------------------------------------------------------------------

export function mockNextQuestions(req: NextQuestionsRequest): NextQuestionsResponse {
  const observed = new Set(req.observed);
  const excluded = new Set(req.excluded ?? []);
  const limit = Math.min(Math.max(req.limit ?? 5, 1), 8);
  const profile = PROFILES.find((p) => req.candidates.includes(p.disease.diseaseId));
  const nameOf = (id: string) =>
    PROFILES.find((p) => p.disease.diseaseId === id)?.disease.name ??
    (id.startsWith('MOCK:') ? `Mock comparison condition ${id.slice(-1)}` : id);

  const questions: Question[] = (profile?.otherFeatures ?? [])
    .filter((f) => !observed.has(f.term.id) && !excluded.has(f.term.id))
    .map((f) => {
      const discriminates = req.candidates.map((diseaseId) => ({
        diseaseId,
        frequency: diseaseId === profile?.disease.diseaseId ? freq(f.frequency, diseaseId) : null,
      }));
      const others = req.candidates.filter((id) => id !== profile?.disease.diseaseId).map(nameOf);
      const why = [
        `${f.frequency} in ${profile?.disease.name ?? ''}`,
        others.length > 0 ? `not listed for ${others.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('; ');
      return {
        hpoId: f.term.id,
        label: f.term.label,
        question: `Has anyone noticed ${f.term.label.toLowerCase()}?`,
        discriminates,
        why,
        score: f.frequency === 'Very frequent' ? 0.9 : 0.55,
      };
    })
    .sort((a, b) => b.score - a.score || a.hpoId.localeCompare(b.hpoId))
    .slice(0, limit);

  return { version: CONTRACT_VERSION, source: 'demo', questions, dataVersions: mockDataVersions() };
}

// ---------------------------------------------------------------------------
// /api/trials
// ---------------------------------------------------------------------------

export function mockTrials(query: TrialsQuery): TrialsResponse {
  return {
    version: CONTRACT_VERSION,
    source: 'demo',
    studies: [],
    query: { condition: query.condition, ids: query.ids, status: 'RECRUITING' },
    total: 0,
    fetchedAt: MOCK_RECORDED_AT,
    dataVersions: { fetchedAt: MOCK_RECORDED_AT, demoCache: 'offline mock' },
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
      testsToAsk: top3.flatMap((cand) =>
        cand.genes.map((gene) => ({
          text: `Ask whether genetic testing that includes ${gene.symbol} is appropriate (gene associated with ${cand.name} in HPO annotations)`,
          gene,
          diseaseId: cand.diseaseId,
          source: cand.diseaseId,
        })),
      ),
      disclaimer: DISCLAIMER,
      attributions,
      dataVersions: mockDataVersions(),
    },
    phenopacket,
  };
}
