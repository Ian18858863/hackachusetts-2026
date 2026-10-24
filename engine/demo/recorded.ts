// Recorded upstream responses for the demo cases (CONTRACT.md section 9:
// one /api/rank response per prepared term set at limit 5, the matching
// /api/next-questions response, and /api/trials for the top candidate).
//
// EMPTY IN THIS SKELETON. Responses are recorded in task 1.9 once
// rankCandidates, nextQuestions and searchTrials are implemented, so nothing
// here is hand-written. Until then every lookup is a cache miss (undefined),
// which the functions treat as "no demo fallback" (502/504).

import type { NextQuestionsResponse, RankResponse, TrialsResponse } from "../types";

/** Keyed by demoRankKey(observed, excluded, limit). */
export const RECORDED_RANKINGS: Readonly<Record<string, RankResponse>> = {};

/** Keyed by demoRankKey(observed, excluded, candidates.length). */
export const RECORDED_QUESTIONS: Readonly<Record<string, NextQuestionsResponse>> = {};

/** Keyed by normalised condition name (see normalizeCondition in ./index). */
export const RECORDED_TRIALS: Readonly<Record<string, TrialsResponse>> = {};
