// POST /api/brief (docs/CONTRACT.md section 7.7).
//
// Case object -> one-page specialist brief + GA4GH Phenopacket v2 (features only).
//   1. Validate the case object (section 8): at least one observed term and a
//      `lastRanking`; otherwise 400. Removed terms are ignored.
//   2. RDD_ENGINE_PATH / RDD_ENGINE_PATH_BRIEF (see _lib/fallback/engineFirst.ts):
//      "fallback" (default) runs functions/_lib/fallback/brief.ts directly;
//      "engine" runs buildBrief first and falls back while it is a
//      placeholder (X-RDD-Path: engine | fallback).
//   3. Phenopacket from the engine's toPhenopacket (implemented): no
//      `diseases`, no `interpretations`, so it never states a diagnosis.
// Pure, no network, not cached. The notes text is never logged.

import { HPO_VERSION, buildBrief, toPhenopacket } from "../../engine/index";
import type { Brief, CaseObject, DataVersions, Phenopacket } from "../../engine/index";
import { fallbackBuildBrief } from "../_lib/fallback/brief";
import { engineFirst, enginePathMode, PATH_HEADER } from "../_lib/fallback/engineFirst";
import { DISEASE_ID_RE, HPO_ID_RE } from "../_lib/fallback/validate";
import {
  CONTRACT_VERSION,
  engineErrorResponse,
  invalid,
  isRecord,
  json,
  logError,
  methodNotAllowed,
  readJsonBody,
  withHeader,
} from "../_lib/respond";
import type { PagesContext } from "../_lib/respond";

/** Notes (8,000 chars) plus a 10-candidate ranking fit well inside this. */
const MAX_BODY_BYTES = 512 * 1024;
const MAX_TERMS = 200;
const MAX_CANDIDATES = 10;
const MAX_QUESTIONS = 20;
const MAX_NOTES = 8000;

const STATUSES = new Set(["observed", "excluded", "removed"]);
const PROVENANCES = new Set(["llm", "manual", "demo"]);

interface BriefResponseBody {
  version: typeof CONTRACT_VERSION;
  source: "live" | "demo";
  brief: Brief;
  phenopacket: Phenopacket;
}

export const onRequest = async (context: PagesContext<Record<string, unknown>>): Promise<Response> => {
  if (context.request.method !== "POST") return methodNotAllowed(["POST"]);
  try {
    return await handlePost(context);
  } catch (err) {
    logError("brief", err);
    return engineErrorResponse(err, "Your case is kept");
  }
};

function isString(v: unknown, max: number): v is string {
  return typeof v === "string" && v.length <= max;
}

function isTermRef(v: unknown): boolean {
  return isRecord(v) && typeof v.id === "string" && HPO_ID_RE.test(v.id) && isString(v.label, 300);
}

/** FrequencyInfo: label null or a string, source a disease id string, raw optional string. */
function isFrequency(v: unknown): boolean {
  return (
    isRecord(v) &&
    (v.label === null || typeof v.label === "string") &&
    typeof v.source === "string" &&
    (v.raw === undefined || typeof v.raw === "string")
  );
}

function everyItem(v: unknown, max: number, check: (item: Record<string, unknown>) => boolean): boolean {
  return Array.isArray(v) && v.length <= max && v.every((item) => isRecord(item) && check(item));
}

/**
 * Candidate in the shape /api/rank returns (contract section 5), down to the
 * fields the brief reads: evidence frequencies (attributions), genes (tests to
 * ask) and sources. A malformed candidate is a 400, never a 500 or a test
 * suggestion with a missing gene symbol.
 */
function isCandidate(c: unknown): boolean {
  if (!isRecord(c)) return false;
  const links = c.links;
  return (
    typeof c.rank === "number" &&
    typeof c.diseaseId === "string" &&
    DISEASE_ID_RE.test(c.diseaseId) &&
    isString(c.name, 300) &&
    c.name !== "" &&
    isRecord(links) &&
    typeof links.monarch === "string" &&
    (links.omim === undefined || typeof links.omim === "string") &&
    (links.orphanet === undefined || typeof links.orphanet === "string") &&
    everyItem(c.matched, 100, (e) =>
      isTermRef(e.patientTerm) && isTermRef(e.diseaseTerm) && (e.frequency === null || isFrequency(e.frequency)),
    ) &&
    everyItem(c.unmatched, 100, (t) => isTermRef(t)) &&
    everyItem(c.notReported, 50, (f) => isTermRef(f.term) && isFrequency(f.frequency)) &&
    everyItem(c.contradicted, 100, (f) => isTermRef(f.term) && isFrequency(f.frequency)) &&
    everyItem(c.genes, 50, (g) => isString(g.id, 100) && g.id !== "" && isString(g.symbol, 50) && g.symbol !== "") &&
    Array.isArray(c.sources) &&
    c.sources.every((x) => typeof x === "string") &&
    Array.isArray(c.categories) &&
    c.categories.every((x) => typeof x === "string")
  );
}

/** Plain-English problem with the case object, or null if it has the section 8 shape we use. */
function caseProblem(c: unknown): string | null {
  if (!isRecord(c)) return "`case` is required: send the case object as { \"case\": { ... } }.";
  if (c.version !== CONTRACT_VERSION) return "`case.version` must be \"0.1\". Start a new case and try again.";
  if (!isString(c.caseId, 100) || c.caseId === "") return "`case.caseId` must be a short string.";
  if (c.notes !== undefined && !isString(c.notes, MAX_NOTES)) return "`case.notes` must be text of at most 8,000 characters.";

  if (c.demo !== null) {
    const d = c.demo;
    if (!isRecord(d) || !isString(d.caseId, 100) || !isString(d.sourcePhenopacketId, 200) || !isString(d.label, 300)) {
      return "`case.demo` must be null or { caseId, sourcePhenopacketId, label }.";
    }
  }

  if (!Array.isArray(c.terms) || c.terms.length > MAX_TERMS) return `\`case.terms\` must be a list of at most ${MAX_TERMS} terms.`;
  let observed = 0;
  for (const t of c.terms as unknown[]) {
    if (
      !isRecord(t) ||
      typeof t.hpoId !== "string" ||
      !HPO_ID_RE.test(t.hpoId) ||
      !isString(t.label, 300) ||
      t.label === "" ||
      typeof t.status !== "string" ||
      !STATUSES.has(t.status) ||
      typeof t.provenance !== "string" ||
      !PROVENANCES.has(t.provenance) ||
      (t.quote !== undefined && !isString(t.quote, MAX_NOTES))
    ) {
      return "Each term in `case.terms` needs an HPO id, a label, a status (observed, excluded or removed) and a provenance.";
    }
    if (t.status === "observed") observed++;
  }
  if (observed === 0) return "The case has no feature marked as present. Keep at least one before making a brief.";

  const lr = c.lastRanking;
  if (!isRecord(lr) || !isRecord(lr.response) || !Array.isArray(lr.response.candidates)) {
    return "The case has not been ranked yet. Look for possible matches first, then make the brief.";
  }
  const candidates = lr.response.candidates as unknown[];
  if (candidates.length > MAX_CANDIDATES) return `\`case.lastRanking\` may hold at most ${MAX_CANDIDATES} candidates.`;
  for (const cand of candidates) {
    if (!isCandidate(cand)) {
      return "`case.lastRanking` does not have the shape returned by /api/rank. Rank the case again.";
    }
  }
  const dv = lr.response.dataVersions;
  if (dv !== undefined && (!isRecord(dv) || typeof dv.fetchedAt !== "string")) {
    return "`case.lastRanking.response.dataVersions` must include `fetchedAt`.";
  }

  if (!Array.isArray(c.questions) || c.questions.length > MAX_QUESTIONS) {
    return `\`case.questions\` must be a list of at most ${MAX_QUESTIONS} questions.`;
  }
  for (const q of c.questions as unknown[]) {
    if (!isRecord(q) || typeof q.hpoId !== "string" || !HPO_ID_RE.test(q.hpoId) || !isString(q.label, 300)) {
      return "Each item in `case.questions` needs the shape returned by /api/next-questions.";
    }
  }
  return null;
}

async function handlePost(context: PagesContext<Record<string, unknown>>): Promise<Response> {
  const body = await readJsonBody(
    context.request,
    MAX_BODY_BYTES,
    {
      code: "TEXT_TOO_LONG",
      message: "The case is too large to turn into a brief. Shorten the notes or remove terms and try again.",
    },
  );
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return invalid("The request body must be a JSON object: { \"case\": { ... } }.");

  const problem = caseProblem(body.value.case);
  if (problem) return invalid(problem);
  const c = body.value.case as unknown as CaseObject;

  const generatedAt = new Date().toISOString();
  const rankedVersions = c.lastRanking?.response.dataVersions;
  // When the ranking versions are missing or have no hpo, report the HPO release the engine pins (engine/hpo.ts).
  const dataVersions: DataVersions = rankedVersions
    ? { ...rankedVersions, hpo: rankedVersions.hpo ?? HPO_VERSION }
    : { hpo: HPO_VERSION, fetchedAt: generatedAt };
  const opts = { generatedAt, dataVersions };

  const result = await engineFirst(
    enginePathMode(context.env, "brief"),
    () => buildBrief(c, opts),
    () => fallbackBuildBrief(c, opts),
  );
  if (!result.ok) {
    logError(`brief.${result.path}`, result.error);
    return withHeader(engineErrorResponse(result.error, "Your case is kept"), PATH_HEADER, result.path);
  }

  const phenopacket = toPhenopacket(c, { created: generatedAt, hpoVersion: dataVersions.hpo ?? HPO_VERSION });
  const out: BriefResponseBody = {
    version: CONTRACT_VERSION,
    source: c.demo ? "demo" : "live",
    brief: result.value,
    phenopacket,
  };
  return json(out, 200, { [PATH_HEADER]: result.path });
}
