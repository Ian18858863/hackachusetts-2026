# Interface contract: Rare Disease Detective

> **v0.1.8 DRAFT — pending APPROVE by Jerry (engine fields) and Ian.** v0.1.1 to v0.1.8 are non-breaking (v0.1.1: new primary demo case; v0.1.2: timeouts, overlap counting, next-questions filter, trial relevance and temporary demo fallbacks, as implemented in Ian's functions fallback; v0.1.3: broader-term matches count only through an HP: shared ancestor, `/api/rank` is served by the engine, and `dataVersions.hpo` is the pinned HPO_VERSION; v0.1.4: fallback question ordering under a partial hierarchy check, and demo recordings for demo-npc1, demo-marfan and demo-cdls; v0.1.5: safety text and attribution in the app's family mode; v0.1.6: localized demo provenance label in the app UI and the brief; v0.1.7: PubCaseFinder orders the ranking in production with a 12 s bound and Monarch fallback, `dataVersions.rankingSource`, ranking attribution from data; v0.1.8: `/api/extract` reports a Workers AI outage as retryable 503 `LLM_UNAVAILABLE` and returns the complete features of a streamed answer cut at the 15 s deadline); see the changelog in section 14.
> Contract version string in every response: `"0.1"`. Single file editor: Ian's Kiro (T09).
> Kiro spec that implements this contract: [`.kiro/specs/rare-disease-detective/`](../.kiro/specs/rare-disease-detective/requirements.md).
> This file is the source of truth for request and response shapes. If the spec and this file disagree, this file wins and the spec gets fixed.

## Contents

1. [Product summary and safety rule](#1-product-summary-and-safety-rule)
2. [Architecture (agreed)](#2-architecture-agreed)
3. [Ownership and paths](#3-ownership-and-paths)
4. [Conventions for every endpoint](#4-conventions-for-every-endpoint)
5. [Shared TypeScript types](#5-shared-typescript-types)
6. [Engine functions (Jerry)](#6-engine-functions-jerry)
7. [Endpoints](#7-endpoints)
   - 7.1 [GET /api/health](#71-get-apihealth)
   - 7.2 [POST /api/extract](#72-post-apiextract)
   - 7.3 [GET /api/terms](#73-get-apiterms-proposed)
   - 7.4 [POST /api/rank](#74-post-apirank)
   - 7.5 [POST /api/next-questions](#75-post-apinext-questions)
   - 7.6 [GET /api/trials](#76-get-apitrials)
   - 7.7 [POST /api/brief](#77-post-apibrief)
8. [The app's case object](#8-the-apps-case-object)
9. [Demo cases](#9-demo-cases)
10. [Upstream services, timeouts and caching](#10-upstream-services-timeouts-and-caching)
11. [Properties for property-based tests (T08)](#11-properties-for-property-based-tests-t08)
12. [Offline benchmark (our own evaluation)](#12-offline-benchmark-our-own-evaluation)
13. [Attribution and safety text](#13-attribution-and-safety-text)
14. [Change process](#14-change-process)
15. [Open questions](#15-open-questions)

---

## 1. Product summary and safety rule

A parent or clinician pastes a plain-language symptom history. The app extracts HPO phenotype terms, each shown with the exact sentence fragment it came from. The user confirms, removes, marks absent or adds terms. Candidate rare diseases are ranked with transparent evidence. "What to check next" lists the features that best separate the top candidates, as plain questions. The user can see recruiting trials and export a one-page specialist brief (print to PDF) and a GA4GH Phenopacket v2 JSON.

**Safety rule (binding on every endpoint and screen):**

- This is decision support for a conversation with a doctor, not a diagnosis.
- The ontology and the ranking services rank. The LLM only translates notes into candidate terms.
- No component invents HPO IDs, disease facts, frequencies or probabilities. Every disease fact shown comes from a named upstream source and data version.
- No percentage or probability is derived from a similarity score. Overlap is a plain-language label (`strong` / `partial` / `weak`); the raw score is shown only as "raw service score".
- Demo data is always labelled as demo data. No real patients.

## 2. Architecture (agreed)

```text
Browser (app/**, Ian)
   │  fetch('/api/*') only. Never calls third-party APIs directly.
   ▼
Cloudflare Pages Functions (functions/api/<name>.ts, Ian)
   │  validate input, call engine, map errors, set cache headers
   │  extract.ts → env.AI.run(LLM_MODEL, …)  (Workers AI binding `AI`)
   ▼
Domain engine (engine/**, Jerry) — repo-root TypeScript, pure functions
   │  network only through an injected `fetch`; no Node `fs`; no phenotype.hpoa at runtime
   ├── JAX HPO API        (term search, term lookup, disease annotations)
   ├── Monarch semsim     (primary ranking)
   ├── Orphadata          (id / name cross-check)
   ├── PubCaseFinder      (optional secondary signal, off the critical path)
   ├── ClinicalTrials.gov (recruiting studies)
   └── engine/demo/**     (small labelled demo cache for the bundled demo cases)
```

- The engine runs on Cloudflare Workers. It uses only `fetch`, `URL`, `Request`, `Response`, `crypto.subtle` and standard JS.
- Every engine function that touches the network takes `deps: EngineDeps` with an injected `fetch`, so pure parts are testable offline with mocked responses.
- The LLM is Cloudflare Workers AI, reached through a Pages Functions AI binding named `AI` (an `[ai]` binding in the root `wrangler.toml`; runs on Ian's Cloudflare account; no API key needed). The model id comes from the environment variable `LLM_MODEL`; its default is chosen in T17 by testing Workers AI text models on the demo narratives (candidates: `@cf/openai/gpt-oss-120b`, `@cf/moonshotai/kimi-k2.6`, `@cf/zai-org/glm-5.3`, `@cf/meta/llama-3.3-70b-instruct-fp8-fast`).
- The LLM call lives in `functions/api/extract.ts` (Ian), not in the engine. The LLM only proposes phrases and candidate labels; the engine grounds and validates them.
- No server-side storage of case data. The case object lives in the browser (`localStorage`). Functions must not log note text.

## 3. Ownership and paths

| Path | Owner | Task | Notes |
|---|---|---|---|
| `engine/**` | Jerry | T07 | Domain logic, upstream clients, demo cache (`engine/demo/**`), specialist mapping table |
| `engine/test/**` | Jerry | T08 | fast-check property-based tests (section 11), unit tests with mocked fetch |
| `engine/bench/**` | Jerry | T08 | Offline benchmark script and committed results (section 12) |
| `functions/api/health.ts` | Ian | T03 | Exists |
| `functions/api/<name>.ts` | Ian | one claim per file | `extract`, `terms`, `rank`, `next-questions`, `trials`, `brief` |
| `app/**` | Ian | feature folders claimed separately | Includes the demo narratives' UI (picker, demo labels) |
| `landing/**` | Peter | T04 | Shares tokens and voice with the app; may show a true screenshot of the proof moment |
| `docs/CONTRACT.md` | Ian's Kiro, single editor | T09 | Changes follow section 14 |
| `.kiro/specs/rare-disease-detective/**` | Ian's Kiro | T09 | Must stay consistent with this file |

## 4. Conventions for every endpoint

- JSON in and out, `Content-Type: application/json; charset=utf-8`. Field names are `camelCase`.
- Every success response carries:

| Field | Type | Meaning |
|---|---|---|
| `version` | `"0.1"` | Contract version |
| `source` | `"live"` \| `"demo"` | `demo` only when the payload came from the bundled demo cache (`engine/demo/**`) |
| `dataVersions` | `DataVersions` | Present whenever upstream data appears. Includes `fetchedAt` |

- Every error uses one shape, with the HTTP status from the table below:

```json
{ "version": "0.1", "error": { "code": "UPSTREAM_TIMEOUT", "message": "The ranking service did not answer within 10 seconds. Your terms are kept; try again.", "retryable": true } }
```

| HTTP | `code` | `retryable` | When |
|---|---|---|---|
| 400 | `INVALID_REQUEST` | false | Missing or malformed field, malformed HPO id (`^HP:\d{7}$`), empty `observed` |
| 405 | `METHOD_NOT_ALLOWED` | false | Wrong method |
| 413 | `TEXT_TOO_LONG` | false | `text` over 8,000 characters |
| 422 | `NO_TERMS_FOUND` | false | Extraction produced zero grounded terms |
| 429 | `RATE_LIMITED` | true | Upstream or our own rate limit |
| 502 | `UPSTREAM_ERROR` | true | Upstream returned non-2xx or invalid JSON, and no demo cache entry applies |
| 503 | `LLM_UNAVAILABLE` | false | The Workers AI binding `AI` is missing (e.g. some local runs) and the text is not a bundled demo case |
| 503 | `LLM_UNAVAILABLE` | true | v0.1.8: the binding exists but its call throws (e.g. Workers AI code 4006, daily allocation used up; model unavailable), and the text is not a bundled demo case (section 7.2) |
| 504 | `UPSTREAM_TIMEOUT` | true | Upstream exceeded its timeout (section 10), and no demo cache entry applies |
| 500 | `INTERNAL` | true | Anything else. Message stays generic; no stack traces, no note text |

- `message` is plain English, safe to show to the user as is, and says what the user can do.
- The client keeps all user input on every error.

## 5. Shared TypeScript types

These types are a contract, not implementation. Jerry exports them from `engine/types.ts`; functions and app import them from there.

```ts
// ---- primitives ----
export type ContractVersion = "0.1";
export type Source = "live" | "demo";
export type HpoId = string;        // "HP:0001166", regex ^HP:\d{7}$
export type DiseaseId = string;    // "ORPHA:558" preferred, else "OMIM:154700"
export type MondoId = string;      // "MONDO:0007947"
export type IsoDateTime = string;  // "2026-10-24T16:05:00.000Z"

export interface DataVersions {
  hpo?: string;            // HPO release label; the engine reports its pinned constant HPO_VERSION, e.g. "2026-09-01" (open question 6)
  monarch?: string;        // Monarch API/KG version if exposed, else "v3 API"
  orphanet?: string;       // Orphadata record date, e.g. "2026-06-23"
  clinicalTrials?: string; // ClinicalTrials.gov data date if exposed
  pubCaseFinder?: string;
  rankingSource?: "pubcasefinder" | "monarch"; // v0.1.7: which service ordered the list (/api/rank only); absent in older bodies = Monarch
  demoCache?: string;      // date the demo cache was recorded; present only when source = "demo"
  fetchedAt: IsoDateTime;  // when this response's upstream data was fetched (or recorded, for demo)
}

export interface ApiError {
  version: ContractVersion;
  error: { code: ErrorCode; message: string; retryable: boolean };
}
export type ErrorCode =
  | "INVALID_REQUEST" | "METHOD_NOT_ALLOWED" | "TEXT_TOO_LONG" | "NO_TERMS_FOUND"
  | "RATE_LIMITED" | "UPSTREAM_ERROR" | "LLM_UNAVAILABLE" | "UPSTREAM_TIMEOUT" | "INTERNAL";

// ---- phenotype terms ----
export interface HpoTerm {
  id: HpoId;
  label: string;           // HPO primary name, unchanged
  definition?: string;
  synonyms?: string[];
}

export type Confidence = "high" | "medium" | "low";
export type Grounding = "exact-id" | "label-search";

export interface ExtractedTerm {
  hpoId: HpoId;            // confirmed by the HPO API; never LLM-invented
  label: string;           // HPO primary name from the HPO API
  quote: string;           // exact substring of the request text
  start: number;           // text.slice(start, end) === quote (UTF-16 code units)
  end: number;
  negated: boolean;        // true = the text says the feature is absent
  confidence: Confidence;  // LLM's own confidence in the phrase → term mapping
  grounding: Grounding;    // exact-id: LLM id confirmed; label-search: re-mapped by label
}

// ---- frequencies ----
// HPO frequency bands (HP:0040279 subclasses). Raw "n/m" or "x%" values are mapped to a band:
// Obligate 100%, Very frequent 80–99%, Frequent 30–79%, Occasional 5–29%, Very rare 1–4%, Excluded 0%.
export type FrequencyLabel =
  | "Obligate" | "Very frequent" | "Frequent" | "Occasional" | "Very rare" | "Excluded";

export interface FrequencyInfo {
  label: FrequencyLabel | null; // null = annotated without a frequency
  raw?: string;                 // value as given by the source, e.g. "112/140"
  source: DiseaseId;            // which annotation set it came from, e.g. "OMIM:154700"
}

// ---- ranking ----
export type OverlapLabel = "strong" | "partial" | "weak";

export interface TermRef { id: HpoId; label: string }

export interface Evidence {
  patientTerm: TermRef;
  diseaseTerm: TermRef;
  via: "exact" | "ancestor";
  ancestor?: TermRef;           // the shared ancestor (Monarch match_subsumer) when via = "ancestor"
  frequency: FrequencyInfo | null; // frequency of diseaseTerm in this disease; null if not annotated
}

export interface DiseaseFeature { term: TermRef; frequency: FrequencyInfo }

export interface Gene { id: string; symbol: string } // id "NCBIGene:2200", symbol "FBN1"

export interface Candidate {
  rank: number;                 // 1..n, no gaps
  diseaseId: DiseaseId;
  mondoId: MondoId;
  name: string;
  overlap: OverlapLabel;        // rule in section 7.4
  score: number;                // raw Monarch semsim score; UI says "raw service score"
  matched: Evidence[];
  unmatched: TermRef[];         // patient observed terms with no qualifying match in this disease
  notReported: DiseaseFeature[];// frequent disease features the patient has not mentioned (max 8)
  contradicted: DiseaseFeature[];// patient-excluded features this disease usually has
  categories: string[];         // organ systems from HPO annotation categories, e.g. "Eye"
  genes: Gene[];                // from HPO annotations; may be empty
  links: { monarch: string; orphanet?: string; omim?: string }; // links only; no OMIM API
  sources: Array<"monarch-semsim" | "hpo-annotations" | "orphadata" | "pubcasefinder">;
  pubCaseFinderRank?: number;   // only if PubCaseFinder was used (open question 3)
}

// ---- what to check next ----
export interface Question {
  hpoId: HpoId;
  label: string;                // HPO primary name
  question: string;             // plain-language question; wording only, no new facts
  discriminates: Array<{ diseaseId: DiseaseId; frequency: FrequencyInfo | null }>; // one per candidate
  why: string;                  // built from `discriminates`, e.g. "Very frequent in Marfan syndrome; not listed for <other candidate>"
  score: number;                // discrimination score (section 7.5); for ordering, not shown as a probability
}

// ---- trials ----
export interface Trial {
  nctId: string;                // "NCT01234567"
  title: string;                // BriefTitle
  status: "RECRUITING";
  phases: string[];             // e.g. ["PHASE2"]; [] if none listed
  conditions: string[];
  countries: string[];          // unique LocationCountry values
  url: string;                  // https://clinicaltrials.gov/study/<nctId>
}

// ---- brief ----
export interface SpecialistSuggestion { specialty: string; becauseOf: string[]; mappingRow: string }
export interface TestSuggestion { text: string; gene: Gene; diseaseId: DiseaseId; source: DiseaseId }

export interface Brief {
  title: string;
  generatedAt: IsoDateTime;
  patientSummary: { demo: boolean; demoLabel?: string; notesExcerpt?: string; ageText?: string };
  features: {
    observed: Array<TermRef & { quote?: string; provenance: Provenance }>;
    excluded: Array<TermRef & { quote?: string; provenance: Provenance }>;
  };
  candidates: Candidate[];       // as last ranked, top 5 max
  questions: Question[];
  specialists: SpecialistSuggestion[]; // [] unless grounded (section 7.7)
  testsToAsk: TestSuggestion[];        // [] unless grounded (section 7.7)
  disclaimer: string;            // section 13, verbatim
  attributions: string[];        // section 13, only sources whose data appear
  dataVersions: DataVersions;
}

// ---- Phenopacket v2 subset (GA4GH) ----
export interface OntologyClass { id: string; label: string }
export interface Phenopacket {
  id: string;
  subject: { id: string; sex?: "UNKNOWN_SEX" | "FEMALE" | "MALE" | "OTHER_SEX" };
  phenotypicFeatures: Array<{ type: OntologyClass; excluded?: boolean; description?: string }>;
  metaData: {
    created: IsoDateTime;
    createdBy: string;           // "Rare Disease Detective v0.1"
    resources: Array<{
      id: "hp"; name: "human phenotype ontology"; url: "http://purl.obolibrary.org/obo/hp.owl";
      version: string; namespacePrefix: "HP"; iriPrefix: "http://purl.obolibrary.org/obo/HP_";
    }>;
    phenopacketSchemaVersion: "2.0";
    externalReferences?: Array<{ id: string; reference?: string; description: string }>;
  };
}

// ---- case object (app) ----
export type TermStatus = "observed" | "excluded" | "removed";
export type Provenance = "llm" | "manual" | "demo";
// CaseTerm and CaseObject: section 8
```

## 6. Engine functions (Jerry)

All exported from `engine/index.ts`. Signatures are the contract; internals are Jerry's.

```ts
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface EngineDeps {
  fetch: FetchLike;              // injected; tests pass a mock
  now?: () => Date;              // injected clock for deterministic tests
  cache?: Cache;                 // Workers Cache API (caches.default); optional
  timeoutsMs?: Partial<Record<UpstreamName, number>>; // defaults in section 10
}
export type UpstreamName = "hpoSearch" | "hpoTerm" | "hpoAnnotation" | "monarchSemsim"
  | "orphadata" | "pubCaseFinder" | "clinicalTrials";

/** What the LLM step hands to the engine. Nothing here is trusted. */
export interface TermProposal {
  phrase: string;                // should be an exact substring of text
  label: string;                 // LLM's suggested HPO label
  hpoId?: string;                // LLM's suggested id, may be wrong or invented
  negated: boolean;
  confidence: Confidence;
}

export interface GroundingResult { terms: ExtractedTerm[]; warnings: string[]; dataVersions: DataVersions }

export function groundTerms(text: string, proposals: TermProposal[], deps: EngineDeps): Promise<GroundingResult>;
export function searchTerms(q: string, limit: number, deps: EngineDeps): Promise<{ terms: HpoTerm[]; dataVersions: DataVersions }>;
export function rankCandidates(req: RankRequest, deps: EngineDeps): Promise<RankResponse>;
export function nextQuestions(req: NextQuestionsRequest, deps: EngineDeps): Promise<NextQuestionsResponse>;
export function searchTrials(req: { condition: string; ids?: string[] }, deps: EngineDeps): Promise<TrialsResponse>;

// pure, no network
export function buildBrief(c: CaseObject, opts: { generatedAt: IsoDateTime; dataVersions: DataVersions }): Brief;
export function toPhenopacket(c: CaseObject, opts: { created: IsoDateTime; hpoVersion: string }): Phenopacket;
export function overlapLabel(matchedCount: number, observedCount: number, contradictedCount: number): OverlapLabel;
export function normalizeFrequency(raw: string | undefined | null): FrequencyLabel | null;
export function specialistsFor(categories: string[]): SpecialistSuggestion[]; // mapping table in engine/data/specialists.ts

// demo cache
export function listDemoCases(): DemoCaseSummary[];
export function getDemoCase(caseId: string): DemoCase | undefined;
export function demoRankKey(observed: HpoId[], excluded: HpoId[], limit: number): string; // sorted, deduped
export function getDemoRanking(key: string): RankResponse | undefined;
export function getDemoQuestions(key: string): NextQuestionsResponse | undefined;
export function getDemoTrials(condition: string): TrialsResponse | undefined;
```

`RankRequest`, `RankResponse`, `NextQuestionsRequest`, `NextQuestionsResponse`, `TrialsResponse` are the endpoint bodies in section 7 (the function adds `version`). `DemoCase` is defined in section 9.

## 7. Endpoints

### 7.1 GET /api/health

Owner: Ian (`functions/api/health.ts`, exists). No engine call. Timeout: none.

```json
{ "version": "0.1", "source": "live", "ok": true, "time": "2026-10-24T16:05:00.000Z", "llm": { "binding": true, "model": "@cf/openai/gpt-oss-120b" } }
```

| Field | Type | Notes |
|---|---|---|
| `ok` | boolean | Function is up |
| `time` | IsoDateTime | Server time |
| `llm.binding` | boolean | Whether the Workers AI binding `AI` is present. `false` means demo-only extraction |
| `llm.model` | string \| null | Workers AI model id in use (`LLM_MODEL` or the T17 default); `null` when the binding is missing. The model shown in the example is a placeholder until T17 |

### 7.2 POST /api/extract

Owner: Ian (`functions/api/extract.ts`, LLM step). Engine: `groundTerms`, `getDemoCase` (Jerry).
Total budget 20 s: LLM 15 s, grounding 4 s (HPO term lookup 2 s, label search 2 s, in parallel per term).

**Request**

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | string | yes | 1 to 8,000 characters. Over 8,000 → 413 |
| `caseId` | string | no | Bundled demo case id, e.g. `"demo-marfan"` |

```json
{ "text": "My brother is 40. He has always had very long, thin fingers, ...", "caseId": "demo-marfan" }
```

**Behaviour**

1. Validate input.
2. If `caseId` names a bundled demo case and `text` equals that case's narrative exactly, return the prepared extraction from `getDemoCase(caseId)` with `source: "demo"`. The demo path never calls the LLM, so the demo works even when Workers AI is slow or down.
3. Otherwise, if the `AI` binding is missing (e.g. some local runs), return 503 `LLM_UNAVAILABLE` ("Live extraction is not available here. Try one of the demo cases, or add terms by hand."). Manual term entry via `/api/terms` still works.
4. Otherwise, call Workers AI (`env.AI.run(env.LLM_MODEL ?? <T17 default>, …)`) and ask for `TermProposal[]` (phrases copied verbatim from the text, candidate labels, optional ids, negation, confidence). The prompt says: copy phrases exactly, do not diagnose, do not output diseases.
5. Call `groundTerms(text, proposals, deps)`. For each proposal the engine:
   - finds `phrase` in `text` by exact match and sets `start`/`end` (first occurrence not already used by another term); drops the proposal with a warning if not found;
   - if `hpoId` is given, looks it up (`/api/hp/terms/{id}`); keeps it as `grounding: "exact-id"` only if it exists and its name or a synonym equals `label` (case-insensitive);
   - otherwise searches by `label` (`/api/hp/search?q=`), takes the top result whose name or synonym equals the label, else the top result, as `grounding: "label-search"`, and lowers `confidence` by one step;
   - drops the proposal with a warning if nothing confirms it;
   - sets `label` to the HPO primary name, never the LLM's wording;
   - deduplicates by `hpoId` (keeps the first quote).
6. Zero grounded terms → 422 `NO_TERMS_FOUND`.

**Response 200**

```json
{
  "version": "0.1",
  "source": "demo",
  "terms": [
    { "hpoId": "HP:0001166", "label": "Arachnodactyly", "quote": "very long, thin fingers", "start": 36, "end": 59, "negated": false, "confidence": "high", "grounding": "exact-id" },
    { "hpoId": "HP:0002107", "label": "Pneumothorax", "quote": "never had a collapsed lung", "start": 513, "end": 539, "negated": true, "confidence": "high", "grounding": "exact-id" }
  ],
  "warnings": [],
  "model": "demo-prepared",
  "dataVersions": { "hpo": "2025-11-24", "demoCache": "2026-10-24", "fetchedAt": "2026-10-24T16:05:00.000Z" }
}
```

| Field | Type | Notes |
|---|---|---|
| `terms` | `ExtractedTerm[]` | In order of `start` |
| `warnings` | string[] | Plain English, e.g. `"Dropped 'tired all the time': no matching HPO term confirmed"` |
| `model` | string | Workers AI model id, e.g. `"@cf/openai/gpt-oss-120b"`, or `"demo-prepared"` for the prepared extraction |

Errors: 400, 405, 413, 422, 503 `LLM_UNAVAILABLE` (binding missing), 504 (Workers AI timeout, non-demo text), 502 (Workers AI error).

Workers AI outage (v0.1.8, T41): when the `AI` binding exists but `env.AI.run` itself throws (for example Workers AI code 4006 when the daily allocation is used up, or the model is unavailable) and the text is not a bundled demo narrative, the answer is 503 `LLM_UNAVAILABLE` with `retryable: true` and the message "Reading free text is unavailable right now. Use a demo case, or add features by hand." `LLM_UNAVAILABLE` with `retryable: false` keeps its meaning: the binding is missing (step 3). A Workers AI timeout stays 504 `UPSTREAM_TIMEOUT`; a stream that fails after the call started, or output with no usable JSON, stays 502 `UPSTREAM_ERROR`. The log line names the error class, the Workers AI code and the first line of its message, never note text. A bundled demo narrative still gets the prepared extraction on any of these failures.

Streamed answer and partial result (v0.1.8, T39): for chat-format models (every model except `gpt-oss`) the model answer is streamed. If the model is still writing at the 15 s model deadline, the stream is cancelled and only the complete feature objects received so far are grounded; a feature object that was cut off is never completed or used. When at least one term is grounded the answer is 200 with the warning "The extraction service was slow, so only the features it found in the first 15 seconds are shown. Some features may be missing; add them by hand or try again" first in `warnings`. When no complete feature arrived, or none of them grounds, it is still 504 `UPSTREAM_TIMEOUT` (`retryable: true`), because an empty cut answer says nothing about the notes. A finished answer that is not valid JSON as a whole (for example it hit the 2,048-token output cap) is parsed the same way: its complete features are kept with the same warning, and with zero grounded terms it is 422 `NO_TERMS_FOUND`.

Also 429 `RATE_LIMITED` (v0.1.3, `retryable: true`, with a `Retry-After` header in seconds): the live LLM path is limited per client IP (`CF-Connecting-IP`) to 10 extractions per minute and 60 per hour in fixed windows, counted approximately in the Workers Cache API (per data centre, not atomic, fails open). The prepared demo extraction (step 2) is never limited; a demo narrative sent without its `caseId` goes through the live path and counts. The message says to try again in a minute, or in about an hour when the hourly window is full.

### 7.3 GET /api/terms (proposed)

Needed for "add a term by hand" because the app may not call the HPO API directly. Owner: Ian (`functions/api/terms.ts`). Engine: `searchTerms`. Timeout 2 s. Cache 7 days.

`GET /api/terms?q=long%20fingers&limit=8` (`q` 2–100 chars, `limit` 1–20, default 8)

```json
{
  "version": "0.1",
  "source": "live",
  "terms": [ { "id": "HP:0001166", "label": "Arachnodactyly", "definition": "Abnormally long and slender fingers (spider fingers).", "synonyms": ["Long slender fingers", "Spider fingers"] } ],
  "dataVersions": { "hpo": "2025-11-24", "fetchedAt": "2026-10-24T16:05:00.000Z" }
}
```

Errors: 400, 502, 504.

### 7.4 POST /api/rank

Owner: Ian (`functions/api/rank.ts`). Engine: `rankCandidates`, `demoRankKey`, `getDemoRanking`, `overlapLabel`, `normalizeFrequency` (Jerry).
Budget 12 s: Monarch semsim 10 s (measured ~4.6 s on 2026-10-24, then 4.9–8 s for the demo-npc1 term set, so 8 s caused 504s; v0.1.2), HPO annotations 3 s each in parallel, Orphadata 2 s (non-blocking: on failure keep the Monarch name and id). The annotation and Orphadata calls that follow Monarch keep their own timeouts but are capped by the time left in the 12 s budget, so the total budget never grows.

**Request**

| Field | Type | Required | Notes |
|---|---|---|---|
| `observed` | HpoId[] | yes | 1–50 ids; at least 6 recommended (with 3 terms the top 5 included noise) |
| `excluded` | HpoId[] | no | 0–50 ids; default `[]`. An id may not be in both lists → 400 |
| `limit` | number | no | 1–10, default 5 |

```json
{ "observed": ["HP:0001166","HP:0000218","HP:0001065","HP:0001083","HP:0000268","HP:0000278","HP:0000490","HP:0012499","HP:0004959"],
  "excluded": ["HP:0002107","HP:0002650"], "limit": 5 }
```

**Method**

1. Deduplicate and sort `observed` and `excluded` (makes the result independent of input order and gives the cache key).
2. Call Monarch `GET /v3/api/semsim/search/{observed joined by ,}/Human%20Diseases?limit={limit + 5}`. Monarch does not use excluded terms.
3. For each result, take `subject.id` as `mondoId`. Choose `diseaseId`: `Orphanet:`/`ORPHA:` xref normalised to `ORPHA:<n>` if present, else `OMIM:` xref, else the MONDO id. Results with the same `diseaseId` are merged (keep the higher score).
4. For each of the top `limit` results, fetch HPO annotations for both the ORPHA and the OMIM id when both exist. Verified on 2026-10-24: `ORPHA:558` gives frequency bands (`"Very frequent"`, `"Frequent"`, `"Occasional"`) and an empty `genes` list; `OMIM:154700` gives `"n/m"` fractions or `""` and `genes: [{ "id": "NCBIGene:2200", "name": "FBN1" }]`. Frequencies prefer the ORPHA band, else the normalised OMIM value. Genes are the union. Categories are the union of category keys.
5. Build `matched` from Monarch `object_best_matches` (patient term → disease term). `via` is `"exact"` when `match_source == match_target`, else `"ancestor"` with `match_subsumer`. A match counts only if the subsumer is not `HP:0000118` (Phenotypic abnormality) and not a direct child of it (organ-system level). A broader-term match also counts only if the subsumer is an HP: term (v0.1.3); a non-HP shared ancestor (e.g. a `UPHENO:` term) does not count. Those patient terms go to `unmatched`.
6. `notReported`: disease features with frequency Obligate, Very frequent or Frequent whose id is not a matched `diseaseTerm`, not observed and not excluded. Sorted by frequency band then id; max 8.
7. `contradicted`: patient-excluded ids that appear in the disease annotations with frequency Obligate, Very frequent or Frequent (exact id match in v0.1; ancestor-aware matching is open question 7).
8. `overlap = overlapLabel(weightedMatched, observed.length, contradicted.length)`:
   - weightedMatched = floor(exact matches + 0.5 × ancestor matches), where exact and ancestor are `via` values in `matched` (v0.1.2; with plain counting every demo-npc1 candidate came out `strong`, because any shared term below the organ-system level counts as a match);
   - coverage = weightedMatched / observed; base = `strong` if coverage ≥ 0.6, `partial` if ≥ 0.3, else `weak` (thresholds unchanged);
   - each contradicted feature lowers the label one step, floor `weak`.
   `matched` still lists every match, exact and ancestor. The `overlapLabel` signature is unchanged; only the count passed in changes. Thresholds are engine constants (open question 8, resolved for v0.1.2). The label never shows as a percentage. The UI headline ("N of M features described") counts exact matches only and shows broader-term matches separately (e.g. "plus N through broader terms").
9. Order by Monarch `score` descending, ties by `diseaseId` ascending. Take the top `limit`. Assign `rank` 1..n. v0.1 does not re-order by contradictions; the contradiction is shown and lowers the label.
10. Orphadata cross-check for ORPHA ids: if the name differs, keep the Orphanet preferred name and add `"orphadata"` to `sources`.
11. PubCaseFinder: off by default in v0.1 (open question 3). If enabled, it runs in parallel with a 6 s timeout, only top 50 rows are kept, and it only adds `pubCaseFinderRank`. Its failure never fails the request. Superseded in production by the next paragraph (v0.1.7).

PubCaseFinder ordering (v0.1.7, T36, T36c; switch `RDD_RANK_SOURCE = "pcf"` in `wrangler.toml`, on in production; roll back by removing it): `/api/rank` starts the PubCaseFinder list call (`target=omim`, TSV, first 40 rows, excluded terms not sent) and the Monarch path at the same time. If PubCaseFinder's mappable list arrives within 12 s, PubCaseFinder gives the order; the evidence still comes from HPO annotations (exact matches) and Monarch semsim compare (broader matches, same HP-only and organ-system rules as step 5), so `matched`, `overlap`, frequencies and genes keep their meaning, and `score` is the PubCaseFinder score (raw service score). `sources` includes `"pubcasefinder"` only when it ordered the list. Otherwise (no list within 12 s, error, polite per-colo rate guard, nothing mappable) the Monarch answer is returned in the same request and the PubCaseFinder call may finish in the background to fill its cache. `dataVersions.rankingSource` is `"pubcasefinder"` or `"monarch"`. Cache: PubCaseFinder-ordered answers 24 h; a Monarch answer under the switch 10 min, so a later PubCaseFinder answer replaces it; the effective source is part of the key. Bounds under the switch: one deadline of 17 s from the start of the request bounds the whole handler: the 12 s PubCaseFinder wait; PubCaseFinder evidence after the list (calls end 1.5 s before the deadline; evidence that could not finish is served as incomplete, or replaced by a complete Monarch answer that is ready); and the Monarch path (engine Monarch semsim 13 s inside a 16 s rank budget, every call aborted 0.3 s before the deadline; no answer by the deadline → 504 `UPSTREAM_TIMEOUT` or the recorded demo ranking). One counter keeps all fetches and Cache API calls of the request, both paths and the handler's own cache reads and writes, at 46 or fewer (Workers limit 50). Without the switch the engine path keeps Monarch 20 s inside a 25 s budget (T32a). `X-RDD-Path` (QA only): `pcf`, `pcf-timeout->engine`, `pcf-late->engine` (list arrived but evidence did not finish), or `pcf->engine` after a PubCaseFinder failure. The app's `/api/rank` client timeout is 20 s, 3 s more than the server deadline.

**Response 200** (shape example; values from the 2026-10-24 checks where noted, others illustrative)

```json
{
  "version": "0.1",
  "source": "live",
  "candidates": [
    {
      "rank": 1,
      "diseaseId": "ORPHA:558",
      "mondoId": "MONDO:0007947",
      "name": "Marfan syndrome",
      "overlap": "partial",
      "score": 14.2,
      "matched": [
        { "patientTerm": { "id": "HP:0001166", "label": "Arachnodactyly" },
          "diseaseTerm": { "id": "HP:0001166", "label": "Arachnodactyly" },
          "via": "exact",
          "frequency": { "label": "Very frequent", "source": "ORPHA:558" } },
        { "patientTerm": { "id": "HP:0004959", "label": "Descending thoracic aorta aneurysm" },
          "diseaseTerm": { "id": "HP:0002616", "label": "Aortic root aneurysm" },
          "via": "ancestor",
          "ancestor": { "id": "HP:0004942", "label": "Aortic aneurysm" },
          "frequency": { "label": "Very frequent", "source": "ORPHA:558" } }
      ],
      "unmatched": [],
      "notReported": [
        { "term": { "id": "HP:0001519", "label": "Disproportionate tall stature" }, "frequency": { "label": "Very frequent", "source": "ORPHA:558" } }
      ],
      "contradicted": [
        { "term": { "id": "HP:0002650", "label": "Scoliosis" }, "frequency": { "label": "Frequent", "source": "ORPHA:558" } }
      ],
      "categories": ["Cardiovascular", "Eye", "Skeletal system", "Skin, Hair, and Nails"],
      "genes": [{ "id": "NCBIGene:2200", "symbol": "FBN1" }],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0007947",
        "orphanet": "https://www.orpha.net/en/disease/detail/558",
        "omim": "https://omim.org/entry/154700"
      },
      "sources": ["monarch-semsim", "hpo-annotations", "orphadata"]
    }
  ],
  "dataVersions": { "hpo": "2025-11-24", "monarch": "v3 API", "orphanet": "2026-06-23", "fetchedAt": "2026-10-24T16:05:00.000Z" }
}
```

The `score` value and the `HP:0004942` ancestor are illustrative. `overlap` is `partial` because one contradicted feature (Scoliosis) lowers the base label one step. The ORPHA:558 frequencies for Arachnodactyly, Aortic root aneurysm, Disproportionate tall stature and Scoliosis and the FBN1 gene on OMIM:154700 were read from the JAX API on 2026-10-24.

**Slow or failed upstream**

| Situation | Result |
|---|---|
| Monarch over 10 s or non-2xx, and `demoRankKey(...)` hits the demo cache | 200 with the cached ranking, `source: "demo"`, `dataVersions.demoCache` set |
| Same, no demo cache hit | 504 `UPSTREAM_TIMEOUT` or 502 `UPSTREAM_ERROR`, `retryable: true` |
| One HPO annotation call fails | That candidate keeps Monarch evidence; `frequency: null`; `"hpo-annotations"` missing from its `sources`; response still 200 |
| Orphadata or PubCaseFinder fails | Ignored; response still 200 |

Cache: Workers Cache API, key `rank:v0.1:<sorted observed>|<sorted excluded>|<limit>`, TTL 24 h. Annotation responses cached per disease id for 24 h.

Enrichment report (v0.1.3, additive): besides `rankCandidates`, the engine exports `rankCandidatesWithReport(req, deps)`, which returns the same `RankResponse` plus an enrichment report whose `enrichment.complete` is `false` when an annotation or Orphadata call failed. `/api/rank` does not cache a response with incomplete enrichment (T18h). The report is not part of the response body.

### 7.5 POST /api/next-questions

Owner: Ian (`functions/api/next-questions.ts`). Engine: `nextQuestions`, `getDemoQuestions`. Budget 5 s (annotations are usually cached from `/api/rank`).

**Request**

| Field | Type | Required | Notes |
|---|---|---|---|
| `observed` | HpoId[] | yes | As sent to `/api/rank` |
| `excluded` | HpoId[] | no | Default `[]` |
| `candidates` | DiseaseId[] | yes | 2–5 ids, normally the top 3–5 from `/api/rank` |
| `limit` | number | no | 1–8, default 5 |

```json
{ "observed": ["HP:0001166","HP:0001083"], "excluded": ["HP:0002650"], "candidates": ["ORPHA:558","ORPHA:99999"], "limit": 5 }
```

**Method** (the Phenomizer idea, Köhler et al. 2009): features frequent in some top candidates and rare or not annotated in others separate them best.

1. Fetch HPO annotations for each candidate.
2. Map each feature's frequency to a midpoint: Obligate 1.0, Very frequent 0.9, Frequent 0.55, Occasional 0.17, Very rare 0.025, Excluded 0; annotated without frequency 0.5; not annotated 0.
3. For each HPO id annotated in at least one candidate and not in `observed` or `excluded`: `score = max − min` of the midpoints across candidates.
4. Keep features with `score ≥ 0.35`, order by score descending then `hpoId`.
5. Hierarchy filter (v0.1.2): skip a feature that is an ancestor or a descendant of an observed term, or a descendant of an excluded term (it would ask about something already reported). An ancestor of an excluded term is kept (no headache does not rule out a broader feature such as pain). Ancestors come from `GET https://ontology.jax.org/api/hp/terms/{HP:id}/ancestors` (cached 7 days). The lookups are bounded by the 5 s budget and by the Cloudflare Workers free-plan limit of 50 subrequests per invocation, where Cache API calls count too (the fallback stops hierarchy lookups at 40 subrequests in total). If a lookup fails, times out or is refused by the budget, that check is skipped and the feature is kept; if the whole filter cannot run, the scored list is returned unfiltered. Then take `limit`.
6. `question` comes from a fixed template using the HPO label, e.g. `"Has anyone noticed <label, lower case>?"`, with the label kept visible. Any future LLM rephrasing may change wording only; the term, the `discriminates` list and `why` always come from data.
7. "Not annotated" is reported as `frequency: null` and written as "not listed for", never as "absent in".

**Response 200**

```json
{
  "version": "0.1",
  "source": "live",
  "questions": [
    {
      "hpoId": "HP:0001519",
      "label": "Disproportionate tall stature",
      "question": "Has anyone noticed disproportionate tall stature (long limbs compared with the body)?",
      "discriminates": [
        { "diseaseId": "ORPHA:558", "frequency": { "label": "Very frequent", "source": "ORPHA:558" } },
        { "diseaseId": "ORPHA:99999", "frequency": null }
      ],
      "why": "Very frequent in Marfan syndrome; not listed for Example disease B",
      "score": 0.9
    }
  ],
  "dataVersions": { "hpo": "2025-11-24", "fetchedAt": "2026-10-24T16:05:00.000Z" }
}
```

`ORPHA:99999` / "Example disease B" is a placeholder, not a real candidate. The Marfan frequency was read from the JAX API on 2026-10-24. Failed upstream: demo cache by `demoRankKey(observed, excluded, candidates.length)` if present, else 504/502 retryable.

Ian's temporary fallback (v0.1.4, T18o; `functions/_lib/fallback/questions.ts` and `hierarchy.ts`): the hierarchy filter of step 5 runs inside the 5 s time budget and one cap of 40 subrequests for the whole invocation, Cache API calls included. The cap is shared with the annotation phase: the hierarchy lookups get what the annotation calls left. The ancestors of the observed terms are looked up first (at most 12 observed terms); if that phase does not finish before the deadline, the filter cannot run and the scored list is returned unfiltered in plain score order (step 5). Features are then checked lazily in score order, only as many as are still needed to fill `limit`. Each kept feature is in one tier: checked (its own lookup and every observed lookup succeeded), partly checked (its own lookup succeeded, but the ancestors of some observed term are unknown, because that term was beyond the 12 looked up or its lookup failed, timed out or was refused by the budget) or unchecked (its own lookup failed, timed out, was refused by the budget or was not reached). The output is checked, then partly checked, then unchecked, each in score order, so a feature whose check was skipped or partial never comes before a checked one. When every lookup succeeds the output is plain score order. JAX annotation and ancestor reads use the Cloudflare edge cache (`fetch` with `cf.cacheTtlByStatus`) for 2xx responses only; errors are never cached.

### 7.6 GET /api/trials

Owner: Ian (`functions/api/trials.ts`). Engine: `searchTrials`, `getDemoTrials`. Timeout 6 s. Cache 6 h, key = normalised condition.

`GET /api/trials?condition=Marfan%20syndrome&ids=ORPHA:558,MONDO:0007947`

| Param | Required | Notes |
|---|---|---|
| `condition` | yes | Disease name, 2–200 chars |
| `ids` | no | Echoed in `query`; v0.1 searches by name only |

Upstream: `https://clinicaltrials.gov/api/v2/studies?query.cond=<condition>&filter.overallStatus=RECRUITING&pageSize=20&countTotal=true&fields=NCTId,BriefTitle,OverallStatus,Phase,Condition,LocationCountry` (20 fetched so the relevance filter can still leave 5; v0.1.2).

Relevance (v0.1.2): `query.cond` also matches intervention names and other fields (checked 2026-10-24: "Niemann-Pick disease, type C1" returned only a study of the drug NPC-1). Keep only studies where at least one listed condition contains all distinctive words of the condition name (case and accents ignored; generic words such as "disease", "syndrome", "type", Roman numerals and subtype codes such as "1", "C1", "2A" are not distinctive). If fewer than 3 studies remain, run one broader search with the subtype suffix removed (e.g. "Niemann-Pick disease type C", which returned 6 relevant studies on 2026-10-24), apply the same filter and append new studies after the first ones. At most 2 ClinicalTrials.gov calls per request.

```json
{
  "version": "0.1",
  "source": "live",
  "studies": [
    { "nctId": "NCT00000000", "title": "Example recruiting study title", "status": "RECRUITING", "phases": ["PHASE2"], "conditions": ["Marfan Syndrome"], "countries": ["United States"], "url": "https://clinicaltrials.gov/study/NCT00000000" }
  ],
  "query": { "condition": "Marfan syndrome", "ids": ["ORPHA:558", "MONDO:0007947"], "status": "RECRUITING" },
  "total": 1,
  "fetchedAt": "2026-10-24T16:05:00.000Z",
  "dataVersions": { "fetchedAt": "2026-10-24T16:05:00.000Z" }
}
```

(The study is a placeholder for shape; never show it in the UI.) `studies` has at most 5 items; `total` is the upstream `totalCount` of the query whose results are shown (the first query's count if it contributed any study, else the broader query's; the two counts overlap and are never added). `query.condition` always echoes the requested condition, even when the broader search was used. Zero studies is a 200 with `studies: []`. Failure: demo cache if the condition belongs to a demo case, else 504/502 retryable.

### 7.7 POST /api/brief

Owner: Ian (`functions/api/brief.ts`). Engine: `buildBrief`, `toPhenopacket`, `specialistsFor` (pure; no network). Timeout 2 s. Not cached.

**Request**: `{ "case": CaseObject }` (section 8). Terms with status `removed` are ignored. Requires at least one observed term and a `lastRanking`; otherwise 400.

**Grounding rules**

- `specialists`: from the organ-system `categories` of the top 3 candidates, through `engine/data/specialists.ts`, a small documented table owned by Jerry (e.g. `"Cardiovascular" → "Cardiologist"`, `"Eye" → "Ophthalmologist"`; any genetic-sounding candidate → `"Clinical geneticist"` only if the candidate has annotated genes). Each row names the table row it came from (`mappingRow`). No table row → no suggestion. Empty list is fine.
- `testsToAsk`: only from annotated `genes` of the top 3 candidates, text exactly `"Ask whether genetic testing that includes <SYMBOL> is appropriate (gene associated with <disease name> in HPO annotations)"`. No genes → empty list. No other tests are suggested in v0.1.
- `disclaimer` and `attributions`: section 13.

**Response 200**

```json
{
  "version": "0.1",
  "source": "demo",
  "brief": {
    "title": "Specialist brief: features and possible matches to discuss",
    "generatedAt": "2026-10-24T16:10:00.000Z",
    "patientSummary": { "demo": true, "demoLabel": "Demo case (synthetic narrative from phenopacket-store PMID_10756346_Patient_B55)", "ageText": "40 years" },
    "features": {
      "observed": [ { "id": "HP:0001166", "label": "Arachnodactyly", "quote": "very long, thin fingers", "provenance": "demo" } ],
      "excluded": [ { "id": "HP:0002107", "label": "Pneumothorax", "quote": "never had a collapsed lung", "provenance": "demo" } ]
    },
    "candidates": [],
    "questions": [],
    "specialists": [ { "specialty": "Cardiologist", "becauseOf": ["Cardiovascular"], "mappingRow": "Cardiovascular" } ],
    "testsToAsk": [ { "text": "Ask whether genetic testing that includes FBN1 is appropriate (gene associated with Marfan syndrome in HPO annotations)", "gene": { "id": "NCBIGene:2200", "symbol": "FBN1" }, "diseaseId": "ORPHA:558", "source": "OMIM:154700" } ],
    "disclaimer": "Decision support, not a diagnosis. These are possible matches to discuss with a doctor.",
    "attributions": ["This product uses the Human Phenotype Ontology (version 2025-11-24). Find out more at https://hpo.jax.org"],
    "dataVersions": { "hpo": "2025-11-24", "fetchedAt": "2026-10-24T16:05:00.000Z" }
  },
  "phenopacket": {
    "id": "rdd-demo-marfan-20261024T161000Z",
    "subject": { "id": "DEMO-synthetic-demo-marfan", "sex": "UNKNOWN_SEX" },
    "phenotypicFeatures": [
      { "type": { "id": "HP:0001166", "label": "Arachnodactyly" }, "description": "very long, thin fingers" },
      { "type": { "id": "HP:0002107", "label": "Pneumothorax" }, "excluded": true, "description": "never had a collapsed lung" }
    ],
    "metaData": {
      "created": "2026-10-24T16:10:00.000Z",
      "createdBy": "Rare Disease Detective v0.1",
      "resources": [ { "id": "hp", "name": "human phenotype ontology", "url": "http://purl.obolibrary.org/obo/hp.owl", "version": "2025-11-24", "namespacePrefix": "HP", "iriPrefix": "http://purl.obolibrary.org/obo/HP_" } ],
      "phenopacketSchemaVersion": "2.0",
      "externalReferences": [ { "id": "phenopacket-store:PMID_10756346_Patient_B55", "description": "DEMO DATA. Synthetic narrative derived from a phenopacket-store case (BSD-3). Not a real patient." } ]
    }
  }
}
```

(Brief `candidates` and `questions` are shortened to `[]` here; in a real response they hold the last ranking and questions.)

- The phenopacket contains phenotypic features only. It deliberately has no `diseases` or `interpretations`, so it never states a diagnosis.
- Non-demo cases: `subject.id` is `"rdd-subject-1"` and `externalReferences` is omitted. No names, no birth dates.
- The app renders `brief` with a print stylesheet ("Print or save as PDF") and offers `phenopacket` as `phenopacket-<id>.json` download.
- `source` is `"demo"` when the case is a demo case.

## 8. The app's case object

Owned by Ian (`app/**`). Stored in `localStorage` under `rdd.case.v0.1`. Sent to `/api/brief`.

```ts
export interface CaseTerm {
  hpoId: HpoId;
  label: string;
  status: TermStatus;          // observed | excluded | removed
  provenance: Provenance;      // llm | manual | demo
  quote?: string;              // from extraction; absent for manual terms
  start?: number;
  end?: number;
  confidence?: Confidence;
  grounding?: Grounding;
  updatedAt: IsoDateTime;
}

export interface CaseObject {
  version: ContractVersion;
  caseId: string;              // random UUID in the browser
  demo: { caseId: string; sourcePhenopacketId: string; label: string } | null;
  notes: string;               // the pasted text, ≤ 8,000 chars
  terms: CaseTerm[];
  lastRanking: { request: { observed: HpoId[]; excluded: HpoId[]; limit: number }; response: RankResponse; rankedAt: IsoDateTime } | null;
  questions: Question[];
  selectedCandidateId: DiseaseId | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
```

- Extraction terms start as `observed` (or `excluded` when `negated: true`).
- Marking a term absent sets `excluded`; removing sets `removed` (kept so the user can undo).
- Any change to the observed or excluded set marks `lastRanking` stale; the app re-ranks (debounced ~600 ms) and then refreshes questions.

## 9. Demo cases

- Derived from [phenopacket-store](https://github.com/monarch-initiative/phenopacket-store) (BSD-3). Each narrative was written by Ian's Kiro on 2026-10-24 from the HPO terms of the named phenopacket. Not real patients; some excluded terms from the source are left out to keep the text short. Order in the demo picker: `demo-npc1` (primary), `demo-dmd`, `demo-marfan`, `demo-kabuki`, `demo-cdls`.
- UI label, verbatim: `Demo case (synthetic narrative from phenopacket-store <id>)`.
- Owners: Jerry owns the demo cache under `engine/demo/**` (narrative text, prepared extraction, recorded upstream responses for the prepared term set). Ian owns the demo narratives' UI (picker, labels).
- Offsets below were computed and checked with `text.slice(start, end) === quote`. Jerry's tests must re-check them.

```ts
export interface DemoCaseSummary { caseId: string; title: string; label: string; sourcePhenopacketId: string }
export interface DemoCase extends DemoCaseSummary {
  narrative: string;
  expectedDiagnosis: { id: string; label: string }; // from the source phenopacket; for the benchmark and tests, never shown as "the answer"
  extraction: ExtractedTerm[];   // prepared, grounding "exact-id", confidence "high"
  recordedAt: IsoDateTime;
}
```

### 9.1 `demo-npc1` (primary demo case, listed first)

- Source: `notebooks/NPC1/phenopackets/PMID_27900365_patient.json` (id `PMID_27900365_patient`, male, 54 years, HPO 2025-11-24 in `metaData.resources`). Expected diagnosis: `OMIM:257220` Niemann-Pick disease, type C1.
- Why primary: in the pre-registered benchmark (`docs/research/ranking-benchmark.md` on branch `ian/t23-rerank`), Monarch semsim ranks `OMIM:257220` #1 for this term set, with "Niemann-Pick disease type C" and "type C2" next, a real clinical differential that contains the source condition.
- The narrative uses all 12 observed terms of the source. The subject is an adult, so the narrative is in his own voice; the age follows the source (54 years).
- The source has no excluded terms. The negated term (Headache) was added for the demo so that a "not present" term appears, and it is not part of the source phenopacket. Check on 2026-10-24: `HP:0002315` is not annotated to `OMIM:257220`, `OMIM:607625` (type C2) or `ORPHA:646` (Niemann-Pick disease type C) in `GET https://ontology.jax.org/api/network/annotation/{id}`, so it cannot create a contradiction for these candidates. Seizure, Hearing impairment and Feeding difficulties were rejected because each is annotated to at least one of them.
- Every id and label below was confirmed with `GET https://ontology.jax.org/api/hp/terms/{id}` on 2026-10-24.
- Narrative (543 chars):

> I am a 54-year-old man. My mother says I stayed yellow for a long time as a newborn. Since I was 18 I have become more and more forgetful, I find it hard to concentrate, my speech is slurred, and I fall a lot. In middle age my thinking slowly got worse and my walking became unsteady and clumsy. A doctor noticed that when I flick my eyes upward they stop short. A scan found a large liver and a large spleen. A tissue sample showed cells swollen with fat, and a lab test found my cells are slow to process cholesterol. I do not get headaches.

| hpoId | label | quote | start | end | negated |
|---|---|---|---|---|---|
| `HP:0006579` | Prolonged neonatal jaundice | "stayed yellow for a long time as a newborn" | 41 | 83 | false |
| `HP:0007017` | Progressive forgetfulness | "more and more forgetful" | 114 | 137 | false |
| `HP:0031987` | Diminished ability to concentrate | "hard to concentrate" | 149 | 168 | false |
| `HP:0001260` | Dysarthria | "my speech is slurred" | 170 | 190 | false |
| `HP:0002527` | Falls | "I fall a lot" | 196 | 208 | false |
| `HP:0001268` | Mental deterioration | "my thinking slowly got worse" | 224 | 252 | false |
| `HP:0001251` | Ataxia | "my walking became unsteady and clumsy" | 257 | 294 | false |
| `HP:0031833` | Hypometric upward saccades | "when I flick my eyes upward they stop short" | 318 | 361 | false |
| `HP:0002240` | Hepatomegaly | "a large liver" | 376 | 389 | false |
| `HP:0001744` | Splenomegaly | "a large spleen" | 394 | 408 | false |
| `HP:0003651` | Foam cells | "cells swollen with fat" | 433 | 455 | false |
| `HP:0003349` | Low cholesterol esterification rate | "my cells are slow to process cholesterol" | 478 | 518 | false |
| `HP:0002315` | Headache | "I do not get headaches" | 520 | 542 | true |

### 9.2 `demo-dmd` (kept as a harder case)

- Kept as a harder case: Monarch ranks Duchenne #40 for its full term set (see `docs/research/ranking-benchmark.md` on branch `ian/t23-rerank`).
- Source: `notebooks/DMD/phenopackets/PMID_38054185_Case_presentation.json` (id `PMID_38054185_Case_presentation`, male, 4 years, HPO 2026-06-23). It is the only phenopacket under `notebooks/DMD` (checked 2026-10-24). Expected diagnosis: `OMIM:310200` Duchenne muscular dystrophy.
- The narrative uses all 12 observed terms of the source. The source has no excluded terms; the negated term (Seizure) was added for the demo so that a "not present" term appears, and it is not part of the source phenopacket. The age follows the source (4 years).
- Every id and label below was confirmed with `GET https://ontology.jax.org/api/hp/terms/{id}` on 2026-10-24.
- Narrative (440 chars):

> Our son is 4. He started walking later than other children. He has trouble climbing stairs, and to get up from the floor he pushes on his knees with his hands. His calves are big and firm. He is often tired, and his legs tire quickly when he plays. A blood test showed a very high CK, and his AST, ALT and LDH were also raised. The doctor saw small twitches in his muscles, and a nerve test gave unusual results. He has never had a seizure.

| hpoId | label | quote | start | end | negated |
|---|---|---|---|---|---|
| `HP:0001270` | Motor delay | "started walking later than other children" | 17 | 58 | false |
| `HP:0003551` | Difficulty climbing stairs | "trouble climbing stairs" | 67 | 90 | false |
| `HP:0003391` | Gowers sign | "pushes on his knees with his hands" | 124 | 158 | false |
| `HP:0003707` | Calf muscle pseudohypertrophy | "His calves are big and firm" | 160 | 187 | false |
| `HP:0012378` | Fatigue | "He is often tired" | 189 | 206 | false |
| `HP:0003750` | Increased muscle fatiguability | "his legs tire quickly when he plays" | 212 | 247 | false |
| `HP:0030235` | Extremely elevated creatine kinase | "a very high CK" | 269 | 283 | false |
| `HP:0031956` | Elevated circulating aspartate aminotransferase concentration | "AST" | 293 | 296 | false |
| `HP:0031964` | Elevated circulating alanine aminotransferase concentration | "ALT" | 298 | 301 | false |
| `HP:0025435` | Increased circulating lactate dehydrogenase concentration | "LDH" | 306 | 309 | false |
| `HP:0002380` | Fasciculations | "small twitches in his muscles" | 343 | 372 | false |
| `HP:0040129` | Abnormal nerve conduction velocity | "a nerve test gave unusual results" | 378 | 411 | false |
| `HP:0001250` | Seizure | "never had a seizure" | 420 | 439 | true |

### 9.3 `demo-marfan`

- Source: `notebooks/FBN1/phenopackets/PMID_10756346_Patient_B55.json` (id `PMID_10756346_Patient_B55`, male, 40 years, HPO 2025-10-22). Expected diagnosis: `OMIM:154700` Marfan syndrome.
- Narrative (566 chars):

> My brother is 40. He has always had very long, thin fingers, and his dentist says he has a high palate. He has stretch marks on his back and shoulders although his weight has not changed. Years ago an eye doctor found that the lens in his left eye had shifted out of place. His head is long and narrow, his lower jaw sits far back, and his eyes look deep-set. Last year he was rushed to hospital with a tear in the aorta in his chest, and the scans also showed a bulge in the descending part of the aorta. He has never had a collapsed lung and his spine is straight.

| hpoId | label | quote | start | end | negated |
|---|---|---|---|---|---|
| `HP:0001166` | Arachnodactyly | "very long, thin fingers" | 36 | 59 | false |
| `HP:0000218` | High palate | "high palate" | 91 | 102 | false |
| `HP:0001065` | Striae distensae | "stretch marks" | 111 | 124 | false |
| `HP:0001083` | Ectopia lentis | "the lens in his left eye had shifted out of place" | 223 | 272 | false |
| `HP:0000268` | Dolichocephaly | "His head is long and narrow" | 274 | 301 | false |
| `HP:0000278` | Retrognathia | "his lower jaw sits far back" | 303 | 330 | false |
| `HP:0000490` | Deeply set eye | "his eyes look deep-set" | 336 | 358 | false |
| `HP:0012499` | Descending aortic dissection | "a tear in the aorta in his chest" | 401 | 433 | false |
| `HP:0004959` | Descending thoracic aorta aneurysm | "a bulge in the descending part of the aorta" | 461 | 504 | false |
| `HP:0002107` | Pneumothorax | "never had a collapsed lung" | 513 | 539 | true |
| `HP:0002650` | Scoliosis | "his spine is straight" | 544 | 565 | true |

### 9.4 `demo-kabuki`

- Source: `notebooks/KMT2D/phenopackets/PMID_24739679_patient_K1.json` (id `PMID_24739679_patient_K1`, male, 11 months, HPO 2025-11-24). Expected diagnosis: `OMIM:147920` Kabuki syndrome 1.
- Narrative (568 chars):

> Our son is 11 months old. He has been floppy since birth and is behind on sitting and babbling. He is short for his age. His eye openings are long and the outer part of his lower eyelids turns outward. His eyebrows are highly arched and thin at the outer ends. He has a wide nasal bridge and a nose tip that sits low, the whites of his eyes look bluish, and his ears are large. The pads on his fingertips stick out and his fingers curve sideways. A heart scan found an unusual vein draining the right lung. He has not had any seizures, and his hearing test was normal.

| hpoId | label | quote | start | end | negated |
|---|---|---|---|---|---|
| `HP:0001252` | Hypotonia | "floppy since birth" | 38 | 56 | false |
| `HP:0001263` | Global developmental delay | "behind on sitting and babbling" | 64 | 94 | false |
| `HP:0004322` | Short stature | "short for his age" | 102 | 119 | false |
| `HP:0000637` | Long palpebral fissure | "His eye openings are long" | 121 | 146 | false |
| `HP:0007655` | Eversion of lateral third of lower eyelids | "the outer part of his lower eyelids turns outward" | 151 | 200 | false |
| `HP:0002553` | Highly arched eyebrow | "His eyebrows are highly arched" | 202 | 232 | false |
| `HP:0005338` | Sparse lateral eyebrow | "thin at the outer ends" | 237 | 259 | false |
| `HP:0000431` | Wide nasal bridge | "a wide nasal bridge" | 268 | 287 | false |
| `HP:0000437` | Depressed nasal tip | "a nose tip that sits low" | 292 | 316 | false |
| `HP:0000592` | Blue sclerae | "the whites of his eyes look bluish" | 318 | 352 | false |
| `HP:0000400` | Macrotia | "his ears are large" | 358 | 376 | false |
| `HP:0001212` | Prominent fingertip pads | "The pads on his fingertips stick out" | 378 | 414 | false |
| `HP:0040019` | Finger clinodactyly | "his fingers curve sideways" | 419 | 445 | false |
| `HP:0011626` | Scimitar anomaly | "an unusual vein draining the right lung" | 466 | 505 | false |
| `HP:0001250` | Seizure | "has not had any seizures" | 510 | 534 | true |
| `HP:0000365` | Hearing impairment | "his hearing test was normal" | 540 | 567 | true |

### 9.5 `demo-cdls`

- Source: `notebooks/NIPBL/phenopackets/PMID_20358602_Patient_C10.json` (id `PMID_20358602_Patient_C10`, male, 6 years, HPO 2025-10-22). Expected diagnosis: `OMIM:122470` Cornelia de Lange syndrome 1.
- Narrative (396 chars):

> Our son is 6. He was small before birth and has kept growing slowly since. He walked and talked late, and he has an intellectual disability. He has a lot of body hair, especially on his back and arms. One testicle had not come down at birth. Two of his toes are joined together and his fingers are short. His doctor hears a heart murmur. He has never had a seizure, and he has no trouble feeding.

| hpoId | label | quote | start | end | negated |
|---|---|---|---|---|---|
| `HP:0001511` | Intrauterine growth retardation | "small before birth" | 21 | 39 | false |
| `HP:0008897` | Postnatal growth retardation | "growing slowly" | 53 | 67 | false |
| `HP:0001263` | Global developmental delay | "walked and talked late" | 78 | 100 | false |
| `HP:0001249` | Intellectual disability | "intellectual disability" | 116 | 139 | false |
| `HP:0001007` | Hirsutism | "a lot of body hair" | 148 | 166 | false |
| `HP:0000028` | Cryptorchidism | "One testicle had not come down" | 201 | 231 | false |
| `HP:0001159` | Syndactyly | "Two of his toes are joined together" | 242 | 277 | false |
| `HP:0001156` | Brachydactyly | "his fingers are short" | 282 | 303 | false |
| `HP:0030148` | Heart murmur | "heart murmur" | 324 | 336 | false |
| `HP:0001250` | Seizure | "never had a seizure" | 345 | 364 | true |
| `HP:0011968` | Feeding difficulties | "no trouble feeding" | 377 | 395 | true |

Temporary fallback copies (v0.1.2; the "that case only" scope and the deletion rule for `demoRecorded.ts` are superseded by v0.1.4, next paragraph): until `engine/demo/**` contains `demo-npc1`, Ian's functions hold fallback copies for that case only: the prepared extraction (`functions/_lib/fallback/demoCases.ts`) and one recorded rank, next-questions and trials response (`functions/_lib/fallback/demoRecorded.ts`). The recorded responses are used only when the live upstream fails (timeout or 5xx) and the request matches the recorded one exactly (same `demoRankKey`; next-questions also the same candidate ids; trials the same normalised condition). The engine's `getDemoCase`, `getDemoRanking`, `getDemoQuestions` and `getDemoTrials` take precedence. Both files are deleted once `engine/demo` has `demo-npc1`.

Fallback recordings (v0.1.4, T18l, T18q): `functions/_lib/fallback/demoRecorded.ts` now holds, for `demo-npc1`, one recorded `/api/rank` response, one `/api/next-questions` response for the 5 candidates the app sends (the top 5 of that ranking) and one `/api/trials` response for the top candidate; and, for `demo-marfan` and `demo-cdls`, one recorded `/api/rank` response each (rank only). They are used only when an upstream fails (timeout or 5xx) and the request matches the recorded one exactly, and are served with `source: "demo"` and `dataVersions.demoCache`. The engine's own recordings (`engine/demo/recorded/`) are tried first. `demoRecorded.ts` is deleted when the engine's recordings cover every request it records (the three cases above) and Ian's fallback layer is removed; `demoCases.ts` is still deleted once `engine/demo` has `demo-npc1`.

Demo cache contents per case: narrative, prepared extraction, one recorded `/api/rank` response for the prepared term set (limit 5), the matching `/api/next-questions` response, and `/api/trials` for the top candidate. Each recorded payload keeps its original `dataVersions` plus `demoCache`. Target size: five cases, under 400 KB total (open question 5).

## 10. Upstream services, timeouts and caching

| Upstream | Call | Timeout | Cache (Workers Cache API) | Licence / credit |
|---|---|---|---|---|
| JAX HPO search | `GET https://ontology.jax.org/api/hp/search?q=&limit=` (~0.1 s) | 2 s | 7 days by `q|limit` | HPO licence: cite, show version, do not alter |
| JAX HPO term | `GET https://ontology.jax.org/api/hp/terms/{HP:id}` | 2 s | 7 days by id | HPO |
| JAX HPO ancestors | `GET https://ontology.jax.org/api/hp/terms/{HP:id}/ancestors` (next-questions filter, section 7.5) | 2 s, inside the 5 s budget | 7 days by id | HPO |
| JAX HPO annotations | `GET https://ontology.jax.org/api/network/annotation/{ORPHA:n or OMIM:n}` (~0.15 s) | 3 s | 24 h by id | HPO; Orphanet-sourced rows CC BY 4.0 |
| Monarch semsim | `GET https://api.monarchinitiative.org/v3/api/semsim/search/{ids}/Human%20Diseases?limit=N` (~4.6 s; 4.9–8 s for demo-npc1) | 10 s (inside the 12 s `/api/rank` budget, section 7.4) | 24 h by sorted ids + limit | Monarch; "not for diagnosis or medical decisions" |
| Orphadata | `GET https://api.orphadata.com/rd-cross-referencing/orphacodes/{n}?lang=en` | 2 s | 7 days by code | CC BY 4.0 |
| PubCaseFinder | `GET https://pubcasefinder.dbcls.jp/api/pcf_get_ranked_list?target=omim&format=tsv&hpo_id=` (first byte ~9-11 s cold; first 40 rows read) | v0.1.7: 12 s wait for the list inside `/api/rank`, call itself 20 s (may finish in the background); polite per-colo limit 8/min, 90/h | 24 h list by sorted observed ids | CC BY 4.0 |
| ClinicalTrials.gov v2 | `GET https://clinicaltrials.gov/api/v2/studies?...` | 6 s | 6 h by condition | US government work |
| Workers AI (binding `AI`, model `LLM_MODEL`) | `env.AI.run` from `functions/api/extract.ts` only | 15 s | none | Ian's Cloudflare account; no key needed |

- Timeouts use `AbortSignal.timeout(ms)` (or an `AbortController`) inside the engine's fetch wrapper.
- One retry with 300 ms backoff for idempotent GETs on 5xx or network error, only if the remaining budget allows.
- Subrequests: the Cloudflare Workers free plan allows 50 subrequests per invocation, and Cache API calls count toward that limit. Functions that fan out (next-questions) must stay under it.
- Cache keys are built from sorted, deduplicated ids so term order never changes the key.
- Demo fallback on upstream failure (v0.1.2; v0.1.4): the engine's demo cache (`engine/demo/recorded/`) first, then Ian's temporary recordings (section 9: `demo-npc1` rank, next-questions and trials; `demo-marfan` and `demo-cdls` rank only) only on an exact key match, served with `source: "demo"`; otherwise 504/502 retryable.
- OMIM: links only. No OMIM API calls, no OMIM data beyond ids and names already in HPO annotations and Monarch xrefs.

## 11. Properties for property-based tests (T08)

Jerry's fast-check tests in `engine/test/**`, all with mocked `fetch`. Each property names the function it covers.

| # | Property | Function |
|---|---|---|
| P1 | Every returned `hpoId` was confirmed by the mocked HPO lookup or search. Invented or unknown ids never appear | `groundTerms` |
| P2 | For every term, `text.slice(start, end) === quote`, `0 ≤ start < end ≤ text.length`, and `label` equals the mocked HPO primary name | `groundTerms` |
| P3 | No two returned terms share an `hpoId` | `groundTerms` |
| P4 | Same mocked upstream responses → identical output (deep equal) for any permutation and duplication of `observed` and `excluded` | `rankCandidates` |
| P5 | `rank` values are exactly `1..n` with no gaps or repeats; `n ≤ limit`; order is by score desc then `diseaseId` asc | `rankCandidates` |
| P6 | For every candidate, `matched.length + unmatched.length === observed.length` (deduplicated) | `rankCandidates` |
| P7 | Adding to `excluded` a feature that a disease annotates as Obligate, Very frequent or Frequent never improves that disease's `overlap` label (`strong > partial > weak`) | `rankCandidates`, `overlapLabel` |
| P8 | `overlapLabel` is monotone: non-decreasing in `matchedCount`, non-increasing in `contradictedCount` | `overlapLabel` |
| P9 | No returned question has an `hpoId` in `observed` or `excluded`; `discriminates` has one entry per requested candidate | `nextQuestions` |
| P10 | `toPhenopacket` always has `id`, `subject.id`, `metaData.created`, `metaData.createdBy`, an `hp` resource with `version`, and `phenopacketSchemaVersion: "2.0"` | `toPhenopacket` |
| P11 | Round trip: the set of `(id, excluded)` pairs in `phenotypicFeatures` equals the case's observed and excluded terms; removed terms never appear | `toPhenopacket` |
| P12 | `normalizeFrequency` maps every `"n/m"` (0 ≤ n ≤ m, m > 0) and `"x%"` to the band defined in section 5, and returns null for empty or unknown input | `normalizeFrequency` |
| P13 | `buildBrief` never returns `specialists` or `testsToAsk` entries that cannot be traced to a mapping row or an annotated gene of a top-3 candidate | `buildBrief` |
| P14 | Every demo case's prepared extraction satisfies P2 against its narrative and has at least 6 observed terms | demo cache |

## 12. Offline benchmark (our own evaluation)

- Script in `engine/bench/` (Jerry), run by hand, never in the request path. Results committed as JSON with the date and versions.
- Sample: 50 phenopacket-store cases (release 0.1.27 or the pinned latest), at most 2 per gene, each with at least 6 observed terms, fixed random seed. The five demo cases are excluded from the sample.
- Input: observed and excluded HPO ids straight from the phenopacket (no LLM). This measures ranking, not extraction.
- Metric: top-1, top-5 and top-10 recall. A hit means the phenopacket's disease id (OMIM) matches a candidate's OMIM xref or its MONDO equivalent.
- Label on any slide or README: "Our own evaluation on 50 published cases from phenopacket-store, <date>. Not a clinical validation." Note the bias: these published cases may already feed the disease annotations, so results are likely optimistic.
- Optional second run: the same cases through extraction from a generated narrative, using the Workers AI model chosen in T17.

## 13. Attribution and safety text

Use these strings verbatim (engine constants in `engine/text.ts`, Jerry; the app and landing reuse them).

| Where | Text |
|---|---|
| Every result screen (ranking, questions, trials) and the brief | `Decision support, not a diagnosis. These are possible matches to discuss with a doctor.` |
| Footer and brief, always | `This product uses the Human Phenotype Ontology (version <hpo>). Find out more at https://hpo.jax.org` |
| When Monarch results appear | `Ranking by the Monarch Initiative semantic similarity service (monarchinitiative.org). Monarch tools are not for diagnosis or medical decisions.` |
| When Orphanet data appear | `Orphanet data, CC BY 4.0 (orpha.net, orphadata.com).` |
| When trials appear | `Trial data from ClinicalTrials.gov, U.S. National Library of Medicine.` |
| When PubCaseFinder appears | `PubCaseFinder (DBCLS), CC BY 4.0.` |
| When PubCaseFinder ordered the ranking (`dataVersions.rankingSource = "pubcasefinder"`, v0.1.7), instead of the Monarch line and the line above | `Ranking: PubCaseFinder (DBCLS, CC BY 4.0) with evidence from the Monarch Initiative and HPO annotations. Monarch tools are not for diagnosis or medical decisions.` |
| Demo data anywhere | `Demo case (synthetic narrative from phenopacket-store <id>)` and `phenopacket-store, BSD-3-Clause.` |

- No OMIM API; OMIM appears only as ids and outbound links.
- The disclaimer is body size, calm and permanent (design steering section 7).
- Family mode (v0.1.5, T30a): the app's family mode ("For families", `?audience=family`) never shows disease names, rankings or trials. There the safety text is `Decision support, not a diagnosis.` verbatim, followed by `This view prepares your notes for a clinician. It does not suggest conditions.` The second half of the full sentence ("These are possible matches to discuss with a doctor.") would be false where no matches are shown. The Monarch ranking line is not shown in family mode, because no Monarch result appears there. Clinician mode (the default) keeps the full disclaimer above, verbatim, on every result screen and in the brief.
- Localized demo label (v0.1.6, T34): in the app UI and the brief (the demo chip text, its tooltip and the brief's one demo line) the demo provenance label may be shown in the user's language in all 6 locales. The phenopacket-store id stays verbatim and untranslated. English stays exactly `Demo case (synthetic narrative from phenopacket-store <id>)`. The phenopacket JSON keeps the English verbatim label, because it is a machine format.
- Known limits of family mode (v0.1.5, accepted):
  - For a synthetic demo case, the phenopacket made by `/api/brief` has `id` `rdd-<demo caseId>-<timestamp>` and `subject.id` `DEMO-synthetic-<demo caseId>` (section 7.7), so both contain the demo id. Non-demo cases get `rdd-case-<timestamp>` and `rdd-subject-1` (`engine/brief.ts`). A family-mode export may replace `id` and `subject.id` with a neutral value (T30a).
  - The landing's family call to action opens a URL that contains `?demo=demo-npc1`. The app removes `?demo` from the address bar after the case has loaded.

## 14. Change process

1. Post `[CONTRACT CHANGE] <section> <summary> <breaking yes/no>` in the group chat.
2. Approvals: Jerry for any engine function, type or engine-produced field; Ian for endpoints and the case object; Peter if landing copy or shared text changes.
3. Ian's Kiro edits this file (single editor), bumps `version` (`0.1` → `0.2` for breaking, `0.1.1` style noted in the changelog for additive), and updates the spec to match.
4. Additive optional fields are non-breaking; renames, removals and type changes are breaking.

Changelog:

- 0.1 (2026-10-24, draft): first version. Same draft, before approval: LLM provider decided (Workers AI binding `AI`), primary demo case `demo-dmd` added.
- 0.1.1 (2026-10-24, draft): `[CONTRACT CHANGE] §9 new demo case demo-npc1 is the primary case; demo-dmd kept as a harder case; landing CTA is /app/?demo=demo-npc1; breaking no`.
- 0.1.2 (2026-10-24, draft; already implemented in Ian's functions fallback, Jerry's engine may adopt):
  - `[CONTRACT CHANGE] §7.4/§10 Monarch semsim timeout 10 s (was 8 s); /api/rank total budget 12 s unchanged; annotation and Orphadata calls capped by the remaining budget; breaking no`.
  - `[CONTRACT CHANGE] §7.4 step 8 overlap coverage = floor(exact matches + 0.5 × ancestor matches) / observed, thresholds unchanged; UI headline counts exact matches, broader-term matches shown separately; breaking no`.
  - `[CONTRACT CHANGE] §7.5 next-questions skips features that are ancestors or descendants of observed terms and descendants of excluded terms; ancestor lookups bounded by the 5 s budget and the Workers free-plan limit of 50 subrequests (cache calls count); filter skipped on lookup failure; breaking no`.
  - `[CONTRACT CHANGE] §7.6 trials keep only studies whose conditions contain all distinctive words of the condition name; fewer than 3 left → one broader search without the subtype suffix; total = upstream totalCount of the query used; query.condition echoes the request; breaking no`.
  - `[CONTRACT CHANGE] §9/§10 temporary demo-npc1 fallback copies in Ian's functions (prepared extraction; recorded rank/questions/trials only on upstream failure with an exact key match); engine demo cache takes precedence; deleted once engine/demo has demo-npc1; breaking no`.
  - `[CONTRACT CHANGE] §15 open question 8 resolved for v0.1.2, pending Jerry's confirmation; breaking no`.
- 0.1.3 (2026-10-24, draft; Ian's Kiro for Ian, acked by Jerry's assistant via the coordinator):
  - `[CONTRACT CHANGE] §7.4 step 5 a broader-term match counts only if the shared ancestor (Monarch match_subsumer) is an HP: term; a non-HP shared ancestor (e.g. UPHENO) does not count and that patient term goes to unmatched (as in engine/rank.ts; the fallback was aligned in T18i); breaking no`.
  - `[CONTRACT CHANGE] §7.4 engine also exports rankCandidatesWithReport (enrichment.complete); /api/rank does not cache a response with incomplete enrichment (T18h); /api/rank is served by the engine since T18k (RDD_ENGINE_PATH_RANK = "engine"); breaking no`.
  - `[CONTRACT CHANGE] §5/§15 open question 6 resolved: dataVersions.hpo is the pinned constant HPO_VERSION in engine/hpo.ts ("2026-09-01"), never "unknown"; /api/brief defaults hpo to it when the ranking's dataVersions has none (T18m); the pin is a label, not checked against the release the JAX API serves; breaking no`.
  - `[CONTRACT CHANGE] §7.2 POST /api/extract may return 429 RATE_LIMITED (retryable, Retry-After) when one IP exceeds 10 live extractions per minute or 60 per hour; demo-case requests are never limited (T18p); breaking no`.
- 0.1.4 (2026-10-24, draft; Ian's Kiro for Ian):
  - `[CONTRACT CHANGE] §7.5 Ian's temporary next-questions fallback checks features lazily in score order within the budget (≤ 40 subrequests incl. Cache API, 5 s); output keeps score order among fully checked features and never places a feature whose hierarchy check was skipped or partial ahead of a checked one (checked → partly checked → unchecked); JAX reads use the Cloudflare edge cache for 2xx only (T18o); breaking no`.
  - `[CONTRACT CHANGE] §9/§10 Ian's temporary fallback recordings cover demo-npc1 (rank, next-questions for the 5 candidates the app sends, trials) and demo-marfan and demo-cdls (rank only); used only when an upstream fails and the request matches exactly; served with source "demo"; the engine's recordings (engine/demo/recorded/) are tried first (T18l, T18q); breaking no`.
- 0.1.5 (2026-10-24, draft; Ian's Kiro for Ian; approved by the coordinator on Ian's authority, 16:35 ET):
  - `[CONTRACT CHANGE] §13 family mode only (T30a): in the app's family mode (?audience=family), which shows no disease names, rankings or trials, the safety text is "Decision support, not a diagnosis." followed by "This view prepares your notes for a clinician. It does not suggest conditions."; the Monarch ranking attribution is not shown there; clinician mode (default) keeps the full §13 sentence verbatim on every result screen and the brief; known limits recorded (demo phenopacket id and subject.id contain the demo id; the family CTA URL contains ?demo=demo-npc1, removed from the address bar after loading); breaking no`.

- 0.1.6 (2026-10-24, draft; Ian's Kiro for Ian; approved by the coordinator on Ian's authority, 16:52 ET):
  - `[CONTRACT CHANGE] §13 the demo provenance label may be localized in the app UI and the brief (chip text, its tooltip, the brief's one demo line) in all 6 locales; the phenopacket-store id stays verbatim and untranslated; the phenopacket JSON keeps the English verbatim label (machine format); English unchanged; breaking no`.

- 0.1.7 (2026-10-24, draft; Ian's Kiro for Ian; approved by the coordinator on Ian's authority, 18:06 ET):
  - `[CONTRACT CHANGE] §7.4/§10/§13 PubCaseFinder orders /api/rank in production (RDD_RANK_SOURCE = "pcf"), started in parallel with the Monarch path and used only if its list arrives within 12 s, else the Monarch answer in the same request; one 17 s request deadline and one 46-subrequest counter bound the whole handler; additive dataVersions.rankingSource ("pubcasefinder" | "monarch"); footer and brief credit the service that ordered the list from that field, keeping the Monarch "not for diagnosis" caveat; Monarch answers under the switch cached 10 min, PubCaseFinder answers 24 h; app /api/rank client timeout 20 s; breaking no`.

- 0.1.8 (2026-10-24, draft; Ian's Kiro for Ian):
  - `[CONTRACT CHANGE] §4/§7.2 when the Workers AI binding call throws (e.g. code 4006 daily allocation used up, model unavailable), /api/extract answers 503 LLM_UNAVAILABLE with retryable true and a message pointing to the demo cases and manual entry; LLM_UNAVAILABLE with retryable false keeps its meaning "binding missing" (T41, approved by the coordinator on Ian's authority, 18:50 ET); breaking no`.
  - `[CONTRACT CHANGE] §7.2 the model answer is streamed; at the 15 s model deadline the terms from complete feature objects are returned with 200 and the warning "The extraction service was slow…", never a truncated feature; with no complete grounded feature still 504 UPSTREAM_TIMEOUT (retryable); a finished answer cut by the output cap is parsed the same way (T39, shipped in 53be7ba); breaking no`.

## 15. Open questions

1. **LLM provider: DECIDED** (Ian, 12:15 ET). Cloudflare Workers AI through a Pages Functions AI binding named `AI` (`[ai]` binding in the root `wrangler.toml`; no API key needed; runs on Ian's Cloudflare account). Model id from `LLM_MODEL`; default chosen in T17 by testing `@cf/openai/gpt-oss-120b`, `@cf/moonshotai/kimi-k2.6`, `@cf/zai-org/glm-5.3` and `@cf/meta/llama-3.3-70b-instruct-fp8-fast` on the demo narratives. The LLM only proposes phrases and candidate labels; the engine grounds them.
2. **ORPHA vs OMIM as primary `diseaseId`** (Jerry). Draft: ORPHA first. Verified 2026-10-24: ORPHA:558 annotations have frequency bands but no genes; OMIM:154700 has FBN1. Draft fetches both.
3. **PubCaseFinder** (Jerry + Ian). Draft: off in v0.1; maybe a secondary badge later. ~11 MB / ~10 s per call.
4. **Specialist mapping table** (Jerry). Rows, wording, and whether "Clinical geneticist" is always suggested.
5. **Demo cache size** (Jerry). Draft: five cases, under 400 KB.
6. **HPO version source: RESOLVED for v0.1.3 by a pinned constant.** Every `dataVersions.hpo` the engine and functions report is `HPO_VERSION` in `engine/hpo.ts` (currently `"2026-09-01"`); `"unknown"` is no longer used, and `/api/brief` falls back to the same constant when the ranking's `dataVersions` has no `hpo`. The pin is a label only: it is not checked against the release the JAX API actually serves (at build time or at runtime), so the two can drift until someone updates the constant.
7. **Ancestor-aware contradictions** (Jerry). v0.1 matches excluded ids exactly.
8. **Overlap thresholds: RESOLVED for v0.1.2** (pending Jerry's confirmation). Thresholds 0.6 / 0.3 and one step down per contradiction stay; coverage counts exact matches 1 and ancestor matches 0.5, floored (section 7.4 step 8).
9. **`GET /api/terms`** (Ian). Proposed here so manual add works without the app calling HPO directly.
