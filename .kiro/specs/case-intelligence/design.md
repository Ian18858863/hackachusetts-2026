# Design: Rare Disease Case Intelligence (T38)

## Layout

All T38 files live in `research/case-intelligence/` plus this spec folder.

```
research/case-intelligence/
  package.json          scripts only, no runtime dependencies (Node 20, node:test)
  data/
    cases/dev/*.json      development cases (one patient per file)
    cases/heldout/*.json  the 10 T33 cases, reserved for evaluation
    hpo/hpo-terms.json    HPO records fetched from the JAX ontology API
    dictionary/           verified and rejected lay-language mappings
    eval/                 exact blind inputs per split (generated, committed)
  lib/                  pure functions: load, text, validate, extract, metrics
  scripts/              CLI wrappers: fetch, verify, validate, export, baseline, evaluate
  test/                 node:test suites with fixtures
  results/              evaluation reports, each stamped with the git SHA
  docs/                 method and limitations
  .cache/               article full text from Europe PMC (gitignored, not redistributed)
```

## Data flow

1. `verify-sources` pulls Europe PMC metadata and full text (falling back to NCBI PMC efetch) into `.cache/`, checks each case's metadata, and checks that every evidence quote occurs in the article text after normalisation. Articles that neither service lets us download are reported as manual checks.
2. `fetch-diseases` stores the Monarch record (name, OMIM and Orphanet xrefs) for every accepted diagnosis id.
3. `fetch-hpo` collects every HP id from cases and dictionary, calls the JAX API once per id, and writes `hpo-terms.json`.
4. `validate` runs all integrity and leakage checks against the committed files only (no network), so it is reproducible.
5. `export-inputs` writes `data/eval/<split>-inputs.json` with `{caseId, note}` only.
6. `run-baseline` runs the dictionary baseline extractor over an inputs file and writes a predictions file.
7. `evaluate` scores a predictions file against the case records.

## Key decisions

- **No dependencies.** Node 20 built-ins only, so there is no lockfile and nothing to audit or install.
- **Network only in fetch and verify.** Validation and evaluation read committed files, so results reproduce offline.
- **Official name, not synonym.** A label passes only if it equals the HPO `name`. Synonyms are stored and used for dictionary rationale, not as labels.
- **Gold phenotypes have two layers.** `articleEvidence` says what the paper supports; `inNote` says what the lay note expresses. Extraction is scored only on `inNote` terms, because a note cannot be blamed for lab findings it never mentions.
- **Exact-id scoring.** Extraction recall counts exact HP id matches. Ancestor credit is out of scope for v0.1 and is listed as a limitation.
- **Disease ids from Monarch.** Each diagnosis carries MONDO, OMIM and ORPHA ids taken from the Monarch entity record, so any ranker that returns one of these can be scored without name matching.
- **Near-duplicate notes.** Token-set Jaccard similarity of 0.6 or more between two notes is an error.
- **Diagnosis leakage.** A note fails if it contains the disease name, any word of the disease name longer than 4 letters that is not a common word, or a confirming gene symbol.

## Error model

`validate` returns `{errors, warnings}`; each item has `code`, `caseId` or `entry`, and a message. Exit code 1 if any error.
