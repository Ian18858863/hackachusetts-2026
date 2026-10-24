# Rare Disease Case Intelligence (T38)

Offline research data and tooling for Rare Disease Detective: verified open-access case reports, verified HPO terms, a lay-language dictionary, and an evaluation harness for future extraction and ranking changes. Nothing here is used by the app, the engine or the functions, and no model is trained or retrained.

Spec: [`.kiro/specs/case-intelligence/`](../../.kiro/specs/case-intelligence/). Method: [docs/METHOD.md](docs/METHOD.md). Results: [docs/RESULTS.md](docs/RESULTS.md). Limitations: [docs/LIMITATIONS.md](docs/LIMITATIONS.md).

## At a glance

- 17 cases, one patient each, from PMC case reports: 10 held-out (the T33 hand-off, re-verified) and 7 development cases. Every diagnosis is confirmed in the article (genetic, enzyme, cytogenetic or methylation testing).
- 14 sources are open-access licensed (CC). Three held-out sources are not: HO-04 and HO-09 (publisher copyright, free to read) and HO-10 (NIH author manuscript). They are kept under documented exceptions.
- 112 HP ids and 257 labels checked against the JAX HPO API; all official names match. This checks ids and names, not clinical interpretation; no clinician has reviewed the corpus.
- 44 verified and 15 rejected lay-language mappings, all from development notes. T37 import is pending (file not provided).
- `npm test`: 64 tests. `npm run validate`: 0 errors, 5 warnings.
- Baseline dictionary extractor: formal held-out coverage 0.029 (2 of 68 in-note terms), which is the honest starting point.

## Layout

```
data/cases/{dev,heldout}/   one JSON per case
data/hpo/hpo-terms.json     JAX HPO records for every id in use
data/diseases/              Monarch records (MONDO, OMIM, Orphanet) for accepted diagnoses
data/dictionary/            verified and rejected lay mappings
data/eval/                  blind inputs (caseId + note) per split
lib/ scripts/ test/         tooling (Node 20, no dependencies)
results/                    verification, validation and evaluation outputs
docs/                       method, results, limitations
```

## Run

```powershell
cd research/case-intelligence
npm test
npm run validate
```

See [docs/METHOD.md](docs/METHOD.md#reproduce) for the full sequence, including network refresh scripts.

## Attribution

This product uses the Human Phenotype Ontology (HPO). Find out more at https://hpo.jax.org. Disease identifiers from the Monarch Initiative (monarchinitiative.org). Article metadata from Europe PMC. Case content is summarised from the cited articles with short quotes (at most 30 words); the articles themselves are not redistributed. Each case records its licence in `source.access`.

Decision support research only, not a diagnosis.
