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
export { nextQuestions } from "./questions";
export { searchTrials } from "./trials";

// Contract section 6: pure functions
export { buildBrief, toPhenopacket, specialistsFor } from "./brief";
export { overlapLabel } from "./rank";
export { normalizeFrequency } from "./hpo";

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
  rankCandidates: "placeholder",
  nextQuestions: "placeholder",
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
