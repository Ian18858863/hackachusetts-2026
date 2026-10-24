// Shared types for the Rare Disease Detective engine.
// Source of truth: docs/CONTRACT.md v0.1, sections 5 (shared types), 6 (engine
// signatures), 7 (endpoint bodies), 8 (case object) and 9 (demo cases).
// These are a contract, not an implementation: change them only through the
// contract change process (CONTRACT.md section 14).
// Types only: this file has no runtime code, so it is safe to import from the
// app, from Pages Functions and from tests.

// ---- primitives ----
export type ContractVersion = "0.1";
export type Source = "live" | "demo";
export type HpoId = string; // "HP:0001166", regex ^HP:\d{7}$
export type DiseaseId = string; // "ORPHA:558" preferred, else "OMIM:154700"
export type MondoId = string; // "MONDO:0007947"
export type IsoDateTime = string; // "2026-10-24T16:05:00.000Z"

export interface DataVersions {
  hpo?: string; // HPO release, e.g. "2025-11-24"; "unknown" if the API does not expose it (open question 6)
  monarch?: string; // Monarch API/KG version if exposed, else "v3 API"
  orphanet?: string; // Orphadata record date, e.g. "2026-06-23"
  clinicalTrials?: string; // ClinicalTrials.gov data date if exposed
  pubCaseFinder?: string;
  demoCache?: string; // date the demo cache was recorded; present only when source = "demo"
  fetchedAt: IsoDateTime; // when this response's upstream data was fetched (or recorded, for demo)
}

export type ErrorCode =
  | "INVALID_REQUEST"
  | "METHOD_NOT_ALLOWED"
  | "TEXT_TOO_LONG"
  | "NO_TERMS_FOUND"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "LLM_UNAVAILABLE"
  | "UPSTREAM_TIMEOUT"
  | "INTERNAL";

export interface ApiError {
  version: ContractVersion;
  error: { code: ErrorCode; message: string; retryable: boolean };
}

// ---- phenotype terms ----
export interface HpoTerm {
  id: HpoId;
  label: string; // HPO primary name, unchanged
  definition?: string;
  synonyms?: string[];
}

export type Confidence = "high" | "medium" | "low";
export type Grounding = "exact-id" | "label-search";

export interface ExtractedTerm {
  hpoId: HpoId; // confirmed by the HPO API; never LLM-invented
  label: string; // HPO primary name from the HPO API
  quote: string; // exact substring of the request text
  start: number; // text.slice(start, end) === quote (UTF-16 code units)
  end: number;
  negated: boolean; // true = the text says the feature is absent
  confidence: Confidence; // LLM's own confidence in the phrase -> term mapping
  grounding: Grounding; // exact-id: LLM id confirmed; label-search: re-mapped by label
}

// ---- frequencies ----
// HPO frequency bands (HP:0040279 subclasses). Raw "n/m" or "x%" values are mapped to a band:
// Obligate 100%, Very frequent 80-99%, Frequent 30-79%, Occasional 5-29%, Very rare 1-4%, Excluded 0%.
export type FrequencyLabel =
  | "Obligate"
  | "Very frequent"
  | "Frequent"
  | "Occasional"
  | "Very rare"
  | "Excluded";

export interface FrequencyInfo {
  label: FrequencyLabel | null; // null = annotated without a frequency
  raw?: string; // value as given by the source, e.g. "112/140"
  source: DiseaseId; // which annotation set it came from, e.g. "OMIM:154700"
}

// ---- ranking ----
export type OverlapLabel = "strong" | "partial" | "weak";

export interface TermRef {
  id: HpoId;
  label: string;
}

export interface Evidence {
  patientTerm: TermRef;
  diseaseTerm: TermRef;
  via: "exact" | "ancestor";
  ancestor?: TermRef; // the shared ancestor (Monarch match_subsumer) when via = "ancestor"
  frequency: FrequencyInfo | null; // frequency of diseaseTerm in this disease; null if not annotated
}

export interface DiseaseFeature {
  term: TermRef;
  frequency: FrequencyInfo;
}

export interface Gene {
  id: string; // "NCBIGene:2200"
  symbol: string; // "FBN1"
}

export type CandidateSource = "monarch-semsim" | "hpo-annotations" | "orphadata" | "pubcasefinder";

export interface Candidate {
  rank: number; // 1..n, no gaps
  diseaseId: DiseaseId;
  mondoId: MondoId;
  name: string;
  overlap: OverlapLabel; // rule in contract section 7.4
  score: number; // raw Monarch semsim score; UI says "raw service score"
  matched: Evidence[];
  unmatched: TermRef[]; // patient observed terms with no qualifying match in this disease
  notReported: DiseaseFeature[]; // frequent disease features the patient has not mentioned (max 8)
  contradicted: DiseaseFeature[]; // patient-excluded features this disease usually has
  categories: string[]; // organ systems from HPO annotation categories, e.g. "Eye"
  genes: Gene[]; // from HPO annotations; may be empty
  links: { monarch: string; orphanet?: string; omim?: string }; // links only; no OMIM API
  sources: CandidateSource[];
  pubCaseFinderRank?: number; // only if PubCaseFinder was used (open question 3)
}

// ---- what to check next ----
export interface Question {
  hpoId: HpoId;
  label: string; // HPO primary name
  question: string; // plain-language question; wording only, no new facts
  discriminates: Array<{ diseaseId: DiseaseId; frequency: FrequencyInfo | null }>; // one per candidate
  why: string; // built from `discriminates`
  score: number; // discrimination score (section 7.5); for ordering, not shown as a probability
}

// ---- trials ----
export interface Trial {
  nctId: string; // "NCT01234567"
  title: string; // BriefTitle
  status: "RECRUITING";
  phases: string[]; // e.g. ["PHASE2"]; [] if none listed
  conditions: string[];
  countries: string[]; // unique LocationCountry values
  url: string; // https://clinicaltrials.gov/study/<nctId>
}

// ---- brief ----
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

export type TermStatus = "observed" | "excluded" | "removed";
export type Provenance = "llm" | "manual" | "demo";

export type BriefFeature = TermRef & { quote?: string; provenance: Provenance };

export interface Brief {
  title: string;
  generatedAt: IsoDateTime;
  patientSummary: { demo: boolean; demoLabel?: string; notesExcerpt?: string; ageText?: string };
  features: {
    observed: BriefFeature[];
    excluded: BriefFeature[];
  };
  candidates: Candidate[]; // as last ranked, top 5 max
  questions: Question[];
  specialists: SpecialistSuggestion[]; // [] unless grounded (section 7.7)
  testsToAsk: TestSuggestion[]; // [] unless grounded (section 7.7)
  disclaimer: string; // section 13, verbatim
  attributions: string[]; // section 13, only sources whose data appear
  dataVersions: DataVersions;
}

// ---- Phenopacket v2 subset (GA4GH) ----
export interface OntologyClass {
  id: string;
  label: string;
}

export interface PhenopacketHpResource {
  id: "hp";
  name: "human phenotype ontology";
  url: "http://purl.obolibrary.org/obo/hp.owl";
  version: string;
  namespacePrefix: "HP";
  iriPrefix: "http://purl.obolibrary.org/obo/HP_";
}

export interface PhenotypicFeature {
  type: OntologyClass;
  excluded?: boolean;
  description?: string;
}

export interface Phenopacket {
  id: string;
  subject: { id: string; sex?: "UNKNOWN_SEX" | "FEMALE" | "MALE" | "OTHER_SEX" };
  phenotypicFeatures: PhenotypicFeature[];
  metaData: {
    created: IsoDateTime;
    createdBy: string; // "Rare Disease Detective v0.1"
    resources: PhenopacketHpResource[];
    phenopacketSchemaVersion: "2.0";
    externalReferences?: Array<{ id: string; reference?: string; description: string }>;
  };
}

// ---- endpoint bodies the engine produces or consumes (contract section 7) ----
// "The function adds `version`": engine functions return the full success body.

/** POST /api/rank request (section 7.4). */
export interface RankRequest {
  observed: HpoId[]; // 1-50 ids
  excluded?: HpoId[]; // 0-50 ids, default []
  limit?: number; // 1-10, default 5
}

/** POST /api/rank response 200 (section 7.4). */
export interface RankResponse {
  version: ContractVersion;
  source: Source;
  candidates: Candidate[];
  dataVersions: DataVersions;
}

/** POST /api/next-questions request (section 7.5). */
export interface NextQuestionsRequest {
  observed: HpoId[];
  excluded?: HpoId[]; // default []
  candidates: DiseaseId[]; // 2-5 ids
  limit?: number; // 1-8, default 5
}

/** POST /api/next-questions response 200 (section 7.5). */
export interface NextQuestionsResponse {
  version: ContractVersion;
  source: Source;
  questions: Question[];
  dataVersions: DataVersions;
}

/** GET /api/trials response 200 (section 7.6). */
export interface TrialsResponse {
  version: ContractVersion;
  source: Source;
  studies: Trial[]; // at most 5
  query: { condition: string; ids: string[]; status: "RECRUITING" };
  total: number; // upstream count
  fetchedAt: IsoDateTime;
  dataVersions: DataVersions;
}

// ---- case object (app, section 8) ----
export interface CaseTerm {
  hpoId: HpoId;
  label: string;
  status: TermStatus; // observed | excluded | removed
  provenance: Provenance; // llm | manual | demo
  quote?: string; // from extraction; absent for manual terms
  start?: number;
  end?: number;
  confidence?: Confidence;
  grounding?: Grounding;
  updatedAt: IsoDateTime;
}

export interface CaseObject {
  version: ContractVersion;
  caseId: string; // random UUID in the browser
  demo: { caseId: string; sourcePhenopacketId: string; label: string } | null;
  notes: string; // the pasted text, <= 8,000 chars
  terms: CaseTerm[];
  lastRanking: {
    request: { observed: HpoId[]; excluded: HpoId[]; limit: number };
    response: RankResponse;
    rankedAt: IsoDateTime;
  } | null;
  questions: Question[];
  selectedCandidateId: DiseaseId | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ---- demo cases (section 9) ----
export interface DemoCaseSummary {
  caseId: string;
  title: string;
  label: string;
  sourcePhenopacketId: string;
}

export interface DemoCase extends DemoCaseSummary {
  narrative: string;
  expectedDiagnosis: { id: string; label: string }; // from the source phenopacket; for the benchmark and tests, never shown as "the answer"
  extraction: ExtractedTerm[]; // prepared, grounding "exact-id", confidence "high"
  recordedAt: IsoDateTime;
}

// ---- engine dependencies and inputs (section 6) ----
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type UpstreamName =
  | "hpoSearch"
  | "hpoTerm"
  | "hpoAnnotation"
  | "monarchSemsim"
  | "orphadata"
  | "pubCaseFinder"
  | "clinicalTrials";

export interface EngineDeps {
  fetch: FetchLike; // injected; tests pass a mock
  now?: () => Date; // injected clock for deterministic tests
  cache?: Cache; // Workers Cache API (caches.default); optional
  timeoutsMs?: Partial<Record<UpstreamName, number>>; // defaults in section 10
}

/** What the LLM step hands to the engine. Nothing here is trusted. */
export interface TermProposal {
  phrase: string; // should be an exact substring of text
  label: string; // LLM's suggested HPO label
  hpoId?: string; // LLM's suggested id, may be wrong or invented
  negated: boolean;
  confidence: Confidence;
}

export interface GroundingResult {
  terms: ExtractedTerm[];
  warnings: string[];
  dataVersions: DataVersions;
}
