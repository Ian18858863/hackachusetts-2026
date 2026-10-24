// POST /api/next-questions (docs/CONTRACT.md section 7.5).
//
// Observed / excluded HPO ids and the top 2-5 candidates -> features that best
// separate those candidates, as plain questions.
//   1. Validate: `observed` 1-50 HPO ids, `excluded` 0-50, no id in both,
//      `candidates` 2-5 ORPHA / OMIM / MONDO ids, `limit` 1-8 (default 5).
//   2. Engine nextQuestions first; while it is a placeholder, the fallback in
//      functions/_lib/fallback/questions.ts (X-RDD-Path: engine | fallback).
//      Annotations are cached per disease id for 24 h by the fallback.
//   3. Upstream failed -> recorded demo questions for
//      demoRankKey(observed, excluded, candidates.length), else 502/504.

import { demoRankKey, getDemoQuestions, nextQuestions } from "../../engine/index";
import type { NextQuestionsResponse } from "../../engine/index";
import { engineFirst, PATH_HEADER } from "../_lib/fallback/engineFirst";
import type { FallbackDeps } from "../_lib/fallback/http";
import { fallbackNextQuestions } from "../_lib/fallback/questions";
import { diseaseIdList, hpoIdList, intInRange, overlapId } from "../_lib/fallback/validate";
import {
  CONTRACT_VERSION,
  asDemoPayload,
  defaultCache,
  engineErrorResponse,
  invalid,
  isRecord,
  isUpstreamFailure,
  json,
  logError,
  methodNotAllowed,
  readJsonBody,
  withHeader,
} from "../_lib/respond";
import type { PagesContext } from "../_lib/respond";

const MAX_BODY_BYTES = 16 * 1024;
const KEPT = "Your terms are kept";

export const onRequest = async (context: PagesContext<Record<string, unknown>>): Promise<Response> => {
  if (context.request.method !== "POST") return methodNotAllowed(["POST"]);
  try {
    return await handlePost(context);
  } catch (err) {
    logError("next-questions", err);
    return engineErrorResponse(err, KEPT);
  }
};

async function handlePost(context: PagesContext<Record<string, unknown>>): Promise<Response> {
  const body = await readJsonBody(
    context.request,
    MAX_BODY_BYTES,
    {
      code: "INVALID_REQUEST",
      message: "The request is too large. Send at most 50 observed and 50 excluded HPO ids and 5 candidates.",
    },
  );
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) {
    return invalid("The request body must be a JSON object with `observed` and `candidates` lists.");
  }

  const observed = hpoIdList(body.value.observed, "observed", 1, 50);
  if (!observed.ok) return invalid(observed.message);
  const excluded = hpoIdList(body.value.excluded, "excluded", 0, 50);
  if (!excluded.ok) return invalid(excluded.message);
  const both = overlapId(observed.value, excluded.value);
  if (both) return invalid(`${both} is in both \`observed\` and \`excluded\`. Mark it as present or absent, not both.`);
  const candidates = diseaseIdList(body.value.candidates, "candidates", 2, 5);
  if (!candidates.ok) return invalid(candidates.message);
  const limit = intInRange(body.value.limit, "limit", 1, 8, 5);
  if (!limit.ok) return invalid(limit.message);

  const req = {
    observed: observed.value,
    excluded: excluded.value,
    candidates: candidates.value,
    limit: limit.value,
  };

  const deps: FallbackDeps = { fetch: globalThis.fetch.bind(globalThis), waitUntil: (p) => context.waitUntil(p) };
  const cache = defaultCache();
  if (cache) deps.cache = cache;

  const result = await engineFirst(
    () => nextQuestions({ ...req, candidates: [...req.candidates] }, deps),
    () => fallbackNextQuestions(req, deps),
  );

  if (!result.ok) {
    if (isUpstreamFailure(result.error)) {
      const demo = getDemoQuestions(demoRankKey(req.observed, req.excluded, req.candidates.length));
      if (demo) {
        logError("next-questions", result.error, "demo-fallback");
        return json(asDemoPayload(demo), 200, { [PATH_HEADER]: result.path });
      }
    }
    logError(`next-questions.${result.path}`, result.error);
    return withHeader(engineErrorResponse(result.error, KEPT), PATH_HEADER, result.path);
  }

  const out: NextQuestionsResponse = { ...result.value, version: CONTRACT_VERSION };
  return json(out, 200, { [PATH_HEADER]: result.path });
}
