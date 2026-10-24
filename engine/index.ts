// Public entry point of the Rare Disease Detective engine (CONTRACT.md section 6).
// Import from Pages Functions as: import { ... } from "../../engine/index";
//
// Runtime: Cloudflare Workers. Network only through the injected deps.fetch;
// no Node built-ins, no phenotype.hpoa at runtime, no runtime dependencies.
//
// Status (see ENGINE_STATUS): functions marked "placeholder" throw
// NotImplementedError. They never return anything that looks like analysis.

export type * from "./types";

// Contract section 6: network functions
export { groundTerms } from "./ground";
export { searchTerms } from "./hpo";
export { rankCandidates } from "./rank";
// Not in contract section 6: same ranking plus the enrichment report, so
// functions can tell complete from incomplete live evidence without a
// change to RankResponse (proposed as an additive contract change).
export { rankCandidatesWithReport } from "./rank";
export type { CandidateEnrichment, EnrichmentReport, RankWithReport } from "./rank";
export type { FetchStatus } from "./annotations";
export { nextQuestions } from "./questions";
// Not in contract section 6: same questions plus a report of which annotation
// calls and hierarchy checks ran, and the subrequest count.
export { nextQuestionsWithReport } from "./questions";
export type { NextQuestionsReport, NextQuestionsWithReport, HierarchyReport, QuestionsCandidateReport } from "./questions";
export { searchTrials } from "./trials";

// Contract section 6: pure functions
export { buildBrief, toPhenopacket, specialistsFor } from "./brief";
export { overlapLabel } from "./rank";
export { normalizeFrequency } from "./hpo";
// HPO release reported in dataVersions.hpo (open question 6): "2026-09-01",
// latest obophenotype release as of 2026-10-24, served via the JAX ontology
// API; checked by the GitHub releases API. Evidence and limits in engine/hpo.ts.
export { HPO_VERSION } from "./hpo";

// Contract section 6: demo cache
export {
  listDemoCases,
  getDemoCase,
  demoRankKey,
  getDemoRanking,
  getDemoQuestions,
  getDemoTrials,
} from "./demo/index";

// Additional exports (not in contract section 6): typed errors for status
// mapping (design.md) and the section 13 strings (engine/text.ts).
export { EngineError, UpstreamTimeout, UpstreamError, InvalidInput, NotImplementedError } from "./errors";
export * from "./text";

/** Which section 6 functions are real in this build. Not part of the contract. */
export const ENGINE_STATUS = {
  groundTerms: "implemented",
  searchTerms: "implemented",
  rankCandidates: "implemented",
  nextQuestions: "implemented",
  searchTrials: "placeholder",
  buildBrief: "placeholder",
  toPhenopacket: "implemented",
  overlapLabel: "implemented",
  normalizeFrequency: "implemented",
  specialistsFor: "placeholder",
  listDemoCases: "implemented",
  getDemoCase: "implemented",
  demoRankKey: "implemented",
  getDemoRanking: "implemented (no recorded responses yet: always undefined)",
  getDemoQuestions: "implemented (no recorded responses yet: always undefined)",
  getDemoTrials: "implemented (no recorded responses yet: always undefined)",
} as const;
