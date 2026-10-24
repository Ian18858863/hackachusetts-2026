# Tasks: Rare Disease Detective

> Status: v0.1 DRAFT. Shapes come from [`docs/CONTRACT.md`](../../../docs/CONTRACT.md) v0.1. Each task names its owner, its exact path and the requirements it serves (`R<n>.<m>`). Claim a task on the board in `BRIEFING.md` section 6 before starting it.
>
> **Parallel lanes.** Lane 0 unblocks everyone. After that, Jerry's engine lane, Ian's functions lane (against a stub engine or the demo cache), Ian's app lane (against contract example JSON) and Peter's landing lane run in parallel. Lane 5 joins them.

## Lane 0: contract (blocks dependent interfaces)

- [ ] 0.1 Ian and Jerry review `docs/CONTRACT.md` v0.1 and post APPROVE or `[CONTRACT CHANGE]` items; resolve open questions 2, 4, 6 and 8 (owner: Ian's Kiro edits; Jerry approves engine fields). _R all_
- [x] 0.2 Decided (Ian, 12:15 ET): Cloudflare Workers AI through the Pages Functions AI binding `AI`; no API key needed; model id from `LLM_MODEL`, default chosen in T17 (open question 1). _R10.4_

## Lane 1: engine — Jerry (`engine/**`, T07/T08)

Tasks 1.1 and 1.2 first; 1.3–1.8 can then run in any order.

- [ ] 1.1 `engine/types.ts`, `engine/index.ts`: export the contract §5 types and §6 signatures (stubs allowed). _R2, R3, R5, R6_
- [ ] 1.2 `engine/http.ts`: injected-fetch wrapper with per-upstream timeouts (contract §10), one retry for GETs, typed `UpstreamTimeout` / `UpstreamError` / `InvalidInput`, optional Workers cache with sorted-id keys. _R11.2, R11.3_
- [ ] 1.3 `engine/hpo.ts`: term lookup, `searchTerms`, disease annotations for ORPHA and OMIM ids, `normalizeFrequency` to HPO bands. _R2.2, R2.7, R3.4, R3.7_
- [ ] 1.4 `engine/ground.ts`: `groundTerms` (exact quote offsets, id confirmation, label re-mapping, drop with warning, dedupe, HPO primary names). _R2.2, R2.3, R2.4, R2.8_
- [ ] 1.5 `engine/rank.ts`: `rankCandidates` and `overlapLabel` (Monarch semsim, ORPHA > OMIM > MONDO id choice, evidence, unmatched, notReported, contradicted, genes, categories, links, Orphadata name check, deterministic ordering; PubCaseFinder behind a flag, off by default). _R3.1–R3.8, R4.4, R11.4_
- [ ] 1.6 `engine/questions.ts`: `nextQuestions` (frequency-midpoint spread, exclude observed and excluded, template questions, `why` from data). _R5.1–R5.4_
- [ ] 1.7 `engine/trials.ts`: `searchTrials` (RECRUITING only, max 5, total, url). _R7.1, R7.3_
- [ ] 1.8 `engine/brief.ts`, `engine/data/specialists.ts`, `engine/text.ts`: `buildBrief`, `toPhenopacket`, `specialistsFor`, disclaimer and attribution strings. _R6.2–R6.6, R8.1, R8.2, R9.1, R9.3_
- [ ] 1.9 `engine/demo/**`: the five demo cases from contract §9 (`demo-npc1` first, then `demo-dmd`, `demo-marfan`, `demo-kabuki`, `demo-cdls`) (narratives, prepared extractions), then record rank, questions and trials responses for each prepared term set; `listDemoCases`, `getDemoCase`, `demoRankKey`, `getDemoRanking`, `getDemoQuestions`, `getDemoTrials`. Under 400 KB. _R10.1, R10.3, R10.5, R11.2_
- [ ] 1.10 `engine/test/**`: unit tests per module with recorded fixtures and mock fetch. _R2, R3, R5, R6_
- [ ] 1.11 `engine/test/**`: fast-check properties P1–P14 (contract §11). _R2.2, R2.3, R3.6, R3.3, R4.4, R5.3, R6.4, R10.1_
- [ ] 1.12 `engine/bench/**`: offline benchmark on 50 phenopacket-store cases, results JSON with date and versions, labelled "our own evaluation". _R9.3_

## Lane 2: functions — Ian (`functions/api/*`, one claim per file)

Each function can start against the contract examples and the engine stubs from 1.1, and switch to the real engine as Jerry's tasks land.

- [ ] 2.1 `functions/api/health.ts`: add `version`, `source` and `llm { binding, model }` (exists; small change). _R10.4_
- [ ] 2.2 `functions/api/extract.ts`: validation (≤ 8,000 chars), demo-case path via `getDemoCase`, 503 `LLM_UNAVAILABLE` when the `AI` binding is missing, Workers AI call `env.AI.run(LLM_MODEL, …)` for `TermProposal[]` with 15 s timeout, `groundTerms`, 422 on zero terms. No note text in logs. _R1.2, R1.5, R2.1–R2.4, R2.8, R2.9, R10.3, R10.4, R11.6_ Part of Ian's T17 claim: add the `[ai]` binding named `AI` to the root `wrangler.toml` and choose the `LLM_MODEL` default by testing the candidate models on the five demo narratives.
- [ ] 2.3 `functions/api/terms.ts`: `searchTerms` proxy, 7-day cache. _R2.7_
- [ ] 2.4 `functions/api/rank.ts`: validation (id regex, sizes, no id in both lists), `rankCandidates`, demo fallback on 502/504, 24 h cache. _R3.1, R3.6, R11.2, R11.3, R11.6_
- [ ] 2.5 `functions/api/next-questions.ts`: validation (2–5 candidates), `nextQuestions`, demo fallback. _R5.1, R11.2, R11.3_
- [ ] 2.6 `functions/api/trials.ts`: `searchTrials`, 6 h cache, demo fallback. _R7.1–R7.3, R11.2_
- [ ] 2.7 `functions/api/brief.ts`: validation (≥ 1 observed term, `lastRanking` present), `buildBrief` + `toPhenopacket`. _R6.1–R6.6_
- [ ] 2.8 Function tests (separate claim, e.g. `functions/test/**`): status codes, error shape, demo fallback with a stub engine. _R11.3, R11.6_

## Lane 3: app — Ian (`app/**`, feature folders claimed separately)

Start with 3.1; the feature folders then run in parallel against contract example JSON (labelled mock data) until the functions are live.

- [ ] 3.1 `app/src/shared/`: typed API client for `/api/*` only, case store in `localStorage` (`rdd.case.v0.1`), disclaimer component, footer with HPO version and attributions, loading / empty / error / offline components, `aria-live` region. _R1.5, R8.1, R8.2, R9.1, R11.1, R11.3, R11.5, R12.3_
- [ ] 3.2 `app/src/features/intake/`: notes input with character limit, demo picker with demo label, submit to extract. _R1.1–R1.4, R10.2, R10.6_
- [ ] 3.3 `app/src/features/review/`: terms with quotes, hover/focus highlight in the text, confirm / remove with undo / mark absent / mark present, manual add via `/api/terms`, warnings, zero-terms state. _R2.1, R2.4–R2.9, R9.4, R12.1, R12.4_
- [ ] 3.4 `app/src/features/ranking/`: candidate list (max 5) with overlap labels and links, evidence panel (matched, unmatched, frequency, notReported, contradicted), "raw service score" label, sources and versions, stale state and debounced re-rank without layout shift, rank-change announcement, fewer-than-6 note. _R3.2–R3.8, R4.1–R4.4, R9.2, R12.4_
- [ ] 3.5 `app/src/features/questions/`: questions with "why" lines, yes/no answers that add terms and re-rank. _R5.1–R5.5_
- [ ] 3.6 `app/src/features/trials/`: studies per candidate, empty state with ClinicalTrials.gov link, credit line. _R7.1–R7.3, R8.2_
- [ ] 3.7 `app/src/features/brief/`: brief view with print stylesheet (one page), demo marking, phenopacket download. _R6.1–R6.6, R9.1_
- [ ] 3.8 Accessibility and responsive pass: keyboard happy path, focus ring, contrast check with a tool, 1440×900 / 1000×600 / 375×812, reduced motion. _R12.1–R12.6_

## Lane 4: landing — Peter (`landing/**`, T04)

- [ ] 4.1 Landing page with the shared tokens and voice, hero showing a true screenshot of the ranking evidence, disclaimer and HPO attribution in the footer. _R8.1, R9.1_
- [ ] 4.2 Main call to action opens `/app` with a demo case preloaded (agree the URL parameter with Ian, `/app/?demo=demo-npc1`). _R10.6_

## Lane 5: integration and verification — Ian (T03 paths)

- [ ] 5.1 End-to-end smoke script (T03 path): health, extract (demo), rank, next-questions, trials, brief on local `wrangler pages dev` and on the live URL; check `version`, `source`, shapes; one forced-upstream-failure run checks demo fallback and error shape. _R10.3, R10.5, R11.2, R11.3, R11.6_
- [ ] 5.2 Design steering §12 definition-of-done checks with screenshots, including loading, empty and error states triggered on purpose. _R11.1, R12.1–R12.6_
- [ ] 5.3 Record what was not checked (for example real iPhone, Safari) in the QA note. _R12_
