# Results (T38, 2026-10-24)

All numbers below come from files in `results/` produced by the scripts named. No model was trained or retrained; the "baseline" is a phrase lookup.

## Corpus

| | Dev | Held-out | Total |
|---|---|---|---|
| Cases (one patient each) | 7 | 10 | 17 |
| Distinct diagnoses | 7 | 10 | 17 (none shared between splits) |
| Gold phenotypes | 58 | 77 | 135 |
| … expressed in the note (`inNote`) | 55 | 68 | 123 |
| … added by T38 (not in T33) | 58 | 14 | 72 |
| Diagnosis confirmed by | molecular genetic testing in 5; methylation PCR (PWS); FISH (Williams) | molecular genetic testing in all 10, plus biochemical, enzyme, biopsy or newborn-screening evidence in 5 | |

Diagnoses — held-out: Fabry disease, maple syrup urine disease, late-onset Pompe disease, X-linked adrenoleukodystrophy, achondroplasia, osteogenesis imperfecta type 1, hereditary angioedema type 2, Sotos syndrome, Rett syndrome, Friedreich ataxia. Dev: Wilson disease, tuberous sclerosis 2, Prader-Willi syndrome, phenylketonuria, juvenile nephropathic cystinosis, mucopolysaccharidosis type 2, Williams syndrome.

## Source verification (`scripts/verify-sources.mjs` → `results/source-verification.json`)

- Metadata of all 17 articles matches Europe PMC (PMID, title, journal, year).
- 143 of 143 checkable quotes were found in the article text. 19 quotes from 2 articles (HO-04 X-ALD, HO-09 Rett) cannot be downloaded automatically (not in the open-access subset); they were checked by reading the public PMC pages.
- No quote exceeds 30 words.

## HPO verification (`scripts/fetch-hpo.mjs`, `lib/hpo-check.mjs`)

- 112 distinct HP ids in use; all 112 exist in the JAX ontology API and none is an alternate or obsolete id.
- 198 case labels checked (135 T38 labels plus 63 original T33 labels): all equal the official HPO name.
- 59 dictionary labels (44 verified, 15 rejected): all equal the official HPO name.
- The API does not report its HPO release; the latest GitHub release at fetch time was `v2026-09-01`.

## T33 re-verification findings

The T33 IDs and labels were all correct. The re-check against the articles found:

- **Terms not expressed by the note** (kept as article-only gold): Fabry proteinuria, cardiomyopathy and anemia; MSUD hyperleucinemia and hypervalinemia; Pompe diarrhea; X-ALD hyperreflexia; Sotos depressed nasal bridge.
- **Terms the notes express but T33 did not list**, now added: acroparesthesia, heat and cold intolerance (Fabry); reduced consciousness (MSUD); difficulty climbing stairs and falls (Pompe); hypoesthesia and muscle spasm (X-ALD); pes valgus (Sotos); feeding difficulties and motor stereotypy (Rett); tip-toe gait and neurogenic bladder (Friedreich ataxia). Relative macrocephaly (achondroplasia) was added as article-only.
- **Weak or inferred support**: Rett developmental regression (article says "regressing attentiveness" for Case 1); HAE laryngeal edema (article says "upper airway swelling"); Pompe "falls were happening" (article reports one fall in a walk test); MSUD moderate severity (inferred from IQ 44).
- **Access**: 2 of the 10 T33 articles (X-ALD, Rett) are not in the open-access subset, and Friedreich ataxia full text is only available via NCBI.

## Dictionary (`data/dictionary/`)

- 44 verified phrase mappings to 35 HP ids, all from development notes, each with a rationale.
- 15 rejected candidates: 3 NOT_EQUIVALENT (for example foamy urine → proteinuria), 3 AMBIGUOUS, 7 TOO_SPECIFIC, 2 TOO_GENERAL.
- T37 CSV (317 phrases, 83 ids, per the hand-off) was **not found** in Downloads; its import is pending.

## Validation (`npm run validate` → `results/validation.json`)

0 errors, 2 warnings (the two hand-checked sources).

## Baseline extraction (`dictionary-baseline-v0.1`)

| Split | Gold in-note terms | Predicted | Exact hits | Coverage | Missed rate | Precision | Not in gold | Invalid ids |
|---|---|---|---|---|---|---|---|---|
| Dev (in-sample) | 55 | 36 | 33 | 0.600 | 0.400 | 0.917 | 3 | 0 |
| Held-out | 68 | 2 | 2 | 0.029 | 0.971 | 1.000 | 0 | 0 |

- The dev score is **in-sample**: the dictionary was written from those notes, so it says nothing about generalisation. The 3 dev extras are deliberate lay-level terms (pale patches, corneal crystals, nephrocalcinosis) where the gold uses the article's more specific term.
- The held-out score is the real baseline: phrases curated from 7 notes about 7 other diseases almost never recur in new notes. Held-out was scored once, at commit `411c8e2`, after the dictionary and extractor were committed.
- Top-1 and Top-5 were **not computed**: the baseline does not rank diseases, and T38 did not run any ranker. The scorer is tested with fixtures only.
