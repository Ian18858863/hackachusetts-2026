---
name: rdd-upstream-services
description: Exact upstream endpoints, timeouts, retry, Workers Cache API caching and licence credits for this project's medical data services (JAX HPO search, term and annotations; Monarch semsim; Orphadata; PubCaseFinder; ClinicalTrials.gov v2; Workers AI). Use when writing or reviewing fetch code in engine/ or functions/, choosing a timeout or cache key, or answering which upstream, timeout or licence applies.
---

# Upstream services, timeouts and caching

Source: `docs/CONTRACT.md` section 10, copied verbatim. If the contract changes, the contract wins; re-read it and update this power through its owner.

## Table (verbatim from the contract)

| Upstream | Call | Timeout | Cache (Workers Cache API) | Licence / credit |
|---|---|---|---|---|
| JAX HPO search | `GET https://ontology.jax.org/api/hp/search?q=&limit=` (~0.1 s) | 2 s | 7 days by `q|limit` | HPO licence: cite, show version, do not alter |
| JAX HPO term | `GET https://ontology.jax.org/api/hp/terms/{HP:id}` | 2 s | 7 days by id | HPO |
| JAX HPO annotations | `GET https://ontology.jax.org/api/network/annotation/{ORPHA:n or OMIM:n}` (~0.15 s) | 3 s | 24 h by id | HPO; Orphanet-sourced rows CC BY 4.0 |
| Monarch semsim | `GET https://api.monarchinitiative.org/v3/api/semsim/search/{ids}/Human%20Diseases?limit=N` (~4.6 s) | 8 s | 24 h by sorted ids + limit | Monarch; "not for diagnosis or medical decisions" |
| Orphadata | `GET https://api.orphadata.com/rd-cross-referencing/orphacodes/{n}?lang=en` | 2 s | 7 days by code | CC BY 4.0 |
| PubCaseFinder | `GET https://pubcasefinder.dbcls.jp/api/pcf_get_ranked_list?target=omim&format=json&hpo_id=` (~10 s, ~11 MB) | 6 s, optional | 24 h, top 50 rows only | CC BY 4.0 |
| ClinicalTrials.gov v2 | `GET https://clinicaltrials.gov/api/v2/studies?...` | 6 s | 6 h by condition | US government work |
| Workers AI (binding `AI`, model `LLM_MODEL`) | `env.AI.run` from `functions/api/extract.ts` only | 15 s | none | Ian's Cloudflare account; no key needed |

## Rules (verbatim from the contract)

- Timeouts use `AbortSignal.timeout(ms)` (or an `AbortController`) inside the engine's fetch wrapper.
- One retry with 300 ms backoff for idempotent GETs on 5xx or network error, only if the remaining budget allows.
- Cache keys are built from sorted, deduplicated ids so term order never changes the key.
- OMIM: links only. No OMIM API calls, no OMIM data beyond ids and names already in HPO annotations and Monarch xrefs.

## How to apply

1. Use only the endpoints in the table. Do not add an upstream that is not in the contract; propose it through the contract change process instead.
2. Take the timeout and cache lifetime from the same row as the endpoint you call.
3. When an upstream's data reaches the user, show its credit line from the `rdd-attribution-text` skill in this power.
4. No API keys are needed or stored for any of these services. Never put a key in code, fixtures or logs.
