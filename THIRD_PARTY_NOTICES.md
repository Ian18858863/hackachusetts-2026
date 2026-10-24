# Third-party notices

The code and documentation in this repository are licensed under the Apache License 2.0 ([LICENSE](LICENSE)). The software packages, fonts, data and services below keep their own licences and terms. Package licences were read from the `license` field in `app/package-lock.json`, `landing/package-lock.json` and `engine/package-lock.json` on 2026-10-24.

| Component | Used in | Licence or terms | Notes |
|---|---|---|---|
| React, React DOM 19.3.1 | `app/`, `landing/` | MIT | Runtime dependency |
| Vite (8.3.5 in `app/` and `landing/`, 6.4.5 in `engine/`), `@vitejs/plugin-react` 6.1.2 | `app/`, `landing/`, `engine/` | MIT | Build and dev tooling |
| TypeScript 7.0.2 | `app/`, `landing/`, `engine/` | Apache-2.0 | Build tooling |
| `@fontsource-variable/newsreader` 5.3.0 (Newsreader) | `app/`, `landing/` | SIL Open Font License 1.1 | The package declares `OFL-1.1` as its licence. Font files are bundled into the built site |
| `@fontsource/source-sans-3` 5.3.1 (Source Sans 3) | `app/`, `landing/` | SIL Open Font License 1.1 | The package declares `OFL-1.1` as its licence. Font files are bundled into the built site |
| `@types/react`, `@types/react-dom` 19.3.0 (`app/`, `landing/`), `@types/node` 26.6.5 (`app/`); `@types/chai`, `@types/deep-eql`, `@types/estree` (`engine/`, pulled in by Vitest) | `app/`, `landing/`, `engine/` | MIT | Type definitions, development only, not shipped |
| Vitest 3.2.7, fast-check 4.10.2, esbuild 0.28.2 | `engine/` (tests and build) | MIT | Development only, not shipped |
| Human Phenotype Ontology (HPO), via the JAX ontology API | `engine/`, `functions/` | HPO licence terms: [hpo.jax.org/license](https://hpo.jax.org/license) | Shown in the app footer and the brief: "This product uses the Human Phenotype Ontology (version <hpo>). Find out more at https://hpo.jax.org". The label shown for a term is always its HPO primary name (contract §7.2) |
| Monarch Initiative semantic similarity API (api.monarchinitiative.org) | `engine/`, `functions/` | Attribution: "Ranking by the Monarch Initiative semantic similarity service (monarchinitiative.org). Monarch tools are not for diagnosis or medical decisions." | Data licence terms of the API: not verified |
| Orphanet data (Orphanet-sourced HPO annotations, api.orphadata.com) | `engine/`, `functions/` | CC BY 4.0 | Credit: "Orphanet data, CC BY 4.0 (orpha.net, orphadata.com)." |
| ClinicalTrials.gov API v2 | `engine/`, `functions/` | US government work (U.S. National Library of Medicine) | Credit: "Trial data from ClinicalTrials.gov, U.S. National Library of Medicine." |
| phenopacket-store (Monarch Initiative) | Demo cases in `engine/demo/` and `functions/_lib/fallback/`, benchmark cases fetched by `scripts/ranking-benchmark.ts` (cache not committed) | BSD-3-Clause | Demo narratives are synthetic, written from the HPO terms of published phenopackets. Not real patients |

OMIM is not used beyond ids and outbound links that already appear in HPO annotations and Monarch cross-references. PubCaseFinder is referenced in the code but switched off in v0.1, so it is not listed.
