/**
 * Interface types for the app, mirroring docs/CONTRACT.md v0.1 (DRAFT, 2026-10-24):
 * section 5 (shared types), section 7 (endpoint bodies), section 8 (case object)
 * and section 9 (demo case summary).
 *
 * The contract is the source of truth. If this file and the contract disagree,
 * the contract wins and this file gets fixed. Do not add fields here that the
 * contract does not define; app-only state lives in shared/store.tsx.
 *
 * When engine/types.ts lands (Jerry, T07) these can be re-exported from there;
 * until then the app keeps its own copy so it builds without the engine.
 */

// ---------------------------------------------------------------------------
// Section 5: primitives
// ---------------------------------------------------------------------------

export const CONTRACT_VERSION = '0.1' as const;
export type ContractVersion = typeof CONTRACT_VERSION;
export type Source = 'live' | 'demo';
/** "HP:0001166", regex ^HP:\d{7}$ */
export type HpoId = string;
/** "ORPHA:558" preferred, else "OMIM:154700" */
export type DiseaseId = string;
/** "MONDO:0007947" */
export type MondoId = string;
/** "2026-10-24T16:05:00.000Z" */
export type IsoDateTime = string;

export const HPO_ID_PATTERN = /^HP:\d{7}$/;

export interface DataVersions {
  hpo?: string;
  monarch?: string;
  orphanet?: string;
  clinicalTrials?: string;
  pubCaseFinder?: string;
  /** Present only when source = "demo". */
  demoCache?: string;
  fetchedAt: IsoDateTime;
}

export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'METHOD_NOT_ALLOWED'
  | 'TEXT_TOO_LONG'
  | 'NO_TERMS_FOUND'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'LLM_UNAVAILABLE'
  | 'UPSTREAM_TIMEOUT'
  | 'INTERNAL';

export interface ApiError {
  version: ContractVersion;
  error: { code: ErrorCode; message: string; retryable: boolean };
}

/** Fields on every success response (section 4). */
export interface SuccessEnvelope {
  version: ContractVersion;
  source: Source;
}

// ---------------------------------------------------------------------------
// Section 5: phenotype terms
// ---------------------------------------------------------------------------

export interface HpoTerm {
  id: HpoId;
  label: string;
  definition?: string;
  synonyms?: string[];
}

export type Confidence = 'high' | 'medium' | 'low';
export type Grounding = 'exact-id' | 'label-search';

export interface ExtractedTerm {
  hpoId: HpoId;
  label: string;
  /** Exact substring of the request text. */
  quote: string;
  /** text.slice(start, end) === quote (UTF-16 code units). */
  start: number;
  end: number;
  negated: boolean;
  confidence: Confidence;
  grounding: Grounding;
}

// ---------------------------------------------------------------------------
// Section 5: frequencies
// ---------------------------------------------------------------------------

export type FrequencyLabel =
  | 'Obligate'
  | 'Very frequent'
  | 'Frequent'
  | 'Occasional'
  | 'Very rare'
  | 'Excluded';

export interface FrequencyInfo {
  /** null = annotated without a frequency. */
  label: FrequencyLabel | null;
  raw?: string;
  source: DiseaseId;
}

// ---------------------------------------------------------------------------
// Section 5: ranking
// ---------------------------------------------------------------------------

export type OverlapLabel = 'strong' | 'partial' | 'weak';

export interface TermRef {
  id: HpoId;
  label: string;
}

export interface Evidence {
  patientTerm: TermRef;
  diseaseTerm: TermRef;
  via: 'exact' | 'ancestor';
  ancestor?: TermRef;
  frequency: FrequencyInfo | null;
}

export interface DiseaseFeature {
  term: TermRef;
  frequency: FrequencyInfo;
}

export interface Gene {
  id: string;
  symbol: string;
}

export type CandidateSource = 'monarch-semsim' | 'hpo-annotations' | 'orphadata' | 'pubcasefinder';

export interface Candidate {
  /** /api/rank (T32b): false when some annotation data could not be loaded; absent means true. */
  evidenceComplete?: boolean;
  rank: number;
  diseaseId: DiseaseId;
  mondoId: MondoId;
  name: string;
  overlap: OverlapLabel;
  /** Raw Monarch semsim score. The UI calls it "raw service score", never a percentage. */
  score: number;
  matched: Evidence[];
  unmatched: TermRef[];
  notReported: DiseaseFeature[];
  contradicted: DiseaseFeature[];
  categories: string[];
  genes: Gene[];
  links: { monarch: string; orphanet?: string; omim?: string };
  sources: CandidateSource[];
  pubCaseFinderRank?: number;
}

// ---------------------------------------------------------------------------
// Section 5: what to check next
// ---------------------------------------------------------------------------

export interface Question {
  hpoId: HpoId;
  label: string;
  question: string;
  discriminates: Array<{ diseaseId: DiseaseId; frequency: FrequencyInfo | null }>;
  why: string;
  /** For ordering only; never shown as a probability. */
  score: number;
}

// ---------------------------------------------------------------------------
// Section 5: trials
// ---------------------------------------------------------------------------

export interface Trial {
  nctId: string;
  title: string;
  status: 'RECRUITING';
  phases: string[];
  conditions: string[];
  countries: string[];
  url: string;
}

// ---------------------------------------------------------------------------
// Section 5: brief and phenopacket
// ---------------------------------------------------------------------------

export type TermStatus = 'observed' | 'excluded' | 'removed';
export type Provenance = 'llm' | 'manual' | 'demo';

export interface SpecialistSuggestion {
  specialty: string;
  becauseOf: string[];
  mappingRow: string;
}

export interface TestSuggestion {
  text: string;
  gene: Gene;
  diseaseId: DiseaseId;
  source: DiseaseId;
}

export type BriefFeature = TermRef & { quote?: string; provenance: Provenance };

export interface Brief {
  title: string;
  generatedAt: IsoDateTime;
  patientSummary: { demo: boolean; demoLabel?: string; notesExcerpt?: string; ageText?: string };
  features: { observed: BriefFeature[]; excluded: BriefFeature[] };
  candidates: Candidate[];
  questions: Question[];
  specialists: SpecialistSuggestion[];
  testsToAsk: TestSuggestion[];
  disclaimer: string;
  attributions: string[];
  dataVersions: DataVersions;
}

export interface OntologyClass {
  id: string;
  label: string;
}

export interface Phenopacket {
  id: string;
  subject: { id: string; sex?: 'UNKNOWN_SEX' | 'FEMALE' | 'MALE' | 'OTHER_SEX' };
  phenotypicFeatures: Array<{ type: OntologyClass; excluded?: boolean; description?: string }>;
  metaData: {
    created: IsoDateTime;
    createdBy: string;
    resources: Array<{
      id: 'hp';
      name: 'human phenotype ontology';
      url: 'http://purl.obolibrary.org/obo/hp.owl';
      version: string;
      namespacePrefix: 'HP';
      iriPrefix: 'http://purl.obolibrary.org/obo/HP_';
    }>;
    phenopacketSchemaVersion: '2.0';
    externalReferences?: Array<{ id: string; reference?: string; description: string }>;
  };
}

// ---------------------------------------------------------------------------
// Section 7: endpoint bodies
// ---------------------------------------------------------------------------

/** 7.1 GET /api/health */
export interface HealthResponse extends SuccessEnvelope {
  ok: boolean;
  time: IsoDateTime;
  llm: { binding: boolean; model: string | null };
}

/** 7.2 POST /api/extract */
export interface ExtractRequest {
  /** 1 to 8,000 characters. */
  text: string;
  caseId?: string;
}
export interface ExtractResponse extends SuccessEnvelope {
  /** In order of start. */
  terms: ExtractedTerm[];
  warnings: string[];
  model: string;
  dataVersions: DataVersions;
}

/** 7.3 GET /api/terms?q=&limit= */
export interface TermsQuery {
  /** 2 to 100 characters. */
  q: string;
  /** 1 to 20, default 8. */
  limit?: number;
}
export interface TermsResponse extends SuccessEnvelope {
  terms: HpoTerm[];
  dataVersions: DataVersions;
}

/** 7.4 POST /api/rank */
export interface RankRequest {
  /** 1 to 50 ids. */
  observed: HpoId[];
  /** 0 to 50 ids; never overlapping observed. */
  excluded?: HpoId[];
  /** 1 to 10, default 5. */
  limit?: number;
}
export interface RankResponse extends SuccessEnvelope {
  candidates: Candidate[];
  dataVersions: DataVersions;
}

/** 7.5 POST /api/next-questions */
export interface NextQuestionsRequest {
  observed: HpoId[];
  excluded?: HpoId[];
  /** 2 to 5 ids. */
  candidates: DiseaseId[];
  /** 1 to 8, default 5. */
  limit?: number;
}
export interface NextQuestionsResponse extends SuccessEnvelope {
  questions: Question[];
  dataVersions: DataVersions;
}

/** 7.6 GET /api/trials?condition=&ids= */
export interface TrialsQuery {
  /** Disease name, 2 to 200 characters. */
  condition: string;
  ids?: string[];
}
export interface TrialsResponse extends SuccessEnvelope {
  /** At most 5. */
  studies: Trial[];
  query: { condition: string; ids?: string[]; status: 'RECRUITING' };
  total: number;
  fetchedAt: IsoDateTime;
  dataVersions: DataVersions;
}

/** 7.7 POST /api/brief */
export interface BriefRequest {
  case: CaseObject;
}
export interface BriefResponse extends SuccessEnvelope {
  brief: Brief;
  phenopacket: Phenopacket;
}

// ---------------------------------------------------------------------------
// Section 8: the app's case object (stored in localStorage as rdd.case.v0.1)
// ---------------------------------------------------------------------------

export const CASE_STORAGE_KEY = 'rdd.case.v0.1';

export interface CaseTerm {
  hpoId: HpoId;
  label: string;
  status: TermStatus;
  provenance: Provenance;
  quote?: string;
  start?: number;
  end?: number;
  confidence?: Confidence;
  grounding?: Grounding;
  updatedAt: IsoDateTime;
}

export interface CaseRanking {
  request: { observed: HpoId[]; excluded: HpoId[]; limit: number };
  response: RankResponse;
  rankedAt: IsoDateTime;
}

export interface CaseObject {
  version: ContractVersion;
  caseId: string;
  demo: { caseId: string; sourcePhenopacketId: string; label: string } | null;
  /** The pasted text, at most 8,000 characters. */
  notes: string;
  terms: CaseTerm[];
  lastRanking: CaseRanking | null;
  questions: Question[];
  selectedCandidateId: DiseaseId | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Section 9: demo cases
// ---------------------------------------------------------------------------

export interface DemoCaseSummary {
  caseId: string;
  title: string;
  label: string;
  sourcePhenopacketId: string;
}

export interface DemoCase extends DemoCaseSummary {
  narrative: string;
  /** From the source phenopacket; for tests and the benchmark, never shown as "the answer". */
  expectedDiagnosis: { id: string; label: string };
  extraction: ExtractedTerm[];
  recordedAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Limits used by the client (sections 7.2 to 7.6)
// ---------------------------------------------------------------------------

export const LIMITS = {
  notesMaxChars: 8000,
  termsQueryMin: 2,
  termsQueryMax: 100,
  rankIdsMax: 50,
  rankRecommendedObserved: 6,
  rankDefaultLimit: 5,
  questionsCandidatesMin: 2,
  questionsCandidatesMax: 5,
  questionsDefaultLimit: 5,
} as const;
