// Demo cache lookups (CONTRACT.md sections 6 and 9). Pure, no network.
// Returned objects are copies, so callers cannot mutate the bundled cache.

import type {
  DemoCase,
  DemoCaseSummary,
  HpoId,
  NextQuestionsResponse,
  RankResponse,
  TrialsResponse,
} from "../types";
import { DEMO_CASES } from "./cases";
import { RECORDED_QUESTIONS, RECORDED_RANKINGS, RECORDED_TRIALS } from "./recorded";

/** Summaries in demo picker order (demo-dmd first). */
export function listDemoCases(): DemoCaseSummary[] {
  return DEMO_CASES.map(({ caseId, title, label, sourcePhenopacketId }) => ({
    caseId,
    title,
    label,
    sourcePhenopacketId,
  }));
}

/** The full demo case, or undefined for an unknown id. */
export function getDemoCase(caseId: string): DemoCase | undefined {
  const found = DEMO_CASES.find((c) => c.caseId === caseId);
  return found ? structuredClone(found) : undefined;
}

function sortedUnique(ids: readonly HpoId[]): HpoId[] {
  return [...new Set(ids.map((id) => id.trim()))].filter((id) => id !== "").sort();
}

/**
 * Order-independent key for a term set: sorted, deduplicated ids.
 * Format: "<observed joined by ,>|<excluded joined by ,>|<limit>".
 */
export function demoRankKey(observed: HpoId[], excluded: HpoId[], limit: number): string {
  return `${sortedUnique(observed).join(",")}|${sortedUnique(excluded).join(",")}|${limit}`;
}

/**
 * Recorded /api/rank response for a demoRankKey, or undefined (cache miss).
 * Returned with source "demo" and dataVersions.demoCache = the recording date;
 * the original dataVersions (including fetchedAt) are kept.
 */
export function getDemoRanking(key: string): RankResponse | undefined {
  const hit = Object.hasOwn(RECORDED_RANKINGS, key) ? RECORDED_RANKINGS[key] : undefined;
  if (!hit) return undefined;
  const response = structuredClone(hit.response);
  response.source = "demo";
  response.dataVersions.demoCache = hit.recordedAt.slice(0, 10);
  return response;
}

/** Recorded /api/next-questions response for a demoRankKey, or undefined (cache miss). */
export function getDemoQuestions(key: string): NextQuestionsResponse | undefined {
  const hit = Object.hasOwn(RECORDED_QUESTIONS, key) ? RECORDED_QUESTIONS[key] : undefined;
  return hit ? structuredClone(hit) : undefined;
}

/** Normalised condition key: trimmed, lower case, single spaces. */
export function normalizeCondition(condition: string): string {
  return condition.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Recorded /api/trials response for a condition name, or undefined (cache miss). */
export function getDemoTrials(condition: string): TrialsResponse | undefined {
  const key = normalizeCondition(condition);
  const hit = Object.hasOwn(RECORDED_TRIALS, key) ? RECORDED_TRIALS[key] : undefined;
  return hit ? structuredClone(hit) : undefined;
}
