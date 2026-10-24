---
name: rdd-demo-fixtures
description: Rules for recording upstream responses into this project's demo cache (engine/demo/**) and labelling demo data. Covers which payloads to record per demo case, keeping dataVersions plus demoCache, offset checks, size target and the verbatim demo label. Use when creating, re-recording or testing demo fixtures, or when code serves a response with source "demo".
---

# Demo fixtures and the demo cache

Source: `docs/CONTRACT.md` section 9 (rules only). The narratives, expected diagnoses and term tables for each case are in section 9.1 to 9.4 of the contract; read them there, do not copy or edit them here.

## Rules (verbatim from the contract)

- Derived from [phenopacket-store](https://github.com/monarch-initiative/phenopacket-store) (BSD-3). Each narrative was written by Ian's Kiro on 2026-10-24 from the HPO terms of the named phenopacket. Not real patients; some excluded terms from the source are left out to keep the text short. Order in the demo picker: `demo-dmd` (primary), `demo-marfan`, `demo-kabuki`, `demo-cdls`.
- UI label, verbatim: `Demo case (synthetic narrative from phenopacket-store <id>)`.
- Owners: Jerry owns the demo cache under `engine/demo/**` (narrative text, prepared extraction, recorded upstream responses for the prepared term set). Ian owns the demo narratives' UI (picker, labels).
- Offsets below were computed and checked with `text.slice(start, end) === quote`. Jerry's tests must re-check them.

```ts
export interface DemoCaseSummary { caseId: string; title: string; label: string; sourcePhenopacketId: string }
export interface DemoCase extends DemoCaseSummary {
  narrative: string;
  expectedDiagnosis: { id: string; label: string }; // from the source phenopacket; for the benchmark and tests, never shown as "the answer"
  extraction: ExtractedTerm[];   // prepared, grounding "exact-id", confidence "high"
  recordedAt: IsoDateTime;
}
```

Demo cache contents per case: narrative, prepared extraction, one recorded `/api/rank` response for the prepared term set (limit 5), the matching `/api/next-questions` response, and `/api/trials` for the top candidate. Each recorded payload keeps its original `dataVersions` plus `demoCache`. Target size: four cases, under 400 KB total (open question 5).

## How to record a fixture (steps derived from the rules above)

1. Only the owner of `engine/demo/**` (Jerry) writes the cache. Other agents read it.
2. For each case, record exactly: `/api/rank` for the prepared term set with limit 5, the matching `/api/next-questions`, and `/api/trials` for the top candidate.
3. Store each payload as returned. Keep its original `dataVersions` and add `demoCache` (the recording date). Do not edit upstream values.
4. Call upstreams only through the endpoints, timeouts and cache rules in the `rdd-upstream-services` skill. No API keys in fixtures.
5. Re-check every prepared term with `text.slice(start, end) === quote`.
6. Keep the total for four cases under 400 KB.
7. Wherever demo data appears, show `Demo case (synthetic narrative from phenopacket-store <id>)` and `phenopacket-store, BSD-3-Clause.` plus the credit lines of the upstreams in the recorded payload (see `rdd-attribution-text`).
8. `expectedDiagnosis` is for the benchmark and tests only; never show it as "the answer".
