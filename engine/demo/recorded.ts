// Recorded upstream responses for the demo cases (CONTRACT.md section 9).
//
// Every entry was produced by engine/scripts/record-demo.mjs, which calls the
// real engine against the live upstream APIs and saves the response verbatim
// with its original dataVersions. Nothing here is hand-written. The lookups in
// ./index set source "demo" and dataVersions.demoCache on the way out.
//
// Recorded so far (all on 2026-10-24, /api/rank at limit 5):
// - demo-npc1  format 2, re-recorded 14:37 ET under the v0.1.2 overlap rule:
//              per-call provider outcomes captured; enrichment complete
// - demo-dmd   format 1 response, metadata upgraded: per-call outcomes not captured
// - demo-kabuki format 1 response, metadata upgraded: per-call outcomes not captured
// Not yet recorded: next-questions (needs nextQuestions, task 1.6), trials
// (needs searchTrials, task 1.7), demo-marfan and demo-cdls.

import type { EnrichmentReport } from "../rank";
import type { HpoId, NextQuestionsResponse, RankResponse, TrialsResponse } from "../types";
import dmdRank from "./recorded/demo-dmd.rank.json";
import kabukiRank from "./recorded/demo-kabuki.rank.json";
import npc1Rank from "./recorded/demo-npc1.rank.json";

type Tally = Partial<Record<"ok" | "not-found" | "unusable" | "failed" | "not-applicable" | "not-captured", number>>;

export interface RecordedRank {
  kind: "rank";
  format: 2;
  caseId: string;
  key: string; // demoRankKey(observed, excluded, limit)
  request: { observed: HpoId[]; excluded: HpoId[]; limit: number };
  snapshot: true; // a stored copy of a live response, never a fresh call
  recordedAt: string; // live retrieval time (= response.dataVersions.fetchedAt)
  recordedWith: string;
  /** Observed per-call outcomes, or "not-captured" for format 1 recordings. */
  providers: { monarchSemsim: "ok"; hpoAnnotation: Tally | "not-captured"; orphadata: Tally | "not-captured" };
  /** Format 1 only: counts read off the stored response, explicitly not observed call outcomes. */
  inferredFromResponse?: {
    basis: string;
    candidates: number;
    candidatesListingHpoAnnotations: number;
    candidatesListingOrphadata: number;
    candidatesWithoutOrphanetId: number;
  };
  enrichment: EnrichmentReport | null; // null: per-call outcomes were not captured (format 1 recordings)
  /** Which overlap rule produced the stored labels (contract v0.1 or v0.1.2, section 7.4 step 8). */
  overlapRule: string;
  note?: string;
  response: RankResponse;
}

/** Recordings in demo picker order. */
export const RANK_RECORDS = [npc1Rank, dmdRank, kabukiRank] as unknown as readonly RecordedRank[];

/** Keyed by demoRankKey(observed, excluded, limit). */
export const RECORDED_RANKINGS: Readonly<Record<string, RecordedRank>> = Object.fromEntries(
  RANK_RECORDS.map((r) => [r.key, r]),
);

/** Keyed by demoRankKey(observed, excluded, candidates.length). Empty until task 1.6. */
export const RECORDED_QUESTIONS: Readonly<Record<string, NextQuestionsResponse>> = {};

/** Keyed by normalised condition name (see normalizeCondition in ./index). Empty until task 1.7. */
export const RECORDED_TRIALS: Readonly<Record<string, TrialsResponse>> = {};
