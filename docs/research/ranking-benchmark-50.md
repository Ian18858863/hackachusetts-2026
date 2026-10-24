# Ranking benchmark on 50 held-out phenopacket-store cases (T07, Ian instruction #30)

Our own evaluation of three ranking methods on published cases. Not a clinical validation. Nothing here is medical advice or a diagnosis.

## Part 1. Pre-registration (written before any ranking request)

Pre-registered at **2026-10-24 17:36:34 EDT** by Jerry's Kiro, before any Monarch or PubCaseFinder request for these cases. The sha256 of this Part 1 text was recorded outside the repository at the same time (`~/hackachusetts-2026-T07-bench50-preregistration.txt`) and is repeated in Part 2. Part 1 is not edited after that point.

### Source

- `monarch-initiative/phenopacket-store`, pinned commit `85ffd78f3c17442a7dbb143df916ed6f8680066e` (the `main` commit at selection time).
- Folder list: every `notebooks/<name>` directory in the git tree of that commit (732 folders), sorted by Unicode code point (identical to JavaScript's default sort for these ASCII names).

### Exclusions

- Demo folders (CONTRACT §9): `DMD`, `FBN1`, `KMT2D`, `NIPBL`.
- The 10 folders used in T23 (`docs/research/ranking-benchmark.md`, phenopacket-store selection): `11q_terminal_deletion`, `BCKDHB`, `CORIN`, `F8`, `HIVEP2`, `LRRC8C`, `NPC1`, `PSKH1`, `SHARPIN`, `TFAP2A`.
- All 14 were present in the tree. Eligible folders: N = 718.

### Sampling rule

- Case k (k = 0..49) is eligible folder number `floor(k * N / 50)` (0-based) in the sorted eligible list. With N = 718 the indices are: 0, 14, 28, 43, 57, 71, 86, 100, 114, 129, 143, 157, 172, 186, 201, 215, 229, 244, 258, 272, 287, 301, 315, 330, 344, 359, 373, 387, 402, 416, 430, 445, 459, 473, 488, 502, 516, 531, 545, 560, 574, 588, 603, 617, 631, 646, 660, 674, 689, 703.
- In that folder, the source is the first file in sorted order matching `notebooks/<folder>/phenopackets/*.json` (direct children only).
- Observed terms: the `type.id` of every `phenotypicFeatures` entry without `excluded: true` whose id starts with `HP:`; deduplicated and sorted. Excluded features are not used (none of the three methods uses excluded terms).
- Expected disease: `interpretations[0].diagnosis.disease.id`.

### Skip rules (mechanical, fixed now)

A case is skipped only if: no matching JSON file; the file cannot be fetched or parsed; zero observed HP terms; no `interpretations[0].diagnosis.disease.id`; or more than 50 observed terms (CONTRACT §7.4 cap). A skipped case is **not replaced**. Applying these rules to the inputs (no ranking data involved) skipped **0 of 50** cases.

### Denominator and failures

- The denominator is **50 for every method**, always.
- If a method's request for a case fails after retries (timeout, non-2xx, unusable body), that case counts as a **miss** for that method and is listed as an upstream failure. It is never dropped or replaced. Accuracy over successfully answered cases is reported as a secondary number.
- Accuracy at k = the number of cases whose expected disease is at rank ≤ k, divided by 50.

### Methods

- **A. Monarch semsim** (CONTRACT §7.4 step 2): `GET https://api.monarchinitiative.org/v3/api/semsim/search/<sorted observed ids joined by ,>/Human%20Diseases?limit=50`. 50 is the API maximum, used so that the top 50 for method C is available. The order is Monarch's as returned (no engine merging or re-ranking).
- **B. PubCaseFinder**: `GET https://pubcasefinder.dbcls.jp/api/pcf_get_ranked_list?target=omim&format=json&hpo_id=<sorted observed ids joined by ,>`, the ids URL-encoded with `encodeURIComponent`. Rank = position in the returned list (1-based).
- **C. Reciprocal rank fusion**: union of the top 50 of A and B; score = sum over methods of `1 / (60 + rank)` (1-based rank); a method that does not list a disease in its top 50 contributes nothing; ties broken by the better best-rank, then by key in code-point order.

### Identifier matching (fixed now)

- Expected ids are OMIM for all 50 cases (checked from the inputs).
- **A** returns MONDO ids. A Monarch candidate matches if the expected `OMIM:n` is in that candidate's own `xref` list in the same Monarch response. No name matching, no external mapping.
- **B** returns OMIM ids. A candidate matches if its id equals the expected id, after normalising `OMIM:` prefix spelling only.
- **C** keys: a Monarch candidate is keyed by its MONDO id; a PubCaseFinder OMIM id is merged into a Monarch key only if that OMIM id is in the `xref` list of a Monarch candidate in the same case's top 50 (the first such candidate in Monarch rank order); otherwise it keeps its OMIM key. The expected disease's RRF rank is the best rank of any key that matches by the rules above.
- Anything that cannot be resolved by these rules is reported as unresolved, not guessed. Original returned ids are kept in the raw results file.

### Selected cases

| # | eligible index | folder | source | expected | observed terms |
|---|---|---|---|---|---|
| 1 | 0 | `AAGAB` | `notebooks/AAGAB/phenopackets/PMID_24573067_CASE_REPORT.json` | OMIM:148600 | 3 |
| 2 | 14 | `ADAMTSL2` | `notebooks/ADAMTSL2/phenopackets/PMID_27057656_patient.json` | OMIM:231050 | 16 |
| 3 | 28 | `AMN` | `notebooks/AMN/phenopackets/PMID_26040326_eldest_sister_III_1.json` | OMIM:618882 | 3 |
| 4 | 43 | `ARID2` | `notebooks/ARID2/phenopackets/PMID_26238514_Patient_1.json` | OMIM:617808 | 13 |
| 5 | 57 | `ATP6V1B1` | `notebooks/ATP6V1B1/phenopackets/PMID_22509993_Case_I.json` | OMIM:267300 | 14 |
| 6 | 71 | `BCKDK` | `notebooks/BCKDK/phenopackets/PMID_22956686_1435_IV_6.json` | OMIM:614923 | 8 |
| 7 | 86 | `CARD9` | `notebooks/CARD9/phenopackets/PMID_19864672_Patient_1M.json` | OMIM:212050 | 2 |
| 8 | 100 | `CDK10` | `notebooks/CDK10/phenopackets/PMID_28886341_Individual_F1_II_1.json` | OMIM:617694 | 24 |
| 9 | 114 | `CHSY1` | `notebooks/CHSY1/phenopackets/PMID_24269551_patient_IV_1.json` | OMIM:605282 | 7 |
| 10 | 129 | `COL2A1` | `notebooks/COL2A1/phenopackets/PMID_28841907_boy.json` | OMIM:108300 | 16 |
| 11 | 143 | `CPAP` | `notebooks/CPAP/phenopackets/PMID_16900296_IV_3.json` | OMIM:608393 | 3 |
| 12 | 157 | `DAND5` | `notebooks/DAND5/phenopackets/PMID_34215651_Proband_16.json` | OMIM:621079 | 8 |
| 13 | 172 | `DHX9` | `notebooks/DHX9/phenopackets/PMID_37369308_patient.json` | OMIM:620988 | 18 |
| 14 | 186 | `DTNA` | `notebooks/DTNA/phenopackets/PMID_36799992_A_III_1.json` | OMIM:620971 | 7 |
| 15 | 201 | `EPB42` | `notebooks/EPB42/phenopackets/PMID_7803799_proband.json` | OMIM:612690 | 6 |
| 16 | 215 | `FANCC` | `notebooks/FANCC/phenopackets/PMID_16429406_first_patient.json` | OMIM:227645 | 3 |
| 17 | 229 | `FGFR2` | `notebooks/FGFR2/phenopackets/PMID_23546041_Patient_1.json` | OMIM:101200 | 16 |
| 18 | 244 | `FTH1` | `notebooks/FTH1/phenopackets/PMID_37660254_Patient_1.json` | OMIM:620669 | 18 |
| 19 | 258 | `GGCX` | `notebooks/GGCX/phenopackets/PMID_17110937_Patient_1.json` | OMIM:610842 | 9 |
| 20 | 272 | `GPSM2` | `notebooks/GPSM2/phenopackets/PMID_27180139_case_1.json` | OMIM:604213 | 12 |
| 21 | 287 | `HMGCS2` | `notebooks/HMGCS2/phenopackets/PMID_11228257_Patient_1.json` | OMIM:605911 | 5 |
| 22 | 301 | `IKZF2` | `notebooks/IKZF2/phenopackets/PMID_34826259_index_patient.json` | OMIM:621233 | 16 |
| 23 | 315 | `JKAMP` | `notebooks/JKAMP/phenopackets/PMID_41643666_F10_II_1.json` | OMIM:621533 | 12 |
| 24 | 330 | `KIF5A` | `notebooks/KIF5A/phenopackets/PMID_15452312_III_10.json` | OMIM:604187 | 7 |
| 25 | 344 | `LGI1` | `notebooks/LGI1/phenopackets/PMID_40455867_P1A.json` | OMIM:621475 | 9 |
| 26 | 359 | `LYZ` | `notebooks/LYZ/phenopackets/PMID_10534505_III4.json` | OMIM:620658 | 2 |
| 27 | 373 | `MCOLN1` | `notebooks/MCOLN1/phenopackets/PMID_15523648_A_four_year_old_female.json` | OMIM:252650 | 13 |
| 28 | 387 | `MOCS3` | `notebooks/MOCS3/phenopackets/PMID_28544736_PID_0577877.json` | OMIM:621373 | 26 |
| 29 | 402 | `MYZAP` | `notebooks/MYZAP/phenopackets/PMID_35840178_brother_of_proband_II_2.json` | OMIM:620894 | 5 |
| 30 | 416 | `NHLRC1` | `notebooks/NHLRC1/phenopackets/PMID_15781812_individual_103.json` | OMIM:620681 | 4 |
| 31 | 430 | `NRAP` | `notebooks/NRAP/phenopackets/PMID_28611399_proband.json` | OMIM:621595 | 8 |
| 32 | 445 | `OTUD6B` | `notebooks/OTUD6B/phenopackets/PMID_30364145_proband.json` | OMIM:617452 | 21 |
| 33 | 459 | `PDGFRB` | `notebooks/PDGFRB/phenopackets/PMID_33450762_P1_Mother.json` | OMIM:621091 | 3 |
| 34 | 473 | `PMP22` | `notebooks/PMP22/phenopackets/PMID_29078790_proband.json` | OMIM:162500 | 4 |
| 35 | 488 | `PPP2R5C` | `notebooks/PPP2R5C/phenopackets/PMID_39978342_P1.json` | OMIM:621185 | 10 |
| 36 | 502 | `PTCH1` | `notebooks/PTCH1/phenopackets/PMID_42462758_Family_1_Patient_1.json` | OMIM:109400 | 17 |
| 37 | 516 | `RAP1GDS1` | `notebooks/RAP1GDS1/phenopackets/PMID_32431071_Family_1_IV_10.json` | OMIM:620655 | 11 |
| 38 | 531 | `RNF31` | `notebooks/RNF31/phenopackets/PMID_26008899_patient.json` | OMIM:620632 | 24 |
| 39 | 545 | `RUNX2` | `notebooks/RUNX2/phenopackets/PMID_24966961_proband.json` | OMIM:119600 | 13 |
| 40 | 560 | `SEPHS1` | `notebooks/SEPHS1/phenopackets/PMID_38531365_Individual_1.json` | OMIM:621325 | 10 |
| 41 | 574 | `SLC35C1` | `notebooks/SLC35C1/phenopackets/PMID_24403049_Proband_1.json` | OMIM:266265 | 14 |
| 42 | 588 | `SMC3` | `notebooks/SMC3/phenopackets/PMID_17273969_Patient_2P.json` | OMIM:610759 | 9 |
| 43 | 603 | `SPIN4` | `notebooks/SPIN4/phenopackets/PMID_36927955_proband.json` | OMIM:301114 | 12 |
| 44 | 617 | `STXBP1` | `notebooks/STXBP1/phenopackets/PMID_35190816_STX_102.json` | OMIM:612164 | 3 |
| 45 | 631 | `TBL1XR1` | `notebooks/TBL1XR1/phenopackets/PMID_28687524_proband.json` | OMIM:602342 | 23 |
| 46 | 646 | `THAP11` | `notebooks/THAP11/phenopackets/PMID_28449119_patient.json` | OMIM:620940 | 8 |
| 47 | 660 | `TP53RK` | `notebooks/TP53RK/phenopackets/PMID_30053862_Case_II_1.json` | OMIM:617730 | 13 |
| 48 | 674 | `TSPOAP1` | `notebooks/TSPOAP1/phenopackets/PMID_33539324_C_II_1.json` | OMIM:620456 | 2 |
| 49 | 689 | `VPS13A` | `notebooks/VPS13A/phenopackets/PMID_28446873_Case_1.json` | OMIM:200150 | 11 |
| 50 | 703 | `WWOX` | `notebooks/WWOX/phenopackets/PMID_24369382_Family_1_II_1.json` | OMIM:614322 | 8 |

Inputs (observed ids, expected id, phenopacket id) for every case: `engine/bench/cases50.json`.

## Part 2. Results (appended after the run; Part 1 above is unchanged)

Primary run: `node bench/bench50.mjs` from `engine/`, started 2026-10-24T21:39:44.751Z, finished 2026-10-24T21:42:17.748Z (153.0 s). Concurrency 3 per upstream, 90 s timeout, 2 retries with 2 s / 4 s backoff on 429, 5xx, network error or timeout. Raw results with the original returned ids: `engine/bench/results50.json`.

### Summary (denominator 50 for every method, as pre-registered)

| Method | Top-1 | Top-3 | Top-10 | Cases answered |
|---|---|---|---|---|
| A. Monarch semsim | 19/50 (38%) | 23/50 (46%) | 30/50 (60%) | 50/50 |
| B. PubCaseFinder | 3/50 (6%) | 5/50 (10%) | 5/50 (10%) | 10/50 |
| C. RRF (A + B) | 18/50 (36%) | 22/50 (44%) | 33/50 (66%) | 50/50 (B data for only 10) |

**The comparison is not valid for B or C.** PubCaseFinder answered only cases 1-10. Cases 11-50 failed with HTTP 429 (rate limited) after 3 attempts each, so by the pre-registered rule they count as misses for B, and C for those cases is Monarch's ranking alone. B's 3/5/5 and C's numbers therefore mostly measure the rate limit, not the method.

Secondary numbers, on the 10 cases PubCaseFinder answered (not pre-registered as a primary result; a small subset, shown only for context):

| Method | Top-1 | Top-3 | Top-10 |
|---|---|---|---|
| A. Monarch | 3/10 | 5/10 | 6/10 |
| B. PubCaseFinder | 3/10 | 5/10 | 5/10 |
| C. RRF | 2/10 | 4/10 | 9/10 |

### Upstream failures

- Monarch: 0 failures, 50/50 answered, no retries needed.
- PubCaseFinder: cases 11-50 (40 cases) failed with HTTP 429 after 3 attempts each. The 429 responses had no `Retry-After` header.
- Supplementary retry (`node bench/bench50-pcf-retry.mjs`, one request every 8 s, results in `engine/bench/results50-pcf-retry.json`): cases 11-16 still got HTTP 429 (21:43:56-21:44:39 UTC). It was stopped after 6 attempts so as not to keep hitting a throttled service. These retries changed no result.

### Identifier matching

- All 50 expected ids are OMIM. No unresolved identifier mappings in the matched results.
- Case 4 (ARID2, OMIM:617808): Monarch misses it under the xref rule. A separate Monarch search shows MONDO:0033492 "Coffin-Siris syndrome 6" has that xref, so the miss is ranking, not identifiers.
- Monarch misses in other cases were not individually checked for identifier gaps. Where both methods miss, it is not known whether a MONDO entity carries the expected OMIM xref.

### Per-case results

Ranks are 1-based positions in each method's top 50; — means not in the top 50 (or no data). The ✓/✗ columns give top-1, top-3, top-10.

| # | folder | expected | obs | Monarch | PCF | RRF | A 1/3/10 | B 1/3/10 | C 1/3/10 | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `AAGAB` | OMIM:148600 | 3 | 12 | 2 | 4 | ✗✗✗ | ✗✓✓ | ✗✗✓ |  |
| 2 | `ADAMTSL2` | OMIM:231050 | 16 | 27 | 30 | 6 | ✗✗✗ | ✗✗✗ | ✗✗✓ |  |
| 3 | `AMN` | OMIM:618882 | 3 | 2 | 2 | 2 | ✗✓✓ | ✗✓✓ | ✗✓✓ |  |
| 4 | `ARID2` | OMIM:617808 | 13 | — | 1 | 9 | ✗✗✗ | ✓✓✓ | ✗✗✓ | Monarch: MONDO:0033492 (xref OMIM:617808) not in Monarch top 50; identifier is mappable, so a ranking miss |
| 5 | `ATP6V1B1` | OMIM:267300 | 14 | 1 | 1 | 1 | ✓✓✓ | ✓✓✓ | ✓✓✓ |  |
| 6 | `BCKDK` | OMIM:614923 | 8 | 1 | — | 3 | ✓✓✓ | ✗✗✗ | ✗✓✓ | PCF position 76 (below top 50) |
| 7 | `CARD9` | OMIM:212050 | 2 | 3 | 15 | 6 | ✗✓✓ | ✗✗✗ | ✗✗✓ |  |
| 8 | `CDK10` | OMIM:617694 | 24 | 1 | 1 | 1 | ✓✓✓ | ✓✓✓ | ✓✓✓ |  |
| 9 | `CHSY1` | OMIM:605282 | 7 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PCF position 119 (below top 50) |
| 10 | `COL2A1` | OMIM:108300 | 16 | 4 | — | 8 | ✗✗✓ | ✗✗✗ | ✗✗✓ | PCF position 109 (below top 50) |
| 11 | `CPAP` | OMIM:608393 | 3 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 12 | `DAND5` | OMIM:621079 | 8 | 5 | — | 5 | ✗✗✓ | ✗✗✗ | ✗✗✓ | PubCaseFinder failed: HTTP 429 |
| 13 | `DHX9` | OMIM:620988 | 18 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |
| 14 | `DTNA` | OMIM:620971 | 7 | 3 | — | 3 | ✗✓✓ | ✗✗✗ | ✗✓✓ | PubCaseFinder failed: HTTP 429 |
| 15 | `EPB42` | OMIM:612690 | 6 | 4 | — | 4 | ✗✗✓ | ✗✗✗ | ✗✗✓ | PubCaseFinder failed: HTTP 429 |
| 16 | `FANCC` | OMIM:227645 | 3 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 17 | `FGFR2` | OMIM:101200 | 16 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 18 | `FTH1` | OMIM:620669 | 18 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |
| 19 | `GGCX` | OMIM:610842 | 9 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |
| 20 | `GPSM2` | OMIM:604213 | 12 | 27 | — | 27 | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 21 | `HMGCS2` | OMIM:605911 | 5 | 3 | — | 3 | ✗✓✓ | ✗✗✗ | ✗✓✓ | PubCaseFinder failed: HTTP 429 |
| 22 | `IKZF2` | OMIM:621233 | 16 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |
| 23 | `JKAMP` | OMIM:621533 | 12 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 24 | `KIF5A` | OMIM:604187 | 7 | 7 | — | 7 | ✗✗✓ | ✗✗✗ | ✗✗✓ | PubCaseFinder failed: HTTP 429 |
| 25 | `LGI1` | OMIM:621475 | 9 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 26 | `LYZ` | OMIM:620658 | 2 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 27 | `MCOLN1` | OMIM:252650 | 13 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 28 | `MOCS3` | OMIM:621373 | 26 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |
| 29 | `MYZAP` | OMIM:620894 | 5 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |
| 30 | `NHLRC1` | OMIM:620681 | 4 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |
| 31 | `NRAP` | OMIM:621595 | 8 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 32 | `OTUD6B` | OMIM:617452 | 21 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 33 | `PDGFRB` | OMIM:621091 | 3 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 34 | `PMP22` | OMIM:162500 | 4 | 10 | — | 10 | ✗✗✓ | ✗✗✗ | ✗✗✓ | PubCaseFinder failed: HTTP 429 |
| 35 | `PPP2R5C` | OMIM:621185 | 10 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 36 | `PTCH1` | OMIM:109400 | 17 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |
| 37 | `RAP1GDS1` | OMIM:620655 | 11 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |
| 38 | `RNF31` | OMIM:620632 | 24 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |
| 39 | `RUNX2` | OMIM:119600 | 13 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 40 | `SEPHS1` | OMIM:621325 | 10 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |
| 41 | `SLC35C1` | OMIM:266265 | 14 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |
| 42 | `SMC3` | OMIM:610759 | 9 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 43 | `SPIN4` | OMIM:301114 | 12 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |
| 44 | `STXBP1` | OMIM:612164 | 3 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 45 | `TBL1XR1` | OMIM:602342 | 23 | 5 | — | 5 | ✗✗✓ | ✗✗✗ | ✗✗✓ | PubCaseFinder failed: HTTP 429 |
| 46 | `THAP11` | OMIM:620940 | 8 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |
| 47 | `TP53RK` | OMIM:617730 | 13 | 4 | — | 4 | ✗✗✓ | ✗✗✗ | ✗✗✓ | PubCaseFinder failed: HTTP 429 |
| 48 | `TSPOAP1` | OMIM:620456 | 2 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |
| 49 | `VPS13A` | OMIM:200150 | 11 | — | — | — | ✗✗✗ | ✗✗✗ | ✗✗✗ | PubCaseFinder failed: HTTP 429 |
| 50 | `WWOX` | OMIM:614322 | 8 | 1 | — | 1 | ✓✓✓ | ✗✗✗ | ✓✓✓ | PubCaseFinder failed: HTTP 429 |

### Reading the result

- Monarch alone: top-1 38%, top-3 46%, top-10 60% on 50 held-out published cases. These cases may already feed the disease annotations, so this is likely optimistic (as in CONTRACT §12). Not a clinical validation.
- On the 10 cases with both methods, RRF's top-10 was higher than Monarch's (9 vs 6) but top-1 lower (2 vs 3). 10 cases are too few to decide anything.
- A valid B/C comparison needs PubCaseFinder at a rate it accepts: for example one request a minute, or a later run.
