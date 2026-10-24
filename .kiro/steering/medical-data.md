---
inclusion: fileMatch
fileMatchPattern: ["engine/**", "functions/**"]
---

# Medical data rules for engine/ and functions/

> Provenance: written by Ian's Kiro on 2026-10-24 (T21), distilled only from `docs/CONTRACT.md` sections 1, 10 and 13 and `.kiro/steering/design.md` section 7. If this file and the contract disagree, the contract wins. Change the rules through the contract change process (contract section 14), not here.

This product is decision support for a conversation with a doctor, not a diagnosis. These rules apply to every function in `engine/` and `functions/` that touches phenotype terms, diseases, rankings, trials or the brief.

## Who decides what

- The ontology and the ranking services rank. The LLM only translates notes into candidate terms (contract section 1).
- LLM output is a proposal. An HPO ID is kept only after the engine confirms it against the HPO service.

## No invented IDs or facts

- Never invent HPO IDs, disease IDs, disease facts, frequencies or probabilities, in code, fixtures, fallbacks or comments (contract section 1).
- If an upstream call fails, return the typed error or the cached fallback. Do not fill gaps with made-up values.

## Source and version on every disease fact

- Every disease fact shown comes from a named upstream source and data version (contract section 1). Keep the source and version with the data from the engine to the response; do not drop them in mapping code.
- Use only the upstreams listed in contract section 10, with their timeouts, retry rule and cache keys: JAX HPO (search, term, annotations), Monarch semsim, Orphadata, PubCaseFinder (optional), ClinicalTrials.gov v2, Workers AI (binding `AI`, from `functions/api/extract.ts` only).
- Cache keys use sorted, deduplicated ids so term order never changes the key (contract section 10).

## No probabilities from similarity scores

- No percentage or probability is derived from a similarity score. Overlap is a plain-language label: `strong`, `partial` or `weak`. The raw score is shown only as "raw service score" (contract section 1).
- Results are ranked "possible matches to discuss with a doctor", never a single answer (design section 7).
- Each result carries its reasoning: which inputs matched, which did not, and how common each is (design section 7).

## Demo data

- Demo data is always labelled as demo data. No real patients (contract section 1, design section 7).
- Demo label text: `Demo case (synthetic narrative from phenopacket-store <id>)` and `phenopacket-store, BSD-3-Clause.` (contract section 13).

## Attribution and safety text

Use the strings from contract section 13 verbatim. They live as engine constants in `engine/text.ts` (Jerry); functions and the app reuse them instead of retyping them.

- Every result (ranking, questions, trials) and the brief: `Decision support, not a diagnosis. These are possible matches to discuss with a doctor.`
- Footer and brief, always: the HPO line with the real HPO version.
- When Monarch, Orphanet, ClinicalTrials.gov or PubCaseFinder data appear: the matching credit line from section 13.

## OMIM

- No OMIM API calls. OMIM appears only as ids, names already present in HPO annotations and Monarch xrefs, and outbound links (contract sections 10 and 13).

## The contract

#[[file:docs/CONTRACT.md]]
