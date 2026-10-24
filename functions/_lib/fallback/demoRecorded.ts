// TEMPORARY recorded demo cache for demo-npc1 (T18e), Ian-owned fallback layer.
// Since T18q it also holds one /api/rank recording each for demo-marfan and
// demo-cdls (recorded 2026-10-24T20:00Z UTC from production, engine path),
// because the engine records rankings only for demo-npc1, demo-dmd and
// demo-kabuki and a Monarch timeout otherwise returned 504 for those two.
//
// One real /api/rank response for the exact demo-npc1 term set of
// docs/CONTRACT.md section 9.1 (12 observed ids, excluded HP:0002315, limit 5),
// the matching /api/next-questions response for its top 5 candidates, and the
// /api/trials response for its top candidate's condition. Re-recorded by Ian's
// Kiro (T18l) at 2026-10-24T19:20Z UTC from production
// https://hackachusetts-2026.pages.dev (commit 6c89a84; /api/rank answered with
// X-RDD-Path: engine, /api/next-questions and /api/trials with X-RDD-Path:
// fallback), all 200 with source "live". The bodies are pasted unchanged; each
// keeps its original `dataVersions` and `fetchedAt` (the rank and trials
// bodies were Workers cache hits, so their fetchedAt is slightly earlier).
//
// Used ONLY when the live upstream path fails (timeout or 5xx) AND the request
// is exactly the recorded one (same key rule as the engine's demoRankKey:
// sorted, deduplicated observed | excluded | limit; next-questions also needs
// the same candidate ids; trials the same normalised condition). The handlers
// then answer with source "demo" and dataVersions.demoCache (asDemoPayload).
// The engine's getDemoRanking / getDemoQuestions / getDemoTrials take
// precedence; delete this file when engine/demo records demo-npc1.
//
// DEMO DATA, NOT A REAL PATIENT. The term set comes from the synthetic
// narrative derived from phenopacket-store PMID_27900365_patient (BSD-3-Clause).

import { demoRankKey } from "../../../engine/index";
import type { DiseaseId, HpoId, NextQuestionsResponse, RankResponse, TrialsResponse } from "../../../engine/index";

/** demo-npc1 observed ids (CONTRACT.md 9.1), sorted. */
export const NPC1_OBSERVED: readonly HpoId[] = ["HP:0001251","HP:0001260","HP:0001268","HP:0001744","HP:0002240","HP:0002527","HP:0003349","HP:0003651","HP:0006579","HP:0007017","HP:0031833","HP:0031987"];
/** demo-npc1 excluded ids (Headache, added for the demo). */
export const NPC1_EXCLUDED: readonly HpoId[] = ["HP:0002315"];
const NPC1_LIMIT = 5;
/**
 * Top 5 candidates of the recorded ranking, in rank order: exactly what the app
 * sends to /api/next-questions (LIMITS.questionsCandidatesMax = 5).
 */
const NPC1_QUESTION_CANDIDATES: readonly DiseaseId[] = ["OMIM:257220","ORPHA:2274","OMIM:607625","ORPHA:480556","ORPHA:33574"];
/** Condition of the recorded ranking's top candidate (its name, as the app sends it). */
const NPC1_TRIALS_CONDITION = "Niemann-Pick disease, type C1";

const RANK_KEY = demoRankKey([...NPC1_OBSERVED], [...NPC1_EXCLUDED], NPC1_LIMIT);

/** Recorded POST /api/rank response (source "live" as recorded; engine path; recorded at 2026-10-24T19:20Z UTC). */
const RECORDED_RANK: RankResponse = {
  "version": "0.1",
  "source": "live",
  "candidates": [
    {
      "rank": 1,
      "diseaseId": "OMIM:257220",
      "mondoId": "MONDO:0009757",
      "name": "Niemann-Pick disease, type C1",
      "overlap": "strong",
      "score": 13.768556970635798,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0001251",
            "label": "Ataxia"
          },
          "diseaseTerm": {
            "id": "HP:0001251",
            "label": "Ataxia"
          },
          "via": "exact",
          "frequency": {
            "label": null,
            "source": "OMIM:257220"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001260",
            "label": "Dysarthria"
          },
          "diseaseTerm": {
            "id": "HP:0001260",
            "label": "Dysarthria"
          },
          "via": "exact",
          "frequency": {
            "label": null,
            "source": "OMIM:257220"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001268",
            "label": "Mental deterioration"
          },
          "diseaseTerm": {
            "id": "HP:0000726",
            "label": "Dementia"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:257220"
          },
          "ancestor": {
            "id": "HP:0001268",
            "label": "Mental deterioration"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001744",
            "label": "Splenomegaly"
          },
          "diseaseTerm": {
            "id": "HP:0001744",
            "label": "Splenomegaly"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:257220",
            "raw": "4/13"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0002240",
            "label": "Hepatomegaly"
          },
          "diseaseTerm": {
            "id": "HP:0002240",
            "label": "Hepatomegaly"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:257220",
            "raw": "7/13"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0002527",
            "label": "Falls"
          },
          "diseaseTerm": {
            "id": "HP:0002066",
            "label": "Gait ataxia"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:257220",
            "raw": "4/4"
          },
          "ancestor": {
            "id": "HP:0001288",
            "label": "Gait disturbance"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0003349",
            "label": "Low cholesterol esterification rate"
          },
          "diseaseTerm": {
            "id": "HP:0003349",
            "label": "Low cholesterol esterification rate"
          },
          "via": "exact",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:257220",
            "raw": "13/13"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0003651",
            "label": "Foam cells"
          },
          "diseaseTerm": {
            "id": "HP:0003640",
            "label": "CNS foam cells"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:257220"
          },
          "ancestor": {
            "id": "HP:0003651",
            "label": "Foam cells"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0006579",
            "label": "Prolonged neonatal jaundice"
          },
          "diseaseTerm": {
            "id": "HP:0006579",
            "label": "Prolonged neonatal jaundice"
          },
          "via": "exact",
          "frequency": {
            "label": null,
            "source": "OMIM:257220"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0007017",
            "label": "Progressive forgetfulness"
          },
          "diseaseTerm": {
            "id": "HP:0000726",
            "label": "Dementia"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:257220"
          },
          "ancestor": {
            "id": "HP:0100543",
            "label": "Cognitive impairment"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0031833",
            "label": "Hypometric upward saccades"
          },
          "diseaseTerm": {
            "id": "HP:0000511",
            "label": "Vertical supranuclear gaze palsy"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:257220"
          },
          "ancestor": {
            "id": "HP:0000496",
            "label": "Abnormality of eye movement"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0031987",
            "label": "Diminished ability to concentrate"
          },
          "diseaseTerm": {
            "id": "HP:0000726",
            "label": "Dementia"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:257220"
          },
          "ancestor": {
            "id": "HP:0100543",
            "label": "Cognitive impairment"
          }
        }
      ],
      "unmatched": [],
      "notReported": [
        {
          "term": {
            "id": "HP:0001249",
            "label": "Intellectual disability"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:257220",
            "raw": "4/4"
          }
        },
        {
          "term": {
            "id": "HP:0001982",
            "label": "Sea-blue histiocytosis"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:257220",
            "raw": "4/4"
          }
        },
        {
          "term": {
            "id": "HP:0001250",
            "label": "Seizure"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "OMIM:257220",
            "raw": "12/14"
          }
        },
        {
          "term": {
            "id": "HP:0003621",
            "label": "Juvenile onset"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:257220",
            "raw": "3/4"
          }
        }
      ],
      "contradicted": [],
      "categories": [
        "Blood and blood-forming tissues",
        "Cardiovascular",
        "Cellular phenotype",
        "Clinical course",
        "Digestive System",
        "Eye",
        "Inheritance",
        "Metabolism/Laboratory abnormality",
        "Musculature",
        "Nervous System",
        "Prenatal and Birth"
      ],
      "genes": [
        {
          "id": "NCBIGene:4864",
          "symbol": "NPC1"
        }
      ],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0009757",
        "omim": "https://omim.org/entry/257220"
      },
      "sources": [
        "monarch-semsim",
        "hpo-annotations"
      ]
    },
    {
      "rank": 2,
      "diseaseId": "ORPHA:2274",
      "mondoId": "MONDO:0009445",
      "name": "Ichthyosis-hepatosplenomegaly-cerebellar degeneration syndrome",
      "overlap": "partial",
      "score": 13.60032992185091,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0001251",
            "label": "Ataxia"
          },
          "diseaseTerm": {
            "id": "HP:0001251",
            "label": "Ataxia"
          },
          "via": "exact",
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:2274"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001260",
            "label": "Dysarthria"
          },
          "diseaseTerm": {
            "id": "HP:0001260",
            "label": "Dysarthria"
          },
          "via": "exact",
          "frequency": {
            "label": null,
            "source": "OMIM:242520"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001268",
            "label": "Mental deterioration"
          },
          "diseaseTerm": {
            "id": "HP:0000726",
            "label": "Dementia"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:2274"
          },
          "ancestor": {
            "id": "HP:0001268",
            "label": "Mental deterioration"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001744",
            "label": "Splenomegaly"
          },
          "diseaseTerm": {
            "id": "HP:0001433",
            "label": "Hepatosplenomegaly"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:242520"
          },
          "ancestor": {
            "id": "HP:0001744",
            "label": "Splenomegaly"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0002240",
            "label": "Hepatomegaly"
          },
          "diseaseTerm": {
            "id": "HP:0001433",
            "label": "Hepatosplenomegaly"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:242520"
          },
          "ancestor": {
            "id": "HP:0002240",
            "label": "Hepatomegaly"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0002527",
            "label": "Falls"
          },
          "diseaseTerm": {
            "id": "HP:0001288",
            "label": "Gait disturbance"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:2274"
          },
          "ancestor": {
            "id": "HP:0001288",
            "label": "Gait disturbance"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0003651",
            "label": "Foam cells"
          },
          "diseaseTerm": {
            "id": "HP:0001433",
            "label": "Hepatosplenomegaly"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:242520"
          },
          "ancestor": {
            "id": "HP:0002597",
            "label": "Abnormality of the vasculature"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0006579",
            "label": "Prolonged neonatal jaundice"
          },
          "diseaseTerm": {
            "id": "HP:0001433",
            "label": "Hepatosplenomegaly"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:242520"
          },
          "ancestor": {
            "id": "HP:0001392",
            "label": "Abnormality of the liver"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0007017",
            "label": "Progressive forgetfulness"
          },
          "diseaseTerm": {
            "id": "HP:0000726",
            "label": "Dementia"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:2274"
          },
          "ancestor": {
            "id": "HP:0100543",
            "label": "Cognitive impairment"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0031987",
            "label": "Diminished ability to concentrate"
          },
          "diseaseTerm": {
            "id": "HP:0000726",
            "label": "Dementia"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:2274"
          },
          "ancestor": {
            "id": "HP:0100543",
            "label": "Cognitive impairment"
          }
        }
      ],
      "unmatched": [
        {
          "id": "HP:0003349",
          "label": "Low cholesterol esterification rate"
        },
        {
          "id": "HP:0031833",
          "label": "Hypometric upward saccades"
        }
      ],
      "notReported": [
        {
          "term": {
            "id": "HP:0001265",
            "label": "Hyporeflexia"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:2274"
          }
        },
        {
          "term": {
            "id": "HP:0002167",
            "label": "Abnormal speech pattern"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:2274"
          }
        },
        {
          "term": {
            "id": "HP:0008064",
            "label": "Ichthyosis"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:2274"
          }
        }
      ],
      "contradicted": [],
      "categories": [
        "Cardiovascular",
        "Digestive System",
        "Inheritance",
        "Nervous System",
        "Skin, Hair, and Nails"
      ],
      "genes": [],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0009445",
        "orphanet": "https://www.orpha.net/en/disease/detail/2274",
        "omim": "https://omim.org/entry/242520"
      },
      "sources": [
        "monarch-semsim",
        "hpo-annotations",
        "orphadata"
      ]
    },
    {
      "rank": 3,
      "diseaseId": "OMIM:607625",
      "mondoId": "MONDO:0011873",
      "name": "Niemann-Pick disease, type C2",
      "overlap": "strong",
      "score": 13.513454282927398,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0001251",
            "label": "Ataxia"
          },
          "diseaseTerm": {
            "id": "HP:0001251",
            "label": "Ataxia"
          },
          "via": "exact",
          "frequency": {
            "label": null,
            "source": "OMIM:607625"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001260",
            "label": "Dysarthria"
          },
          "diseaseTerm": {
            "id": "HP:0001260",
            "label": "Dysarthria"
          },
          "via": "exact",
          "frequency": {
            "label": null,
            "source": "OMIM:607625"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001268",
            "label": "Mental deterioration"
          },
          "diseaseTerm": {
            "id": "HP:0000726",
            "label": "Dementia"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:607625"
          },
          "ancestor": {
            "id": "HP:0001268",
            "label": "Mental deterioration"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001744",
            "label": "Splenomegaly"
          },
          "diseaseTerm": {
            "id": "HP:0001744",
            "label": "Splenomegaly"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:607625",
            "raw": "5/8"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0002240",
            "label": "Hepatomegaly"
          },
          "diseaseTerm": {
            "id": "HP:0002240",
            "label": "Hepatomegaly"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:607625",
            "raw": "5/8"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0002527",
            "label": "Falls"
          },
          "diseaseTerm": {
            "id": "HP:0001332",
            "label": "Dystonia"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:607625"
          },
          "ancestor": {
            "id": "HP:0100022",
            "label": "Abnormality of movement"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0003349",
            "label": "Low cholesterol esterification rate"
          },
          "diseaseTerm": {
            "id": "HP:0003349",
            "label": "Low cholesterol esterification rate"
          },
          "via": "exact",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:607625",
            "raw": "8/8"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0003651",
            "label": "Foam cells"
          },
          "diseaseTerm": {
            "id": "HP:0003640",
            "label": "CNS foam cells"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:607625"
          },
          "ancestor": {
            "id": "HP:0003651",
            "label": "Foam cells"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0006579",
            "label": "Prolonged neonatal jaundice"
          },
          "diseaseTerm": {
            "id": "HP:0006579",
            "label": "Prolonged neonatal jaundice"
          },
          "via": "exact",
          "frequency": {
            "label": null,
            "source": "OMIM:607625"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0007017",
            "label": "Progressive forgetfulness"
          },
          "diseaseTerm": {
            "id": "HP:0000726",
            "label": "Dementia"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:607625"
          },
          "ancestor": {
            "id": "HP:0100543",
            "label": "Cognitive impairment"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0031833",
            "label": "Hypometric upward saccades"
          },
          "diseaseTerm": {
            "id": "HP:0000511",
            "label": "Vertical supranuclear gaze palsy"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:607625"
          },
          "ancestor": {
            "id": "HP:0000496",
            "label": "Abnormality of eye movement"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0031987",
            "label": "Diminished ability to concentrate"
          },
          "diseaseTerm": {
            "id": "HP:0030223",
            "label": "Perseverative thought"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:607625"
          },
          "ancestor": {
            "id": "HP:0025769",
            "label": "Disordered formal thought process"
          }
        }
      ],
      "unmatched": [],
      "notReported": [
        {
          "term": {
            "id": "HP:0002206",
            "label": "Pulmonary fibrosis"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:607625",
            "raw": "1/1"
          }
        },
        {
          "term": {
            "id": "HP:0002093",
            "label": "Respiratory insufficiency"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "OMIM:607625",
            "raw": "7/8"
          }
        },
        {
          "term": {
            "id": "HP:0000952",
            "label": "Jaundice"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:607625",
            "raw": "5/8"
          }
        },
        {
          "term": {
            "id": "HP:0001522",
            "label": "Death in infancy"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:607625",
            "raw": "4/8"
          }
        },
        {
          "term": {
            "id": "HP:0003623",
            "label": "Neonatal onset"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:607625",
            "raw": "6/8"
          }
        }
      ],
      "contradicted": [],
      "categories": [
        "Blood and blood-forming tissues",
        "Cardiovascular",
        "Clinical course",
        "Digestive System",
        "Eye",
        "Inheritance",
        "Metabolism/Laboratory abnormality",
        "Musculature",
        "Nervous System",
        "Prenatal and Birth",
        "Respiratory System"
      ],
      "genes": [
        {
          "id": "NCBIGene:10577",
          "symbol": "NPC2"
        }
      ],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0011873",
        "omim": "https://omim.org/entry/607625"
      },
      "sources": [
        "monarch-semsim",
        "hpo-annotations"
      ]
    },
    {
      "rank": 4,
      "diseaseId": "ORPHA:480556",
      "mondoId": "MONDO:0018816",
      "name": "Isolated neonatal sclerosing cholangitis",
      "overlap": "partial",
      "score": 12.105663557182051,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0001260",
            "label": "Dysarthria"
          },
          "diseaseTerm": {
            "id": "HP:0001256",
            "label": "Mild intellectual disability"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "OMIM:617394",
            "raw": "1/4"
          },
          "ancestor": {
            "id": "HP:0011446",
            "label": "Abnormality of mental function"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001268",
            "label": "Mental deterioration"
          },
          "diseaseTerm": {
            "id": "HP:0001256",
            "label": "Mild intellectual disability"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "OMIM:617394",
            "raw": "1/4"
          },
          "ancestor": {
            "id": "HP:0011446",
            "label": "Abnormality of mental function"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001744",
            "label": "Splenomegaly"
          },
          "diseaseTerm": {
            "id": "HP:0001744",
            "label": "Splenomegaly"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:617394",
            "raw": "5/7"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0002240",
            "label": "Hepatomegaly"
          },
          "diseaseTerm": {
            "id": "HP:0002240",
            "label": "Hepatomegaly"
          },
          "via": "exact",
          "frequency": {
            "label": "Occasional",
            "source": "OMIM:617394",
            "raw": "1/7"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0003349",
            "label": "Low cholesterol esterification rate"
          },
          "diseaseTerm": {
            "id": "HP:0030948",
            "label": "Elevated gamma-glutamyltransferase level"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:617394",
            "raw": "7/7"
          },
          "ancestor": {
            "id": "HP:0012379",
            "label": "Abnormal circulating enzyme concentration or activity"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0003651",
            "label": "Foam cells"
          },
          "diseaseTerm": {
            "id": "HP:0001409",
            "label": "Portal hypertension"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:617394",
            "raw": "4/4"
          },
          "ancestor": {
            "id": "HP:0002597",
            "label": "Abnormality of the vasculature"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0006579",
            "label": "Prolonged neonatal jaundice"
          },
          "diseaseTerm": {
            "id": "HP:0000952",
            "label": "Jaundice"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:617394",
            "raw": "7/7"
          },
          "ancestor": {
            "id": "HP:0000952",
            "label": "Jaundice"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0007017",
            "label": "Progressive forgetfulness"
          },
          "diseaseTerm": {
            "id": "HP:0001256",
            "label": "Mild intellectual disability"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "OMIM:617394",
            "raw": "1/4"
          },
          "ancestor": {
            "id": "HP:0011446",
            "label": "Abnormality of mental function"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0031987",
            "label": "Diminished ability to concentrate"
          },
          "diseaseTerm": {
            "id": "HP:0001256",
            "label": "Mild intellectual disability"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "OMIM:617394",
            "raw": "1/4"
          },
          "ancestor": {
            "id": "HP:0011446",
            "label": "Abnormality of mental function"
          }
        }
      ],
      "unmatched": [
        {
          "id": "HP:0001251",
          "label": "Ataxia"
        },
        {
          "id": "HP:0002527",
          "label": "Falls"
        },
        {
          "id": "HP:0031833",
          "label": "Hypometric upward saccades"
        }
      ],
      "notReported": [
        {
          "term": {
            "id": "HP:0001396",
            "label": "Cholestasis"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:617394",
            "raw": "4/4"
          }
        },
        {
          "term": {
            "id": "HP:0001399",
            "label": "Hepatic failure"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:617394",
            "raw": "4/4"
          }
        },
        {
          "term": {
            "id": "HP:0006580",
            "label": "Portal fibrosis"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:617394",
            "raw": "4/4"
          }
        },
        {
          "term": {
            "id": "HP:0030991",
            "label": "Sclerosing cholangitis"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:617394",
            "raw": "4/4"
          }
        },
        {
          "term": {
            "id": "HP:0000989",
            "label": "Pruritus"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:617394",
            "raw": "5/7"
          }
        },
        {
          "term": {
            "id": "HP:0001394",
            "label": "Cirrhosis"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:617394",
            "raw": "3/4"
          }
        },
        {
          "term": {
            "id": "HP:0001408",
            "label": "Bile duct proliferation"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:617394",
            "raw": "6/11"
          }
        },
        {
          "term": {
            "id": "HP:0003593",
            "label": "Infantile onset"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:617394",
            "raw": "5/7"
          }
        }
      ],
      "contradicted": [],
      "categories": [
        "Cardiovascular",
        "Clinical course",
        "Digestive System",
        "Ear",
        "Genitourinary system",
        "Inheritance",
        "Metabolism/Laboratory abnormality",
        "Nervous System",
        "Skin, Hair, and Nails"
      ],
      "genes": [
        {
          "id": "NCBIGene:51473",
          "symbol": "DCDC2"
        }
      ],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0018816",
        "orphanet": "https://www.orpha.net/en/disease/detail/480556",
        "omim": "https://omim.org/entry/617394"
      },
      "sources": [
        "monarch-semsim",
        "hpo-annotations",
        "orphadata"
      ]
    },
    {
      "rank": 5,
      "diseaseId": "ORPHA:33574",
      "mondoId": "MONDO:0009259",
      "name": "Glutamate-cysteine ligase deficiency",
      "overlap": "partial",
      "score": 11.585167464171132,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0001251",
            "label": "Ataxia"
          },
          "diseaseTerm": {
            "id": "HP:0001251",
            "label": "Ataxia"
          },
          "via": "exact",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:33574"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001260",
            "label": "Dysarthria"
          },
          "diseaseTerm": {
            "id": "HP:0001260",
            "label": "Dysarthria"
          },
          "via": "exact",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:33574"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001268",
            "label": "Mental deterioration"
          },
          "diseaseTerm": {
            "id": "HP:0000709",
            "label": "Psychosis"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:33574"
          },
          "ancestor": {
            "id": "HP:0011446",
            "label": "Abnormality of mental function"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001744",
            "label": "Splenomegaly"
          },
          "diseaseTerm": {
            "id": "HP:0001433",
            "label": "Hepatosplenomegaly"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:33574"
          },
          "ancestor": {
            "id": "HP:0001744",
            "label": "Splenomegaly"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0002240",
            "label": "Hepatomegaly"
          },
          "diseaseTerm": {
            "id": "HP:0001433",
            "label": "Hepatosplenomegaly"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:33574"
          },
          "ancestor": {
            "id": "HP:0002240",
            "label": "Hepatomegaly"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0002527",
            "label": "Falls"
          },
          "diseaseTerm": {
            "id": "HP:0001347",
            "label": "Hyperreflexia"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:33574"
          },
          "ancestor": {
            "id": "HP:0100022",
            "label": "Abnormality of movement"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0003349",
            "label": "Low cholesterol esterification rate"
          },
          "diseaseTerm": {
            "id": "HP:0025435",
            "label": "Increased circulating lactate dehydrogenase concentration"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:230450",
            "raw": "1/1"
          },
          "ancestor": {
            "id": "HP:0012379",
            "label": "Abnormal circulating enzyme concentration or activity"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0006579",
            "label": "Prolonged neonatal jaundice"
          },
          "diseaseTerm": {
            "id": "HP:0000952",
            "label": "Jaundice"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:33574"
          },
          "ancestor": {
            "id": "HP:0000952",
            "label": "Jaundice"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0007017",
            "label": "Progressive forgetfulness"
          },
          "diseaseTerm": {
            "id": "HP:0000709",
            "label": "Psychosis"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:33574"
          },
          "ancestor": {
            "id": "HP:0011446",
            "label": "Abnormality of mental function"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0031987",
            "label": "Diminished ability to concentrate"
          },
          "diseaseTerm": {
            "id": "HP:0001260",
            "label": "Dysarthria"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:33574"
          },
          "ancestor": {
            "id": "HP:0025792",
            "label": "Abnormal cognitive process"
          }
        }
      ],
      "unmatched": [
        {
          "id": "HP:0003651",
          "label": "Foam cells"
        },
        {
          "id": "HP:0031833",
          "label": "Hypometric upward saccades"
        }
      ],
      "notReported": [
        {
          "term": {
            "id": "HP:0000007",
            "label": "Autosomal recessive inheritance"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:230450",
            "raw": "1/1"
          }
        },
        {
          "term": {
            "id": "HP:0001878",
            "label": "Hemolytic anemia"
          },
          "frequency": {
            "label": "Obligate",
            "source": "ORPHA:33574"
          }
        },
        {
          "term": {
            "id": "HP:6000132",
            "label": "Reduced erythrocyte gamma-glutamyl cysteine synthetase activity"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:230450",
            "raw": "3/3"
          }
        },
        {
          "term": {
            "id": "HP:0002503",
            "label": "Spinocerebellar tract degeneration"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:33574"
          }
        },
        {
          "term": {
            "id": "HP:0003198",
            "label": "Myopathy"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:33574"
          }
        },
        {
          "term": {
            "id": "HP:0003355",
            "label": "Aminoaciduria"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:33574"
          }
        },
        {
          "term": {
            "id": "HP:0009830",
            "label": "Peripheral neuropathy"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:33574"
          }
        }
      ],
      "contradicted": [],
      "categories": [
        "Blood and blood-forming tissues",
        "Cardiovascular",
        "Digestive System",
        "Inheritance",
        "Metabolism/Laboratory abnormality",
        "Musculature",
        "Nervous System"
      ],
      "genes": [
        {
          "id": "NCBIGene:2729",
          "symbol": "GCLC"
        }
      ],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0009259",
        "orphanet": "https://www.orpha.net/en/disease/detail/33574",
        "omim": "https://omim.org/entry/230450"
      },
      "sources": [
        "monarch-semsim",
        "hpo-annotations",
        "orphadata"
      ]
    }
  ],
  "dataVersions": {
    "hpo": "2026-09-01",
    "monarch": "v3 API",
    "fetchedAt": "2026-10-24T19:17:17.534Z",
    "orphanet": "2026-06-23"
  }
};

/** Recorded POST /api/next-questions response for NPC1_QUESTION_CANDIDATES (the five candidates the app sends, limit 5; recorded at 2026-10-24T19:57Z UTC from the T18o fallback). */
// Typed by assertion: the live answer carries the additive `noAnnotationData` field (see questions.ts).
const RECORDED_QUESTIONS = {
  "version": "0.1",
  "source": "live",
  "questions": [
    {
      "hpoId": "HP:0001249",
      "label": "Intellectual disability",
      "question": "Has anyone noticed intellectual disability?",
      "discriminates": [
        {
          "diseaseId": "OMIM:257220",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:257220",
            "raw": "4/4"
          }
        },
        {
          "diseaseId": "ORPHA:2274",
          "frequency": null
        },
        {
          "diseaseId": "OMIM:607625",
          "frequency": {
            "label": null,
            "source": "OMIM:607625"
          }
        },
        {
          "diseaseId": "ORPHA:480556",
          "frequency": null,
          "noAnnotationData": true
        },
        {
          "diseaseId": "ORPHA:33574",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:33574"
          }
        }
      ],
      "why": "Obligate (4/4) in Niemann-pick disease, type C1; not listed for Ichthyosis-hepatosplenomegaly-cerebellar degeneration syndrome; listed without a frequency for Niemann-pick disease, type C2; Occasional in Glutamate-cysteine ligase deficiency",
      "score": 1
    },
    {
      "hpoId": "HP:0001878",
      "label": "Hemolytic anemia",
      "question": "Has anyone noticed hemolytic anemia?",
      "discriminates": [
        {
          "diseaseId": "OMIM:257220",
          "frequency": null
        },
        {
          "diseaseId": "ORPHA:2274",
          "frequency": null
        },
        {
          "diseaseId": "OMIM:607625",
          "frequency": null
        },
        {
          "diseaseId": "ORPHA:480556",
          "frequency": null,
          "noAnnotationData": true
        },
        {
          "diseaseId": "ORPHA:33574",
          "frequency": {
            "label": "Obligate",
            "source": "ORPHA:33574"
          }
        }
      ],
      "why": "Not listed for Niemann-pick disease, type C1; not listed for Ichthyosis-hepatosplenomegaly-cerebellar degeneration syndrome; not listed for Niemann-pick disease, type C2; Obligate in Glutamate-cysteine ligase deficiency",
      "score": 1
    },
    {
      "hpoId": "HP:0001982",
      "label": "Sea-blue histiocytosis",
      "question": "Has anyone noticed sea-blue histiocytosis?",
      "discriminates": [
        {
          "diseaseId": "OMIM:257220",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:257220",
            "raw": "4/4"
          }
        },
        {
          "diseaseId": "ORPHA:2274",
          "frequency": null
        },
        {
          "diseaseId": "OMIM:607625",
          "frequency": {
            "label": null,
            "source": "OMIM:607625"
          }
        },
        {
          "diseaseId": "ORPHA:480556",
          "frequency": null,
          "noAnnotationData": true
        },
        {
          "diseaseId": "ORPHA:33574",
          "frequency": null
        }
      ],
      "why": "Obligate (4/4) in Niemann-pick disease, type C1; not listed for Ichthyosis-hepatosplenomegaly-cerebellar degeneration syndrome; listed without a frequency for Niemann-pick disease, type C2; not listed for Glutamate-cysteine ligase deficiency",
      "score": 1
    },
    {
      "hpoId": "HP:0002206",
      "label": "Pulmonary fibrosis",
      "question": "Has anyone noticed pulmonary fibrosis?",
      "discriminates": [
        {
          "diseaseId": "OMIM:257220",
          "frequency": null
        },
        {
          "diseaseId": "ORPHA:2274",
          "frequency": null
        },
        {
          "diseaseId": "OMIM:607625",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:607625",
            "raw": "1/1"
          }
        },
        {
          "diseaseId": "ORPHA:480556",
          "frequency": null,
          "noAnnotationData": true
        },
        {
          "diseaseId": "ORPHA:33574",
          "frequency": null
        }
      ],
      "why": "Not listed for Niemann-pick disease, type C1; not listed for Ichthyosis-hepatosplenomegaly-cerebellar degeneration syndrome; Obligate (1/1) in Niemann-pick disease, type C2; not listed for Glutamate-cysteine ligase deficiency",
      "score": 1
    },
    {
      "hpoId": "HP:0025435",
      "label": "Increased circulating lactate dehydrogenase concentration",
      "question": "Has anyone noticed increased circulating lactate dehydrogenase concentration?",
      "discriminates": [
        {
          "diseaseId": "OMIM:257220",
          "frequency": null
        },
        {
          "diseaseId": "ORPHA:2274",
          "frequency": null
        },
        {
          "diseaseId": "OMIM:607625",
          "frequency": null
        },
        {
          "diseaseId": "ORPHA:480556",
          "frequency": null,
          "noAnnotationData": true
        },
        {
          "diseaseId": "ORPHA:33574",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:230450",
            "raw": "1/1"
          }
        }
      ],
      "why": "Not listed for Niemann-pick disease, type C1; not listed for Ichthyosis-hepatosplenomegaly-cerebellar degeneration syndrome; not listed for Niemann-pick disease, type C2; Obligate (1/1) in Glutamate-cysteine ligase deficiency",
      "score": 1
    }
  ],
  "dataVersions": {
    "hpo": "2026-09-01",
    "fetchedAt": "2026-10-24T19:57:48.505Z"
  }
} as NextQuestionsResponse;

/** Recorded GET /api/trials response for NPC1_TRIALS_CONDITION with ids OMIM:257220,MONDO:0009757, as the app sends for candidate 1 (recorded at 2026-10-24T19:20Z UTC). */
const RECORDED_TRIALS: TrialsResponse = {
  "version": "0.1",
  "source": "live",
  "studies": [
    {
      "nctId": "NCT00344331",
      "title": "Evaluation of Biochemical Markers and Clinical Investigation of Niemann-Pick Disease, Type C",
      "status": "RECRUITING",
      "phases": [],
      "conditions": [
        "Niemann-Pick Disease, Type C"
      ],
      "countries": [
        "United States"
      ],
      "url": "https://clinicaltrials.gov/study/NCT00344331"
    },
    {
      "nctId": "NCT07054515",
      "title": "A Study to Evaluate the Safety and Efficacy of Oral Nizubaglustat (AZ-3102) in Late-infantile and Juvenile Forms of Niemann-Pick Type C Disease, GM1 Gangliosidosis or GM2 Gangliosidosis",
      "status": "RECRUITING",
      "phases": [
        "PHASE3"
      ],
      "conditions": [
        "Niemann-Pick Type C Disease",
        "GM1 Gangliosidosis",
        "GM2 Gangliosidosis"
      ],
      "countries": [
        "United States",
        "Argentina",
        "Australia",
        "Brazil",
        "Canada",
        "France",
        "Germany",
        "India",
        "Italy",
        "Mexico",
        "Pakistan",
        "Portugal",
        "Spain",
        "Sweden",
        "Switzerland",
        "Turkey (Türkiye)",
        "United Kingdom"
      ],
      "url": "https://clinicaltrials.gov/study/NCT07054515"
    },
    {
      "nctId": "NCT05163288",
      "title": "A Pivotal Study of N-Acetyl-L-Leucine on Niemann-Pick Disease Type C",
      "status": "RECRUITING",
      "phases": [
        "PHASE3"
      ],
      "conditions": [
        "Niemann-Pick Disease, Type C"
      ],
      "countries": [
        "United States",
        "Australia",
        "Czechia",
        "Germany",
        "Netherlands",
        "Slovakia",
        "Switzerland",
        "United Kingdom"
      ],
      "url": "https://clinicaltrials.gov/study/NCT05163288"
    },
    {
      "nctId": "NCT05588167",
      "title": "Establishment of Genomic and Phenotypic Database for Niemann-Pick Disease, Type C",
      "status": "RECRUITING",
      "phases": [],
      "conditions": [
        "Niemann-Pick Disease, Type C"
      ],
      "countries": [
        "United States"
      ],
      "url": "https://clinicaltrials.gov/study/NCT05588167"
    },
    {
      "nctId": "NCT07082725",
      "title": "A Study to Evaluate the Safety and Efficacy of Oral Nizubaglustat (AZ-3102) in Late-infantile and Juvenile Forms of Niemann-Pick Type C Disease (NPC)",
      "status": "RECRUITING",
      "phases": [
        "PHASE3"
      ],
      "conditions": [
        "Niemann-Pick Type C Disease"
      ],
      "countries": [
        "United States",
        "Argentina",
        "Australia",
        "Brazil",
        "Canada",
        "Germany",
        "India",
        "Italy",
        "Mexico",
        "Pakistan",
        "Portugal",
        "Spain",
        "Switzerland",
        "Turkey (Türkiye)",
        "United Kingdom"
      ],
      "url": "https://clinicaltrials.gov/study/NCT07082725"
    }
  ],
  "query": {
    "condition": "Niemann-Pick disease, type C1",
    "ids": [
      "OMIM:257220",
      "MONDO:0009757"
    ],
    "status": "RECRUITING"
  },
  "total": 6,
  "fetchedAt": "2026-10-24T19:18:43.514Z",
  "dataVersions": {
    "fetchedAt": "2026-10-24T19:18:43.514Z"
  }
};

function normalizeCondition(condition: string): string {
  return condition.trim().toLowerCase().replace(/\s+/g, " ");
}

/** demo-marfan request as the app sends it: non-negated / negated ids of the engine's prepared extraction (engine/demo/cases.ts), limit 5. */
const MARFAN_OBSERVED: readonly HpoId[] = ["HP:0001166","HP:0000218","HP:0001065","HP:0001083","HP:0000268","HP:0000278","HP:0000490","HP:0012499","HP:0004959"];
const MARFAN_EXCLUDED: readonly HpoId[] = ["HP:0002107","HP:0002650"];

/** Recorded POST /api/rank response for demo-marfan (T18q): production https://hackachusetts-2026.pages.dev (6c89a84), HTTP 200, source "live", X-RDD-Path: engine; recorded at 2026-10-24T20:00Z UTC (body fetchedAt 2026-10-24T19:57:58.178Z, a Workers cache hit). Pasted unchanged. */
const RECORDED_RANK_MARFAN: RankResponse = {
  "version": "0.1",
  "source": "live",
  "candidates": [
    {
      "rank": 1,
      "diseaseId": "OMIM:614816",
      "mondoId": "MONDO:0013897",
      "name": "Loeys-Dietz syndrome 4",
      "overlap": "partial",
      "score": 14.425018751127952,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0000218",
            "label": "High palate"
          },
          "diseaseTerm": {
            "id": "HP:0000218",
            "label": "High palate"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:614816",
            "raw": "44/73"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0000268",
            "label": "Dolichocephaly"
          },
          "diseaseTerm": {
            "id": "HP:0000268",
            "label": "Dolichocephaly"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:614816",
            "raw": "1/3"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0000278",
            "label": "Retrognathia"
          },
          "diseaseTerm": {
            "id": "HP:0000278",
            "label": "Retrognathia"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:614816",
            "raw": "13/28"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0000490",
            "label": "Deeply set eye"
          },
          "diseaseTerm": {
            "id": "HP:0000490",
            "label": "Deeply set eye"
          },
          "via": "exact",
          "frequency": {
            "label": "Excluded",
            "source": "OMIM:614816",
            "raw": "0/13"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001065",
            "label": "Striae distensae"
          },
          "diseaseTerm": {
            "id": "HP:0001065",
            "label": "Striae distensae"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:614816",
            "raw": "24/70"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001083",
            "label": "Ectopia lentis"
          },
          "diseaseTerm": {
            "id": "HP:0001083",
            "label": "Ectopia lentis"
          },
          "via": "exact",
          "frequency": {
            "label": "Excluded",
            "source": "OMIM:614816",
            "raw": "0/27"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001166",
            "label": "Arachnodactyly"
          },
          "diseaseTerm": {
            "id": "HP:0001166",
            "label": "Arachnodactyly"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:614816",
            "raw": "35/66"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0004959",
            "label": "Descending thoracic aorta aneurysm"
          },
          "diseaseTerm": {
            "id": "HP:0002616",
            "label": "Aortic root aneurysm"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Very frequent",
            "source": "OMIM:614816",
            "raw": "23/25"
          },
          "ancestor": {
            "id": "HP:0012727",
            "label": "Thoracic aortic aneurysm"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0012499",
            "label": "Descending aortic dissection"
          },
          "diseaseTerm": {
            "id": "HP:0002647",
            "label": "Aortic dissection"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "OMIM:614816",
            "raw": "9/60"
          },
          "ancestor": {
            "id": "HP:0002647",
            "label": "Aortic dissection"
          }
        }
      ],
      "unmatched": [],
      "notReported": [
        {
          "term": {
            "id": "HP:0000006",
            "label": "Autosomal dominant inheritance"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:614816",
            "raw": "20/20"
          }
        },
        {
          "term": {
            "id": "HP:0000193",
            "label": "Bifid uvula"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:614816",
            "raw": "3/3"
          }
        },
        {
          "term": {
            "id": "HP:0004970",
            "label": "Ascending tubular aorta aneurysm"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:614816",
            "raw": "3/3"
          }
        },
        {
          "term": {
            "id": "HP:0012532",
            "label": "Chronic pain"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:614816",
            "raw": "2/2"
          }
        },
        {
          "term": {
            "id": "HP:0000023",
            "label": "Inguinal hernia"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:614816",
            "raw": "26/42"
          }
        },
        {
          "term": {
            "id": "HP:0000098",
            "label": "Tall stature"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:614816",
            "raw": "33/59"
          }
        },
        {
          "term": {
            "id": "HP:0000494",
            "label": "Downslanted palpebral fissures"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:614816",
            "raw": "10/28"
          }
        },
        {
          "term": {
            "id": "HP:0000766",
            "label": "Abnormal sternum morphology"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:614816",
            "raw": "16/31"
          }
        }
      ],
      "contradicted": [
        {
          "term": {
            "id": "HP:0002650",
            "label": "Scoliosis"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:614816",
            "raw": "25/74"
          }
        }
      ],
      "categories": [
        "Blood and blood-forming tissues",
        "Cardiovascular",
        "Connective tissue",
        "Constitutional Symptom",
        "Digestive System",
        "Eye",
        "Growth",
        "Head and neck",
        "Inheritance",
        "Limbs",
        "Nervous System",
        "Other",
        "Respiratory System",
        "Skeletal system",
        "Skin, Hair, and Nails"
      ],
      "genes": [
        {
          "id": "NCBIGene:7042",
          "symbol": "TGFB2"
        }
      ],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0013897",
        "omim": "https://omim.org/entry/614816"
      },
      "sources": [
        "monarch-semsim",
        "hpo-annotations"
      ]
    },
    {
      "rank": 2,
      "diseaseId": "ORPHA:622925",
      "mondoId": "MONDO:0010515",
      "name": "X-linked severe syndromic thoracic aortic aneurysm and dissection",
      "overlap": "strong",
      "score": 13.666337147635847,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0000218",
            "label": "High palate"
          },
          "diseaseTerm": {
            "id": "HP:0000218",
            "label": "High palate"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:300989",
            "raw": "2/5"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0000268",
            "label": "Dolichocephaly"
          },
          "diseaseTerm": {
            "id": "HP:0000268",
            "label": "Dolichocephaly"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:300989",
            "raw": "4/7"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0000278",
            "label": "Retrognathia"
          },
          "diseaseTerm": {
            "id": "HP:0000272",
            "label": "Malar flattening"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Very frequent",
            "source": "OMIM:300989",
            "raw": "7/8"
          },
          "ancestor": {
            "id": "HP:0011821",
            "label": "Abnormal facial skeleton morphology"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0000490",
            "label": "Deeply set eye"
          },
          "diseaseTerm": {
            "id": "HP:0000316",
            "label": "Hypertelorism"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:300989",
            "raw": "8/11"
          },
          "ancestor": {
            "id": "HP:0100886",
            "label": "Abnormality of globe location"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001065",
            "label": "Striae distensae"
          },
          "diseaseTerm": {
            "id": "HP:0001065",
            "label": "Striae distensae"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:300989",
            "raw": "4/9"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001083",
            "label": "Ectopia lentis"
          },
          "diseaseTerm": {
            "id": "HP:0000316",
            "label": "Hypertelorism"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:300989",
            "raw": "8/11"
          },
          "ancestor": {
            "id": "HP:0012372",
            "label": "Abnormal eye morphology"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001166",
            "label": "Arachnodactyly"
          },
          "diseaseTerm": {
            "id": "HP:0001166",
            "label": "Arachnodactyly"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:300989",
            "raw": "4/10"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0004959",
            "label": "Descending thoracic aorta aneurysm"
          },
          "diseaseTerm": {
            "id": "HP:0002616",
            "label": "Aortic root aneurysm"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Very frequent",
            "source": "OMIM:300989",
            "raw": "13/15"
          },
          "ancestor": {
            "id": "HP:0012727",
            "label": "Thoracic aortic aneurysm"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0012499",
            "label": "Descending aortic dissection"
          },
          "diseaseTerm": {
            "id": "HP:0002647",
            "label": "Aortic dissection"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "OMIM:300989",
            "raw": "3/14"
          },
          "ancestor": {
            "id": "HP:0002647",
            "label": "Aortic dissection"
          }
        }
      ],
      "unmatched": [],
      "notReported": [
        {
          "term": {
            "id": "HP:0002119",
            "label": "Ventriculomegaly"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:300989",
            "raw": "3/3"
          }
        },
        {
          "term": {
            "id": "HP:0004482",
            "label": "Relative macrocephaly"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:300989",
            "raw": "3/3"
          }
        },
        {
          "term": {
            "id": "HP:0000494",
            "label": "Downslanted palpebral fissures"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "OMIM:300989",
            "raw": "6/7"
          }
        },
        {
          "term": {
            "id": "HP:0001382",
            "label": "Joint hypermobility"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "OMIM:300989",
            "raw": "8/10"
          }
        },
        {
          "term": {
            "id": "HP:0000212",
            "label": "Gingival overgrowth"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:300989",
            "raw": "2/3"
          }
        },
        {
          "term": {
            "id": "HP:0000520",
            "label": "Proptosis"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:300989",
            "raw": "5/8"
          }
        },
        {
          "term": {
            "id": "HP:0000766",
            "label": "Abnormal sternum morphology"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:300989",
            "raw": "4/10"
          }
        },
        {
          "term": {
            "id": "HP:0000998",
            "label": "Hypertrichosis"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:300989",
            "raw": "2/3"
          }
        }
      ],
      "contradicted": [],
      "categories": [
        "Blood and blood-forming tissues",
        "Cardiovascular",
        "Connective tissue",
        "Eye",
        "Growth",
        "Head and neck",
        "Inheritance",
        "Limbs",
        "Nervous System",
        "Other",
        "Skeletal system",
        "Skin, Hair, and Nails"
      ],
      "genes": [
        {
          "id": "NCBIGene:633",
          "symbol": "BGN"
        }
      ],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0010515",
        "orphanet": "https://www.orpha.net/en/disease/detail/622925",
        "omim": "https://omim.org/entry/300989"
      },
      "sources": [
        "monarch-semsim",
        "hpo-annotations",
        "orphadata"
      ]
    },
    {
      "rank": 3,
      "diseaseId": "ORPHA:99715",
      "mondoId": "MONDO:0011431",
      "name": "MASS syndrome",
      "overlap": "partial",
      "score": 13.504668784549956,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0000268",
            "label": "Dolichocephaly"
          },
          "diseaseTerm": {
            "id": "HP:0000768",
            "label": "Pectus carinatum"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "OMIM:604308",
            "raw": "1/4"
          },
          "ancestor": {
            "id": "HP:0009121",
            "label": "Abnormal axial skeleton morphology"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0000278",
            "label": "Retrognathia"
          },
          "diseaseTerm": {
            "id": "HP:0000768",
            "label": "Pectus carinatum"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "OMIM:604308",
            "raw": "1/4"
          },
          "ancestor": {
            "id": "HP:0009121",
            "label": "Abnormal axial skeleton morphology"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0000490",
            "label": "Deeply set eye"
          },
          "diseaseTerm": {
            "id": "HP:0001083",
            "label": "Ectopia lentis"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Excluded",
            "source": "OMIM:604308",
            "raw": "0/3"
          },
          "ancestor": {
            "id": "HP:0012372",
            "label": "Abnormal eye morphology"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001065",
            "label": "Striae distensae"
          },
          "diseaseTerm": {
            "id": "HP:0001065",
            "label": "Striae distensae"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:604308",
            "raw": "5/7"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001083",
            "label": "Ectopia lentis"
          },
          "diseaseTerm": {
            "id": "HP:0001083",
            "label": "Ectopia lentis"
          },
          "via": "exact",
          "frequency": {
            "label": "Excluded",
            "source": "OMIM:604308",
            "raw": "0/3"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001166",
            "label": "Arachnodactyly"
          },
          "diseaseTerm": {
            "id": "HP:0001166",
            "label": "Arachnodactyly"
          },
          "via": "exact",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:604308",
            "raw": "4/4"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0004959",
            "label": "Descending thoracic aorta aneurysm"
          },
          "diseaseTerm": {
            "id": "HP:0004942",
            "label": "Aortic aneurysm"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:604308",
            "raw": "7/7"
          },
          "ancestor": {
            "id": "HP:0004942",
            "label": "Aortic aneurysm"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0012499",
            "label": "Descending aortic dissection"
          },
          "diseaseTerm": {
            "id": "HP:0004933",
            "label": "Ascending aortic dissection"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Excluded",
            "source": "OMIM:604308",
            "raw": "0/7"
          },
          "ancestor": {
            "id": "HP:0002647",
            "label": "Aortic dissection"
          }
        }
      ],
      "unmatched": [
        {
          "id": "HP:0000218",
          "label": "High palate"
        }
      ],
      "notReported": [
        {
          "term": {
            "id": "HP:0001519",
            "label": "Disproportionate tall stature"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:604308",
            "raw": "3/3"
          }
        },
        {
          "term": {
            "id": "HP:0001634",
            "label": "Mitral valve prolapse"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:604308",
            "raw": "3/3"
          }
        },
        {
          "term": {
            "id": "HP:0100775",
            "label": "Dural ectasia"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:604308",
            "raw": "3/4"
          }
        }
      ],
      "contradicted": [],
      "categories": [
        "Cardiovascular",
        "Eye",
        "Growth",
        "Inheritance",
        "Limbs",
        "Nervous System",
        "Skeletal system",
        "Skin, Hair, and Nails"
      ],
      "genes": [
        {
          "id": "NCBIGene:2200",
          "symbol": "FBN1"
        }
      ],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0011431",
        "orphanet": "https://www.orpha.net/en/disease/detail/99715",
        "omim": "https://omim.org/entry/604308"
      },
      "sources": [
        "monarch-semsim",
        "hpo-annotations",
        "orphadata"
      ]
    },
    {
      "rank": 4,
      "diseaseId": "OMIM:129600",
      "mondoId": "MONDO:0007514",
      "name": "ectopia lentis 1, isolated, autosomal dominant",
      "overlap": "strong",
      "score": 13.155902476703044,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0000218",
            "label": "High palate"
          },
          "diseaseTerm": {
            "id": "HP:0000218",
            "label": "High palate"
          },
          "via": "exact",
          "frequency": {
            "label": "Occasional",
            "source": "OMIM:129600",
            "raw": "4/37"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0000268",
            "label": "Dolichocephaly"
          },
          "diseaseTerm": {
            "id": "HP:0000767",
            "label": "Pectus excavatum"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "OMIM:129600",
            "raw": "3/37"
          },
          "ancestor": {
            "id": "HP:0009121",
            "label": "Abnormal axial skeleton morphology"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0000278",
            "label": "Retrognathia"
          },
          "diseaseTerm": {
            "id": "HP:0000767",
            "label": "Pectus excavatum"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "OMIM:129600",
            "raw": "3/37"
          },
          "ancestor": {
            "id": "HP:0009121",
            "label": "Abnormal axial skeleton morphology"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001065",
            "label": "Striae distensae"
          },
          "diseaseTerm": {
            "id": "HP:0001065",
            "label": "Striae distensae"
          },
          "via": "exact",
          "frequency": {
            "label": "Occasional",
            "source": "OMIM:129600",
            "raw": "6/29"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001083",
            "label": "Ectopia lentis"
          },
          "diseaseTerm": {
            "id": "HP:0001083",
            "label": "Ectopia lentis"
          },
          "via": "exact",
          "frequency": {
            "label": "Very frequent",
            "source": "OMIM:129600",
            "raw": "51/57"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001166",
            "label": "Arachnodactyly"
          },
          "diseaseTerm": {
            "id": "HP:0001166",
            "label": "Arachnodactyly"
          },
          "via": "exact",
          "frequency": {
            "label": "Occasional",
            "source": "OMIM:129600",
            "raw": "4/37"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0004959",
            "label": "Descending thoracic aorta aneurysm"
          },
          "diseaseTerm": {
            "id": "HP:0002616",
            "label": "Aortic root aneurysm"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Excluded",
            "source": "OMIM:129600",
            "raw": "0/44"
          },
          "ancestor": {
            "id": "HP:0012727",
            "label": "Thoracic aortic aneurysm"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0012499",
            "label": "Descending aortic dissection"
          },
          "diseaseTerm": {
            "id": "HP:0002616",
            "label": "Aortic root aneurysm"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Excluded",
            "source": "OMIM:129600",
            "raw": "0/44"
          },
          "ancestor": {
            "id": "HP:0001679",
            "label": "Abnormal aortic morphology"
          }
        }
      ],
      "unmatched": [
        {
          "id": "HP:0000490",
          "label": "Deeply set eye"
        }
      ],
      "notReported": [
        {
          "term": {
            "id": "HP:0000006",
            "label": "Autosomal dominant inheritance"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:129600",
            "raw": "20/20"
          }
        },
        {
          "term": {
            "id": "HP:0000594",
            "label": "Shallow anterior chamber"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:129600",
            "raw": "6/6"
          }
        },
        {
          "term": {
            "id": "HP:0003581",
            "label": "Adult onset"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:129600",
            "raw": "5/5"
          }
        },
        {
          "term": {
            "id": "HP:0030961",
            "label": "Microspherophakia"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:129600",
            "raw": "6/6"
          }
        },
        {
          "term": {
            "id": "HP:0000545",
            "label": "Myopia"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:129600",
            "raw": "30/38"
          }
        },
        {
          "term": {
            "id": "HP:0003596",
            "label": "Middle age onset"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:129600",
            "raw": "5/7"
          }
        },
        {
          "term": {
            "id": "HP:0011463",
            "label": "Childhood onset"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:129600",
            "raw": "6/8"
          }
        }
      ],
      "contradicted": [],
      "categories": [
        "Cardiovascular",
        "Clinical course",
        "Eye",
        "Growth",
        "Head and neck",
        "Inheritance",
        "Limbs",
        "Other",
        "Skeletal system",
        "Skin, Hair, and Nails"
      ],
      "genes": [
        {
          "id": "NCBIGene:2200",
          "symbol": "FBN1"
        }
      ],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0007514",
        "omim": "https://omim.org/entry/129600"
      },
      "sources": [
        "monarch-semsim",
        "hpo-annotations"
      ]
    },
    {
      "rank": 5,
      "diseaseId": "ORPHA:300382",
      "mondoId": "MONDO:0014831",
      "name": "Progeroid and marfanoid aspect-lipodystrophy syndrome",
      "overlap": "strong",
      "score": 13.019466399093128,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0000218",
            "label": "High palate"
          },
          "diseaseTerm": {
            "id": "HP:0000218",
            "label": "High palate"
          },
          "via": "exact",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "1/1"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0000268",
            "label": "Dolichocephaly"
          },
          "diseaseTerm": {
            "id": "HP:0030799",
            "label": "Scaphocephaly"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:616914"
          },
          "ancestor": {
            "id": "HP:0000268",
            "label": "Dolichocephaly"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0000278",
            "label": "Retrognathia"
          },
          "diseaseTerm": {
            "id": "HP:0000278",
            "label": "Retrognathia"
          },
          "via": "exact",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "2/2"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0000490",
            "label": "Deeply set eye"
          },
          "diseaseTerm": {
            "id": "HP:0000490",
            "label": "Deeply set eye"
          },
          "via": "exact",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "1/1"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001065",
            "label": "Striae distensae"
          },
          "diseaseTerm": {
            "id": "HP:0000995",
            "label": "Melanocytic nevus"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "1/1"
          },
          "ancestor": {
            "id": "HP:0011355",
            "label": "Localized skin lesion"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001083",
            "label": "Ectopia lentis"
          },
          "diseaseTerm": {
            "id": "HP:0001083",
            "label": "Ectopia lentis"
          },
          "via": "exact",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "1/1"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001166",
            "label": "Arachnodactyly"
          },
          "diseaseTerm": {
            "id": "HP:0001166",
            "label": "Arachnodactyly"
          },
          "via": "exact",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "1/1"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0004959",
            "label": "Descending thoracic aorta aneurysm"
          },
          "diseaseTerm": {
            "id": "HP:0002616",
            "label": "Aortic root aneurysm"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "1/1"
          },
          "ancestor": {
            "id": "HP:0012727",
            "label": "Thoracic aortic aneurysm"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0012499",
            "label": "Descending aortic dissection"
          },
          "diseaseTerm": {
            "id": "HP:0002616",
            "label": "Aortic root aneurysm"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "1/1"
          },
          "ancestor": {
            "id": "HP:0001679",
            "label": "Abnormal aortic morphology"
          }
        }
      ],
      "unmatched": [],
      "notReported": [
        {
          "term": {
            "id": "HP:0000098",
            "label": "Tall stature"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "1/1"
          }
        },
        {
          "term": {
            "id": "HP:0000238",
            "label": "Hydrocephalus"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "1/1"
          }
        },
        {
          "term": {
            "id": "HP:0000256",
            "label": "Macrocephaly"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "1/1"
          }
        },
        {
          "term": {
            "id": "HP:0000325",
            "label": "Triangular face"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "1/1"
          }
        },
        {
          "term": {
            "id": "HP:0000337",
            "label": "Broad forehead"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "1/1"
          }
        },
        {
          "term": {
            "id": "HP:0000418",
            "label": "Narrow nasal ridge"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "1/1"
          }
        },
        {
          "term": {
            "id": "HP:0000426",
            "label": "Prominent nasal bridge"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "1/1"
          }
        },
        {
          "term": {
            "id": "HP:0000460",
            "label": "Narrow nose"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:616914",
            "raw": "1/1"
          }
        }
      ],
      "contradicted": [],
      "categories": [
        "Blood and blood-forming tissues",
        "Cardiovascular",
        "Connective tissue",
        "Digestive System",
        "Eye",
        "Growth",
        "Head and neck",
        "Inheritance",
        "Limbs",
        "Musculature",
        "Nervous System",
        "Prenatal and Birth",
        "Skeletal system",
        "Skin, Hair, and Nails"
      ],
      "genes": [
        {
          "id": "NCBIGene:2200",
          "symbol": "FBN1"
        }
      ],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0014831",
        "orphanet": "https://www.orpha.net/en/disease/detail/300382",
        "omim": "https://omim.org/entry/616914"
      },
      "sources": [
        "monarch-semsim",
        "hpo-annotations",
        "orphadata"
      ]
    }
  ],
  "dataVersions": {
    "hpo": "2026-09-01",
    "monarch": "v3 API",
    "fetchedAt": "2026-10-24T19:57:58.178Z",
    "orphanet": "2026-06-23"
  }
};

/** demo-cdls request as the app sends it: non-negated / negated ids of the engine's prepared extraction (engine/demo/cases.ts), limit 5. */
const CDLS_OBSERVED: readonly HpoId[] = ["HP:0001511","HP:0008897","HP:0001263","HP:0001249","HP:0001007","HP:0000028","HP:0001159","HP:0001156","HP:0030148"];
const CDLS_EXCLUDED: readonly HpoId[] = ["HP:0001250","HP:0011968"];

/** Recorded POST /api/rank response for demo-cdls (T18q): production https://hackachusetts-2026.pages.dev (6c89a84), HTTP 200, source "live", X-RDD-Path: engine; recorded at 2026-10-24T20:00Z UTC (body fetchedAt 2026-10-24T19:58:02.307Z, a Workers cache hit). Pasted unchanged. */
const RECORDED_RANK_CDLS: RankResponse = {
  "version": "0.1",
  "source": "live",
  "candidates": [
    {
      "rank": 1,
      "diseaseId": "ORPHA:96175",
      "mondoId": "MONDO:0019906",
      "name": "Ring chromosome 11 syndrome",
      "overlap": "strong",
      "score": 12.49753645201336,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0000028",
            "label": "Cryptorchidism"
          },
          "diseaseTerm": {
            "id": "HP:0000028",
            "label": "Cryptorchidism"
          },
          "via": "exact",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:96175"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001007",
            "label": "Hirsutism"
          },
          "diseaseTerm": {
            "id": "HP:0001007",
            "label": "Hirsutism"
          },
          "via": "exact",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:96175"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001159",
            "label": "Syndactyly"
          },
          "diseaseTerm": {
            "id": "HP:0030084",
            "label": "Clinodactyly"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:96175"
          },
          "ancestor": {
            "id": "HP:0011297",
            "label": "Abnormal digit morphology"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001249",
            "label": "Intellectual disability"
          },
          "diseaseTerm": {
            "id": "HP:0001249",
            "label": "Intellectual disability"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:96175"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001263",
            "label": "Global developmental delay"
          },
          "diseaseTerm": {
            "id": "HP:0001263",
            "label": "Global developmental delay"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:96175"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001511",
            "label": "Intrauterine growth retardation"
          },
          "diseaseTerm": {
            "id": "HP:0001511",
            "label": "Intrauterine growth retardation"
          },
          "via": "exact",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:96175"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0008897",
            "label": "Postnatal growth retardation"
          },
          "diseaseTerm": {
            "id": "HP:0001510",
            "label": "Growth delay"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:96175"
          },
          "ancestor": {
            "id": "HP:0001510",
            "label": "Growth delay"
          }
        }
      ],
      "unmatched": [
        {
          "id": "HP:0001156",
          "label": "Brachydactyly"
        },
        {
          "id": "HP:0030148",
          "label": "Heart murmur"
        }
      ],
      "notReported": [
        {
          "term": {
            "id": "HP:0000252",
            "label": "Microcephaly"
          },
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:96175"
          }
        },
        {
          "term": {
            "id": "HP:0000271",
            "label": "Abnormality of the face"
          },
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:96175"
          }
        },
        {
          "term": {
            "id": "HP:0000957",
            "label": "Cafe-au-lait spot"
          },
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:96175"
          }
        },
        {
          "term": {
            "id": "HP:0004322",
            "label": "Short stature"
          },
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:96175"
          }
        },
        {
          "term": {
            "id": "HP:0004325",
            "label": "Decreased body weight"
          },
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:96175"
          }
        }
      ],
      "contradicted": [],
      "categories": [
        "Cardiovascular",
        "Endocrine",
        "Genitourinary system",
        "Growth",
        "Head and neck",
        "Limbs",
        "Neoplasm",
        "Nervous System",
        "Skin, Hair, and Nails"
      ],
      "genes": [],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0019906",
        "orphanet": "https://www.orpha.net/en/disease/detail/96175"
      },
      "sources": [
        "monarch-semsim",
        "hpo-annotations",
        "orphadata"
      ]
    },
    {
      "rank": 2,
      "diseaseId": "ORPHA:1867",
      "mondoId": "MONDO:0010540",
      "name": "Hereditary bullous dystrophy, macular type",
      "overlap": "strong",
      "score": 12.331898875931753,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0000028",
            "label": "Cryptorchidism"
          },
          "diseaseTerm": {
            "id": "HP:0000028",
            "label": "Cryptorchidism"
          },
          "via": "exact",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:1867"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001007",
            "label": "Hirsutism"
          },
          "diseaseTerm": {
            "id": "HP:0001596",
            "label": "Alopecia"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:1867"
          },
          "ancestor": {
            "id": "HP:0011362",
            "label": "Abnormal hair quantity"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001156",
            "label": "Brachydactyly"
          },
          "diseaseTerm": {
            "id": "HP:0009381",
            "label": "Short finger"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:1867"
          },
          "ancestor": {
            "id": "HP:0011927",
            "label": "Short digit"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001159",
            "label": "Syndactyly"
          },
          "diseaseTerm": {
            "id": "HP:0001182",
            "label": "Tapered finger"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:1867"
          },
          "ancestor": {
            "id": "HP:0011297",
            "label": "Abnormal digit morphology"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001249",
            "label": "Intellectual disability"
          },
          "diseaseTerm": {
            "id": "HP:0001249",
            "label": "Intellectual disability"
          },
          "via": "exact",
          "frequency": {
            "label": null,
            "source": "OMIM:302000"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001263",
            "label": "Global developmental delay"
          },
          "diseaseTerm": {
            "id": "HP:0001249",
            "label": "Intellectual disability"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:302000"
          },
          "ancestor": {
            "id": "HP:0012759",
            "label": "Neurodevelopmental abnormality"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001511",
            "label": "Intrauterine growth retardation"
          },
          "diseaseTerm": {
            "id": "HP:0001510",
            "label": "Growth delay"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:1867"
          },
          "ancestor": {
            "id": "HP:0001510",
            "label": "Growth delay"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0008897",
            "label": "Postnatal growth retardation"
          },
          "diseaseTerm": {
            "id": "HP:0001510",
            "label": "Growth delay"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:1867"
          },
          "ancestor": {
            "id": "HP:0001510",
            "label": "Growth delay"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0030148",
            "label": "Heart murmur"
          },
          "diseaseTerm": {
            "id": "HP:0030148",
            "label": "Heart murmur"
          },
          "via": "exact",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:1867"
          }
        }
      ],
      "unmatched": [],
      "notReported": [
        {
          "term": {
            "id": "HP:0000252",
            "label": "Microcephaly"
          },
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:1867"
          }
        },
        {
          "term": {
            "id": "HP:0000953",
            "label": "Hyperpigmentation of the skin"
          },
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:1867"
          }
        },
        {
          "term": {
            "id": "HP:0001063",
            "label": "Acrocyanosis"
          },
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:1867"
          }
        },
        {
          "term": {
            "id": "HP:0001256",
            "label": "Mild intellectual disability"
          },
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:1867"
          }
        },
        {
          "term": {
            "id": "HP:0002090",
            "label": "Pneumonia"
          },
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:1867"
          }
        },
        {
          "term": {
            "id": "HP:0004322",
            "label": "Short stature"
          },
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:1867"
          }
        },
        {
          "term": {
            "id": "HP:0005590",
            "label": "Spotty hypopigmentation"
          },
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:1867"
          }
        },
        {
          "term": {
            "id": "HP:0007957",
            "label": "Corneal opacity"
          },
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:1867"
          }
        }
      ],
      "contradicted": [],
      "categories": [
        "Cardiovascular",
        "Clinical course",
        "Eye",
        "Genitourinary system",
        "Growth",
        "Head and neck",
        "Immunology",
        "Inheritance",
        "Limbs",
        "Nervous System",
        "Skin, Hair, and Nails"
      ],
      "genes": [],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0010540",
        "orphanet": "https://www.orpha.net/en/disease/detail/1867",
        "omim": "https://omim.org/entry/302000"
      },
      "sources": [
        "monarch-semsim",
        "hpo-annotations",
        "orphadata"
      ]
    },
    {
      "rank": 3,
      "diseaseId": "ORPHA:261483",
      "mondoId": "MONDO:0010467",
      "name": "Xq27.3q28 duplication syndrome",
      "overlap": "partial",
      "score": 11.853935113793593,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0000028",
            "label": "Cryptorchidism"
          },
          "diseaseTerm": {
            "id": "HP:0000028",
            "label": "Cryptorchidism"
          },
          "via": "exact",
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:261483"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001007",
            "label": "Hirsutism"
          },
          "diseaseTerm": {
            "id": "HP:0002231",
            "label": "Sparse body hair"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:261483"
          },
          "ancestor": {
            "id": "HP:0011362",
            "label": "Abnormal hair quantity"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001159",
            "label": "Syndactyly"
          },
          "diseaseTerm": {
            "id": "HP:0001773",
            "label": "Short foot"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:261483"
          },
          "ancestor": {
            "id": "HP:0002813",
            "label": "Abnormal limb bone morphology"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001249",
            "label": "Intellectual disability"
          },
          "diseaseTerm": {
            "id": "HP:0001256",
            "label": "Mild intellectual disability"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:261483"
          },
          "ancestor": {
            "id": "HP:0001249",
            "label": "Intellectual disability"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001263",
            "label": "Global developmental delay"
          },
          "diseaseTerm": {
            "id": "HP:0001263",
            "label": "Global developmental delay"
          },
          "via": "exact",
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:261483"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001511",
            "label": "Intrauterine growth retardation"
          },
          "diseaseTerm": {
            "id": "HP:0001511",
            "label": "Intrauterine growth retardation"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:261483"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0008897",
            "label": "Postnatal growth retardation"
          },
          "diseaseTerm": {
            "id": "HP:0001511",
            "label": "Intrauterine growth retardation"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Frequent",
            "source": "ORPHA:261483"
          },
          "ancestor": {
            "id": "HP:0001510",
            "label": "Growth delay"
          }
        }
      ],
      "unmatched": [
        {
          "id": "HP:0001156",
          "label": "Brachydactyly"
        },
        {
          "id": "HP:0030148",
          "label": "Heart murmur"
        }
      ],
      "notReported": [
        {
          "term": {
            "id": "HP:0000837",
            "label": "Increased circulating gonadotropin level"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:300869",
            "raw": "3/3"
          }
        },
        {
          "term": {
            "id": "HP:0001328",
            "label": "Specific learning disability"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:300869",
            "raw": "3/3"
          }
        },
        {
          "term": {
            "id": "HP:0040171",
            "label": "Decreased serum testosterone concentration"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:300869",
            "raw": "3/3"
          }
        },
        {
          "term": {
            "id": "HP:0000135",
            "label": "Hypogonadism"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:261483"
          }
        },
        {
          "term": {
            "id": "HP:0000233",
            "label": "Thin vermilion border"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:261483"
          }
        },
        {
          "term": {
            "id": "HP:0000414",
            "label": "Bulbous nose"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:261483"
          }
        },
        {
          "term": {
            "id": "HP:0000490",
            "label": "Deeply set eye"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:261483"
          }
        },
        {
          "term": {
            "id": "HP:0001508",
            "label": "Failure to thrive"
          },
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:261483"
          }
        }
      ],
      "contradicted": [],
      "categories": [
        "Breast",
        "Endocrine",
        "Eye",
        "Genitourinary system",
        "Growth",
        "Head and neck",
        "Inheritance",
        "Limbs",
        "Musculature",
        "Nervous System",
        "Other",
        "Skin, Hair, and Nails"
      ],
      "genes": [
        {
          "id": "NCBIGene:2332",
          "symbol": "FMR1"
        }
      ],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0010467",
        "orphanet": "https://www.orpha.net/en/disease/detail/261483",
        "omim": "https://omim.org/entry/300869"
      },
      "sources": [
        "monarch-semsim",
        "hpo-annotations",
        "orphadata"
      ]
    },
    {
      "rank": 4,
      "diseaseId": "OMIM:241000",
      "mondoId": "MONDO:0009418",
      "name": "hypogonadism with low-grade mental deficiency and microcephaly",
      "overlap": "weak",
      "score": 11.704976370080251,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0001159",
            "label": "Syndactyly"
          },
          "diseaseTerm": {
            "id": "HP:0001159",
            "label": "Syndactyly"
          },
          "via": "exact",
          "frequency": {
            "label": null,
            "source": "OMIM:241000"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001249",
            "label": "Intellectual disability"
          },
          "diseaseTerm": {
            "id": "HP:0001249",
            "label": "Intellectual disability"
          },
          "via": "exact",
          "frequency": {
            "label": null,
            "source": "OMIM:241000"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001263",
            "label": "Global developmental delay"
          },
          "diseaseTerm": {
            "id": "HP:0001249",
            "label": "Intellectual disability"
          },
          "via": "ancestor",
          "frequency": {
            "label": null,
            "source": "OMIM:241000"
          },
          "ancestor": {
            "id": "HP:0012759",
            "label": "Neurodevelopmental abnormality"
          }
        }
      ],
      "unmatched": [
        {
          "id": "HP:0000028",
          "label": "Cryptorchidism"
        },
        {
          "id": "HP:0001007",
          "label": "Hirsutism"
        },
        {
          "id": "HP:0001156",
          "label": "Brachydactyly"
        },
        {
          "id": "HP:0001511",
          "label": "Intrauterine growth retardation"
        },
        {
          "id": "HP:0008897",
          "label": "Postnatal growth retardation"
        },
        {
          "id": "HP:0030148",
          "label": "Heart murmur"
        }
      ],
      "notReported": [],
      "contradicted": [],
      "categories": [
        "Endocrine",
        "Genitourinary system",
        "Head and neck",
        "Inheritance",
        "Limbs",
        "Nervous System"
      ],
      "genes": [],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0009418",
        "omim": "https://omim.org/entry/241000"
      },
      "sources": [
        "monarch-semsim",
        "hpo-annotations"
      ]
    },
    {
      "rank": 5,
      "diseaseId": "OMIM:620062",
      "mondoId": "MONDO:0100217",
      "name": "developmental delay with short stature, dysmorphic facial features, and sparse hair 2",
      "overlap": "partial",
      "score": 11.523565391062927,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0000028",
            "label": "Cryptorchidism"
          },
          "diseaseTerm": {
            "id": "HP:0000034",
            "label": "Hydrocele testis"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:620062",
            "raw": "1/3"
          },
          "ancestor": {
            "id": "HP:0000035",
            "label": "Abnormal testis morphology"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001007",
            "label": "Hirsutism"
          },
          "diseaseTerm": {
            "id": "HP:0002209",
            "label": "Sparse scalp hair"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:620062",
            "raw": "3/3"
          },
          "ancestor": {
            "id": "HP:0011362",
            "label": "Abnormal hair quantity"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001156",
            "label": "Brachydactyly"
          },
          "diseaseTerm": {
            "id": "HP:0001156",
            "label": "Brachydactyly"
          },
          "via": "exact",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:620062",
            "raw": "1/3"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001159",
            "label": "Syndactyly"
          },
          "diseaseTerm": {
            "id": "HP:0001156",
            "label": "Brachydactyly"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:620062",
            "raw": "1/3"
          },
          "ancestor": {
            "id": "HP:0011297",
            "label": "Abnormal digit morphology"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001249",
            "label": "Intellectual disability"
          },
          "diseaseTerm": {
            "id": "HP:0001263",
            "label": "Global developmental delay"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:620062",
            "raw": "3/3"
          },
          "ancestor": {
            "id": "HP:0012759",
            "label": "Neurodevelopmental abnormality"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001263",
            "label": "Global developmental delay"
          },
          "diseaseTerm": {
            "id": "HP:0001263",
            "label": "Global developmental delay"
          },
          "via": "exact",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:620062",
            "raw": "3/3"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0001511",
            "label": "Intrauterine growth retardation"
          },
          "diseaseTerm": {
            "id": "HP:0004322",
            "label": "Short stature"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:620062",
            "raw": "3/3"
          },
          "ancestor": {
            "id": "HP:0001510",
            "label": "Growth delay"
          }
        },
        {
          "patientTerm": {
            "id": "HP:0008897",
            "label": "Postnatal growth retardation"
          },
          "diseaseTerm": {
            "id": "HP:0004322",
            "label": "Short stature"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:620062",
            "raw": "3/3"
          },
          "ancestor": {
            "id": "HP:0001510",
            "label": "Growth delay"
          }
        }
      ],
      "unmatched": [
        {
          "id": "HP:0030148",
          "label": "Heart murmur"
        }
      ],
      "notReported": [
        {
          "term": {
            "id": "HP:0000369",
            "label": "Low-set ears"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:620062",
            "raw": "3/3"
          }
        },
        {
          "term": {
            "id": "HP:0002194",
            "label": "Delayed gross motor development"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:620062",
            "raw": "3/3"
          }
        },
        {
          "term": {
            "id": "HP:0003593",
            "label": "Infantile onset"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:620062",
            "raw": "3/3"
          }
        },
        {
          "term": {
            "id": "HP:0011220",
            "label": "Prominent forehead"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:620062",
            "raw": "3/3"
          }
        },
        {
          "term": {
            "id": "HP:0012413",
            "label": "Notched primary central incisor"
          },
          "frequency": {
            "label": "Obligate",
            "source": "OMIM:620062",
            "raw": "1/1"
          }
        },
        {
          "term": {
            "id": "HP:0000252",
            "label": "Microcephaly"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:620062",
            "raw": "2/3"
          }
        },
        {
          "term": {
            "id": "HP:0000256",
            "label": "Macrocephaly"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:620062",
            "raw": "1/3"
          }
        },
        {
          "term": {
            "id": "HP:0000954",
            "label": "Single transverse palmar crease"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:620062",
            "raw": "1/3"
          }
        }
      ],
      "contradicted": [],
      "categories": [
        "Cardiovascular",
        "Clinical course",
        "Ear",
        "Genitourinary system",
        "Growth",
        "Head and neck",
        "Inheritance",
        "Limbs",
        "Nervous System"
      ],
      "genes": [
        {
          "id": "NCBIGene:1802",
          "symbol": "DPH2"
        }
      ],
      "links": {
        "monarch": "https://monarchinitiative.org/MONDO:0100217",
        "omim": "https://omim.org/entry/620062"
      },
      "sources": [
        "monarch-semsim",
        "hpo-annotations"
      ]
    }
  ],
  "dataVersions": {
    "hpo": "2026-09-01",
    "monarch": "v3 API",
    "fetchedAt": "2026-10-24T19:58:02.307Z",
    "orphanet": "2026-06-23"
  }
};

/**
 * Recorded rankings by demoRankKey (T18q): demo-npc1 (T18l), demo-marfan and
 * demo-cdls. The engine records demo-dmd and demo-kabuki (engine/demo/recorded/)
 * and is asked first.
 */
const RECORDED_RANKINGS: ReadonlyMap<string, RankResponse> = new Map([
  [RANK_KEY, RECORDED_RANK],
  [demoRankKey([...MARFAN_OBSERVED], [...MARFAN_EXCLUDED], 5), RECORDED_RANK_MARFAN],
  [demoRankKey([...CDLS_OBSERVED], [...CDLS_EXCLUDED], 5), RECORDED_RANK_CDLS],
]);

/** Recorded ranking for an exact demoRankKey, else undefined. Returns a copy. */
export function getFallbackDemoRanking(key: string): RankResponse | undefined {
  const hit = RECORDED_RANKINGS.get(key);
  return hit ? structuredClone(hit) : undefined;
}

/**
 * Recorded questions when the term set (demoRankKey with candidates.length,
 * as in the engine) AND the candidate ids equal the recorded ones. Returns a copy.
 */
export function getFallbackDemoQuestions(
  observed: HpoId[],
  excluded: HpoId[],
  candidates: readonly DiseaseId[],
): NextQuestionsResponse | undefined {
  const key = demoRankKey(observed, excluded, candidates.length);
  if (key !== demoRankKey([...NPC1_OBSERVED], [...NPC1_EXCLUDED], NPC1_QUESTION_CANDIDATES.length)) return undefined;
  const asked = [...new Set(candidates)].sort().join(",");
  if (asked !== [...NPC1_QUESTION_CANDIDATES].sort().join(",")) return undefined;
  return structuredClone(RECORDED_QUESTIONS);
}

/**
 * Recorded trials for the top candidate's condition (normalised match), else
 * undefined. `query.ids` echoes the request, as the live path does.
 */
export function getFallbackDemoTrials(condition: string, ids: readonly string[]): TrialsResponse | undefined {
  if (normalizeCondition(condition) !== normalizeCondition(NPC1_TRIALS_CONDITION)) return undefined;
  const out = structuredClone(RECORDED_TRIALS);
  out.query = { ...out.query, condition, ids: [...ids] };
  return out;
}
