# First-pass review: T18o fix and T18q, re-review

- **Task:** Re-review of the T18o fix (2xx-only edge cache, re-recorded questions) together with T18q (recorded demo-marfan and demo-cdls rankings)
- **Reviewed commit range:** `6fdfa0a...HEAD` on branch `ian/t18o-questions-filter`: `b44cc2b` (T18o fix) and `6d2f26b` (T18q)
- **Reviewer agent:** `rdd-reviewer` (read-only Kiro CLI custom agent, `.kiro/agents/rdd-reviewer.json`)
- **Date:** 2026-10-24, 16:12 ET
- Translated faithfully into English from the agent's Chinese output; the original is kept in the assistant's run log.

## Review

1. `functions/_lib/fallback/questions.ts:121-132` and `:381`, should-fix. One read can use up to 3 subrequests in the worst case: first a 5xx, then `getJson` retries and gets a 2xx with an unusable body, then `edgeCached` sends one more `no-store` request. But `LookupBudget` reserves only `CALLS_PER_LOOKUP = 2` per lookup, so the cap of 40 can be exceeded. Fix: reserve 3, or skip the `no-store` request when the previous call was already a retry.
2. `functions/_lib/fallback/questions.ts:244-249`, should-fix. The annotation phase has no cap, and the new Monarch mappings and Orphadata calls each carry 1 retry. With 5 candidates the theoretical worst case is about 65 subrequests, above the Workers Free limit of 50 (contract §7.5, §10). Normally demo-npc1 uses about 18, which is fine. Fix: put the annotation phase under the `SubrequestMeter` cap too, or write the worst case in a comment and accept the risk.
3. `functions/_lib/fallback/questions.ts:37`, nit. The comment says "see T18o log" without the measured number. Fix: write the measured subrequest count.
4. `functions/_lib/fallback/questions.ts:155`, nit. The mappings request uses `limit=20`; if the exactMatch is not in the first 20 rows it is missed. Fix: raise the limit, or filter by predicate.
5. `docs/CONTRACT.md` §9 last paragraph and §10, should-fix (outside scope, needs coordination). The contract says the temporary fallback covers only demo-npc1; T18q added recorded rankings for demo-marfan and demo-cdls. Fix: post a `[CONTRACT CHANGE]` and record it as v0.1.4 (non-breaking).
6. Earlier findings are fixed:
   - `cacheTtlByStatus` caches 2xx only.
   - An unusable body bypasses the cache with `no-store`. `compatibility_date` is 2026-07-29, which supports the `cache` field.
   - When JAX answers 404 for an ORPHA id, the MONDO id now comes from Monarch mappings.
   - The `displayName` rule matches the engine.
   - `RECORDED_QUESTIONS` no longer has `noAnnotationData`, is now explicitly typed `NextQuestionsResponse`, and its shape follows §5/§7.5; `discriminates` has one entry per candidate (R5.2, R5.4, P9).
   - The recorded rankings keep `source: "live"` as recorded, and `asDemoPayload` turns that into `demo` and adds `demoCache` (R10.5, R11.2). The lookup order is the engine's `getDemoRanking` first, then the map (`functions/api/rank.ts:112-113`).
   - Changes are inside the claimed scope.

CHANGES_REQUESTED (items 1 and 2). NOT RUN: tsc typecheck (no tsconfig at the repo root or under `functions/`), unit tests, a measured subrequest count, a field-by-field check of the Marfan/CDLS JSON. design.md §7 and §12 do not apply, since there is no UI change.

## Outcome

Outcome: findings 1–4 fixed in commit `6719a84` on `ian/t18o-questions-filter`, landed on `main` as `f88e727` ("Bound the worst-case subrequests in fallback next-questions (T18o)"). Each read is capped at 2 calls; the annotation phase has a bound (at most 37 calls, optional Monarch and Orphadata calls share a budget of 12), so the whole invocation stays at or under 40; the comment gives the measured 37 calls for demo-npc1 on a cold cache; the mappings query filters by `skos:exactMatch` with `limit=500`. `hierarchy.test.ts` 23 passed, 0 failed. Finding 5 recorded as contract v0.1.4 by T18r (`fb84992`, fix `e2feaef`). The reviewed commits landed as `2b7e0cc` (T18o fix) and `8b4a41f` (T18q).
