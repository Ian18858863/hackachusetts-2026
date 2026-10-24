// POST /api/extract (docs/CONTRACT.md section 7.2).
//
// Notes text -> HPO terms with exact source quotes.
//   1. Validate: JSON object, `text` 1-8,000 characters (413 above), optional `caseId`.
//   2. Demo path: `caseId` names a bundled demo case AND `text` equals its
//      narrative exactly -> the prepared extraction, source "demo". No LLM call.
//   3. Live path: Workers AI proposes phrases and labels (functions/_lib/llm.ts),
//      the engine grounds them against the HPO API (groundTerms).
//   3b. Proposals the engine could not confirm are retried by
//      functions/_lib/grounding.ts (T37): the model's main label, then its
//      alternative labels, against HPO names and synonyms; at most
//      min(12, 50 - subrequests already used - 4) extra HPO searches, inside
//      the same 4 s deadline. Terms found through an alternative label carry
//      a warning.
//   3c. The model's answer is streamed (T39). If it is still writing after
//      15 s, the complete features received so far are grounded as usual and
//      the response carries a warning that some features may be missing.
//      Only when no complete feature arrived is it 504 UPSTREAM_TIMEOUT.
//   4. Zero grounded terms -> 422 NO_TERMS_FOUND, or 504 UPSTREAM_TIMEOUT when
//      the answer was cut at the deadline (nothing about the notes is known).
//      A finished answer that is not valid JSON as a whole (output-token cap)
//      keeps its complete features with the same partial warning.
// Only the live path is rate-limited per client IP (functions/_lib/rateLimit.ts,
// T18p): 429 RATE_LIMITED with Retry-After. The demo path is never limited.
// If the AI binding is missing or the LLM / HPO call fails and the text is a
// bundled demo narrative, the prepared extraction is returned instead
// (contract section 4 table, design.md error handling).
//
// Privacy: the notes text is never logged, cached or echoed in errors. Logs
// carry only error class names, codes, counts and timings.

import { HPO_VERSION, getDemoCase, groundTerms, listDemoCases } from "../../engine/index";
import type { DataVersions, DemoCase, EngineDeps, ExtractedTerm } from "../../engine/index";
import { getFallbackDemoCase } from "../_lib/fallback/demoCases";
import {
  DEFAULT_MAX_LOOKUPS,
  estimateEngineSubrequests,
  recoverUngrounded,
  secondaryLookupCap,
} from "../_lib/grounding";
import type { SecondaryStats } from "../_lib/grounding";
import { LlmError, MAX_TEXT_CHARS, noGroundedTermsCode, proposeTerms } from "../_lib/llm";
import type { LlmEnv, ProposeResult } from "../_lib/llm";
import { checkAndCount, clientIp, extractWindows, rateLimitMessage } from "../_lib/rateLimit";
import {
  CONTRACT_VERSION,
  apiError,
  defaultCache,
  engineErrorResponse,
  invalid,
  isRecord,
  isUpstreamFailure,
  json,
  logError,
  methodNotAllowed,
  readJsonBody,
} from "../_lib/respond";
import type { PagesContext } from "../_lib/respond";

/** RDD_EXTRACT_LIMIT_PER_MIN: optional per-minute limit override (functions/_lib/rateLimit.ts). */
type Env = LlmEnv & { RDD_EXTRACT_LIMIT_PER_MIN?: string };

/** Model id reported for the prepared demo extraction (contract 7.2 example). */
const DEMO_MODEL = "demo-prepared";
/**
 * LLM budget from contract section 10. With streaming this is the point at
 * which the answer so far is used (T39), so llm 15 s + grounding 4 s stays
 * inside the 20 s total of contract section 7.2.
 */
const LLM_TIMEOUT_MS = 15_000;
/** Overall grounding budget from contract section 7.2 (all HPO lookups and searches). */
const GROUNDING_DEADLINE_MS = 4_000;
/**
 * Upper cap on extra JAX searches made by the secondary grounding (T37). The
 * real cap is lower when the request already used subrequests: the Workers AI
 * call, the rate limiter's Cache API reads and writes, and the engine's HPO
 * lookups (secondaryLookupCap in functions/_lib/grounding.ts).
 */
const SECONDARY_MAX_LOOKUPS = DEFAULT_MAX_LOOKUPS; // 12
/** Subrequests of the Workers AI call (counted conservatively as one). */
const AI_SUBREQUESTS = 1;
/** Below this much time left in the grounding deadline the secondary step is skipped. */
const SECONDARY_MIN_MS = 300;
/**
 * HPO release for the prepared demo extraction: the release the engine pins
 * (HPO_VERSION in engine/hpo.ts), so the demo path, the live path and the
 * brief report the same label.
 */
const DEMO_HPO_VERSION = HPO_VERSION;

/** Raised locally when groundTerms exceeds GROUNDING_DEADLINE_MS. */
class GroundingDeadline extends Error {
  constructor() {
    super("Grounding exceeded its overall deadline");
    this.name = "GroundingDeadline";
  }
}

/** Resolve or reject with `promise`, or reject with GroundingDeadline after `ms`. */
function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new GroundingDeadline()), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}
/**
 * Byte cap for the request body. 8,000 UTF-16 code units are at most 24,000
 * UTF-8 bytes; JSON escaping can add more, so allow generous headroom and
 * enforce the real limit on `text.length` after parsing.
 */
const MAX_BODY_BYTES = 64 * 1024;
const CASE_ID_MAX = 100;

interface ExtractResponseBody {
  version: typeof CONTRACT_VERSION;
  source: "live" | "demo";
  terms: ExtractedTerm[];
  warnings: string[];
  model: string;
  dataVersions: DataVersions;
}

export const onRequest = async (context: PagesContext<Env>): Promise<Response> => {
  if (context.request.method !== "POST") return methodNotAllowed(["POST"]);
  try {
    return await handlePost(context);
  } catch (err) {
    // Last resort: anything not mapped below. No note text in the response.
    return engineErrorResponse(err, "Your notes are kept");
  }
};

async function handlePost({ request, env, waitUntil }: PagesContext<Env>): Promise<Response> {
  // ---- 1. validate ----
  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return invalid("The request body must be a JSON object with a `text` field.");

  const { text, caseId } = body.value;
  if (typeof text !== "string") return invalid("`text` is required and must be a string.");
  if (text.length > MAX_TEXT_CHARS) {
    return apiError(
      "TEXT_TOO_LONG",
      `The text is ${text.length.toLocaleString("en-US")} characters. The limit is 8,000; shorten it and try again.`,
    );
  }
  if (text.trim().length === 0) return invalid("`text` is empty. Paste or type the symptom history first.");
  if (caseId !== undefined && caseId !== null && (typeof caseId !== "string" || caseId.length > CASE_ID_MAX)) {
    return invalid("`caseId` must be a short string, such as \"demo-dmd\".");
  }

  // ---- 2. demo path: exact narrative of the named demo case ----
  if (typeof caseId === "string") {
    const demo = lookupDemoCase(caseId);
    if (demo && demo.narrative === text) return demoResponse(demo, []);
  }

  // ---- 3. live path ----
  if (!env.AI || typeof env.AI.run !== "function") {
    const demo = findDemoByNarrative(text);
    if (demo) return demoResponse(demo, []);
    return apiError(
      "LLM_UNAVAILABLE",
      "Live extraction is not available here. Try one of the demo cases, or add terms by hand.",
    );
  }

  // Per-IP limit on live LLM calls only (approximate, fails open).
  // Counter writes go to waitUntil so they add no latency.
  const rateCache = defaultCache();
  const rateWindows = extractWindows(env);
  // One Cache API read and one write per window when the cache exists.
  const rateLimitSubrequests = rateCache ? 2 * rateWindows.length : 0;
  const decision = await checkAndCount(rateCache, clientIp(request), rateWindows, Date.now(), waitUntil);
  if (decision.limited) {
    return apiError("RATE_LIMITED", rateLimitMessage(decision.retryAfterSec), {
      "Retry-After": String(decision.retryAfterSec),
    });
  }

  let proposed: ProposeResult;
  try {
    proposed = await proposeTerms(text, env, { timeoutMs: LLM_TIMEOUT_MS });
  } catch (err) {
    return llmFailure(err, text);
  }

  const deps: EngineDeps = { fetch: globalThis.fetch.bind(globalThis) };
  const cache = defaultCache();
  if (cache) deps.cache = cache;

  const groundStarted = Date.now();
  let grounded;
  try {
    // The engine applies per-call timeouts; this caps the whole step at 4 s.
    // On expiry the remaining HPO fetches end on their own per-call timeouts.
    grounded = await withDeadline(groundTerms(text, proposed.proposals, deps), GROUNDING_DEADLINE_MS);
  } catch (err) {
    if (err instanceof GroundingDeadline) {
      logError("extract.ground", err, "deadline");
      const demo = findDemoByNarrative(text);
      if (demo) return demoResponse(demo, [FALLBACK_WARNING]);
      return apiError(
        "UPSTREAM_TIMEOUT",
        "The HPO term service did not confirm the terms within 4 seconds. Your notes are kept; try again.",
      );
    }
    if (isUpstreamFailure(err)) {
      const demo = findDemoByNarrative(text);
      if (demo) {
        logError("extract.ground", err, "demo-fallback");
        return demoResponse(demo, [FALLBACK_WARNING]);
      }
    }
    logError("extract.ground", err);
    return engineErrorResponse(err, "Your notes are kept");
  }
  // ---- 3b. secondary grounding: retry unconfirmed proposals (T37) ----
  // Never fails the request: any error keeps the engine result as it is.
  const deadlineAt = groundStarted + GROUNDING_DEADLINE_MS;
  let secondary: SecondaryStats | null = null;
  const used = AI_SUBREQUESTS + rateLimitSubrequests + estimateEngineSubrequests(proposed.proposals);
  const lookupCap = secondaryLookupCap(used, SECONDARY_MAX_LOOKUPS);
  let secondarySkip: "deadline" | "subrequests" | "error" | null = null;
  if (lookupCap === 0) {
    secondarySkip = "subrequests";
  } else if (deadlineAt - Date.now() < SECONDARY_MIN_MS) {
    secondarySkip = "deadline";
  } else {
    try {
      const fetchFn = globalThis.fetch.bind(globalThis);
      const recovered = await withDeadline(
        recoverUngrounded(text, proposed.proposals, grounded, {
          fetch: fetchFn,
          maxLookups: lookupCap,
          deadlineAt,
          perCallTimeoutMs: Math.min(2_000, Math.max(1, deadlineAt - Date.now())),
        }),
        Math.max(1, deadlineAt - Date.now()),
      );
      grounded = { ...grounded, terms: recovered.terms, warnings: recovered.warnings };
      secondary = recovered.stats;
    } catch (err) {
      secondarySkip = "error";
      logError("extract.ground2", err);
    }
  }
  const groundMs = Date.now() - groundStarted;

  // Counts and timings only; never the text.
  console.log(
    `[rdd] extract live model=${proposed.model} llmMs=${proposed.llmMs} groundMs=${groundMs} ` +
      `outChars=${proposed.outputChars} outTokens=${proposed.outputTokens ?? "?"} ` +
      `alts=${proposed.proposals.reduce((n, p) => n + (p.alternatives?.length ?? 0), 0)} partial=${proposed.partial} ` +
      `proposals=${proposed.proposals.length} terms=${grounded.terms.length} warnings=${grounded.warnings.length}` +
      ` subrequestsUsed~${used} lookupCap=${lookupCap}` +
      (secondary
        ? ` retried=${secondary.retried} recovered=${secondary.recovered} viaAlt=${secondary.viaAlternative} ` +
          `lookups=${secondary.lookups}/${lookupCap} failed=${secondary.failedLookups} ` +
          `skippedBudget=${secondary.skippedByBudget}` +
          (lookupCap < SECONDARY_MAX_LOOKUPS ? " capCutBy=subrequests" : "")
        : ` secondary=skipped reason=${secondarySkip ?? "none"}`),
  );

  if (grounded.terms.length === 0) {
    if (noGroundedTermsCode(proposed) === "UPSTREAM_TIMEOUT") {
      // Cut at the deadline: the empty result says nothing about the notes.
      const demo = findDemoByNarrative(text);
      if (demo) return demoResponse(demo, [FALLBACK_WARNING]);
      return apiError("UPSTREAM_TIMEOUT", LLM_TIMEOUT_MESSAGE);
    }
    return apiError(
      "NO_TERMS_FOUND",
      "No features in the text could be matched to HPO terms. Your notes are kept; add more detail or add terms by hand.",
    );
  }

  const warnings = [...grounded.warnings];
  if (proposed.partial) warnings.unshift(PARTIAL_WARNING);
  const notInText = proposed.stats.droppedNotInText;
  if (notInText > 0) {
    warnings.push(
      `Dropped ${notInText} suggested ${notInText === 1 ? "phrase" : "phrases"} that did not appear word for word in the text`,
    );
  }

  const out: ExtractResponseBody = {
    version: CONTRACT_VERSION,
    source: "live",
    terms: grounded.terms,
    warnings,
    model: proposed.model,
    dataVersions: grounded.dataVersions,
  };
  return json(out, 200, { "Server-Timing": `llm;dur=${proposed.llmMs}, ground;dur=${groundMs}` });
}

const PARTIAL_WARNING =
  "The extraction service was slow, so only the features it found in the first 15 seconds are shown. Some features may be missing; add them by hand or try again";

const FALLBACK_WARNING =
  "Live extraction was not available, so the prepared extraction for this demo case is shown";

const LLM_TIMEOUT_MESSAGE =
  "The extraction service did not answer within 15 seconds. Your notes are kept; try again, or add terms by hand.";

/** Map an LLM failure to the contract error, falling back to a demo narrative's prepared extraction. */
function llmFailure(err: unknown, text: string): Response {
  if (!(err instanceof LlmError)) {
    logError("extract.llm", err);
    return engineErrorResponse(err, "Your notes are kept");
  }
  logError("extract.llm", err, err.code);

  if (err.code === "invalid_input") {
    // Already validated above; kept for completeness.
    return invalid("`text` must be 1 to 8,000 characters.");
  }
  if (err.code === "no_binding") {
    const demo = findDemoByNarrative(text);
    if (demo) return demoResponse(demo, []);
    return apiError(
      "LLM_UNAVAILABLE",
      "Live extraction is not available here. Try one of the demo cases, or add terms by hand.",
    );
  }

  const demo = findDemoByNarrative(text);
  if (demo) return demoResponse(demo, [FALLBACK_WARNING]);

  if (err.code === "timeout") {
    return apiError("UPSTREAM_TIMEOUT", LLM_TIMEOUT_MESSAGE);
  }
  // "upstream" or "bad_output"
  return apiError(
    "UPSTREAM_ERROR",
    "The extraction service returned an error. Your notes are kept; try again, or add terms by hand.",
  );
}

/**
 * Engine demo case first; the temporary functions fallback (demo-npc1 only,
 * T18c) is used only when the engine does not have the case.
 */
function lookupDemoCase(caseId: string): DemoCase | undefined {
  return getDemoCase(caseId) ?? getFallbackDemoCase(caseId);
}

/** The bundled demo case whose narrative equals `text` exactly, if any. */
function findDemoByNarrative(text: string): DemoCase | undefined {
  const ids = new Set(listDemoCases().map((s) => s.caseId));
  ids.add("demo-npc1");
  for (const id of ids) {
    const demo = lookupDemoCase(id);
    if (demo && demo.narrative === text) return demo;
  }
  return undefined;
}

function demoResponse(demo: DemoCase, warnings: string[]): Response {
  const terms = [...demo.extraction].sort((a, b) => a.start - b.start || a.end - b.end);
  const out: ExtractResponseBody = {
    version: CONTRACT_VERSION,
    source: "demo",
    terms,
    warnings,
    model: DEMO_MODEL,
    dataVersions: {
      hpo: DEMO_HPO_VERSION,
      demoCache: demo.recordedAt.slice(0, 10),
      fetchedAt: demo.recordedAt,
    },
  };
  return json(out);
}
