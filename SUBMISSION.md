# Rare Disease Detective: submission map

A one-page map from the official judging criteria to evidence in this repository. Every number below is counted from the repo or quoted from the linked file. Hackachusetts 2026, Healthcare & Biotech track. Built at Sundai.

**Decision support, not a diagnosis.** These are possible matches to discuss with a doctor.

- Live demo: https://hackachusetts-2026.pages.dev/app/?demo=demo-npc1
- Demo video (< 3 min): https://youtu.be/NhfCiivQvSw
- Repository: https://github.com/Ian18858863/hackachusetts-2026 (Apache-2.0, [LICENSE](LICENSE))
- Full description: [README.md](README.md). Kiro write-up: [docs/KIRO_WRITEUP.md](docs/KIRO_WRITEUP.md).

## Try it in 60 seconds

1. Open https://hackachusetts-2026.pages.dev/ and press **Try the demo case**. It opens `/app/?demo=demo-npc1`, a synthetic narrative derived from phenopacket-store case `PMID_27900365_patient`.
2. **Features:** each HPO term sits next to the exact phrase it came from. "I do not get headaches" is in the "Not present" group.
3. **Possible matches:** each candidate shows the matched features (exact or through a broader term), how frequent each is in that disease, and features not mentioned. Overlap is a word, not a percentage.
4. **What to check next:** questions that separate the top candidates, each with a "why" line from annotation frequencies. Answering Yes or No re-ranks.
5. **Brief:** print or save as PDF, and download the GA4GH Phenopacket v2 JSON (features only, no diagnosis inside).
6. Family mode: https://hackachusetts-2026.pages.dev/app/?demo=demo-npc1&audience=family (no disease names, rankings or trials).
7. Language: the switch in the top bar, or add `&lang=zh` (also `ja`, `es`, `ko`, `fr`).

**Workers AI outage on 2026-10-24 (resolved).** On 2026-10-24 from about 18:45 to 19:01 ET live free-text extraction was unavailable because the account's Workers AI free daily allocation was used up (error 4006, reported by the coordinator's direct API check at 18:53 ET); it was restored at 19:01 ET after the account moved to Workers Paid. Demo cases were unaffected; if the model is unavailable again the app answers 503 LLM_UNAVAILABLE with a manual-entry path (T41).

## Implementation

| Evidence | Where |
|---|---|
| Kiro CLI (`kiro-cli chat --no-interactive`) authored Ian's tasks in parallel sessions, one git worktree and branch per task; 114 dated log rows, 20 of them Kiro-run Git integrations into `main` | [docs/KIRO_USAGE.md](docs/KIRO_USAGE.md), [BRIEFING.md](BRIEFING.md) section 6 |
| Custom agents `rdd-builder` (agent hooks on `agentSpawn`, `userPromptSubmit`, `preToolUse`, `postToolUse`; 3 hook scripts) and read-only `rdd-reviewer` | [.kiro/agents/](.kiro/agents/), [.kiro/hooks/scripts/](.kiro/hooks/scripts/) |
| `rdd-reviewer` first-pass reviews before merges: 46 files | [docs/reviews/](docs/reviews/) |
| Kiro IDE: the `PostFileSave` hook `typecheck-app-on-save` fired at 15:44 ET (branch not merged); Jerry's engine commits say "Authored by Jerry's Kiro" (tool details not logged) | usage-log row for 15:44, [.kiro/hooks/typecheck-on-save.json](.kiro/hooks/typecheck-on-save.json), [engine/](engine/) |
| 3 specs, 127 numbered EARS criteria (65 product, 25 landing, 37 i18n); 14 correctness properties P1–P14 | [.kiro/specs/](.kiro/specs/), [design.md](.kiro/specs/rare-disease-detective/design.md) |
| 4 steering files (always, fileMatch, manual) | [.kiro/steering/](.kiro/steering/) |
| MCP: Context7 and biomcp, with logged lookups | [.kiro/settings/mcp.json](.kiro/settings/mcp.json), [docs/research/biomcp-checks.md](docs/research/biomcp-checks.md) |
| Project power `rdd-medical-data` with 3 skills | [.kiro/powers/rdd-medical-data/](.kiro/powers/rdd-medical-data/) |
| Property-based tests: 19 `fc.assert` calls in 5 files, 19 `numRuns` settings from 30 to 3,000 (14,960 runs), seed 20261024 | [engine/test/](engine/test/) |
| Contract first: one interface contract for three people and parallel sessions | [docs/CONTRACT.md](docs/CONTRACT.md) (commit `f77cc31`) |

## Potential Value

| Evidence | Where |
|---|---|
| 263–446 million people live with a rare disease; diagnosis takes 4.7 years on average; 73% misdiagnosed at least once (survey of 6,507 patients) | [README "The problem"](README.md#the-problem), [docs/research/health-visions.md](docs/research/health-visions.md) |
| Competitors and our gap (DxGPT, RareSense and others) | [docs/research/health-visions.md](docs/research/health-visions.md) |
| Two audiences: clinician mode and family mode | [README "Two audiences"](README.md#two-audiences), commit `843a1c7` |
| 6 interface languages | [app/src/shared/i18n/locales.ts](app/src/shared/i18n/locales.ts), [.kiro/specs/i18n/](.kiro/specs/i18n/requirements.md) |
| No sign-up; case kept in the browser; functions do not store or log note text | [docs/CONTRACT.md](docs/CONTRACT.md) section 2 |
| GA4GH Phenopacket v2 export for a genetics clinic's own tools | [docs/CONTRACT.md](docs/CONTRACT.md) section 7.7 |
| Apache-2.0 code and docs; third-party licences listed | [LICENSE](LICENSE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) |

## Quality and Design

| Evidence | Where |
|---|---|
| Six public resources combined: HPO (JAX API), Monarch, PubCaseFinder, Orphanet, ClinicalTrials.gov, phenopacket-store | [README "Data sources and attribution"](README.md#data-sources-and-attribution), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) |
| The LLM only proposes phrases; the engine keeps a term only if the phrase is in the text and the HPO API confirms it | [docs/CONTRACT.md](docs/CONTRACT.md) section 7.2, properties P1, P2 |
| Each term footnoted to its source sentence | commit `4418ebf` (T33) |
| Negated features become excluded terms and lower a candidate's overlap label | [docs/CONTRACT.md](docs/CONTRACT.md) section 7.4, property P7 |
| No percentages from similarity scores; "raw service score" only | [docs/CONTRACT.md](docs/CONTRACT.md) section 1 |
| Accessibility QA: axe-core on every step at 3 sizes (no critical or serious findings), keyboard-only path with focus ring on 59 controls, reduced motion; 37 evidence files | [docs/QA.md](docs/QA.md), [docs/qa/](docs/qa/) |

## Honest evaluation

All numbers are our own small evaluations on published cases. They are not a clinical validation. Published cases may already feed the HPO annotations and PubCaseFinder's data, so results are likely optimistic.

| Run | Result | Source |
|---|---|---|
| T23, pre-registered 12:57 ET, 14 cases: frequency-aware re-rank vs Monarch | top-1 5 → 4, top-3 6 → 6, top-10 6 → 6; not shipped | [ranking-benchmark.md](docs/research/ranking-benchmark.md) |
| Jerry's pre-registered 50-case benchmark, Monarch semsim | top-1 / top-3 / top-10 19/50, 23/50, 30/50 | [ranking-benchmark-50.md](docs/research/ranking-benchmark-50.md) |
| Same run, the 10 cases PubCaseFinder answered before HTTP 429 | Monarch 3/5/6, PubCaseFinder 3/5/5, RRF 2/4/9 | [ranking-benchmark-50.md](docs/research/ranking-benchmark-50.md) |
| 20 held-out cases (Peter's 10 PMC case reports plus Jerry's 10) | top-1 / top-3 / top-10 Monarch 6/8/9, PubCaseFinder 7/10/11 | [held-out-20.md](docs/research/held-out-20.md) |
| Peter's 10 cases, free text through production (`8603c0b`) | top-1 / top-3 / top-10 1/2/2; 2 of 10 notes hit the 15 s extraction timeout | [held-out-20.md](docs/research/held-out-20.md) section 1 |
| 14 benchmark cases through our `/api/rank` with PubCaseFinder ordering | top-1 9/14, top-3 10/14, top-10 11/14 | [held-out-20.md](docs/research/held-out-20.md) section 3 |

Caveats: the samples are small. Four of the 14 benchmark cases are demo cases chosen because Monarch misses them, so most of PubCaseFinder's gain on the 14 is on those four ([pcf-ranking.md](docs/research/pcf-ranking.md)). The benchmark input is the published HPO terms, so it measures ranking, not extraction. Free-text extraction scored lower than curated terms on Peter's cases.
