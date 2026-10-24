Not shipped: pre-registered test showed no recall gain; /api/rank does not use this.

# Ranking benchmark: Monarch semsim vs a frequency-aware re-rank (T23)

Development research by Ian's Kiro (rdd-builder), 2026-10-24. Our own evaluation on a small sample. Not a clinical validation. Demo cases are synthetic (docs/CONTRACT.md §9). Nothing here is medical advice or a diagnosis.

## Decision

Added 2026-10-24 13:08 ET, after the results below. The frequency-aware re-rank did not improve recall on this pre-registered evaluation (top-1 5 → 4, top-3 6 → 6, top-10 6 → 6 over 14 cases), so it is not shipped in `/api/rank`. The app shows Monarch's order with the frequency evidence from HPO annotations. `functions/_lib/rerank.ts` stays in the repo as the tested implementation of the method below.

## Method (pre-registered 2026-10-24 12:57 ET)

This section was written and saved before any benchmark result was fetched or computed. Before writing it, Kiro inspected only the field names of two upstream responses (a Monarch semsim call for `HP:0001166,HP:0000098` with `limit=1`, the JAX annotation for `ORPHA:558`, and the children of `HP:0000118`) to name fields correctly. No rank of any benchmark case was looked at. Constants below are fixed now and are not tuned on results.

### Candidate generation

- For each case, call Monarch exactly as in CONTRACT §7.4 step 2 / §10: `GET https://api.monarchinitiative.org/v3/api/semsim/search/<observed ids, deduplicated, sorted, comma-joined>/Human%20Diseases?limit=50`. N = 50. Excluded terms are not sent (Monarch does not use them).
- "Rank before" = 1-based position in Monarch's returned order. If the expected disease is not among the 50, rank before is reported as "> 50".

### Evidence per candidate

- Annotation id: from the Monarch result's `subject.xref`, prefer the Orphanet xref normalised to `ORPHA:<n>`, else the `OMIM:` xref. Call `GET https://ontology.jax.org/api/network/annotation/<id>`. If that call fails or returns zero phenotype entries, try the other id (OMIM if ORPHA was tried first). If neither gives phenotype entries, the candidate is **unscored**.
- Phenotype entries are all items in `categories.*`. Frequency comes from `metadata.frequency`, normalised to an HPO band with the CONTRACT §5 rule (band names as given; `n/m` and `x%` mapped to Obligate 100%, Very frequent 80–99%, Frequent 30–79%, Occasional 5–29%, Very rare 1–4%, Excluded 0%; empty or unknown = unspecified). If one term appears more than once, its highest midpoint is used.
- Grouping terms: a Monarch match counts only if its `match_subsumer` is not `HP:0000001`, not `HP:0000118` and not a direct child of `HP:0000118` (CONTRACT §7.4 step 5). The children of `HP:0000118` are fetched from `https://ontology.jax.org/api/hp/terms/HP:0000118/children` and cached.

### Score (likelihood ratios in log10 space)

In the spirit of LIRICAL (Robinson et al., Am J Hum Genet 2020: per-feature likelihood ratios, summed in log space) and Phenomizer (Köhler et al., Am J Hum Genet 2009: ontology-aware matching with partial credit through shared ancestors). Uniform prior over the candidate pool, so the posterior order equals the order of the summed log10 LR.

Constants:

| Constant | Value | Justification |
|---|---|---|
| Band midpoints | Obligate 1.0, Very frequent 0.895, Frequent 0.545, Occasional 0.17, Very rare 0.025, Excluded 0 | Midpoints of the HPO frequency ranges (HP:0040280–HP:0040285: 100%, 80–99%, 30–79%, 5–29%, 1–4%, 0%) |
| Unspecified frequency | 0.5 | No information either way; same default as CONTRACT §7.5 step 2 so the app stays consistent |
| ε (floor) | 0.01 | Probability that a feature is reported although the disease is not annotated with it (annotation gaps, phenotyping noise). Equal to the lower edge of the HPO "Very rare" band (1%). Also floors 1 − p for excluded Obligate features so no score is −∞ |
| r (mention rate) | 0.5 | Assumed probability that parent notes mention a feature that is present. No data; 0.5 is the uninformative midpoint, chosen to reflect that notes are incomplete |
| K (missing-feature cap) | 3 | A few sentences of notes mention only a handful of features, so at most 3 missing hallmarks are penalised per disease; richly annotated diseases are not penalised for their extra annotations |

Per candidate D in the scored pool P (all scored candidates of this case):

1. **Observed term t.** `p(t|D)`:
   - if t is annotated to D exactly: `p = midpoint(freq)` (unspecified 0.5), floored at ε;
   - else if Monarch's best match for t in D's result (`similarity.object_best_matches[t]`) qualifies (grouping-term rule above): `p = w × m`, where `m` is the midpoint of `match_target` in D's annotations (0.5 if `match_target` is not in D's annotation set) and `w` is that match's `similarity.jaccard_similarity` (overlap of the two terms' ancestor sets, in [0, 1]; 1 for an exact match). Floored at ε. This is the partial credit for an ancestor-level match;
   - else `p = ε`.
   Background `b(t)` = mean of `p(t|D')` over all D' in P (D included). Contribution: `log10(p(t|D) / b(t))`.
2. **Excluded term e** (exact id match only, as CONTRACT §7.4 step 7; ancestor-aware matching is open question 7). `q(e|D)` = midpoint if e is annotated to D exactly, else 0. Contribution: `log10(max(1 − q(e|D), ε) / max(1 − b_x(e), ε))`, with `b_x(e)` = mean of `q(e|D')` over P.
3. **Frequent features never mentioned.** Features f annotated to D as Obligate or Very frequent, with f not observed, not excluded and not the `match_target` of any qualifying best match of D. For each, `factor = min(1, (1 − r·p(f|D)) / (1 − r·b_f(f)))` with `b_f(f)` = mean over P of the exact-annotation midpoint of f (0 when not annotated). The K = 3 smallest factors (ties by HPO id ascending) contribute `log10(factor)` each.
4. **Total** = sum of 1–3. Components are kept per candidate for the UI.
5. **Order.** Scored candidates by total descending, ties by Monarch score descending, then by MONDO id ascending. Unscored candidates follow, in Monarch order. "Rank after" = 1-based position in this list.

### Case selection

- The 4 demo cases of CONTRACT §9 (`demo-dmd`, `demo-marfan`, `demo-kabuki`, `demo-cdls`), observed and excluded terms exactly as listed there, expected diagnosis as listed there.
- 10 phenopacket-store cases chosen by this rule:
  1. List `notebooks/` of `monarch-initiative/phenopacket-store` (default branch) with the GitHub contents API; keep entries of type `dir`; remove the 4 demo folders `DMD`, `FBN1`, `KMT2D`, `NIPBL`; sort names with JavaScript's default string order. Call the count C and set k = floor(C / 10).
  2. Take folder indices 0, k, 2k, …, 9k.
  3. In each folder, list `phenopackets/`, sort names the same way, take the first file ending in `.json`.
  4. Observed = `phenotypicFeatures` without `excluded: true`; excluded = those with `excluded: true`; ids must match `^HP:\d{7}$`. Expected disease = `interpretations[0].diagnosis.disease.id`, else `diseases[0].term.id`.
  5. Mechanical skips only: no `phenopackets/` folder, no `.json` file, zero observed terms, more than 50 observed terms (CONTRACT §7.4 cap), no expected disease id, or a non-2xx Monarch response. A skipped folder is replaced by the next folder index not already chosen. Skips are listed in the results.

### Metrics

- A candidate is the expected disease when its MONDO id equals the expected id, or one of its `subject.xref` values equals it (after normalising `Orphanet:` to `ORPHA:`). The match is strict: a different subtype (e.g. Kabuki syndrome 2 for Kabuki syndrome 1) does not count.
- Per case: rank before, rank after, top 3 after (names).
- Summary: top-1, top-3 and top-10 counts before and after, over all 14 cases and over the 10 non-demo cases.

### Reproducibility

- Every upstream response is cached under `scripts/benchmark-data/` with its URL and fetch time. A second run reads the cache.
- Code: `functions/_lib/rerank.ts` (scoring, pure), `scripts/ranking-benchmark.ts` (fetching, case selection, report).

## Run 1 (2026-10-24 13:02 ET): invalid because of a benchmark bug, kept for the record

**Bug found after this run.** The benchmark's fetch cache treated HTTP 429 (rate limited) as a final answer: 281 of 773 JAX annotation responses in this run were 429 (434 were 200, 58 were 404). Candidates whose annotation call was rate limited became "unscored" and were placed after all scored candidates. That is why three expected diseases show "unscored" below (NPC1, PSKH1, SHARPIN cases) and why two of them dropped (1 → 5, 1 → 2). The fix (in `scripts/ranking-benchmark.ts` only): 429, 5xx and network errors are retried with backoff and never cached as final; annotation concurrency lowered from 8 to 4. No scoring constant or rule in `functions/_lib/rerank.ts` was changed. The corrected run is the next section.

Generated by `node --experimental-strip-types scripts/ranking-benchmark.ts`. Candidate pool: Monarch top 50. "> 50" = not in Monarch's top 50, so the re-rank cannot find it either. Upstream responses cached in `scripts/benchmark-data/` (fetch times inside each file).

Organ-system grouping terms: 23 children of HP:0000118. phenopacket-store selection: 10 cases.

| Case | Expected disease | Rank before (Monarch) | Rank after (re-rank) | Expected disease evidence (annotation id; observed terms credited) | Top 3 after |
|---|---|---|---|---|---|
| `demo-dmd` (demo) | OMIM:310200 Duchenne muscular dystrophy | 40 | 15 | ORPHA:98896; 1 exact + 10 ancestor of 12 | glycogen storage disease due to acid maltase deficiency, late-onset; myopathy with myalgia, increased serum creatine kinase, and with or without episodic rhabdomyolysis 1; XK-related neurodegenerative disease |
| `demo-marfan` (demo) | OMIM:154700 Marfan syndrome | > 50 | > 50 | -; not in pool | progeroid and marfanoid aspect-lipodystrophy syndrome; neonatal Marfan syndrome; cutis laxa, autosomal recessive, type 1B |
| `demo-kabuki` (demo) | OMIM:147920 Kabuki syndrome 1 | > 50 | > 50 | -; not in pool | intellectual disability, X-linked 30; brachycephaly, trichomegaly, and developmental delay; Rauch-Steindl syndrome |
| `demo-cdls` (demo) | OMIM:122470 Cornelia de Lange syndrome 1 | > 50 | > 50 | -; not in pool | Xq27.3q28 duplication syndrome; BRESEK syndrome; craniodigital syndrome-intellectual disability syndrome |
| `PMID_15266616_100` | OMIM:147791 Jacobsen syndrome | > 50 | > 50 | -; not in pool | Leukomelanoderma-infantilism-intellectual disability-hypodontia-hypotrichosis syndrome; FG syndrome 2; syndromic X-linked intellectual disability Shrimpton type |
| `PMID_14742428_DM` | OMIM:620698 Maple syrup urine disease, type Ib | 1 | 1 | OMIM:620698; 6 exact + 0 ancestor of 6 | maple syrup urine disease type 1B; schizophrenia 4; GTP cyclohydrolase I deficiency with hyperphenylalaninemia |
| `PMID_37913506_II_3` | OMIM:620734 Cardiomyopathy, familial hypertrophic, 30, atrial | 2 | 2 | OMIM:620734; 4 exact + 0 ancestor of 4 | hypertrophic cardiomyopathy 18; cardiomyopathy, familial hypertrophic, 30, atrial; cardiomyopathy, familial restrictive, 1 |
| `PMID_33275657_Family_A_III_2` | OMIM:301071 Thrombophilia 13, X-linked, due to factor VIII defect | > 50 | > 50 | -; not in pool | symptomatic form of hemophilia A in female carriers; factor VIII and Factor IX, combined deficiency of; factor VII and Factor VIII, combined deficiency of |
| `PMID_26153216_Patient_1` | OMIM:616977 Intellectual developmental disorder, autosomal dominant 43 | > 50 | > 50 | -; not in pool | developmental delay with sleep apnea; CEBALID syndrome; Brunet-Wagner neurodevelopmental syndrome |
| `PMID_39623139_Patient_1` | OMIM:621056 TIMES syndrome | 1 | 1 | OMIM:621056; 26 exact + 0 ancestor of 26 | telangiectasia, impaired intellectual development, microcephaly, metaphyseal dysplasia, eye abnormalities, and short stature; Cornelia de Lange syndrome 4; chromosome 19q13.11 deletion syndrome, distal |
| `PMID_27900365_patient` | OMIM:257220 Niemann-Pick disease, type C1 | 1 | 5 | -; unscored | Niemann-Pick disease, type C2; congenital bile acid synthesis defect 4; XK-related neurodegenerative disease |
| `PMID_39132680_Family_1_16DG0991` | OMIM:620962 Cholestasis, progressive familial intrahepatic, 13 | 1 | 2 | -; unscored | vitamin B12-responsive methylmalonic acidemia; cholestasis, progressive familial intrahepatic, 13; hyperbilirubinemia, conjugated, type 3 |
| `PMID_38609546_patient_P1` | OMIM:620795 Autoinflammation with episodic fever and immune dysregulation | 1 | 1 | -; unscored | autoinflammation with episodic fever and immune dysregulation; intestinal schistosomiasis; glycoprotein storage disease |
| `PMID_18423521_Patient_1a` | OMIM:113620 Branchiooculofacial syndrome | > 50 | > 50 | -; not in pool | LEOPARD syndrome 2; chromosome 8-derived supernumerary ring/marker; Marie Unna hereditary hypotrichosis |

Summary (counts of cases with the expected disease at or above the rank):

| Set | n | Top-1 before | Top-1 after | Top-3 before | Top-3 after | Top-10 before | Top-10 after | In Monarch top 50 |
|---|---|---|---|---|---|---|---|---|
| All cases | 14 | 5 | 3 | 6 | 5 | 6 | 6 | 7 |
| Demo cases | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| phenopacket-store (non-demo) | 10 | 5 | 3 | 6 | 5 | 6 | 6 | 6 |

Skipped folders (mechanical rule):

- none

Selected phenopacket-store files:

- `notebooks/11q_terminal_deletion/phenopackets/PMID_15266616_100.json` (7 observed, 56 excluded)
- `notebooks/BCKDHB/phenopackets/PMID_14742428_DM.json` (6 observed, 0 excluded)
- `notebooks/CORIN/phenopackets/PMID_37913506_II_3.json` (4 observed, 2 excluded)
- `notebooks/F8/phenopackets/PMID_33275657_Family_A_III_2.json` (1 observed, 4 excluded)
- `notebooks/HIVEP2/phenopackets/PMID_26153216_Patient_1.json` (13 observed, 3 excluded)
- `notebooks/LRRC8C/phenopackets/PMID_39623139_Patient_1.json` (26 observed, 9 excluded)
- `notebooks/NPC1/phenopackets/PMID_27900365_patient.json` (12 observed, 0 excluded)
- `notebooks/PSKH1/phenopackets/PMID_39132680_Family_1_16DG0991.json` (12 observed, 1 excluded)
- `notebooks/SHARPIN/phenopackets/PMID_38609546_patient_P1.json` (10 observed, 2 excluded)
- `notebooks/TFAP2A/phenopackets/PMID_18423521_Patient_1a.json` (5 observed, 12 excluded)

<!-- results:start -->
## Results (2026-10-24 13:04 ET)

Generated by `node --experimental-strip-types scripts/ranking-benchmark.ts`. Candidate pool: Monarch top 50. "> 50" = not in Monarch's top 50, so the re-rank cannot find it either. Upstream responses cached in `scripts/benchmark-data/` (fetch times inside each file).

Organ-system grouping terms: 23 children of HP:0000118. phenopacket-store selection: 10 cases.

| Case | Expected disease | Rank before (Monarch) | Rank after (re-rank) | Expected disease evidence (annotation id; observed terms credited) | Top 3 after |
|---|---|---|---|---|---|
| `demo-dmd` (demo) | OMIM:310200 Duchenne muscular dystrophy | 40 | 15 | ORPHA:98896; 1 exact + 10 ancestor of 12 | glycogen storage disease due to acid maltase deficiency, late-onset; myopathy with myalgia, increased serum creatine kinase, and with or without episodic rhabdomyolysis 1; XK-related neurodegenerative disease |
| `demo-marfan` (demo) | OMIM:154700 Marfan syndrome | > 50 | > 50 | -; not in pool | progeroid and marfanoid aspect-lipodystrophy syndrome; neonatal Marfan syndrome; cutis laxa, autosomal recessive, type 1B |
| `demo-kabuki` (demo) | OMIM:147920 Kabuki syndrome 1 | > 50 | > 50 | -; not in pool | intellectual disability, X-linked 30; brachycephaly, trichomegaly, and developmental delay; Rauch-Steindl syndrome |
| `demo-cdls` (demo) | OMIM:122470 Cornelia de Lange syndrome 1 | > 50 | > 50 | -; not in pool | Xq27.3q28 duplication syndrome; BRESEK syndrome; craniodigital syndrome-intellectual disability syndrome |
| `PMID_15266616_100` | OMIM:147791 Jacobsen syndrome | > 50 | > 50 | -; not in pool | Leukomelanoderma-infantilism-intellectual disability-hypodontia-hypotrichosis syndrome; FG syndrome 2; syndromic X-linked intellectual disability Shrimpton type |
| `PMID_14742428_DM` | OMIM:620698 Maple syrup urine disease, type Ib | 1 | 1 | OMIM:620698; 6 exact + 0 ancestor of 6 | maple syrup urine disease type 1B; schizophrenia 4; GTP cyclohydrolase I deficiency with hyperphenylalaninemia |
| `PMID_37913506_II_3` | OMIM:620734 Cardiomyopathy, familial hypertrophic, 30, atrial | 2 | 2 | OMIM:620734; 4 exact + 0 ancestor of 4 | hypertrophic cardiomyopathy 18; cardiomyopathy, familial hypertrophic, 30, atrial; cardiomyopathy, familial restrictive, 1 |
| `PMID_33275657_Family_A_III_2` | OMIM:301071 Thrombophilia 13, X-linked, due to factor VIII defect | > 50 | > 50 | -; not in pool | symptomatic form of hemophilia A in female carriers; factor VIII and Factor IX, combined deficiency of; factor VII and Factor VIII, combined deficiency of |
| `PMID_26153216_Patient_1` | OMIM:616977 Intellectual developmental disorder, autosomal dominant 43 | > 50 | > 50 | -; not in pool | developmental delay with sleep apnea; CEBALID syndrome; Brunet-Wagner neurodevelopmental syndrome |
| `PMID_39623139_Patient_1` | OMIM:621056 TIMES syndrome | 1 | 1 | OMIM:621056; 26 exact + 0 ancestor of 26 | telangiectasia, impaired intellectual development, microcephaly, metaphyseal dysplasia, eye abnormalities, and short stature; microcephaly, progressive, with simplified gyral pattern and cerebellar hypoplasia; Kariminejad neurodevelopmental syndrome |
| `PMID_27900365_patient` | OMIM:257220 Niemann-Pick disease, type C1 | 1 | 2 | OMIM:257220; 7 exact + 5 ancestor of 12 | Niemann-Pick disease type C; Niemann-Pick disease, type C1; Niemann-Pick disease, type C2 |
| `PMID_39132680_Family_1_16DG0991` | OMIM:620962 Cholestasis, progressive familial intrahepatic, 13 | 1 | 1 | OMIM:620962; 12 exact + 0 ancestor of 12 | cholestasis, progressive familial intrahepatic, 13; mitochondrial DNA depletion syndrome 16 (hepatic type); Fanconi renotubular syndrome 4 with maturity-onset diabetes of the young |
| `PMID_38609546_patient_P1` | OMIM:620795 Autoinflammation with episodic fever and immune dysregulation | 1 | 1 | OMIM:620795; 10 exact + 0 ancestor of 10 | autoinflammation with episodic fever and immune dysregulation; autoinflammatory disease, systemic, with vasculitis; hyperimmunoglobulinemia D with periodic fever |
| `PMID_18423521_Patient_1a` | OMIM:113620 Branchiooculofacial syndrome | > 50 | > 50 | -; not in pool | LEOPARD syndrome 2; chromosome 8-derived supernumerary ring/marker; pterygium colli, isolated |

Summary (counts of cases with the expected disease at or above the rank):

| Set | n | Top-1 before | Top-1 after | Top-3 before | Top-3 after | Top-10 before | Top-10 after | In Monarch top 50 |
|---|---|---|---|---|---|---|---|---|
| All cases | 14 | 5 | 4 | 6 | 6 | 6 | 6 | 7 |
| Demo cases | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| phenopacket-store (non-demo) | 10 | 5 | 4 | 6 | 6 | 6 | 6 | 6 |

Skipped folders (mechanical rule):

- none

Selected phenopacket-store files:

- `notebooks/11q_terminal_deletion/phenopackets/PMID_15266616_100.json` (7 observed, 56 excluded)
- `notebooks/BCKDHB/phenopackets/PMID_14742428_DM.json` (6 observed, 0 excluded)
- `notebooks/CORIN/phenopackets/PMID_37913506_II_3.json` (4 observed, 2 excluded)
- `notebooks/F8/phenopackets/PMID_33275657_Family_A_III_2.json` (1 observed, 4 excluded)
- `notebooks/HIVEP2/phenopackets/PMID_26153216_Patient_1.json` (13 observed, 3 excluded)
- `notebooks/LRRC8C/phenopackets/PMID_39623139_Patient_1.json` (26 observed, 9 excluded)
- `notebooks/NPC1/phenopackets/PMID_27900365_patient.json` (12 observed, 0 excluded)
- `notebooks/PSKH1/phenopackets/PMID_39132680_Family_1_16DG0991.json` (12 observed, 1 excluded)
- `notebooks/SHARPIN/phenopackets/PMID_38609546_patient_P1.json` (10 observed, 2 excluded)
- `notebooks/TFAP2A/phenopackets/PMID_18423521_Patient_1a.json` (5 observed, 12 excluded)
<!-- results:end -->

### Notes on the corrected run

- The timestamp in the "Results" heading is when the table was computed. The upstream data were fetched during run 1 and the corrected run (2026-10-24, about 13:00–13:04 ET); each cache file holds its own `fetchedAt`. Rerunning the script from the cache reproduces the table exactly (checked by diffing the report with only the timestamp line removed).
- Cache housekeeping after the fix: the 51 cached 429 responses that the corrected run no longer requested were deleted, and the 14 Monarch responses were trimmed to the fields the benchmark reads (`score`, `subject.id/name/xref`, `similarity.object_best_matches`; ~1.5 MB → ~0.4 MB each). The script now trims Monarch bodies the same way when it fetches. The rerun after trimming gave the same table.
- Scoring code and constants are unchanged between run 1 and the corrected run.

## Limitations

- **Small sample.** 14 cases (4 demo, 10 phenopacket-store). One case moving changes a count by 1 of 10. No significance testing is meaningful at this size.
- **Monarch pool ceiling.** The re-rank only re-orders Monarch's top 50. In 7 of 14 cases (3 of 4 demo cases, 4 of 10 phenopacket-store cases) the expected disease is not in that pool, so no re-ranking can find it. For `demo-marfan` the pool holds "neonatal Marfan syndrome" and several Loeys-Dietz subtypes but not classic Marfan syndrome (MONDO:0007947); for `demo-kabuki` and `demo-cdls` the strict match finds neither Kabuki syndrome 1 nor Cornelia de Lange syndrome 1.
- **Strict id match.** A subtype or grouping entity does not count: in `PMID_27900365_patient` the grouping entity "Niemann-Pick disease type C" is ranked 1 after re-rank and the expected "Niemann-Pick disease, type C1" is 2.
- **Annotation gaps and mismatched sources.** For `demo-dmd` the re-rank used `ORPHA:98896` (pre-registered ORPHA preference); only 1 of 12 observed terms (Motor delay) is annotated exactly to it, and 10 get ancestor credit. Monarch's best matches are computed against Monarch's own phenotype set for the disease, so a `match_target` is sometimes absent from the JAX annotation set and then gets the unspecified default 0.5. The OMIM annotation set (`OMIM:310200`) was not used for DMD because the rule takes ORPHA first.
- **Pool-relative background.** Background probabilities come from the 50 candidates, which are already similar to the patient. Features shared by most candidates carry little weight. The score is an ordering signal inside this pool, not a calibrated likelihood ratio, and must not be shown as a probability.
- **Excluded-term edge case.** For an excluded term, the contribution is `log10((1 − q) / (1 − b))`. It is positive when the pool average `b` is higher than this disease's frequency `q`, which is the intended relative effect but means "adding an exclusion never raises the score" holds only when `b ≤ q` (the unit test checks that case).
- **Published cases.** phenopacket-store cases come from publications that may already feed the HPO annotations, so results on them are likely optimistic. The demo narratives were written from the same phenopackets.
- **Not checked:** other values of N, other annotation-id rules (OMIM first, or ORPHA ∪ OMIM as in CONTRACT §7.4 step 4), extraction from narratives (this measures ranking only).

## What this means for the demo

- With the corrected run, the re-rank did not improve top-1, top-3 or top-10 counts: all cases 5 → 4 (top-1), 6 → 6 (top-3), 6 → 6 (top-10). The one top-1 loss is the Niemann-Pick grouping-entity case above.
- `demo-dmd`: Duchenne muscular dystrophy moves from Monarch rank 40 to rank 15. It is still not in the top 5 or the top 10. Becker muscular dystrophy moves from 15 to 5. The top 3 after re-rank are late-onset acid maltase deficiency, "myopathy with myalgia, increased serum creatine kinase, and with or without episodic rhabdomyolysis 1", and XK-related neurodegenerative disease.
- `demo-marfan`, `demo-kabuki`, `demo-cdls`: the expected disease is outside Monarch's top 50, so the re-rank cannot change their result. Neonatal Marfan syndrome is rank 2 after re-rank for `demo-marfan` (rank 9 in Monarch order).
- On the 10 phenopacket-store cases, the 6 expected diseases that Monarch places in its top 50 are already in its top 2; the re-rank keeps 4 at rank 1, keeps 1 at rank 2 and moves 1 from 1 to 2.
- On this evidence the re-rank layer alone does not make any demo case show its expected disease in the top 5. Any demo claim must use the measured ranks above, not an expected improvement.
