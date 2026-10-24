# Rare Disease Detective

Turn a symptom history into a specialist-ready brief in minutes — possible conditions to discuss with a doctor, each with its evidence.

- **Live demo:** https://hackachusetts-2026.pages.dev/app/?demo=demo-npc1 (opens the primary demo case; no sign-up). Family mode: https://hackachusetts-2026.pages.dev/app/?demo=demo-npc1&audience=family
- **Demo video (< 3 min):** VIDEO_LINK_TBD (placeholder, added before submission)
- **Built at Sundai** — Hackachusetts 2026, powered by Kiro. Healthcare & Biotech track.

> Decision support, not a diagnosis. These are possible matches to discuss with a doctor.

## The problem

- 263–446 million people worldwide live with a rare disease (3.5–5.9% of the population; Nguengang Wakap et al., *Eur J Hum Genet* 2020, [PMC6974615](https://pmc.ncbi.nlm.nih.gov/articles/PMC6974615/)).
- Diagnosis takes 4.7 years on average (mean; the median is 0.8 years) in a 2022 European survey of 6,507 patients (Faye et al., *Eur J Hum Genet* 2024, [PMC11369105](https://pmc.ncbi.nlm.nih.gov/articles/PMC11369105/)).
- In the same survey, 73% of patients were misdiagnosed at least once.

Families and non-specialist clinicians hold the clues in plain words. Rare-disease tools expect ontology terms. This app closes that gap and hands the specialist something they can check.

## What it does

1. **Notes.** A parent or clinician pastes a plain-language symptom history, or picks a demo case.
2. **Features.** The app extracts phenotype terms from the Human Phenotype Ontology (HPO). Each term is shown with the exact sentence fragment it came from, and features the notes say are absent ("I do not get headaches") go into a "Not present" group. The user keeps, removes, marks absent or adds terms.
3. **Possible matches with evidence.** Candidate rare diseases are ranked. Each one shows which features matched (exactly or through a broader term), which did not, how frequent each feature is in that disease according to HPO annotations, frequent features not mentioned, and excluded features the disease usually has. Overlap is a plain label (strong, partial, weak), never a percentage.
4. **What to check next.** The features that best separate the top candidates, as plain questions for the appointment, each with a "why" line built from annotation frequencies. Answering yes or no adds the term and re-ranks.
5. **Output.** A one-page specialist brief (print or save as PDF), a GA4GH Phenopacket v2 JSON with the observed and excluded features (no diagnosis inside), and recruiting trials from ClinicalTrials.gov for a candidate.

### Two audiences

- **Clinician mode** (the default) is the full flow above: notes, features, possible matches, what to check next, brief.
- **Family mode** (`?audience=family`, or "For families" in the top bar and on the landing page) has four steps: notes, features, questions to ask your doctor, notes for my specialist. It never shows disease names, rankings or trials. The questions come from the same frequency data, ranked in the background, but only the question and a neutral reason are shown. The download gets a neutral file name and neutral ids. The safety text there is "Decision support, not a diagnosis." followed by "This view prepares your notes for a clinician. It does not suggest conditions." ([docs/CONTRACT.md](docs/CONTRACT.md) §13, v0.1.5). Known limit: for a demo case, the phenopacket the server builds contains the demo id (for example `demo-marfan`) until the family download replaces it, and the landing link's `?demo=demo-npc1` stays in the address bar until the case has loaded.

### Six languages

The interface is in English (default), Simplified Chinese, Japanese, Spanish, Korean and French. Pick one in the top bar or with `?lang=zh`, `ja`, `es`, `ko` or `fr`; the choice is saved in the browser and the landing page passes it on to the app. Medical terms stay English: HPO labels and ids, disease names, quotes from the notes, trial data, and sentences the server writes (the questions and their "why" lines, the brief's test lines, the contract §13 attribution lines). In the brief, the translated safety sentence is followed by the server's English original. The translations were written and reviewed by Kiro, not by native speakers.

## How it works

```text
Browser: app/ (Vite + React + TypeScript, served under /app/)
   │  calls /api/* only
   ▼
Cloudflare Pages Functions: functions/api/*.ts
   ├── /api/extract   Workers AI (@cf/meta/llama-3.3-70b-instruct-fp8-fast) proposes phrases and labels,
   │                  then the engine grounds every term against the JAX HPO API
   ├── /api/terms     HPO term search for manual add
   ├── /api/rank      PubCaseFinder orders (12 s bound, else Monarch semantic similarity); HPO annotations and Monarch add the evidence
   ├── /api/next-questions  frequency spread across the top candidates, with an HPO hierarchy filter
   ├── /api/trials    ClinicalTrials.gov v2, recruiting studies only, filtered for condition relevance
   └── /api/brief     brief + phenopacket, pure functions, no network
engine/: Workers-compatible TypeScript domain logic (fetch only, injected for tests)
```

**What runs where today.**

- `/api/extract` and `/api/terms` use the engine's `groundTerms` and `searchTerms`. On the live path, `/api/extract` reduces the model's labels to plain ASCII before grounding (a curly apostrophe in "Gowers’ sign" made the JAX search answer 400 and the whole extraction fail with 502). Phrases the engine drops are retried through HPO synonyms and the model's alternative labels; a term found through an alternative label gets lower confidence and a "please check it" warning (T37, `87a605a`, `8603c0b`). Live extraction is limited per client IP to 10 requests per minute and 60 per hour (approximate counters in the Workers Cache API; 429 `RATE_LIMITED` with `Retry-After`). The demo cases are never limited (T18p, `a645016`, `c499387`).
- `/api/rank` runs on Jerry's engine (`rankCandidatesWithReport`) since T18k (`820e7ff`), after a parity check against Ian's fallback on `demo-npc1` and `demo-dmd`. The engine now includes R6.1 (`6788d66`). On this path Monarch gets 20 s inside a 25 s budget, and each candidate carries `evidenceComplete`, false when an annotation call for that candidate failed (T32a, `29e22a7`). When `evidenceComplete` is false and a frequency is missing, the app says "Could not be loaded" instead of "not listed" (T34, `c6f3743`). The field and the new timeouts are not yet in the contract. A second parity check on all five demo cases (T18n-2) gave the same top 5 on both paths.
- Since T36c, `RDD_RANK_SOURCE = "pcf"` in `wrangler.toml` makes PubCaseFinder (DBCLS) the primary ranking source. `/api/rank` starts the PubCaseFinder call and the Monarch path above at the same time. If PubCaseFinder's list arrives within 12 s, it gives the order; otherwise the Monarch answer is returned in the same request and the PubCaseFinder call finishes in the background to fill its 24 h cache. The evidence on each card (exact matches, broader matches, frequencies, genes) still comes from HPO annotations and Monarch. `dataVersions.rankingSource` says which service ordered the list, and the footer and the brief credit that service. A Monarch answer given under the switch is cached only 10 minutes, so a later PubCaseFinder answer replaces it. The app waits up to 20 s for `/api/rank`. Roll back by removing the line and redeploying (contract §7.4, v0.1.7).
- `/api/next-questions` runs on Ian's fallback in `functions/_lib/fallback/`. Jerry's engine `nextQuestions` exists (`eaf9c0d`, `6788d66`), but in T18n-2 its "why" lines named the diseases differently from the ranking (JAX or MONDO names instead of the names on the match cards), so the endpoint did not switch. The fallback applies the HPO hierarchy filter inside a 5 s budget and at most 40 subrequests (T18o, contract §7.5 v0.1.4).
- `/api/trials` and `/api/brief` run on the fallback, because the engine's `searchTrials` and `buildBrief` are placeholders.

All fallback code follows the contract shapes and rules ([docs/CONTRACT.md](docs/CONTRACT.md) v0.1.6).

The switch is in `functions/_lib/fallback/engineFirst.ts`. `RDD_ENGINE_PATH` sets the path for all four functions, and `RDD_ENGINE_PATH_RANK`, `RDD_ENGINE_PATH_NEXT_QUESTIONS`, `RDD_ENGINE_PATH_TRIALS` and `RDD_ENGINE_PATH_BRIEF` override it per endpoint. Unset or unknown values mean `"fallback"`. With `"engine"`, the engine runs first and the fallback is used only while the engine function is a placeholder. `wrangler.toml` sets only `RDD_ENGINE_PATH_RANK = "engine"`; setting it to `"fallback"` (or removing it) and redeploying rolls rank back. Each response names its path in the `X-RDD-Path` header, for QA only.

- **The ontology ranks; the LLM only translates.** The LLM proposes phrases copied from the notes and candidate labels. The engine keeps a term only if the phrase is found verbatim in the text and the HPO API confirms the term; the label shown is always the HPO primary name. Disease names, frequencies and genes come from Monarch and HPO annotation responses, never from the model.
- **Model choice was measured.** In a bake-off on the demo narratives, `llama-3.3-70b-instruct-fp8-fast` matched `gpt-oss-120b` on quality and was 2–3 times faster (T17, [docs/KIRO_USAGE.md](docs/KIRO_USAGE.md)). Both models got most HPO ids wrong, so the prompt no longer asks for ids and grounding is by label.
- **Fallbacks.** Demo cases have a prepared extraction, so they work without the LLM. When a live upstream fails and the request matches a recording exactly, a recorded response is served, labelled `source: "demo"`: ranking, questions and trials for `demo-npc1`, and the ranking for `demo-marfan` and `demo-cdls` (the engine's own recordings are tried first).
- **No server-side storage.** The case lives in the browser (`localStorage`); functions do not log note text.
- **Demo cases are synthetic.** Five narratives (`demo-npc1`, `demo-dmd`, `demo-marfan`, `demo-kabuki`, `demo-cdls`) were written from the HPO terms of published cases in [phenopacket-store](https://github.com/monarch-initiative/phenopacket-store) (BSD-3-Clause). They are not real patients and are labelled as demo data wherever they appear. The demo picker lists `demo-npc1` first; the other four are labelled "Hard case — the ranking may miss the known condition" (see Honest evaluation). Next to the ranking, the app says it uses only the features listed, not age, sex, ancestry or genetic test results.

Request and response shapes, timeouts and error codes: [docs/CONTRACT.md](docs/CONTRACT.md). Requirements, design and tasks: [.kiro/specs/rare-disease-detective/](.kiro/specs/rare-disease-detective/requirements.md).

## Honest evaluation

On 10 published cases selected by a fixed rule, the correct condition ranked first in 5 and in the top 3 in 6 (our own small evaluation).

We also pre-registered a frequency-aware re-rank (method written at 12:57 ET before any result was computed). It did not improve recall (top-1 5 → 4, top-3 6 → 6 over 14 cases), so it is not shipped. Method, both runs (including one invalidated by a benchmark bug) and per-case results: [docs/research/ranking-benchmark.md](docs/research/ranking-benchmark.md).

**Why PubCaseFinder orders the list (T36c).** On 20 held-out published cases that two teammates picked (10 each) after the 14-case runs, top-1 / top-3 / top-10 was 6 / 8 / 9 with Monarch and 7 / 10 / 11 with PubCaseFinder. Through our own `/api/rank` with PubCaseFinder ordering, the 14 benchmark cases scored 9 / 10 / 11 of 14. The samples are small, and PubCaseFinder, like the HPO annotations, may already include these published cases, so the gain may be smaller on new patients.

Limitations:

- The sample is small, and the cases come from publications that may already feed the HPO annotations, so results are likely optimistic. This is not a clinical validation.
- In 4 of the 10 cases the correct condition is not in Monarch's top 50 at all.
- The input was the published HPO terms, so this measures ranking, not extraction from notes.
- Among the demo cases, only `demo-npc1` shows its source condition first. In the benchmark run of 2026-10-24 13:04 ET, Monarch ranks Duchenne muscular dystrophy #40 for `demo-dmd`, and the Marfan, Kabuki and Cornelia de Lange sources fall outside its top 50. We kept these cases to show the tool's limits honestly. `demo-npc1` became the primary case because of this benchmark, and its source phenopacket is one of the 10 cases.
- The 50-case benchmark planned in contract §12 is not complete: in Jerry's held-out run (below), PubCaseFinder answered only 10 of the 50 cases.

We also tried PubCaseFinder (DBCLS) as the ranking source, behind the `RDD_RANK_SOURCE` switch (T36). On the same 14 cases through our `/api/rank` it ranked the correct condition first in 9 and in the top 3 in 10 (Monarch: 5 and 6), but most of that gain was on the four demo cases, which were picked because Monarch misses them. In Jerry's pre-registered held-out run, PubCaseFinder hit its rate limit after 10 cases; on those 10, top-1/top-3/top-10 were Monarch 3/5/6, PubCaseFinder 3/5/5 and a fusion of both 2/4/9. With no held-out gain in that run, production first stayed on Monarch; the later 20-case held-out run described above (T36c) made PubCaseFinder the primary source. PubCaseFinder is partly built from published case reports, so its numbers on published cases are likely optimistic. Details: [docs/research/pcf-ranking.md](docs/research/pcf-ranking.md).

## Safety

- In clinician mode every result screen and the brief show, in body size: "Decision support, not a diagnosis. These are possible matches to discuss with a doctor." Family mode shows no matches, so it uses the shorter text described under "Two audiences".
- No probability or percentage is derived from a similarity score. The raw Monarch number appears only as "raw service score".
- The brief suggests a genetic test only for a gene annotated to a top-3 candidate in HPO annotations. It suggests no specialists yet, because the organ-system-to-specialty table (contract open question 4) is not agreed and an unmapped suggestion would not be grounded.
- The phenopacket export holds phenotypic features only, with no `diseases` or `interpretations`, so it never states a diagnosis.
- Demo data is labelled "Demo case (synthetic narrative from phenopacket-store <id>)" in the app, the brief and the phenopacket.

## Run it locally

Requirements: Node 22+ and npm. `npx wrangler` needs a Cloudflare login (`npx wrangler login`) for the Workers AI binding.

```bash
# Build the site into dist/ (landing page at dist/, app under dist/app/)
./scripts/build-site.sh

# Serve dist/ plus functions/ (default http://127.0.0.1:8788). Run it in the background or a second terminal.
npx wrangler pages dev

# End-to-end smoke check against any base URL (local or live)
node scripts/smoke.mjs http://127.0.0.1:8788
node scripts/smoke.mjs https://hackachusetts-2026.pages.dev --live-llm
```

The Workers AI binding (`[ai]` in `wrangler.toml`) runs on the logged-in Cloudflare account, and `wrangler pages dev` calls it remotely; that account needs a registered workers.dev subdomain. In one of our runs `wrangler pages dev` did not start on an account without one. When the binding is missing, `/api/extract` answers 503 `LLM_UNAVAILABLE` for free text, while the demo cases and manual term search keep working.

App-only development (no backend needed):

```bash
npm --prefix app ci
npm --prefix app run dev     # http://localhost:5173/app/
# open http://localhost:5173/app/?mock=1 to force the bundled offline mocks
```

More detail: [app/README.md](app/README.md).

## Repository map

| Path | What it holds | Owner |
|---|---|---|
| `app/` | The web app (Vite + React + TypeScript) | Ian (`Ian18858863`) |
| `landing/` | The landing page at `/` (Vite + React + TypeScript), built into `dist/` by `scripts/build-site.sh`; spec in `.kiro/specs/landing/` | Ian (`Ian18858863`), started by Peter (`qirongwangpeter`) |
| `functions/` | Cloudflare Pages Functions for `/api/*`, the Workers AI step and a temporary fallback layer in `functions/_lib/fallback/` | Ian (`Ian18858863`) |
| `engine/` | Domain engine: grounding, ranking, demo cases, phenopacket export, tests with Vitest and fast-check | Jerry (`lolershark`) |
| `docs/` | Interface contract, art direction, research, rdd-reviewer reviews, Kiro usage log and write-up | Ian (`Ian18858863`) |
| `.kiro/` | Kiro specs, steering, custom agents, hooks, MCP settings and a project power | Ian (`Ian18858863`) |
| `scripts/` | Site build, end-to-end smoke check, ranking benchmark | Ian (`Ian18858863`) |

The landing page (`landing/`) was started by Peter's Kiro (v1/v2 and its spec, imported unchanged in `a28e4f5`) and re-implemented by Ian's Kiro on the approved art direction (T04, `08941fe`, `6c89a84`). Team decisions and the task board: [BRIEFING.md](BRIEFING.md).

## Data sources and attribution

- **Human Phenotype Ontology** (https://hpo.jax.org), through the JAX ontology API: term search, term lookup and disease annotations. The app footer and the brief show "This product uses the Human Phenotype Ontology (version <hpo>). Find out more at https://hpo.jax.org", with HPO release 2026-09-01, the release the engine pins (`engine/hpo.ts`).
- **Monarch Initiative** semantic similarity service (monarchinitiative.org) for broader-term evidence and as the fallback ranking. Monarch tools are not for diagnosis or medical decisions.
- **PubCaseFinder** (DBCLS), CC BY 4.0 (pubcasefinder.dbcls.jp), the primary ranking source since T36c (`RDD_RANK_SOURCE = "pcf"`), with Monarch as the fallback when it does not answer within 12 s. When it ordered the results, the footer and the brief show "Ranking: PubCaseFinder (DBCLS, CC BY 4.0) with evidence from the Monarch Initiative and HPO annotations. Monarch tools are not for diagnosis or medical decisions."
- **Orphanet** data, CC BY 4.0 (orpha.net, orphadata.com), through Orphanet-sourced HPO annotations.
- **ClinicalTrials.gov**, U.S. National Library of Medicine, for recruiting studies.
- **phenopacket-store** (Monarch Initiative), BSD-3-Clause, as the source of the synthetic demo cases and the benchmark cases.
- **OMIM is not used** beyond ids and outbound links already present in HPO annotations and Monarch cross-references. No OMIM API calls.

## How we built it with Kiro

- Kiro CLI authored the files for Ian's tasks, ran the checks and integrated reviewed tasks into `main`, with parallel sessions in separate worktrees on disjoint paths. The engine was written by Jerry with Kiro; his tool details are not logged yet.
- Spec-driven: EARS requirements, a design with correctness properties P1–P14, and a ticked task list in `.kiro/specs/rare-disease-detective/`, next to the interface contract.
- Two custom agents: `rdd-builder` writes code behind hook guardrails; `rdd-reviewer` is read-only and gave first-pass reviews, kept in `docs/reviews/`.
- Family mode (T30a, `843a1c7`, `130602e`) and the six-language interface (spec `.kiro/specs/i18n/`, T28a–T28e, `a8d7ec0` to `b7e8e8b`) were built by Kiro; T30a and T28b–T28e were reviewed by `rdd-reviewer` before deploy (no review of T28a is logged).
- Steering (always, fileMatch and manual), MCP (Context7 and biomcp) and a project power `rdd-medical-data`.
- Every claim is backed by the log in [docs/KIRO_USAGE.md](docs/KIRO_USAGE.md). Full write-up: [docs/KIRO_WRITEUP.md](docs/KIRO_WRITEUP.md).

## License

The code and documentation in this repository are licensed under the [Apache License 2.0](LICENSE). Data, fonts and libraries keep their own licences; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The demo cases are synthetic and derived from [phenopacket-store](https://github.com/monarch-initiative/phenopacket-store) (BSD-3-Clause).
