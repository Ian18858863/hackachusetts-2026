# Results (T38, 2026-10-24)

All numbers below come from files in `results/` produced by the scripts named. No model was trained or retrained; the "baseline" is a phrase lookup. No clinician has reviewed this corpus.

## Corpus

| | Dev | Held-out | Total |
|---|---|---|---|
| Cases (one patient each) | 7 | 10 | 17 |
| Distinct diagnoses | 7 | 10 | 17 (none shared between splits) |
| Open-access licensed source (PMC open set, Creative Commons) | 7 | 7 | 14 |
| Documented access exception (not open-access licensed) | 0 | 3 (HO-04, HO-09, HO-10) | 3 |
| Gold phenotypes | 58 | 77 | 135 |
| … expressed in the note (`inNote`) | 55 | 68 | 123 |
| … added by T38 (not in T33) | 58 | 14 | 72 |
| Diagnosis confirmed by | molecular genetic testing in 5; methylation PCR (PWS); FISH (Williams) | molecular genetic testing in all 10, plus biochemical, enzyme, biopsy or newborn-screening evidence in 5 | |

Diagnoses — held-out: Fabry disease, maple syrup urine disease, late-onset Pompe disease, X-linked adrenoleukodystrophy, achondroplasia, osteogenesis imperfecta type 1, hereditary angioedema type 2, Sotos syndrome, Rett syndrome, Friedreich ataxia. Dev: Wilson disease, tuberous sclerosis 2, Prader-Willi syndrome, phenylketonuria, juvenile nephropathic cystinosis, mucopolysaccharidosis type 2, Williams syndrome.

## Source licences (`scripts/check-access.mjs` → `results/source-access.json`)

Checked against each article's PMC front matter through the PMC OAI-PMH API (the legacy PMC OA web service was retired in August 2026). "Free to read on PMC" is not treated as open access.

| Class | Cases | Licence |
|---|---|---|
| `oa-cc` | DEV-01…DEV-07, HO-01, HO-02, HO-05 | CC BY |
| `oa-cc` | HO-06, HO-07 | CC BY-NC |
| `oa-cc` | HO-03, HO-08 | CC BY-NC-ND |
| `free-to-read` | HO-04 (X-ALD) | Publisher copyright, AJTR 2025; not in the PMC open set |
| `free-to-read` | HO-09 (Rett) | Publisher copyright, Springer 2008; not in the PMC open set. Europe PMC's metadata says "cc by", but the PMC record carries only the publisher copyright, so that is not relied on |
| `author-manuscript` | HO-10 (Friedreich ataxia) | NIH author manuscript NIHMS2024171; "available for text mining … fair use"; no CC licence |

**Exception decision:** HO-04, HO-09 and HO-10 do not meet the project's open-access licensing requirement. They are kept in the held-out split, because the held-out set is defined as the 10 T33 cases and was already scored, so replacing them would rewrite the evaluation history. Each has a documented `source.accessException`, and Peter's confirmation is pending. Only short quotes (at most 30 words) and paraphrased notes are stored; no article text is in the repository. Validation forbids non-open-access sources in the development split.

## Source verification (`scripts/verify-sources.mjs` → `results/source-verification.json`)

- Metadata of all 17 articles matches Europe PMC (PMID, title, journal, year).
- **143 quotes were matched automatically** in downloaded article text (Europe PMC full text, or NCBI efetch for HO-10).
- **19 quotes were checked manually** by reading the public PMC page, because those articles cannot be downloaded:
  - HO-04: 10 quotes (2 diagnosis quotes and HP:0001324, HP:0002061, HP:0001288, HP:0002136, HP:0033748, HP:0001260, HP:0003394, HP:0001347).
  - HO-09: 9 quotes (1 diagnosis quote and HP:0011968, HP:0001252, HP:0000252, HP:0001250, HP:0000733, HP:0001270, HP:0001344, HP:0002376).
  - Each is marked `"status": "manual"` in `source-verification.json`, and the cases carry `textAccess: "html-manual"`.
- No quote exceeds 30 words.

**What a matched quote does and does not show:** a match shows that the quoted words occur in the article. It does not show that the quote describes this patient rather than a relative or the disease in general. It also does not show that the HPO term chosen is the right clinical reading, or that `inNote` is judged correctly. Those are Kiro's interpretations, recorded in `comment` and `uncertainty` fields. They have **not** been independently or clinically reviewed.

## HPO verification (`scripts/fetch-hpo.mjs`, `lib/hpo-check.mjs`)

- 112 distinct HP ids in use; all 112 exist in the JAX ontology API and none is an alternate or obsolete id.
- 198 case labels checked (135 T38 labels plus 63 original T33 labels): all equal the official HPO name.
- 59 dictionary labels (44 verified, 15 rejected): all equal the official HPO name.
- These checks confirm id and name only, not that a term is the right clinical choice.
- The API does not report its HPO release; the latest GitHub release at fetch time was `v2026-09-01`.

## T33 re-verification findings

The T33 IDs and labels were all correct. The re-check against the articles found:

- **Terms not expressed by the note** (kept as article-only gold): Fabry proteinuria, cardiomyopathy and anemia; MSUD hyperleucinemia and hypervalinemia; Pompe diarrhea; X-ALD hyperreflexia; Sotos depressed nasal bridge.
- **Terms the notes express but T33 did not list**, now added: acroparesthesia, heat and cold intolerance (Fabry); reduced consciousness (MSUD); difficulty climbing stairs and falls (Pompe); hypoesthesia and muscle spasm (X-ALD); pes valgus (Sotos); feeding difficulties and motor stereotypy (Rett); tip-toe gait and neurogenic bladder (Friedreich ataxia). Relative macrocephaly (achondroplasia) was added as article-only.
- **Weak or inferred support**: Rett developmental regression (article says "regressing attentiveness" for Case 1); HAE laryngeal edema (article says "upper airway swelling"); Pompe "falls were happening" (article reports one fall in a walk test); MSUD moderate severity (inferred from IQ 44).
- **Access**: see Source licences above.

## Dictionary (`data/dictionary/`)

- 44 verified phrase mappings to 35 HP ids, all from development notes, each with a rationale.
- 15 rejected candidates: 3 NOT_EQUIVALENT (for example foamy urine → proteinuria), 3 AMBIGUOUS, 7 TOO_SPECIFIC, 2 TOO_GENERAL.
- T37 CSV (317 phrases, 83 ids, per the hand-off): the importer now accepts its real header `lay phrase,HPO term name,HP id` with a UTF-8 BOM (integration-tested). The file was **still not found** in Downloads, so no T37 row has been imported or verified.

## Validation (`npm run validate` → `results/validation.json`)

0 errors, 5 warnings: 3 documented access exceptions (HO-04, HO-09, HO-10) and 2 manual source checks (HO-04, HO-09).

## Baseline extraction (`dictionary-baseline-v0.1`)

| Run | Status | Split | Extractor revision | Coverage | Missed rate | Precision | Not in gold | Invalid ids |
|---|---|---|---|---|---|---|---|---|
| `eval-baseline-heldout-formal.json` | **formal** (complete, provenance verified) | held-out | `411c8e2` | 0.029 (2/68) | 0.971 | 1.000 | 0 | 0 |
| `eval-baseline-dev.exploratory.json` | exploratory (formal rejected) | dev | recorded `6d54d7c` | 0.600 (33/55) | 0.400 | 0.917 | 3 | 0 |

- **Held-out formal:** this is the same predictions file produced once at `411c8e2`. It was re-scored with the stricter scorer at `10bb591`: complete (10/10 unique cases), provenance ok, and the inputs hash equals the inputs file at `411c8e2`. No extractor change was made after seeing held-out results.
- **Dev:** formal scoring is **rejected** (`INPUTS_NOT_AT_SHA`). The dev predictions record `6d54d7c`, but the dev inputs file and the extractor code were only committed later in `411c8e2`, so the recorded revision is not the one that produced them. The result is kept as exploratory. It is also in-sample, because the dictionary was written from those notes.
- **Historical files kept unchanged:** `eval-baseline-heldout.json` and `eval-baseline-dev.json` were written by the first scorer at `411c8e2`, before the completeness and provenance checks existed.
- Top-1 and Top-5 were **not computed**: the baseline does not rank diseases, and T38 ran no ranker. The scorer is tested with fixtures only.
