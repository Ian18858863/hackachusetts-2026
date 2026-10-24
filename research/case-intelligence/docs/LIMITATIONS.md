# Limitations and open issues (T38)

## Data

- **Small corpus.** 17 cases (7 dev, 10 held-out). Metrics on 10 cases have wide uncertainty; one case moves coverage by several points.
- **Notes are not patient voice.** All notes are assistant-written from articles (T33 notes by the T33 assistant, dev notes by Peter's Kiro). Real patient language is likely messier, with misspellings, negations and irrelevant detail.
- **Gold phenotypes are not exhaustive.** They list what was checked in the article, not every possible term. "Predicted, not in gold" is not proof of an error.
- **Judgement calls.** `inNote` flags and several mappings (for example laryngeal edema, coarse facial features, specific learning disability) are Kiro's reading, recorded with comments. No clinician or independent reviewer has checked the clinical interpretation of the corpus.
- **Quote matches are not proof of interpretation.** An automatic match only shows that the words occur in the article. It does not show that they describe this patient, or that the chosen HPO term is clinically right.
- **19 quotes are hand-checked only.** HO-04 (10 quotes) and HO-09 (9 quotes) cannot be downloaded automatically, so `verify-sources` marks them `manual` and cannot re-check them.
- **Three held-out sources are not open-access licensed.** Two are publisher-copyright articles that are free to read (HO-04 AJTR 2025, HO-09 Springer 2008), and one is an NIH author manuscript (HO-10). They are kept under a documented `accessException` to preserve the scored held-out history; Peter's confirmation is pending. If the exception is not accepted, these cases should move to a separate "restricted" split and a fresh open-access held-out set should be built. They must not be swapped silently, because past held-out results refer to the current 10 cases.
- **Confounded cases.** HO-10 also carries ALG1 variants; DEV-06 also has Turner syndrome; DEV-01 also has IgA nephropathy. Only the stated diagnosis is gold.
- **Article full text is not committed** (`.cache/` is gitignored) to avoid redistributing articles; re-verification needs network access.

## HPO and diseases

- The JAX API does not say which HPO release it serves. Records were fetched on 2026-10-24; the latest GitHub release then was `v2026-09-01`, which matches the team's pinned `HPO_VERSION`, but this was not checked term by term against the release file.
- Disease ids come from Monarch on 2026-10-24. Pompe (MONDO:0009290) and MSUD (MONDO:0009563) have no OMIM xref in that record, so a ranker that returns only OMIM ids cannot score on those two cases.

## Dictionary and baseline

- **T37 import pending.** The importer now reads the real header `lay phrase,HPO term name,HP id` with a UTF-8 BOM; this is integration-tested with a fixture, not with the real file. `T37_lay_language_HPO_dictionary.csv` was still not in Downloads, so no T37 row has been imported. When it is imported, every row stays `unverified`, and each phrase needs a human or Kiro judgement before it can move to the verified file.
- The dictionary covers only 35 HP ids drawn from 7 development cases.
- Several entries are context-dependent (for example "walk steadily" needs a negation, "too much calcium" needs a blood test). The baseline has no negation or context handling.
- Exact-id scoring only; there is no credit for a parent or child term (for example Nephrocalcinosis vs Medullary nephrocalcinosis).

## Evaluation

- Top-1/Top-5 are implemented and unit-tested but **not measured**: T38 ran no ranker, and running the T33 notes through the production app is Ian's team's task.
- Formal scoring checks completeness and provenance: the inputs hash, the split, and whether the extractor revision had the frozen inputs. It cannot check intent. Discipline is still needed: no re-tuning after viewing held-out results.
- The provenance check trusts the `gitSha` written into a predictions file. It proves that the revision existed and had the frozen inputs, not that the predictions were produced by that revision.
- The historical dev baseline records `6d54d7c`, but it was produced before its inputs and extractor were committed (`411c8e2`). Formal scoring correctly rejects it, so it is kept as exploratory only.
- With the held-out split now scored once by the baseline, any future decision made from held-out numbers should be recorded, and a fresh held-out set should be added for later rounds.

## Process

- Work is on the local branch `peter/t38-case-intelligence` in a separate worktree. Nothing was pushed, merged or deployed.
- `docs/KIRO_USAGE.md` is Ian's Kiro's single-editor file, so T38's Kiro usage is reported for Peter to post in chat instead of being edited here.
