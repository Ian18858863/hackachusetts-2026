# Team Briefing — Hackachusetts 2026 (read this first)

Last updated: 2026-10-24. **v4.7 — latest deploy `cf07006` (in the 14:40s ET) with the full demo-npc1 flow verified live; T16 and T18f deployed and verified; T15b, T10d, T11h, T13e, T18d, T18e recorded as pushed; T18c recorded as deployed and verified; late claims T18c–T18f, T13e, T09d, T10e, T11i recorded honestly. Recorded 2026-10-24 ~14:50 ET by Ian's Kiro.** **v4 was approved by all three humans (Ian, Peter, Jerry) in the team chat at ~11:35 ET.** This version preserves the original event rules, topic research, and submission requirements, and adopts the faster 3-person coordination workflow.

This is the single source of shared **decisions and current task claims**. The companion [`docs/PROTOCOL.md`](docs/PROTOCOL.md) (Assistant × Kiro Agent Collaboration Protocol v4) is the operational handbook for human teammates, their AI Assistants, and Kiro coding Agents.

## 0. Read first — terminology and operating rule

- **Human:** Ian (`Ian18858863`), Peter (`qirongwangpeter`), or Jerry (`lolershark`). Humans own decisions, Git approval, release, and evidence of real tests.
- **Assistant:** A teammate's planning/review assistant (Claude for Ian; ChatGPT or other assistant for other teammates). It writes **natural-language Kiro instructions**, reviews actual diffs/tests, reports risks, and never authors project code. Ian's Assistant can use `kiro-cli` to direct Kiro; Ian's expressly authorized Kiro Git actions follow the review/QA limits in the companion protocol.
- **Agent:** The **Kiro** coding agent (IDE / CLI / related Kiro workflow), which authors and fixes project code, tests, and project implementation artifacts. Only Kiro writes competition project code.
- **One GitHub repository, one shared `main` branch, task-level file claims.** No mandatory B0/B1 lock, Integration branch, formal Patch handoffs, or PRs. Prefer small, reviewed, tested commits on `main` every ~20–30 minutes when safe. **Under Ian's ratified standing authorization (see docs/PROTOCOL.md section 6A), his Kiro may integrate/commit/push reviewed Ian-owned tasks after real QA; Peter and Jerry still approve Git actions themselves.**
- **Ian is the demo integration, visual consistency, deployment, and submission coordinator.** This supersedes earlier tentative plans that made Peter the integration lead. Responsibilities are *claim-based*, not permanent monopoly; the initial suggestions in section 6 remain proposals until accepted and claimed.
- **One source of truth for decisions:** this committed `BRIEFING.md`; API shapes live in `docs/CONTRACT.md`; live short-term signals come from group chat and the verified remote SHA. **Assistant-drafted internal coordination files** (`BRIEFING.md`, `docs/CONTRACT.md`, team protocol) may be submitted by a designated editor; **competition code and judge-facing artifacts** (README, source/tests, Kiro specs/steering, Kiro write-up) are Kiro-authored. If sources disagree, ask the humans.
- **All project/submission content remains in English.** Operational human/Assistant chat may be in Chinese or English, but all repo documents (including `docs/PROTOCOL.md`) are in English.
- Read [Section 3](#3-hard-rules-from-the-official-rules) before every Kiro coding task. Stop before acting on ambiguous or unauthorized high-risk changes.

### Known Git event requiring honest follow-up (disclosed by Ian's Assistant)

- At **10:55 ET** on October 24, Ian's Assistant pushed `c31e29feaeac861e3498fe65f53e6c571dd82618` to `main`, after the earlier `c9c7c030dd7e5ab8f6a913c42b761be18b954e76`. Ian's Assistant **verified** at **11:39 ET** that `origin/main` is `c31e29feaeac861e3498fe65f53e6c571dd82618`. Still re-check current `origin/main` before each task. No fixed B0/B1.
- That commit includes a `.kiro/steering/design.md` **draft authored by Claude** and a **premature Kiro-usage line**. Preserve history; no force-push. Ian's **Kiro** must genuinely write/revise the steering, and correct the usage record to reflect **actual** actions only. Do not disguise prior authorship or claim Kiro used the draft before it actually did. Team reviews/approves the new steering SHA.
- Ian's separate Kiro CLI sessions use **unique worktrees and temporary branches** for non-overlapping subtasks `T##a/T##b`, integrated **serially** into clean `main` after Assistant diff review and genuine QA. Only Ian's expressly approved, narrow standing Git consent applies; shared files require their own approvals. Deployment follows the pre-authorization in section 5 (only after a real smoke test passes); making the repo public and submitting stay Ian's personal actions.

## 1. The event in one screen

| Item | Detail |
|---|---|
| Event | Hackachusetts, powered by Kiro. Statewide Massachusetts student hackathon (Mass AI Coalition + Sundai Club; sponsors include AWS, Kiro, The Engine, WHOOP) |
| Our venue | UMass Boston |
| Team | Ian (`Ian18858863`, repo admin), Qirong Wang (`qirongwangpeter`), Jerry (`lolershark`) |
| Repo | https://github.com/Ian18858863/hackachusetts-2026 (private now; must be **public** at submission) |
| Live demo | https://hackachusetts-2026.pages.dev (app at `/app/`; skeleton first deployed 12:02 ET from main `53263d4`; functions first live in `3c99583` at 13:46 ET: `/api/extract` (Workers AI), `/api/terms`, `/api/rank`, `/api/next-questions`, `/api/trials`, `/api/brief`; latest deploy `e8d762f` (live smoke 14 passed, 0 failed)) |
| Build window | 11:30 → 18:00. Submission window 18:00–20:00. **Hard deadline 20:00. Our target: submitted by 19:00.** |
| Judging | Remote, 20:00–23:00. About 50 finalists notified at midnight. Finals Sunday 10/25, 11:00–14:00 at WHOOP HQ |
| Prizes per track | 1st $3,500 · 2nd $1,000 · 3rd $500. Bonus: Best Use of Kiro (1-year Kiro Pro Max). Top 50 finalists get WHOOP straps |

## 2. How we are judged (official criteria)

1. **Potential Value** — a real, clearly defined problem; scalable and realistic; who benefits and how it grows beyond the hackathon; accessibility, equity, adoption; how saturated the market already is.
2. **Implementation** — *how well we used Kiro*: variety of Kiro tools (IDE, CLI, Web, Crew), depth of features (specs, hooks, steering, MCP, property-based testing, powers), and a thoughtful AI-development strategy.
3. **Quality and Design** — creativity and originality, polished and intuitive UI, use of unique public datasets, surprising combinations of technology.

"Best Use of Kiro" goes to the project with the top Implementation score among the top 10%.

## 3. Hard rules (from the official rules)

Breaking these can disqualify us.

- **All project code is written with Kiro.** "Insufficient use of Kiro will result in disqualification." Do not use other AI coding agents (Codex, Claude Code, Cursor, Copilot) to write project code. (Research and this briefing were prepared outside Kiro; that is not project code.)
- **`/.kiro/` at the repo root, committed.** Never add it or its subfolders to `.gitignore`.
- **Public GitHub repo** with all source, assets and instructions needed to run it.
- **Demo video under 3 minutes**, public on YouTube or Vimeo, showing the project actually working. No copyrighted music or third-party trademarks without permission.
- **Text description** of features and functionality.
- **Kiro write-up**: which Kiro tools we used and how; specs vs vibe coding; hooks; steering; MCP; property-based testing; powers.
- **Working demo access** for judges (live URL or test build), free and unrestricted until judging ends. Judges may judge from video and text alone, so the video matters most.
- **Everything in English.**
- **Original work.** Open-source libraries are fine if we follow their licenses.
- **Sundai terms**: open-source the project by the end of the event, add "Built at Sundai", and create a project card on sundai.club/projects.
- **Never commit secrets** (API keys, tokens). Use `.env` (already gitignored).

Sources: official rules `https://docs.google.com/document/d/1aDagPzc29sNGHdycZ-30GMf2z-Np2SwqZX_hY46tLrQ`, Sundai terms `https://tinyurl.com/sundaiterms`.

## 4. Topic status

**Topic: CONFIRMED by all three humans — Rare Disease Detective, Healthcare & Biotech track.** Ian selected it at 11:50 ET on 2026-10-24 and announced it in the team chat. Peter and Jerry each replied "APPROVE topic — Rare Disease Detective (Healthcare & Biotech)" at ~12:05 ET.

- **Product name:** working name "Rare Disease Detective" (final name TBD).
- **Positioning (Ian):** "Paste a symptom history; watch the possible conditions rank step by step with the evidence behind each, plus which specialist to see and which tests to ask about. Positioned as a diagnostic-support assistant for clinicians and families, extensible to hospital systems and genetic testing."
- **Pitch rule:** say "a specialist-ready brief in minutes", never "diagnosis in minutes".

Official guidance ideas exist (wearables, coverage renewals, care coordination, biotech discovery, clinical trials) but they are only guidance; our own idea is allowed.

### Selected concept: Rare Disease Detective

**Problem (verified numbers).**
- 263–446 million people worldwide live with a rare disease (Orphanet data, Eur J Hum Genet 2020); about 30 million in the US.
- More than 10,000 rare diseases; about 72% genetic; about 70% start in childhood (Nat Rev Drug Discov 2020).
- Diagnosis takes **4.7 years** on average; 22% of patients saw 8+ clinicians; 73% were misdiagnosed at least once (survey of 6,507 patients, Eur J Hum Genet 2024).

**Pitch line.** "A specialist-ready brief in minutes, not a diagnosis in years." Do **not** claim "diagnosis in minutes"; that overclaims.

**Why it can work (evidence).** Ontology-based phenotype matching (HPO) beats keyword matching (Köhler 2009). LLM + ontology tools together beat either alone (US study, 424 patients). An agentic LLM system ranked the right disease first in 57% of cases (DeepRare, *Nature* 2026).

**Competition and our gap.** DxGPT already does "plain symptoms → possible diseases" for patients (62,000+ new users in a year). RareSense (clinician HPO matcher) won Harvard's 2025 rare-disease hackathon. Our defensible gap:
1. **Traceable ranking**: each candidate shows which of the patient's features matched and how common each is in that disease. The ontology ranks; the LLM only translates and explains.
2. **"What to check next"**: the features that best separate the top candidates, as plain questions for the appointment.
3. **Specialist-ready output**: one-page brief + GA4GH phenopacket export a genetics clinic can run tools on.
4. **Navigation**: recruiting trials (ClinicalTrials.gov) and patient-organisation links.
5. **Safety framing**: decision support for a conversation with a doctor, not a diagnosis.

**Suggested 3-minute demo flow.**
1. A parent pastes plain notes ("she can't climb stairs, falls a lot, big calves").
2. LLM extracts HPO terms, each shown with the sentence it came from; the family confirms or removes them.
3. Live ranking (Monarch semsim or PubCaseFinder), cross-checked with Orphanet; matched features and frequencies per candidate.
4. "What to check next" questions.
5. Output: one-page brief (PDF) + phenopacket JSON + recruiting trials.
6. Footer: HPO version and attribution; "decision support, not a diagnosis".
7. Demo patients from phenopacket-store only; never real patients.

**Public data and APIs (no key needed; tested 2026-10-24).**

| Resource | Example endpoint | Terms |
|---|---|---|
| HPO ontology API | `https://ontology.jax.org/api/hp/search?q=seizure` · `https://ontology.jax.org/api/network/annotation/HP:0001166` | Free; cite HPO, show its version, don't alter content |
| HPO annotations | `https://github.com/obophenotype/human-phenotype-ontology/releases/latest/download/phenotype.hpoa` (35.8 MB) | Same as HPO |
| Monarch API v3 (ranking) | `https://api.monarchinitiative.org/v3/api/semsim/search/HP:0001166,HP:0000098,HP:0001083/Human%20Diseases?limit=3` | Code BSD-3; says not for diagnosis or medical decisions |
| Orphadata | `https://api.orphadata.com/rd-cross-referencing/orphacodes/558?lang=en` | CC BY 4.0; keep a downloaded backup in case it starts requiring keys |
| PubCaseFinder | `https://pubcasefinder.dbcls.jp/api/pcf_get_ranked_list?target=omim&format=json&hpo_id=...` | CC BY 4.0 (API-specific terms unverified) |
| phenopacket-store (demo patients) | `https://github.com/monarch-initiative/phenopacket-store` | BSD-3 |
| ClinicalTrials.gov API v2 | `https://clinicaltrials.gov/api/v2/studies?...` | US government work |
| **OMIM** | — | **Do not use**: key required, no redistribution |

Official event datasets for this track: https://hackachusetts2026.vercel.app/#/healthcare

### Alternatives considered

- **Digital-twin clinical trials**: strong regulatory backing (EMA qualified PROCOVA in 2022) but realistic gain is 10–35% fewer patients, hard to demo visually, and Unlearn already sells it.
- **Wearable health twin**: eye-catching, but Oura, Apple, Fitbit and WHOOP (the finals host) already ship it, and illness-prediction claims raise FDA device issues.

Full research with all links: [docs/research/health-visions.md](docs/research/health-visions.md).

## 5. Open decisions — only mark CONFIRMED after human agreement

| Decision | Status / current answer | Approval owner |
|---|---|---|
| Final product topic and name | **CONFIRMED by all three humans** (Ian 11:50 ET; Peter and Jerry ~12:05 ET). Working name Rare Disease Detective (final name TBD) | Three humans; Ian records decision |
| Track | **CONFIRMED by all three humans** (Ian 11:50 ET; Peter and Jerry ~12:05 ET). Healthcare & Biotech | Three humans |
| Working roles | **PROPOSED starting claims** in section 6, flexible after announcement | Each human claims; Ian updates board |
| Frontend/backend/hosting stack | **CONFIRMED (~11:35 ET)**. `app/` is Vite + React + TypeScript, served under `/app`. Backend APIs are Cloudflare Pages Functions in the repo-root `functions/` folder, one file per endpoint (`functions/api/<name>.ts`), each claimed separately. Deployment to Ian's Cloudflare Pages runs from the repo root; `scripts/build-site.sh` builds `landing/` into `dist/` and `app/` into `dist/app/`. Peter chooses the landing stack (same stack recommended); landing must output to `landing/dist` via `npm run build` | Three humans |
| API and medical-module contract | **v0.1 DRAFT** in `docs/CONTRACT.md`, pushed as `f77cc31658296dfe0cbc956c9b180ba7b5262f6e`. Waiting for Jerry's APPROVE of the engine fields and Ian's APPROVE. Must be agreed before dependent interfaces are built | Ian + affected owners |
| Shared visual direction | Ian owns initial `.kiro/steering/design.md` draft through Kiro; team reviews before it is treated as final | Ian |
| Runtime LLM provider, account, key | **DECIDED (~12:15 ET, Ian)**. Cloudflare Workers AI through a Pages Functions AI binding `AI` on Ian's Cloudflare account; no API key. Model id comes from env var `LLM_MODEL`; the default is chosen in T17 by a measured bake-off. Any future keys stay in ignored local/hosting secrets, never committed | Owner + Ian |
| Open-source license | **PENDING**; select a suitable license before repo publication | Three humans |
| Integration, demo and deployment | **CONFIRMED (~11:35 ET): Ian**, with repository-admin access (already Ian) | Three humans |
| Deployment authorization | **CONFIRMED (~11:35 ET)**. Ian pre-approved deploying the demo to his Cloudflare Pages through his Kiro **only after a real smoke test passes**. Making the repo public and submitting the form stay Ian's personal actions. First deploy done 12:02 ET after a passing smoke test | Ian |
| Submission representative | Ian was previously proposed; confirm explicitly | Three humans |

**Topic-specific work may now start**, still only within explicitly claimed paths (section 6). Medical content must follow the section 4 safety framing and the contract in `docs/CONTRACT.md` (being drafted under T09). Do not invent medical facts.

## 6. Live task claim board (the team coordination center)

This is a **task board**, not permanent role assignment. One task, folder, or shared file may have only one active editor at a time. Human owners post a `[CLAIM]` in group chat first; Ian ensures the claimed task is reflected here **before substantive editing**. If Ian is busy, coordinate a single temporary board editor in the group. No simultaneous edits to this file.

Statuses: `OPEN` → `CLAIMED` → `IN_PROGRESS` → `REVIEWING` → `QA` → `PUSHED` → `DEMO_VERIFIED` → `DONE`; or `BLOCKED`. `PUSHED` does **not** mean the whole demo works.

**Rows marked OPEN or BLOCKED are starter suggestions, unclaimed until explicitly accepted by the owner; replace ETA with real local time (ET) at claim. CLAIMED/IN_PROGRESS rows are real claims.**

| Task ID / task | Suggested owner | Owned area / conflict boundary | Status | ETA (ET) |
|---|---|---|---|---|
| T01 Main demo shell, core frontend + backend | Ian | Main application routes, demo API, root project config. Now split into T13a–T16 plus T18 functions: T13a foundation (pushed), T13c re-theme, T14 intake + review, T15 ranking + questions, T16 brief + trials (all claimed, app feature folders); T18 functions rank / next-questions / trials / brief / terms, one file each, pending Jerry's engine exports | OPEN | TBD |
| T01a Topic-neutral app shell | Ian | `app/**`; no deployment config inside `app/` | PUSHED (`5d54ab95d65a4f110bd401e21e3e78d31a71b106`) | 12:15 |
| T02 Unified visual steering + honest remediation of 10:55 draft | Ian | `.kiro/steering/design.md` only; log correction handled via separately claimed T10 | PUSHED (`38291acacb9d7895e17c7ecf088e4eafbd937c3d`) | 12:00 |
| T02b Re-author team steering | Ian | `.kiro/steering/team.md` only | PUSHED (`cac4d5aad6a8c072a99f7397dfca1cd47acdcc8a`) | 12:10 |
| T03 Deployment path + full-app smoke checks | Ian | `wrangler.toml` at repo root, `scripts/build-site.sh`, `functions/api/health.ts`, Cloudflare Pages project; deployment secrets outside repo; claim extended to `.gitignore` for `.dev.vars` and `.wrangler/` | DEPLOYED_VERIFIED (pushed `53263d4fe019fd1265f82df97e8a30f5cab0151a`; live https://hackachusetts-2026.pages.dev verified 12:03 ET) | 12:30 |
| T04 Landing page | Ian (Peter's assistant handed T04 to Ian's Kiro at ~14:50 ET; Peter's Kiro v1/v2 is used as input) | `landing/**`, `.kiro/specs/landing/**`, `.kiro/steering/release-check.md` (demo id fix) | CLAIMED (Ian) | 15:45 |
| T05 Pitch narrative + under-3-minute video storyboard | Peter | Presentation/copy assets; never claim a feature works without a real demo | OPEN | TBD |
| T06 README + Kiro write-up | Ian (Peter released T06 in the team chat ~14:35 ET) | `README.md`, `docs/KIRO_WRITEUP.md`; Kiro write-up from **real usage log**, not made-up entries | PUSHED (`2c641c0`) | 15:20 |
| T07 Domain module + approved public datasets | Jerry | `engine/**`, `.kiro/specs/engine/**` (repo-root TypeScript domain engine; runs on Cloudflare Workers, fetch only, no fs; called from `functions/api/*`) | CLAIMED (Jerry) | TBD (Jerry) |
| T08 Module tests / property-based test use | Jerry | `engine/test/**` (property-based tests with fast-check); record true Kiro usage | CLAIMED (Jerry) | TBD (Jerry) |
| T09 API contract, mock response examples | Ian + relevant owners approve; **Ian is sole file editor**; Jerry approves the engine interface fields | `docs/CONTRACT.md`, `.kiro/specs/rare-disease-detective/**` | REVIEWING (contract v0.1 draft and spec pushed `f77cc31658296dfe0cbc956c9b180ba7b5262f6e`; pending APPROVE by Jerry and Ian) | 12:25 (v0.1 draft) |
| T09b Spec progress ticks | Ian | `.kiro/specs/rare-disease-detective/tasks.md` (Ian's Kiro ticks tasks as they ship) | PUSHED (`5508f1a`) | Rolling |
| T09c demo-npc1 primary demo case | Ian | `docs/CONTRACT.md`, `.kiro/specs/rare-disease-detective/**` | PUSHED (`629c869`); claimed late; recorded 13:50 ET | — |
| T09d Contract v0.1.2 | Ian | `docs/CONTRACT.md` | PUSHED (`18556d7`); claimed late; recorded 14:50 ET | TBD |
| T10 Kiro usage record aggregation + correct early inaccurate entry | Ian/Kiro is sole file editor; all members supply **actual** usage evidence | `docs/KIRO_USAGE.md` | PUSHED (`e4d0c8e83cb41664f0f4cd86902ac4c0a507a03b`); T10b pushed as `ff02d63ca96510976851e6cae8ed78761d88a5dc` | 11:50 |
| T10c Kiro usage log and AI-development strategy | Ian | `docs/KIRO_USAGE.md`, `docs/reviews/**` (verbatim rdd-reviewer outputs) | PUSHED (`9ebf2f5`) | 13:20 |
| T10d Kiro usage log + reviews update | Ian | `docs/KIRO_USAGE.md`, `docs/reviews/**` | PUSHED (`db88b59`) | TBD |
| T10e Kiro usage log update | Ian | `docs/KIRO_USAGE.md`, `docs/reviews/**` | PUSHED (`4a9a791`); claimed late; recorded 14:50 ET | TBD |
| T11 Team board updates | Ian, or named one-time delegate | `BRIEFING.md`, `docs/PROTOCOL.md` | DONE (`fa0180f`); rolling board updates continue as T11c | 11:45 |
| T11c Topic decision record + board refresh | Ian | `BRIEFING.md` | PUSHED (`b1804930bc9388dc2a01b0b12405522c053bde1e`) | 12:05 |
| T11d Topic approval, teammate claims and first deploy on the board | Ian | `BRIEFING.md` | PUSHED (`69fe53d04188ff6f993e9a42475febce2ad13d69`) | 12:15 |
| T11e LLM decision, contract draft and new Ian tasks on the board | Ian | `BRIEFING.md` | PUSHED (`c46c832`) | 12:25 |
| T11f Kiro coverage claims on the board | Ian | `BRIEFING.md` | PUSHED (`6b94db7`) | 12:40 |
| T11g Claim T13c–T16, record pushed Kiro coverage tasks | Ian | `BRIEFING.md` | PUSHED (`079e559`) | 12:55 |
| T11h Board refresh: functions live, demo-npc1, late claims | Ian | `BRIEFING.md` | PUSHED (`4d80302`) | 13:55 |
| T11i Board refresh after T16–T18f deploys | Ian | `BRIEFING.md` | PUSHED (`86d41c9`); claimed late; recorded 14:50 ET | 14:55 |
| T11j Claim T24 smoke script and T25 QA pass | Ian | `BRIEFING.md` | CLAIMED (Ian) | 14:35 |
| T11k Record T06 hand-over from Peter to Ian | Ian | `BRIEFING.md` | CLAIMED (Ian) | TBD |
| T11l Record T04 hand-over to Ian, T18g switch, QA fixes | Ian | `BRIEFING.md` | CLAIMED (Ian) | 15:00 |
| T12 Art direction note | Ian; Ian approves | `docs/ART_DIRECTION.md`, `docs/art-direction/**` | PUSHED (`8460be2`); Ian picked the white direction (Option B) at ~12:20 ET but judged both options not good enough; refinement continues as T12b | 12:25 |
| T12b Refined white art direction variants | Ian; Ian picks | `docs/art-direction/**` | PUSHED (`9208298`); Ian picking B1/B2/B3 | 12:45 |
| T12c Ian-approved art direction | Ian; Ian approves | `docs/ART_DIRECTION.md`, `docs/art-direction/**` | PUSHED (`e8fe0f8`); approved by Ian 12:33 ET: B1 UI + B2 typography | 12:35 |
| T13a App foundation: shared contract types, API client, mocks, case store, flow shell | Ian | `app/**` (feature folders are created as stubs and handed to T14–T16) | PUSHED with T13b fixes (`6c1f106`, `87febca`; first-pass rdd-reviewer review, 2 blockers fixed) | 13:10 |
| T13c Re-theme app shell to approved art direction | Ian | `app/src/styles/**`, `app/src/components/**`, `app/src/shared/ui/**`, `app/src/App.*`, `app/src/main.tsx`, `app/index.html`, app manifests | PUSHED (`fb4b51a`, `b5a976f`, `138e98b`) | 13:20 |
| T13d demo-npc1 in app mocks | Ian | `app/src/shared/mocks/**` | PUSHED (`52beb1b`); claimed late; recorded 13:50 ET | — |
| T13e Short-viewport shell | Ian | `app/src/styles/**`, `app/src/components/shell/**` | PUSHED (`72925b0`); claimed late; recorded 14:50 ET | — |
| T14 Notes intake + feature review | Ian | `app/src/features/intake/**`, `app/src/features/review/**` | PUSHED (`fdc3ab6`) | 13:30 |
| T14b/T15c/T16b QA fixes from docs/QA.md | Ian | `app/src/features/**` | DEPLOYED_VERIFIED (`e8d762f`); claimed late; recorded 14:56 ET | — |
| T15 Possible matches with evidence + what to check next | Ian | `app/src/features/ranking/**`, `app/src/features/questions/**` | PUSHED (`f2b2bb3`, `2ab5ba6`) | 13:40 |
| T15b Exact-match headline polish | Ian | `app/src/features/ranking/**` | PUSHED (`253641b`) | TBD |
| T16 Brief + phenopacket export + recruiting trials | Ian | `app/src/features/brief/**`, `app/src/features/trials/**` | DEPLOYED_VERIFIED (`eb86f02`) | 13:40 |
| T17 Workers AI LLM proposal layer + model bake-off | Ian | `functions/_lib/**` and the `[ai]` binding in `wrangler.toml` (T03 claim extended). `functions/api/extract.ts` now exists (T18a) | DEPLOYED_VERIFIED (`cd1a1a47af9ccd7993909fc76ce718e8ad3a6eaf`, live 12:30 ET; `/api/extract` routed via T18a) | 12:50 |
| T18a Functions extract, terms, health | Ian | `functions/api/extract.ts`, `functions/api/terms.ts`, `functions/api/health.ts`, `functions/_lib/respond.ts` (plus a 3-line edit to `functions/_lib/llm.ts`) | PUSHED (`cf82644`); claimed late; recorded 13:50 ET | — |
| T18b Functions rank, next-questions, trials, brief (engine-first fallback; coordinator-approved [CONTRACT CHANGE]) | Ian | `functions/api/rank.ts`, `functions/api/next-questions.ts`, `functions/api/trials.ts`, `functions/api/brief.ts`, `functions/_lib/fallback/**` | DEPLOYED_VERIFIED (`3c99583`, live 13:46 ET incl. live Workers AI extract); claimed late; recorded 13:50 ET | — |
| T18c demo-npc1 extract fallback | Ian | `functions/_lib/fallback/demoCases.ts`, `functions/api/extract.ts` | DEPLOYED_VERIFIED (`2254286`); claimed late; recorded 14:50 ET | — |
| T18d Next-questions hierarchy filter | Ian | `functions/_lib/fallback/**` | PUSHED (`85dc482`, `1e79554`); claimed late; recorded 14:50 ET | — |
| T18e Monarch timeout + recorded demo fallback | Ian | `functions/_lib/fallback/**`, `functions/api/rank.ts`, `functions/api/next-questions.ts`, `functions/api/trials.ts` | PUSHED (`6c907ff`); claimed late; recorded 14:50 ET | — |
| T18f Trials relevance | Ian | `functions/_lib/fallback/**` plus one line in `functions/api/trials.ts` | DEPLOYED_VERIFIED (`cf07006`); claimed late; recorded 14:50 ET | — |
| T18g Engine-path switch for functions (`RDD_ENGINE_PATH`, default = the verified fallback path) | Ian | `functions/_lib/fallback/engineFirst.ts`, `functions/api/*.ts` (small edits) | CLAIMED (Ian) | 15:30 |
| T19 Kiro CLI custom agents and safe agent hooks | Ian | `.kiro/agents/**`, `.kiro/hooks/**` | PUSHED (`dd8a0791ef5fcfdcd3621a83df6ec8a42ed675ab`) | 12:25 |
| T20 Kiro MCP for development | Ian | `.kiro/settings/mcp.json`, `.kiro/agents/rdd-builder.json`, `docs/research/biomcp-checks.md` (Context7 remote MCP server; real doc lookups logged) | PUSHED (`b3dce59`, `d35a18e` biomcp, `0dca96f` reviewer fixes) | 13:00 |
| T21 Kiro IDE 1.x hooks and steering | Ian | `.kiro/hooks/**`, `.kiro/steering/medical-data.md`, `.kiro/steering/release-check.md` | PUSHED (`6c6ce91`, `68ec5cb`) | 13:05 |
| T22 Kiro project power `rdd-medical-data` | Ian | `.kiro/powers/rdd-medical-data/**` | PUSHED (`c5f619f`, `47521fa`) | 13:10 |
| T23 Pre-registered re-rank experiment (research only, not shipped) | Ian | `docs/research/ranking-benchmark.md`, `functions/_lib/rerank.ts` + test (not wired into any endpoint), `scripts/ranking-benchmark.ts`, `scripts/benchmark-data/**` | PUSHED (`4682cdd`); claimed late; recorded 13:50 ET | — |
| T24 End-to-end smoke script (spec task 5.1) | Ian | `scripts/smoke.mjs` | PUSHED (`00ff364`) | 15:15 |
| T25 Accessibility, responsive and definition-of-done QA pass (spec tasks 3.8, 5.2, 5.3) | Ian | `docs/QA.md`, `docs/qa/**` (screenshots) | PUSHED (`48d1e8f`) | 15:30 |

From 12:35 ET every Ian task diff gets a first-pass review by the read-only Kiro agent rdd-reviewer before the assistant's review.

**What a claim must include in group chat:** task ID, human owner, exact paths (or an explicit pending-path blocker), ETA, interface dependencies, and current Git main SHA. A teammate can take over an abandoned task **only after the original owner releases it in chat**; update this board. Do not let an Agent quietly self-claim overlapping files.

**Change the starter assignments whenever the team needs to.** For example, Ian's Assistant may drive the demo frontend and backend by giving separate tasks to Ian's Kiro through `kiro-cli`, while Peter and Jerry work on unrelated claimed paths. Separate tasks are fine; simultaneous Kiro sessions may not edit the same dirty working directory or overlapping paths.

**Shared files / ownership guard:** `BRIEFING.md`, `docs/CONTRACT.md`, `docs/KIRO_USAGE.md`, `.kiro/steering/design.md`, package manifests/lockfiles, app entry routes, and deployment config require a named editor. Affected teammates approve breaking changes. Ian's standing Kiro Git consent does **not** authorize bypassing shared-file claims. To avoid a shared `docs/KIRO_USAGE.md` collision, everyone posts their **real Kiro usage line** in chat immediately, and Ian's Kiro appends those lines in one serial edit.

## 7. Working together — fast, safe, shared-main workflow

1. **Claim first, then work.** Announce a `[CLAIM]` with exclusive paths, owner and ETA. Ian updates the section-6 board; others avoid claimed paths. This rule applies equally to human edits and Kiro Agent sessions.
2. **Agree on the contract before dependent implementation.** The API producer and consumers approve sample JSON, error semantics, `demo/live` labeling, and version in `docs/CONTRACT.md`. Topic-neutral frontend shell can proceed; frontend uses clearly labeled mock data. Any breaking change requires a group `[CONTRACT CHANGE]` first, with one designated file editor.
3. **One coherent visual language.** Ian's **Kiro** creates `.kiro/steering/design.md`, covering layout, typography, palette, responsive behavior, interactions, motion, accessibility, and navigation. Ian checks visual consistency. Each Kiro session reads the committed steering; custom Kiro agents may need explicit steering-resource configuration. Do not assume teammates have fetched a newly pushed steering file.
4. **Direct main, frequent small checkpoints.** The team's default is independent local clones on the shared `main`; Ian's multiple Kiro sessions use different worktrees **and different temporary branches**, with one-by-one integration into clean `main`. Check `git status`, `git fetch` and current remote commit before each task. If clean, `git pull --ff-only origin main`. After Kiro changes, the owning Assistant inspects `git diff`, scope and actual test results; Peter/Jerry approve their Git operations manually, while Ian may use his limited Kiro Git delegation after Assistant review and genuine QA. Push a small change (~20–30 min) when safe. Use meaningful English commit messages and announce the resulting full SHA. No automatic force-push, hard reset, conflict overwrite, or destructive auto-sync.
5. **On push rejection, stop and reconcile.** Another teammate may have pushed first. Keep local commits, alert the group, inspect remote changes, and let the human safely integrate/rebase without losing work. Rerun affected QA before pushing. A short-lived personal branch is an acceptable **exception** to resolve conflicts or risky changes, but there is **no mandatory Integration branch** and no B0/B1 freeze system.
6. **Reviews are diffs, not formal patch rounds.** Kiro edits only the files it was authorized to change. The owner's Assistant reviews the changed files (`git diff` / `git show`), user experience, tests and risks. If defects are found, the Assistant returns a **natural-language correction task** to Kiro; Kiro makes the fix. Assistants never write replacement project code. Do not say "reviewed" without actual evidence.
7. **Human Git control + continuous verification.** Peter and Jerry approve their Git actions individually; under Ian's ratified standing authorization (see docs/PROTOCOL.md section 6A), his Kiro may commit/push **reviewed, QA-passing, Ian-claimed work**, one task at a time, subject to the protocol's gates. Ian fetches the team's latest `main` and runs the integrated main demo at least hourly, plus at 12:30 / 14:30 / 16:30 checkpoints. Before announcing deployment, verify the real live URL in an incognito session. `PUSHED` does not equal `DEMO_VERIFIED` or `DEPLOYED`.
8. **Kiro usage log is part of the deliverable.** Everyone reports real specs, steering, CLI, hooks, MCP, property-based tests, etc. to the group. Ian coordinates single-editor updates to `docs/KIRO_USAGE.md`. Record who, time, Kiro feature, what it actually did and proof; never claim an unperformed tool usage. Hooks must be safe, deterministic and must not secretly commit/push/deploy.
9. **Two cadences:** Task updates / safe pushes about every 20–30 minutes; Ian runs integrated smoke **at least hourly and at 12:30, 14:30, 16:30 checkpoints**. **Hourly three-sentence update.** Each human posts: DONE / NEXT / BLOCKED (include task ID and real main commit SHA if pushed). Each human forwards material team changes to their Assistant; Assistants cannot directly access each other's chat history.
10. **Feature freeze at 17:30 ET.** After freeze, only scoped P0/P1 fixes, deployment reliability, video/submission and release checks. Ian coordinates merges/safe main changes and submission. Avoid risky last-minute migrations or replacing working functionality.
11. **Safety and readiness.** Do not publish credentials, real patient data, or source-restricted datasets. If the chosen topic is rare disease, label mock/demo clearly and frame all output as discussion support, not diagnosis. Build and actual demo results must be verified, never inferred.
12. **Credits.** Original team briefing states each person has a 2,000-credit bonus allocation; verify each account's actual current balance. Each account chooses its own Kiro model and manages its own credits; Ian's account uses Claude Opus 5.5 and Ian tops up his own credits. Avoid runaway loops.

### Safe per-task Git rhythm (human-supervised; example, not an auto-run script)

```powershell
# Before starting, only after checking you have no uncommitted work:
git status --short
git fetch origin
git pull --ff-only origin main

# After Kiro coding and Assistant review:
git diff --check
git diff --stat
# Run module-specific QA / build; human checks actual results.
# Human stages only claimed/approved paths, then reviews staged diff:
git add -- <approved-paths>
git diff --cached --stat
# Peter/Jerry approve Git; Ian may use the reviewed, QA-gated Kiro Git exception.
```

If any command reports divergence, a dirty tree, or unexpected files, **STOP**; do not overwrite teammates' work. Use actual Git paths instead of placeholder `<approved-paths>`.

### Startup approvals

- **11:20 ET target, slipped to ~11:35 ET:** Ian, Peter and Jerry explicitly approved this v4 briefing, the v4 protocol, the limited Ian-only Git delegation and the stack in the team chat (Ian first; Peter and Jerry each wrote "APPROVE v4 + stack").
- **11:45 ET target:** Select and record the actual topic. Until then, only **explicitly claimed and authorized topic-neutral tasks** may begin; the clock reaching 11:30 does not automatically grant authorization.
- **12:30 ET target:** minimal API contract is accepted by impacted owners, if topic-specific interfaces are required. Shared-file edits use one designated editor. Kiro specs/steering/README and judge-facing descriptions must be authored by Kiro, although assistants may prepare internal planning drafts.

### Timeline (Eastern Time; original event checkpoints)

| Checkpoint | Acceptance focus |
|---|---|
| 11:30 | Start project implementation after topic/claim decisions, or topic-neutral tasks only |
| 12:30 | API contract agreed, skeleton launches locally |
| 14:30 | Core demo happy path works end to end |
| 16:30 | Public deployment functioning; demonstrate from fresh browser session |
| 17:30 | Feature freeze |
| 18:00 | Record <3-minute real product demo |
| 19:00 | Submit (internal target) |
| 20:00 | Official hard deadline |

## 8. Submission checklist

- [ ] Repo switched to **public**, license added
- [ ] README: what it does, how to run, live link, video link, "Built at Sundai", HPO attribution and version
- [ ] `.kiro/` committed (specs, steering, hooks)
- [ ] Kiro write-up finished from `docs/KIRO_USAGE.md`
- [ ] Live demo works in a private/incognito window
- [ ] Video < 3 min, public on YouTube or Vimeo
- [ ] SundAI form: all members added, track selected, description, repo, live link, video link
- [ ] Sundai project card created

## 9. Key links

- Event info: https://massaicoalition.com/hackachusetts/
- Rules & submission: https://docs.google.com/document/d/1aDagPzc29sNGHdycZ-30GMf2z-Np2SwqZX_hY46tLrQ
- Challenges & datasets: https://hackachusetts2026.vercel.app/
- SundAI event page (submission): https://www.sundai.club/events/boston/hackachusetts-with-kiro
- Kiro docs: https://kiro.dev/docs/
- Kiro credits: https://app.kiro.dev/account/usage

## 10. Setup (only if not done yet)

1. Install **Kiro IDE** (the IDE download, not only Crew) and sign in.
2. Redeem your paper code: sign in at https://app.kiro.dev first, then open `https://app.kiro.dev/account/usage?redemption_code=<your-code>`. Check "Bonus credits 0 / 2000". "Redemption Failed" after a refresh usually means it already worked in another tab.
3. In Kiro: Command Palette → `Git: Clone` → `https://github.com/Ian18858863/hackachusetts-2026.git`.

## 11. Cross-Assistant synchronization — the minimum viable handoff

**Assistants do not automatically sync.** The group chat is the fast status channel; GitHub `main` and its SHA show what code actually exists; `BRIEFING.md` preserves human decisions/claims; `docs/CONTRACT.md` preserves approved interfaces. Every human forwards relevant group messages to their own Assistant.

**Events that must be reported:** `CLAIM`, `CONTRACT CHANGE`, `REVIEWED`, `PUSHED`, `BLOCKED`, `MAIN SMOKE`, `DEPLOYED`, `FEATURE FREEZE`. Avoid treating `REVIEWED` as proof of a push or of end-to-end success.

```text
[TEAM CHECKPOINT]
Time (ET): YYYY-MM-DD HH:MM
Owner / Task: Ian|Peter|Jerry / T##
Claimed paths: ...
Assistant review: PENDING|CHANGES_REQUESTED|REVIEWED
QA: NOT_RUN|PASS|FAIL (actual command / output summary)
Local commit / remote main SHA: NONE|<full 40-character SHA>
Main integration smoke: NOT_RUN|PASS|FAIL (Ian; specific tested SHA)
Blocked / contract change: ...
Next action / ETA: ...
```

**Five-step relay:** (1) Owner Assistant reviews the actual Kiro diff and test evidence; (2) human posts the checkpoint message to group; (3) human runs/approves QA and the Git action, then posts the pushed SHA; (4) Ian pulls `main`, runs demo smoke and posts verified SHA/URL; (5) each teammate forwards the updated group message to their own Assistant before the next affected task. A post from one Assistant is **not** proof other Assistants received it.

**Exception/incident:** On a shared-file collision, push rejection, broken `main`, incompatible API, or secret exposure, post `[BLOCKED]`, stop affected edits, preserve existing work, assign **one** repair owner. Do not force-push or paper over failing tests to recover speed. If live `main` is broken, Ian selects a previously demonstrated working commit for a controlled recovery decision; no Agent or Assistant self-deploys a fallback.

**End-of-event signal:** Ian announces the exact final Git SHA, public repo URL, live demo URL, incognito smoke result, video URL, and submission status. Other teammates verify/acknowledge; this is the release record. Never equate a Kiro task completion message with submission success.
