// Ranking: overlapLabel (implemented) and rankCandidates (placeholder until
// task 1.5 lands the Monarch semsim client and evidence assembly).

import { NotImplementedError } from "./errors";
import type { EngineDeps, OverlapLabel, RankRequest, RankResponse } from "./types";

/** Coverage thresholds (CONTRACT.md 7.4 step 8; open question 8, draft values). */
export const OVERLAP_STRONG_MIN_COVERAGE = 0.6;
export const OVERLAP_PARTIAL_MIN_COVERAGE = 0.3;

const LADDER: readonly OverlapLabel[] = ["weak", "partial", "strong"];

/** Non-negative integer count; NaN, negative or non-finite input counts as 0. */
function count(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Plain-language overlap label (CONTRACT.md 7.4 step 8).
 * coverage = matched / observed; strong if >= 0.6, partial if >= 0.3, else weak;
 * each contradicted feature lowers the label one step, floor weak.
 * Total function: observedCount <= 0 gives "weak"; matchedCount is clamped to
 * [0, observedCount]. Never shown as a percentage.
 */
export function overlapLabel(
  matchedCount: number,
  observedCount: number,
  contradictedCount: number,
): OverlapLabel {
  const observed = count(observedCount);
  if (observed === 0) return "weak";
  const matched = Math.min(count(matchedCount), observed);
  const coverage = matched / observed;
  const base =
    coverage >= OVERLAP_STRONG_MIN_COVERAGE ? 2 : coverage >= OVERLAP_PARTIAL_MIN_COVERAGE ? 1 : 0;
  const step = Math.max(0, base - count(contradictedCount));
  return LADDER[step] ?? "weak";
}

/** PLACEHOLDER (task 1.5): Monarch-based candidate ranking. Always throws. */
export async function rankCandidates(_req: RankRequest, _deps: EngineDeps): Promise<RankResponse> {
  throw new NotImplementedError("rankCandidates");
}
