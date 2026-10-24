// TEMPORARY recorded demo cache for demo-npc1 (T18e), Ian-owned fallback layer.
//
// One real /api/rank response for the exact demo-npc1 term set of
// docs/CONTRACT.md section 9.1 (12 observed ids, excluded HP:0002315, limit 5),
// the matching /api/next-questions response for its top 3 candidates, and the
// /api/trials response for its top candidate's condition. Recorded by Ian's
// Kiro on 2026-10-24 from this repo's own functions (wrangler pages dev, main
// 72925b0 plus the T18e timeout change, X-RDD-Path: fallback) against the live
// upstreams. Each payload keeps its original `dataVersions` and `fetchedAt`.
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
/** Top 3 candidates of the recorded ranking, as sent to /api/next-questions. */
const NPC1_QUESTION_CANDIDATES: readonly DiseaseId[] = ["OMIM:257220","ORPHA:2274","OMIM:607625"];
/** Condition of the recorded ranking's top candidate (its name, as the app sends it). */
const NPC1_TRIALS_CONDITION = "Niemann-Pick disease, type C1";

const RANK_KEY = demoRankKey([...NPC1_OBSERVED], [...NPC1_EXCLUDED], NPC1_LIMIT);

/** Recorded POST /api/rank response (source "live" as recorded). */
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
      "score": 13.768556970635796,
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
        }
      ],
      "contradicted": [],
      "categories": [
        "Blood and blood-forming tissues",
        "Cardiovascular",
        "Cellular phenotype",
        "Digestive System",
        "Eye",
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
            "id": "HP:0031833",
            "label": "Hypometric upward saccades"
          },
          "diseaseTerm": {
            "id": "HP:0001251",
            "label": "Ataxia"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Very frequent",
            "source": "ORPHA:2274"
          },
          "ancestor": {
            "id": "UPHENO:0079826",
            "label": "behavior process phenotype"
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
      "score": 13.513454282927396,
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
        }
      ],
      "contradicted": [],
      "categories": [
        "Blood and blood-forming tissues",
        "Cardiovascular",
        "Digestive System",
        "Eye",
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
      "score": 12.105663557182055,
      "matched": [
        {
          "patientTerm": {
            "id": "HP:0001251",
            "label": "Ataxia"
          },
          "diseaseTerm": {
            "id": "HP:0000365",
            "label": "Hearing impairment"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Excluded",
            "source": "OMIM:617394",
            "raw": "0/4"
          },
          "ancestor": {
            "id": "UPHENO:0005596",
            "label": "decreased multicellular organismal process"
          }
        },
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
            "id": "HP:0002527",
            "label": "Falls"
          },
          "diseaseTerm": {
            "id": "HP:0000365",
            "label": "Hearing impairment"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Excluded",
            "source": "OMIM:617394",
            "raw": "0/4"
          },
          "ancestor": {
            "id": "UPHENO:0049699",
            "label": "nervous system process phenotype"
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
            "id": "HP:0031833",
            "label": "Hypometric upward saccades"
          },
          "diseaseTerm": {
            "id": "HP:0000365",
            "label": "Hearing impairment"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Excluded",
            "source": "OMIM:617394",
            "raw": "0/4"
          },
          "ancestor": {
            "id": "UPHENO:0002211",
            "label": "sense organ physiology phenotype"
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
      "unmatched": [],
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
            "id": "HP:0011985",
            "label": "Acholic stools"
          },
          "frequency": {
            "label": "Frequent",
            "source": "OMIM:617394",
            "raw": "6/11"
          }
        }
      ],
      "contradicted": [],
      "categories": [
        "Cardiovascular",
        "Digestive System",
        "Ear",
        "Genitourinary system",
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
            "id": "HP:0003651",
            "label": "Foam cells"
          },
          "diseaseTerm": {
            "id": "HP:0001923",
            "label": "Reticulocytosis"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:33574"
          },
          "ancestor": {
            "id": "UPHENO:0079539",
            "label": "increased number of cell"
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
            "id": "HP:0031833",
            "label": "Hypometric upward saccades"
          },
          "diseaseTerm": {
            "id": "HP:0001251",
            "label": "Ataxia"
          },
          "via": "ancestor",
          "frequency": {
            "label": "Occasional",
            "source": "ORPHA:33574"
          },
          "ancestor": {
            "id": "UPHENO:0079826",
            "label": "behavior process phenotype"
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
      "unmatched": [],
      "notReported": [
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
    "hpo": "unknown",
    "monarch": "v3 API",
    "fetchedAt": "2026-10-24T18:13:03.562Z",
    "orphanet": "2026-06-23"
  }
};

/** Recorded POST /api/next-questions response for NPC1_QUESTION_CANDIDATES. */
const RECORDED_QUESTIONS: NextQuestionsResponse = {
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
        }
      ],
      "why": "Obligate (4/4) in Niemann-Pick disease, type C1; not listed for Ichthyosis-hepatosplenomegaly-cerebellar degeneration syndrome; listed without a frequency for Niemann-Pick disease, type C2",
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
        }
      ],
      "why": "Obligate (4/4) in Niemann-Pick disease, type C1; not listed for Ichthyosis-hepatosplenomegaly-cerebellar degeneration syndrome; listed without a frequency for Niemann-Pick disease, type C2",
      "score": 1
    },
    {
      "hpoId": "HP:0002066",
      "label": "Gait ataxia",
      "question": "Has anyone noticed gait ataxia?",
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
          "frequency": null
        }
      ],
      "why": "Obligate (4/4) in Niemann-Pick disease, type C1; not listed for Ichthyosis-hepatosplenomegaly-cerebellar degeneration syndrome; not listed for Niemann-Pick disease, type C2",
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
        }
      ],
      "why": "Not listed for Niemann-Pick disease, type C1; not listed for Ichthyosis-hepatosplenomegaly-cerebellar degeneration syndrome; Obligate (1/1) in Niemann-Pick disease, type C2",
      "score": 1
    },
    {
      "hpoId": "HP:0001250",
      "label": "Seizure",
      "question": "Has anyone noticed seizure?",
      "discriminates": [
        {
          "diseaseId": "OMIM:257220",
          "frequency": {
            "label": "Very frequent",
            "source": "OMIM:257220",
            "raw": "12/14"
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
        }
      ],
      "why": "Very frequent (12/14) in Niemann-Pick disease, type C1; not listed for Ichthyosis-hepatosplenomegaly-cerebellar degeneration syndrome; listed without a frequency for Niemann-Pick disease, type C2",
      "score": 0.9
    }
  ],
  "dataVersions": {
    "hpo": "unknown",
    "fetchedAt": "2026-10-24T18:13:10.857Z"
  }
};

/** Recorded GET /api/trials response for NPC1_TRIALS_CONDITION. */
const RECORDED_TRIALS: TrialsResponse = {
  "version": "0.1",
  "source": "live",
  "studies": [
    {
      "nctId": "NCT07236190",
      "title": "Biomarker-based Trial of NPC-1 for Alzheimer's Pathology",
      "status": "RECRUITING",
      "phases": [
        "PHASE2"
      ],
      "conditions": [
        "Alzheimer Disease",
        "Mild Cognitive Impairment (MCI)",
        "Subjective Cognitive Decline (SCD)"
      ],
      "countries": [
        "United States"
      ],
      "url": "https://clinicaltrials.gov/study/NCT07236190"
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
  "total": 1,
  "fetchedAt": "2026-10-24T18:13:11.019Z",
  "dataVersions": {
    "fetchedAt": "2026-10-24T18:13:11.019Z"
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
