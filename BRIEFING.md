# Team Briefing — Hackachusetts 2026 (read this first)

Last updated: 2026-10-24, morning. Single source of shared context for every teammate and every teammate's AI agent.

## 0. For AI agents reading this

- You are helping **one member** of a three-person team. Read this whole file before doing anything.
- **Do not assume a role.** Ask your human what they want to own (backend, frontend, data, design, pitch, anything), then record it in [section 6](#6-whos-doing-what) and commit.
- [Section 3](#3-hard-rules-from-the-official-rules) lists rules that can disqualify us. Everything else here is a default the team may change. If you change a default, update this file.
- When something here is unclear or out of date, ask your human instead of guessing.

## 1. The event in one screen

| Item | Detail |
|---|---|
| Event | Hackachusetts, powered by Kiro. Statewide Massachusetts student hackathon (Mass AI Coalition + Sundai Club; sponsors include AWS, Kiro, The Engine, WHOOP) |
| Our venue | UMass Boston |
| Team | Ian (`Ian18858863`, repo admin), Qirong Wang (`qirongwangpeter`), Jerry (`lolershark`) |
| Repo | https://github.com/Ian18858863/hackachusetts-2026 (private now; must be **public** at submission) |
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

**Track: Healthcare & Biotech (leading). Final decision pending — Ian confirms.**

Official guidance ideas exist (wearables, coverage renewals, care coordination, biotech discovery, clinical trials) but they are only guidance; our own idea is allowed.

### Leading concept: Rare Disease Detective

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

## 5. Open decisions (team decides; write answers here)

| Decision | Answer |
|---|---|
| Final topic and product name | TBD |
| Who owns what | TBD — see section 6 |
| Tech stack (frontend, backend, hosting) | TBD — owners choose; must deploy to a public URL by 18:00 |
| Runtime LLM provider and whose API key | TBD (e.g. AWS Bedrock, OpenAI, Anthropic). Key lives in `.env`, never in the repo |
| Open-source license | TBD (MIT / Apache-2.0 / AGPL-3.0) |
| Submission Representative | Ian (proposed) |

## 6. Who's doing what

Each person (or their agent) fills in their own row and commits. Change it whenever plans change.

| Person | GitHub | Owns | Kiro tools they'll use | Status |
|---|---|---|---|---|
| Ian | `Ian18858863` | | | |
| Qirong Wang | `qirongwangpeter` | | | |
| Jerry | `lolershark` | | | |

## 7. Working together (defaults that reduce friction)

- **Contract first.** Before building, whoever owns the backend and whoever owns the frontend agree on endpoints and example JSON in [docs/CONTRACT.md](docs/CONTRACT.md). Use mock data so both sides can build in parallel.
- **Claim before you build.** Write your area in section 6 (and tell the group chat). One owner per folder or file at a time.
- **Git.** Pull/Sync before starting. Small commits, clear English messages. Push often. Never force-push or delete someone else's work. On a merge conflict, keep both sides' intent and ask if unsure.
- **Suggested checkpoints.** 12:30 contract agreed + skeleton runs · 14:30 end-to-end happy path works · 16:30 deployed + polish · 17:30 feature freeze · 18:00 record video · 19:00 submitted.
- **Kiro usage counts for a third of the score.** Each time anyone uses a Kiro feature in a new way, add a line to [docs/KIRO_USAGE.md](docs/KIRO_USAGE.md). Spread tools across the team (IDE, CLI, Crew/Web) and features (specs, hooks, steering, MCP, property-based tests, powers).
- **Credits.** Each person has their own 2,000 bonus credits. Use the **Auto** model; avoid long autonomous loops. Free plans don't include premium models.

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
