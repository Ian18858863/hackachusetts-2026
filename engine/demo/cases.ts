// Bundled demo cases (CONTRACT.md section 9). DEMO DATA, NOT REAL PATIENTS.
//
// Provenance: each case is derived from one phenopacket in phenopacket-store
// (https://github.com/monarch-initiative/phenopacket-store, BSD-3-Clause).
// The narratives were written by Ian's Kiro on 2026-10-24 from the HPO terms of
// the named phenopacket and are copied here verbatim from CONTRACT.md 9.1-9.4.
// Some excluded terms of the source were left out to keep the text short.
// The prepared extractions (ids, labels, quotes, offsets) are copied from the
// same tables; engine/test/demo.test.ts re-checks text.slice(start, end) === quote.
//
// Checked by Jerry's Kiro on 2026-10-24 against the raw source phenopackets:
// the observed HPO ids of each case equal the source's observed ids, and each
// negated id below is an excluded feature of the source, except where noted.
//
// `expectedDiagnosis` is the source phenopacket's interpretation. It is for
// the benchmark and tests only and must never be shown as "the answer".
// Titles are deliberately neutral so the demo picker does not reveal it.

import { demoLabel } from "../text";
import type { DemoCase, ExtractedTerm, HpoId } from "../types";

/** When these prepared extractions were assembled into the engine demo cache. */
const PREPARED_AT = "2026-10-24T16:27:00.000Z";

/** Prepared extraction row: grounding "exact-id", confidence "high" (CONTRACT.md 9). */
function term(
  hpoId: HpoId,
  label: string,
  quote: string,
  start: number,
  end: number,
  negated = false,
): ExtractedTerm {
  return { hpoId, label, quote, start, end, negated, confidence: "high", grounding: "exact-id" };
}

// 9.1 Source: notebooks/NPC1/phenopackets/PMID_27900365_patient.json
// (male, 54 years, HPO 2025-11-24). Expected diagnosis OMIM:257220.
// Primary demo case since contract v0.1.1. The source has no excluded terms:
// the negated Headache (HP:0002315) was added for the demo and is NOT part of
// the source phenopacket. Narrative and offsets copied verbatim from CONTRACT.md 9.1.
const NPC1_ID = "PMID_27900365_patient";
const demoNpc1: DemoCase = {
  caseId: "demo-npc1",
  title: "Man, 54 years: forgetfulness, unsteady walking, large liver and spleen",
  label: demoLabel(NPC1_ID),
  sourcePhenopacketId: NPC1_ID,
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
  recordedAt: PREPARED_AT,
};

// 9.2 Source: notebooks/DMD/phenopackets/PMID_38054185_Case_presentation.json
// Kept as a harder case since contract v0.1.1 (Monarch ranks Duchenne low).
// (male, 4 years, HPO 2026-06-23). Expected diagnosis OMIM:310200.
// The source has no excluded terms: the negated Seizure (HP:0001250) was added
// for the demo and is NOT part of the source phenopacket.
const DMD_ID = "PMID_38054185_Case_presentation";
const demoDmd: DemoCase = {
  caseId: "demo-dmd",
  title: "Boy, 4 years: late walking, trouble with stairs, big calves",
  label: demoLabel(DMD_ID),
  sourcePhenopacketId: DMD_ID,
  narrative:
    "Our son is 4. He started walking later than other children. He has trouble climbing stairs, and to get up from the floor he pushes on his knees with his hands. His calves are big and firm. He is often tired, and his legs tire quickly when he plays. A blood test showed a very high CK, and his AST, ALT and LDH were also raised. The doctor saw small twitches in his muscles, and a nerve test gave unusual results. He has never had a seizure.",
  expectedDiagnosis: { id: "OMIM:310200", label: "Duchenne muscular dystrophy" },
  extraction: [
    term("HP:0001270", "Motor delay", "started walking later than other children", 17, 58),
    term("HP:0003551", "Difficulty climbing stairs", "trouble climbing stairs", 67, 90),
    term("HP:0003391", "Gowers sign", "pushes on his knees with his hands", 124, 158),
    term("HP:0003707", "Calf muscle pseudohypertrophy", "His calves are big and firm", 160, 187),
    term("HP:0012378", "Fatigue", "He is often tired", 189, 206),
    term("HP:0003750", "Increased muscle fatiguability", "his legs tire quickly when he plays", 212, 247),
    term("HP:0030235", "Extremely elevated creatine kinase", "a very high CK", 269, 283),
    term("HP:0031956", "Elevated circulating aspartate aminotransferase concentration", "AST", 293, 296),
    term("HP:0031964", "Elevated circulating alanine aminotransferase concentration", "ALT", 298, 301),
    term("HP:0025435", "Increased circulating lactate dehydrogenase concentration", "LDH", 306, 309),
    term("HP:0002380", "Fasciculations", "small twitches in his muscles", 343, 372),
    term("HP:0040129", "Abnormal nerve conduction velocity", "a nerve test gave unusual results", 378, 411),
    term("HP:0001250", "Seizure", "never had a seizure", 420, 439, true),
  ],
  recordedAt: PREPARED_AT,
};

// 9.3 Source: notebooks/FBN1/phenopackets/PMID_10756346_Patient_B55.json
// (male, 40 years, HPO 2025-10-22). Expected diagnosis OMIM:154700.
const MARFAN_ID = "PMID_10756346_Patient_B55";
const demoMarfan: DemoCase = {
  caseId: "demo-marfan",
  title: "Man, 40 years: long fingers, eye lens problem, aorta tear",
  label: demoLabel(MARFAN_ID),
  sourcePhenopacketId: MARFAN_ID,
  narrative:
    "My brother is 40. He has always had very long, thin fingers, and his dentist says he has a high palate. He has stretch marks on his back and shoulders although his weight has not changed. Years ago an eye doctor found that the lens in his left eye had shifted out of place. His head is long and narrow, his lower jaw sits far back, and his eyes look deep-set. Last year he was rushed to hospital with a tear in the aorta in his chest, and the scans also showed a bulge in the descending part of the aorta. He has never had a collapsed lung and his spine is straight.",
  expectedDiagnosis: { id: "OMIM:154700", label: "Marfan syndrome" },
  extraction: [
    term("HP:0001166", "Arachnodactyly", "very long, thin fingers", 36, 59),
    term("HP:0000218", "High palate", "high palate", 91, 102),
    term("HP:0001065", "Striae distensae", "stretch marks", 111, 124),
    term("HP:0001083", "Ectopia lentis", "the lens in his left eye had shifted out of place", 223, 272),
    term("HP:0000268", "Dolichocephaly", "His head is long and narrow", 274, 301),
    term("HP:0000278", "Retrognathia", "his lower jaw sits far back", 303, 330),
    term("HP:0000490", "Deeply set eye", "his eyes look deep-set", 336, 358),
    term("HP:0012499", "Descending aortic dissection", "a tear in the aorta in his chest", 401, 433),
    term("HP:0004959", "Descending thoracic aorta aneurysm", "a bulge in the descending part of the aorta", 461, 504),
    term("HP:0002107", "Pneumothorax", "never had a collapsed lung", 513, 539, true),
    term("HP:0002650", "Scoliosis", "his spine is straight", 544, 565, true),
  ],
  recordedAt: PREPARED_AT,
};

// 9.4 Source: notebooks/KMT2D/phenopackets/PMID_24739679_patient_K1.json
// (male, 11 months, HPO 2025-11-24). Expected diagnosis OMIM:147920.
const KABUKI_ID = "PMID_24739679_patient_K1";
const demoKabuki: DemoCase = {
  caseId: "demo-kabuki",
  title: "Baby boy, 11 months: floppy, slow development, facial features",
  label: demoLabel(KABUKI_ID),
  sourcePhenopacketId: KABUKI_ID,
  narrative:
    "Our son is 11 months old. He has been floppy since birth and is behind on sitting and babbling. He is short for his age. His eye openings are long and the outer part of his lower eyelids turns outward. His eyebrows are highly arched and thin at the outer ends. He has a wide nasal bridge and a nose tip that sits low, the whites of his eyes look bluish, and his ears are large. The pads on his fingertips stick out and his fingers curve sideways. A heart scan found an unusual vein draining the right lung. He has not had any seizures, and his hearing test was normal.",
  expectedDiagnosis: { id: "OMIM:147920", label: "Kabuki syndrome 1" },
  extraction: [
    term("HP:0001252", "Hypotonia", "floppy since birth", 38, 56),
    term("HP:0001263", "Global developmental delay", "behind on sitting and babbling", 64, 94),
    term("HP:0004322", "Short stature", "short for his age", 102, 119),
    term("HP:0000637", "Long palpebral fissure", "His eye openings are long", 121, 146),
    term("HP:0007655", "Eversion of lateral third of lower eyelids", "the outer part of his lower eyelids turns outward", 151, 200),
    term("HP:0002553", "Highly arched eyebrow", "His eyebrows are highly arched", 202, 232),
    term("HP:0005338", "Sparse lateral eyebrow", "thin at the outer ends", 237, 259),
    term("HP:0000431", "Wide nasal bridge", "a wide nasal bridge", 268, 287),
    term("HP:0000437", "Depressed nasal tip", "a nose tip that sits low", 292, 316),
    term("HP:0000592", "Blue sclerae", "the whites of his eyes look bluish", 318, 352),
    term("HP:0000400", "Macrotia", "his ears are large", 358, 376),
    term("HP:0001212", "Prominent fingertip pads", "The pads on his fingertips stick out", 378, 414),
    term("HP:0040019", "Finger clinodactyly", "his fingers curve sideways", 419, 445),
    term("HP:0011626", "Scimitar anomaly", "an unusual vein draining the right lung", 466, 505),
    term("HP:0001250", "Seizure", "has not had any seizures", 510, 534, true),
    term("HP:0000365", "Hearing impairment", "his hearing test was normal", 540, 567, true),
  ],
  recordedAt: PREPARED_AT,
};

// 9.5 Source: notebooks/NIPBL/phenopackets/PMID_20358602_Patient_C10.json
// (male, 6 years, HPO 2025-10-22). Expected diagnosis OMIM:122470.
const CDLS_ID = "PMID_20358602_Patient_C10";
const demoCdls: DemoCase = {
  caseId: "demo-cdls",
  title: "Boy, 6 years: slow growth, late milestones, body hair",
  label: demoLabel(CDLS_ID),
  sourcePhenopacketId: CDLS_ID,
  narrative:
    "Our son is 6. He was small before birth and has kept growing slowly since. He walked and talked late, and he has an intellectual disability. He has a lot of body hair, especially on his back and arms. One testicle had not come down at birth. Two of his toes are joined together and his fingers are short. His doctor hears a heart murmur. He has never had a seizure, and he has no trouble feeding.",
  expectedDiagnosis: { id: "OMIM:122470", label: "Cornelia de Lange syndrome 1" },
  extraction: [
    term("HP:0001511", "Intrauterine growth retardation", "small before birth", 21, 39),
    term("HP:0008897", "Postnatal growth retardation", "growing slowly", 53, 67),
    term("HP:0001263", "Global developmental delay", "walked and talked late", 78, 100),
    term("HP:0001249", "Intellectual disability", "intellectual disability", 116, 139),
    term("HP:0001007", "Hirsutism", "a lot of body hair", 148, 166),
    term("HP:0000028", "Cryptorchidism", "One testicle had not come down", 201, 231),
    term("HP:0001159", "Syndactyly", "Two of his toes are joined together", 242, 277),
    term("HP:0001156", "Brachydactyly", "his fingers are short", 282, 303),
    term("HP:0030148", "Heart murmur", "heart murmur", 324, 336),
    term("HP:0001250", "Seizure", "never had a seizure", 345, 364, true),
    term("HP:0011968", "Feeding difficulties", "no trouble feeding", 377, 395, true),
  ],
  recordedAt: PREPARED_AT,
};

/** Demo picker order (CONTRACT.md 9, v0.1.1): demo-npc1 first, then demo-dmd. */
export const DEMO_CASES: readonly DemoCase[] = [demoNpc1, demoDmd, demoMarfan, demoKabuki, demoCdls];

/** Source details for attribution and tests. Not part of the contract types. */
export const DEMO_SOURCES: Readonly<
  Record<string, { path: string; licence: "BSD-3-Clause"; sourceHpoVersion: string; addedNegations: HpoId[] }>
> = {
  "demo-npc1": {
    path: "notebooks/NPC1/phenopackets/PMID_27900365_patient.json",
    licence: "BSD-3-Clause",
    sourceHpoVersion: "2025-11-24",
    addedNegations: ["HP:0002315"],
  },
  "demo-dmd": {
    path: "notebooks/DMD/phenopackets/PMID_38054185_Case_presentation.json",
    licence: "BSD-3-Clause",
    sourceHpoVersion: "2026-06-23",
    addedNegations: ["HP:0001250"],
  },
  "demo-marfan": {
    path: "notebooks/FBN1/phenopackets/PMID_10756346_Patient_B55.json",
    licence: "BSD-3-Clause",
    sourceHpoVersion: "2025-10-22",
    addedNegations: [],
  },
  "demo-kabuki": {
    path: "notebooks/KMT2D/phenopackets/PMID_24739679_patient_K1.json",
    licence: "BSD-3-Clause",
    sourceHpoVersion: "2025-11-24",
    addedNegations: [],
  },
  "demo-cdls": {
    path: "notebooks/NIPBL/phenopackets/PMID_20358602_Patient_C10.json",
    licence: "BSD-3-Clause",
    sourceHpoVersion: "2025-10-22",
    addedNegations: [],
  },
};
