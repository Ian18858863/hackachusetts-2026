# Held-out evidence for PubCaseFinder ordering (T36c)

> Copied on 2026-10-24 (18:30 ET) from two coordinator handoff notes, so that the numbers in the README are in the repo. Tables are unchanged. Our own small evaluation on published cases; not a clinical validation.

Why this file exists: T36c switched `/api/rank` to PubCaseFinder ordering (`RDD_RANK_SOURCE = "pcf"`) under Ian's rule "flip if the hit rate improves". The decision rests on the 20 held-out cases below (Peter's 10 plus Jerry's 10), which were picked after the 14-case runs in [ranking-benchmark.md](ranking-benchmark.md).

Selection rule (as recorded by the coordinator): open-access PMC case reports with a confirmed diagnosis, not demo diseases, picked by each teammate; HPO ids checked on hpo.jax.org. Jerry's 10 cases are cases 1-10 of the pre-registered 50-case benchmark, the only ones PubCaseFinder answered before it rate-limited the run (HTTP 429); per-case ranks and the sampling rule are in [ranking-benchmark-50.md](ranking-benchmark-50.md) Part 2 (Monarch 3/5/6, PubCaseFinder 3/5/5 top-1/3/10).

Caveats: small samples; PubCaseFinder is built partly from published case reports, so these published cases may already be in its data (possible leakage) and results are likely optimistic.

Related: [pcf-ranking.md](pcf-ranking.md) (T11p, PubCaseFinder evaluation) and [ranking-benchmark-50.md](ranking-benchmark-50.md) (pre-registered 50-case benchmark).

## 1. Peter's 10 cases, run by the coordinator


Cases: 10 open-access PMC case reports with a confirmed diagnosis, picked by Peter (not demo diseases). Notes are Peter's plain-language rewrites; "curated" = Peter's HPO ids verified on hpo.jax.org. Source data: handoff/peter33_cases.json.
Free-text = POST /api/extract on the note, then /api/rank (limit 10). Curated = /api/rank on Peter's HPO ids (limit 10). PubCaseFinder = pcf_get_ranked_list target=omim on Peter's HPO ids.

| # | Disease | Free-text rank (prod) | Curated rank, Monarch (prod) | Curated rank, PubCaseFinder | PCF latency |
|---|---|---|---|---|---|
| 1 | Fabry disease | not in top 10 | not in top 10 | 1 | 14.1 s |
| 2 | Maple syrup urine disease | not in top 10 | 1 | 3 | 11.4 s |
| 3 | Late-onset Pompe disease | not in top 10 | not in top 10 | 2248 | 13.8 s |
| 4 | X-linked adrenoleukodystrophy | extract TIMEOUT (15 s) | not in top 10 | 1474 | 11.3 s |
| 5 | Achondroplasia | not in top 10 | not in top 10 | 1 | 16.9 s |
| 6 | Osteogenesis imperfecta type I | 2 | 1 | 1 | 14.7 s |
| 7 | Hereditary angioedema type II | 1 | 1 | 1 | 15.9 s |
| 8 | Sotos syndrome | not in top 10 | not in top 10 | 6 | 24.9 s |
| 9 | Rett syndrome | extract TIMEOUT (15 s) | not in top 10 | 688 | 11.8 s |
| 10 | Friedreich ataxia | not in top 10 | not in top 10 | 39 | 14.9 s |

Top-1 / top-3 / top-10: free-text prod 1/2/2; curated Monarch 3/3/3; curated PubCaseFinder 4/5/6.
Combined with Jerry's 10 held-out cases where both sources answered (Monarch 3/5/6, PCF 3/5/5): 20 held-out cases, Monarch 6/8/9 vs PubCaseFinder 7/10/11. Small sample; PubCaseFinder may include these published reports (possible leakage).
Reliability: 2 of 10 real free-text notes hit the 15 s extraction timeout on production.

## 2. Coordinator check of PubCaseFinder on the 14 benchmark cases


Same 14 cases as docs/research/ranking-benchmark.md: 4 demo cases from CONTRACT §9 (the observed terms; for demo-npc1 the 12 present terms) plus the 10 phenopacket-store cases picked by the pre-registered rule. The case ids reproduced exactly.
PubCaseFinder: GET https://pubcasefinder.dbcls.jp/api/pcf_get_ranked_list?target=omim&format=json&hpo_id=<sorted ids>. Excluded terms are not used. Monarch ranks are from the 13:04 ET run in ranking-benchmark.md.

| Case | Expected | n terms | Monarch rank | PubCaseFinder rank |
|---|---|---|---|---|
| demo-npc1 | OMIM:257220 NPC1 | 12 | 1 | 1 |
| demo-dmd | OMIM:310200 DMD | 12 | 40 | 3 |
| demo-marfan | OMIM:154700 Marfan | 9 | >50 | 1 |
| demo-kabuki | OMIM:147920 Kabuki 1 | 14 | >50 | 1 |
| demo-cdls | OMIM:122470 CdLS 1 | 9 | >50 | 1 |
| PMID_15266616_100 | OMIM:147791 Jacobsen | 7 | >50 | 1424 |
| PMID_14742428_DM | OMIM:620698 MSUD Ib | 6 | 1 | 1 |
| PMID_37913506_II_3 | OMIM:620734 HCM 30 | 4 | 2 | 603 |
| PMID_33275657_Family_A_III_2 | OMIM:301071 Thrombophilia 13 | 1 | >50 | 36 |
| PMID_26153216_Patient_1 | OMIM:616977 IDD AD 43 | 13 | >50 | 2 |
| PMID_39623139_Patient_1 | OMIM:621056 TIMES | 26 | 1 | 1 |
| PMID_27900365_patient | OMIM:257220 NPC1 | 12 | 1 | 1 |
| PMID_39132680_Family_1_16DG0991 | OMIM:620962 PFIC 13 | 12 | 1 | 1 |
| PMID_38609546_patient_P1 | OMIM:620795 AIFEID | 10 | 1 | 1 |
| PMID_18423521_Patient_1a | OMIM:113620 BOFS | 5 | >50 | 1 |

Summary (14 cases): top-1 Monarch 5 → PubCaseFinder 10; top-3 6 → 12. Non-demo 10: top-1 5 → 6, top-3 6 → 7.
Caveats: small sample; PubCaseFinder is built partly from published case reports, and these cases come from publications, so results are likely optimistic (possible leakage). PubCaseFinder loses two cases Monarch had (HCM 30: 2 → 603). Not a clinical validation.
Live check of the DMD symptom set from a Chinese free-text note (Gait disturbance, Frequent falls, Difficulty climbing stairs, Gowers sign): production /api/rank top 5 = hereditary progressive chorea without dementia, myoclonus familial 1, atonic-astatic syndrome of Foerster, CMT 1D, bagassosis.

## 3. The same 14 cases through our own /api/rank with PubCaseFinder ordering (T36c)

`node scripts/rank-benchmark.mjs http://127.0.0.1:8858 --limit 10` on a local `wrangler pages dev` of branch `ian/t36c-pcf-primary`, 2026-10-24 22:17 UTC: top-1 9/14, top-3 10/14, top-10 11/14; 13 cases ordered by PubCaseFinder, 1 by the Monarch fallback after the 12 s wait. Per-case table: T36c QA report.
