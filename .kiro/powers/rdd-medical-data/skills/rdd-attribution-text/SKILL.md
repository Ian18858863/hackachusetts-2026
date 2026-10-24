---
name: rdd-attribution-text
description: Verbatim attribution, licence credit and "not a diagnosis" safety strings for this project (HPO, Monarch, Orphanet, ClinicalTrials.gov, PubCaseFinder, phenopacket-store demo data) and where each must appear. Use when writing engine/text.ts constants, result screens, the brief or exports, footers, or any code in engine/ or functions/ that returns upstream data to the user.
---

# Attribution and safety text

Source: `docs/CONTRACT.md` section 13, copied verbatim. Use these strings exactly; do not reword, shorten or translate them.

Engine constants live in `engine/text.ts` (owner: Jerry); the app and landing reuse them.

## Strings (verbatim from the contract)

| Where | Text |
|---|---|
| Every result screen (ranking, questions, trials) and the brief | `Decision support, not a diagnosis. These are possible matches to discuss with a doctor.` |
| Footer and brief, always | `This product uses the Human Phenotype Ontology (version <hpo>). Find out more at https://hpo.jax.org` |
| When Monarch results appear | `Ranking by the Monarch Initiative semantic similarity service (monarchinitiative.org). Monarch tools are not for diagnosis or medical decisions.` |
| When Orphanet data appear | `Orphanet data, CC BY 4.0 (orpha.net, orphadata.com).` |
| When trials appear | `Trial data from ClinicalTrials.gov, U.S. National Library of Medicine.` |
| When PubCaseFinder appears | `PubCaseFinder (DBCLS), CC BY 4.0.` |
| Demo data anywhere | `Demo case (synthetic narrative from phenopacket-store <id>)` and `phenopacket-store, BSD-3-Clause.` |

- No OMIM API; OMIM appears only as ids and outbound links.
- The disclaimer is body size, calm and permanent (design steering section 7).

## How to apply

1. `<hpo>` is the HPO version from the response's `dataVersions`; `<id>` is the source phenopacket id of the demo case. Fill placeholders, change nothing else.
2. A credit appears whenever data from that source appears, including responses served from the demo cache.
3. The licence column in the `rdd-upstream-services` skill says which credit belongs to which upstream.
