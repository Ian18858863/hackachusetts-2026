# Requirements: Rare Disease Case Intelligence (T38)

> Owner: Peter. Status: v0.1, written by Peter's Kiro on 2026-10-24. Offline research and evaluation data only. Nothing here is wired into `app/**`, `engine/**` or `functions/**`.

## Introduction

The team needs a reproducible way to tell whether a change to symptom interpretation (lay text to HPO terms) or disease ranking actually generalises to unseen patients. T38 builds a small corpus of verified, open-access rare-disease case reports, a verified lay-language to HPO dictionary, integrity checks, and an offline evaluation harness. It does not retrain or change any model.

## Glossary

- **Case**: one patient from one published, open-access case report, with a confirmed diagnosis.
- **Held-out split**: the 10 cases from the T33 hand-off. Used only to measure, never to tune.
- **Development split**: cases found for T38. Used to grow the dictionary and to test tooling.
- **Note**: a plain-English, patient- or parent-style description written from the article's findings. It is not the patient's own words.
- **Gold phenotypes**: HPO terms supported by the article for that patient. `inNote` marks the subset the note actually expresses.
- **HPO record**: the term as returned by the JAX ontology API (`https://ontology.jax.org/api/hp/terms/{id}`).

## Requirement 1: Verified sources

1.1 EVERY case SHALL cite a PMC id, a source URL, title, journal and year, retrieved from Europe PMC, and SHALL record its licence classification (`oa-cc`, `author-manuscript` or `free-to-read`) from the PMC record. Being free to read on PMC SHALL NOT count as open access.
1.1a Development cases SHALL be `oa-cc`. WHEN a held-out case is not `oa-cc` THE record SHALL carry a documented `accessException` with reason and decision.
1.2 EVERY case SHALL record the diagnosis, how it was confirmed (for example a named gene variant or an enzyme assay) and a short evidence quote (at most 30 words) found in the article.
1.3 EVERY gold phenotype SHALL carry a short evidence quote from the article, or SHALL be marked as not found in the article text with the reason.
1.4 THE corpus SHALL NOT contain invented cases, symptoms, citations, HPO mappings or confirmations, and SHALL NOT copy long passages from articles.
1.5 WHEN a source or a claim cannot be verified THE record SHALL say so in `uncertainty` rather than drop the field silently.

## Requirement 2: Verified HPO terms

2.1 EVERY HP id used anywhere in the corpus or dictionary SHALL be checked against the JAX ontology API, and the returned record (id, name, synonyms, fetch time) SHALL be stored in `data/hpo/hpo-terms.json`.
2.2 WHEN the API returns a different primary id than requested (alternate or obsolete id) THE check SHALL fail for that id.
2.3 WHEN a stored label differs from the official HPO name THE check SHALL fail, even if the label is a synonym.

## Requirement 3: Lay-language dictionary

3.1 THE dictionary SHALL keep verified mappings and rejected mappings in separate files, each with a reason.
3.2 A mapping SHALL be marked verified only when its HP id and name pass Requirement 2 and a recorded rationale says why the phrase supports the phenotype.
3.3 THE dictionary SHALL keep different everyday wordings of the same phenotype as separate entries.
3.4 EVERY dictionary entry SHALL cite the development case or the HPO synonym it came from, and SHALL NOT be derived from a held-out case.
3.5 WHEN the T37 candidate CSV is available THE system SHALL import it as unverified candidates only; until then its import SHALL be reported as pending.

## Requirement 4: Splits and leakage

4.1 THE held-out split SHALL contain exactly the 10 T33 cases.
4.2 THE checks SHALL fail on the same PMC id, DOI or near-identical note across or within splits.
4.3 THE checks SHALL warn when the same disease appears in both splits.
4.4 THE blind evaluation inputs SHALL contain only the case id and the note, and the checks SHALL fail if a note contains its diagnosis name or a confirming gene symbol.

## Requirement 5: Offline validation

5.1 A single command SHALL validate the whole dataset and exit non-zero on any error.
5.2 Checks SHALL cover: required fields, duplicates, missing evidence, HP id format, id and name consistency with the stored HPO records, unverified dictionary entries in the verified file, leakage, and diagnosis leakage in notes.
5.3 THE validation logic SHALL have automated tests with both passing and failing fixtures.

## Requirement 6: Offline evaluation

6.1 THE evaluator SHALL read a predictions file produced by any extractor or ranker and compute metrics only from it.
6.2 Metrics SHALL include phenotype extraction coverage (recall of `inNote` gold terms), missed phenotype rate, predicted terms not in the gold set, Top-1 accuracy and Top-5 recall.
6.3 Disease matching SHALL compare identifiers (MONDO, OMIM, ORPHA) from the case record, not names, and SHALL NOT contain any per-disease rule.
6.4 Held-out results SHALL be produced only by a frozen extractor or ranker and SHALL be recorded with the git SHA that produced them.
6.4a A formal evaluation SHALL reject a submission that is missing any expected case, repeats a case id, contains an unknown case id, is malformed, or ranks only some cases. Formal Top-1 and Top-5 SHALL be computed over all expected cases.
6.4b A formal evaluation SHALL reject predictions whose split, extractor, full git SHA or input hash is missing, or whose input hash differs from the committed inputs, the current notes, or the inputs file at the recorded SHA.
6.4c An exploratory evaluation MAY score partial submissions, SHALL be labelled exploratory, and SHALL NOT report an official Top-1 or Top-5.
6.5 Reports SHALL NOT claim a model was trained or retrained.

## Out of scope

Changes to the live ranking, the app, the engine, the functions, shared files or deployments. Running the T33 notes through the production app (owned by Ian's team).
