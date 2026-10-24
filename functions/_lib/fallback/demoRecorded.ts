// TEMPORARY recorded demo cache for demo-npc1 (T18e), Ian-owned fallback layer.
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

/** Recorded ranking for an exact demoRankKey, else undefined. Returns a copy. */
export function getFallbackDemoRanking(key: string): RankResponse | undefined {
  return key === RANK_KEY ? structuredClone(RECORDED_RANK) : undefined;
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
