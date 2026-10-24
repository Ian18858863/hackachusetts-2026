// TEMPORARY fallback demo case for /api/extract (T18c).
//
// Holds ONLY demo-npc1, copied verbatim from docs/CONTRACT.md section 9.1,
// because the engine demo cache (engine/demo/**) does not contain it yet.
// The engine's getDemoCase takes precedence: functions/api/extract.ts uses this
// entry only when getDemoCase("demo-npc1") returns undefined.
// Delete this file when engine/demo has demo-npc1.
//
// DEMO DATA, NOT A REAL PATIENT. Synthetic narrative written by Ian's Kiro on
// 2026-10-24 from the HPO terms of phenopacket-store
// notebooks/NPC1/phenopackets/PMID_27900365_patient.json (BSD-3-Clause).
// The negated Headache (HP:0002315) was added for the demo and is NOT part of
// the source phenopacket. `expectedDiagnosis` is for tests and the benchmark
// only and must never be shown as "the answer".

import type { DemoCase, ExtractedTerm, HpoId } from "../../../engine/index";

/** When this prepared extraction was added to the functions fallback. */
const RECORDED_AT = "2026-10-24T18:01:00.000Z";
const NPC1_SOURCE_ID = "PMID_27900365_patient";

/** Prepared extraction row: grounding "exact-id", confidence "high" (CONTRACT.md 9). */
function term(hpoId: HpoId, label: string, quote: string, start: number, end: number, negated = false): ExtractedTerm {
  return { hpoId, label, quote, start, end, negated, confidence: "high", grounding: "exact-id" };
}

export const DEMO_NPC1: DemoCase = {
  caseId: "demo-npc1",
  title: "Man, 54 years: newborn jaundice, forgetfulness, unsteady walking",
  label: `Demo case (synthetic narrative from phenopacket-store ${NPC1_SOURCE_ID})`,
  sourcePhenopacketId: NPC1_SOURCE_ID,
  narrative:
    "I am a 54-year-old man. My mother says I stayed yellow for a long time as a newborn. Since I was 18 I have become more and more forgetful, I find it hard to concentrate, my speech is slurred, and I fall a lot. In middle age my thinking slowly got worse and my walking became unsteady and clumsy. A doctor noticed that when I flick my eyes upward they stop short. A scan found a large liver and a large spleen. A tissue sample showed cells swollen with fat, and a lab test found my cells are slow to process cholesterol. I do not get headaches.",
  expectedDiagnosis: { id: "OMIM:257220", label: "Niemann-Pick disease, type C1" },
  extraction: [
    term("HP:0006579", "Prolonged neonatal jaundice", "stayed yellow for a long time as a newborn", 41, 83),
    term("HP:0007017", "Progressive forgetfulness", "more and more forgetful", 114, 137),
    term("HP:0031987", "Diminished ability to concentrate", "hard to concentrate", 149, 168),
    term("HP:0001260", "Dysarthria", "my speech is slurred", 170, 190),
    term("HP:0002527", "Falls", "I fall a lot", 196, 208),
    term("HP:0001268", "Mental deterioration", "my thinking slowly got worse", 224, 252),
    term("HP:0001251", "Ataxia", "my walking became unsteady and clumsy", 257, 294),
    term("HP:0031833", "Hypometric upward saccades", "when I flick my eyes upward they stop short", 318, 361),
    term("HP:0002240", "Hepatomegaly", "a large liver", 376, 389),
    term("HP:0001744", "Splenomegaly", "a large spleen", 394, 408),
    term("HP:0003651", "Foam cells", "cells swollen with fat", 433, 455),
    term("HP:0003349", "Low cholesterol esterification rate", "my cells are slow to process cholesterol", 478, 518),
    term("HP:0002315", "Headache", "I do not get headaches", 520, 542, true),
  ],
  recordedAt: RECORDED_AT,
};

/** Fallback demo cases by id (demo-npc1 only). Returns a copy. */
export function getFallbackDemoCase(caseId: string): DemoCase | undefined {
  return caseId === DEMO_NPC1.caseId ? structuredClone(DEMO_NPC1) : undefined;
}
