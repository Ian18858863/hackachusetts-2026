/**
 * What changed between two rankings, kept per RankResponse object so it
 * survives a step change (a re-rank started from "What to check next" still
 * plays its motion and shows "Up from 3" when the user opens the matches).
 * A ranking restored from localStorage has no record: no motion, no deltas.
 */
import type { Candidate, RankResponse } from '../../shared/contract';
import { pick, type RankingT } from './format';

export interface RankingChange {
  /** null: this is the first ranking of the case. */
  previousRanks: Map<string, number> | null;
  /** Evidence row keys per candidate in the previous ranking (see evidenceKeys). */
  previousEvidence: Map<string, Set<string>> | null;
  /** Set once the evidence motion has played, so revisiting does not replay it. */
  motionPlayed: boolean;
}

const changes = new WeakMap<RankResponse, RankingChange>();

export function evidenceKeys(c: Candidate): Set<string> {
  return new Set([
    ...c.matched.map((e) => `m:${e.patientTerm.id}`),
    ...c.notReported.map((f) => `n:${f.term.id}`),
    ...c.contradicted.map((f) => `c:${f.term.id}`),
  ]);
}

export function recordChange(next: RankResponse, previous: RankResponse | null): void {
  changes.set(next, {
    previousRanks: previous ? new Map(previous.candidates.map((c) => [c.diseaseId, c.rank])) : null,
    previousEvidence: previous ? new Map(previous.candidates.map((c) => [c.diseaseId, evidenceKeys(c)])) : null,
    motionPlayed: false,
  });
}

export function changeFor(response: RankResponse): RankingChange | undefined {
  return changes.get(response);
}

export type RankDelta =
  | { kind: 'none' }
  | { kind: 'new' }
  | { kind: 'up' | 'down'; from: number };

export function rankDelta(change: RankingChange | undefined, c: Candidate): RankDelta {
  if (!change?.previousRanks) return { kind: 'none' };
  const before = change.previousRanks.get(c.diseaseId);
  if (before === undefined) return { kind: 'new' };
  if (before > c.rank) return { kind: 'up', from: before };
  if (before < c.rank) return { kind: 'down', from: before };
  return { kind: 'none' };
}

/** One sentence for the polite live region after a ranking arrives (R4.3). */
export function describeRanking(next: RankResponse, previous: RankResponse | null, t: RankingT): string {
  const first = next.candidates[0];
  const count = next.candidates.length;
  if (count === 0) return t('announceNone');
  const name = first?.name ?? t('unknown');
  if (!previous) return t(pick(count, 'announceRankedOne', 'announceRankedOther'), { n: count, name });
  const before = new Map(previous.candidates.map((c) => [c.diseaseId, c.rank]));
  const moved = next.candidates.filter((c) => before.get(c.diseaseId) !== c.rank).length;
  if (moved === 0) return t('announceUpdatedNone', { name });
  return t(pick(moved, 'announceUpdatedOne', 'announceUpdatedOther'), { n: moved, name });
}
