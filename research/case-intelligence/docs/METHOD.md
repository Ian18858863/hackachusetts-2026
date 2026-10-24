# Evaluation method (T38)

## Splits

| Split | Cases | Source | Use |
|---|---|---|---|
| `heldout` | 10 (`HO-01`–`HO-10`) | T33 hand-off, re-verified by T38 | Measure only. Never used to write dictionary entries, rules or thresholds. |
| `dev` | 7 (`DEV-01`–`DEV-07`) | New open-access PMC case reports found by T38 | Grow the dictionary, test tooling. |

No article, PMID or patient appears in both splits. No diagnosis is shared between splits, so held-out results also test unseen diseases. Validation fails on a shared article, a near-duplicate note (token Jaccard ≥ 0.6), or a dictionary phrase that occurs in a held-out note but not in its cited development note.

## What a case contains

- `source`: PMC id, PMID, URL, title, journal and year as reported by Europe PMC; `textAccess` is `fulltext` (quotes re-checkable by script) or `html-manual` (checked by reading the public PMC page).
- `diagnosis`: name, MONDO id, `acceptedIds` (MONDO ids that count as correct, with OMIM/Orphanet xrefs from Monarch), genes, and confirmation method with short article quotes.
- `note`: a plain-English patient or parent description. It is written from the article and is **not** the patient's words. Held-out notes are the exact T33 notes.
- `phenotypes`: HP id, official HPO name, a short article quote, and `inNote` (whether the note expresses it) with the note phrase.

## Inputs

`data/eval/<split>-inputs.json` holds `{caseId, note}` only, plus a SHA-256 of the inputs. Extractors and rankers must read these files, never the case records. Current hashes: dev `5fc342f9…e01e`, held-out `7e9c915c…9dec`.

## Predictions format

```json
{ "split": "heldout", "extractor": "name", "gitSha": "…",
  "cases": [ { "caseId": "HO-01", "extracted": [ { "hpoId": "HP:0001252" } ], "ranking": ["MONDO:0010526", "OMIM:301500"] } ] }
```

`ranking` is optional, ordered best first; any MONDO, OMIM or Orphanet (`Orphanet:` or `ORPHA:`) id is accepted.

## Metrics

All metrics are computed by `lib/metrics.mjs` from the predictions file alone.

- **Coverage**: exact HP id matches over `inNote` gold terms (micro). Also reported per case and as a macro average.
- **Missed phenotype rate**: 1 − coverage.
- **Precision**: exact matches over predicted terms.
- **Predicted, not in gold**: predicted ids that are not in the case's gold set at all. These are not proven wrong; the gold set is not exhaustive.
- **Predicted, article-only**: predicted ids in the gold set that the note does not express (for example lab findings).
- **Invalid HPO ids**: predicted ids that fail the JAX check (unknown, alternate or obsolete).
- **Top-1 accuracy / Top-5 recall**: share of ranked cases whose first, or first five, ranked ids include an accepted id. Computed only for cases that have a `ranking`.

There is no partial credit for parent or child terms (see limitations).

## Rules for held-out runs

1. Commit the extractor or ranker and its data first.
2. Run it on `heldout-inputs.json`.
3. Score with `scripts/evaluate.mjs heldout …`. The script refuses to run while `lib/`, `scripts/` or `data/` have uncommitted changes, and stamps the commit SHA.
4. Do not change the extractor after seeing held-out results and re-score. If the held-out set is used for a decision, record it and plan a fresh held-out set.

## Reproduce

```powershell
cd research/case-intelligence
npm test                      # 40 tests, offline
npm run validate              # dataset checks, offline
node scripts/export-inputs.mjs
node scripts/run-baseline.mjs dev
node scripts/evaluate.mjs dev results/predictions/baseline-dev.json baseline-dev
node scripts/run-baseline.mjs heldout
node scripts/evaluate.mjs heldout results/predictions/baseline-heldout.json baseline-heldout
# Network (refresh sources and ontology records):
node scripts/verify-sources.mjs     # Europe PMC metadata + quote checks
node scripts/fetch-hpo.mjs          # JAX HPO records for every id in use
node scripts/fetch-diseases.mjs     # Monarch disease records
node scripts/import-t37.mjs [csv]   # when the T37 CSV is available
```
