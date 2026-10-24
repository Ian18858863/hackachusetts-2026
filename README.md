# Rare Disease Detective

Turn a symptom history into a specialist-ready brief in minutes — possible conditions to discuss with a doctor, each with its evidence.

- **Live demo:** https://hackachusetts-2026.pages.dev/app/?demo=demo-npc1 (opens the primary demo case; no sign-up)
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

## How it works

```text
Browser: app/ (Vite + React + TypeScript, served under /app/)
   │  calls /api/* only
   ▼
Cloudflare Pages Functions: functions/api/*.ts
   ├── /api/extract   Workers AI (@cf/meta/llama-3.3-70b-instruct-fp8-fast) proposes phrases and labels,
   │                  then the engine grounds every term against the JAX HPO API
   ├── /api/terms     HPO term search for manual add
   ├── /api/rank      Monarch semantic similarity ranks; HPO annotations add frequencies, genes and categories
   ├── /api/next-questions  frequency spread across the top candidates
   ├── /api/trials    ClinicalTrials.gov v2, recruiting studies only, filtered for condition relevance
   └── /api/brief     brief + phenopacket, pure functions, no network
engine/: Workers-compatible TypeScript domain logic (fetch only, injected for tests)
```

**What runs where today.** The engine's HPO grounding (`groundTerms`), term search (`searchTerms`), demo cases, phenopacket export (`toPhenopacket`) and ranking are live. `/api/rank` runs on Jerry's engine (`rankCandidatesWithReport`) since T18k (`820e7ff`), after the T18i parity check: on `demo-npc1` and `demo-dmd` the engine and Ian's fallback returned the same top 5 with the same overlap labels. The engine's `nextQuestions`, `searchTrials` and `buildBrief` are still placeholders, so `/api/next-questions`, `/api/trials` and `/api/brief` run on Ian's temporary fallback layer in `functions/_lib/fallback/`, which follows the same contract shapes and rules ([docs/CONTRACT.md](docs/CONTRACT.md) v0.1.3).

The switch is in `functions/_lib/fallback/engineFirst.ts`. `RDD_ENGINE_PATH` sets the path for all four functions, and `RDD_ENGINE_PATH_RANK`, `RDD_ENGINE_PATH_NEXT_QUESTIONS`, `RDD_ENGINE_PATH_TRIALS` and `RDD_ENGINE_PATH_BRIEF` override it per endpoint. Unset or unknown values mean `"fallback"`. With `"engine"`, the engine runs first and the fallback is used only while the engine function is a placeholder. `wrangler.toml` sets only `RDD_ENGINE_PATH_RANK = "engine"`; setting it to `"fallback"` (or removing it) and redeploying rolls rank back. Each response names its path in the `X-RDD-Path` header, for QA only.

- **The ontology ranks; the LLM only translates.** The LLM proposes phrases copied from the notes and candidate labels. The engine keeps a term only if the phrase is found verbatim in the text and the HPO API confirms the term; the label shown is always the HPO primary name. Disease names, frequencies and genes come from Monarch and HPO annotation responses, never from the model.
- **Model choice was measured.** In a bake-off on the demo narratives, `llama-3.3-70b-instruct-fp8-fast` matched `gpt-oss-120b` on quality and was 2–3 times faster (T17, [docs/KIRO_USAGE.md](docs/KIRO_USAGE.md)). Both models got most HPO ids wrong, so the prompt no longer asks for ids and grounding is by label.
- **Fallbacks.** Demo cases have a prepared extraction, so they work without the LLM. For `demo-npc1`, a recorded ranking, questions and trials response is used only when the live upstream fails and the request matches exactly; such responses are labelled `source: "demo"`.
- **No server-side storage.** The case lives in the browser (`localStorage`); functions do not log note text.
- **Demo cases are synthetic.** Five narratives (`demo-npc1`, `demo-dmd`, `demo-marfan`, `demo-kabuki`, `demo-cdls`) were written from the HPO terms of published cases in [phenopacket-store](https://github.com/monarch-initiative/phenopacket-store) (BSD-3-Clause). They are not real patients and are labelled as demo data wherever they appear.

Request and response shapes, timeouts and error codes: [docs/CONTRACT.md](docs/CONTRACT.md). Requirements, design and tasks: [.kiro/specs/rare-disease-detective/](.kiro/specs/rare-disease-detective/requirements.md).

## Honest evaluation

On 10 published cases selected by a fixed rule, the correct condition ranked first in 5 and in the top 3 in 6 (our own small evaluation).

We also pre-registered a frequency-aware re-rank (method written at 12:57 ET before any result was computed). It did not improve recall (top-1 5 → 4, top-3 6 → 6 over 14 cases), so it is not shipped and `/api/rank` keeps Monarch's order. Method, both runs (including one invalidated by a benchmark bug) and per-case results: [docs/research/ranking-benchmark.md](docs/research/ranking-benchmark.md).

Limitations:

- The sample is small, and the cases come from publications that may already feed the HPO annotations, so results are likely optimistic. This is not a clinical validation.
- In 4 of the 10 cases the correct condition is not in Monarch's top 50 at all.
- The input was the published HPO terms, so this measures ranking, not extraction from notes.
- Among the demo cases, only `demo-npc1` shows its source condition first. In the benchmark run of 2026-10-24 13:04 ET, Monarch ranks Duchenne muscular dystrophy #40 for `demo-dmd`, and the Marfan, Kabuki and Cornelia de Lange sources fall outside its top 50. We kept these cases to show the tool's limits honestly. `demo-npc1` became the primary case because of this benchmark, and its source phenopacket is one of the 10 cases.
- The 50-case benchmark planned in contract §12 has not been run.

## Safety

- Every result screen and the brief show, in body size: "Decision support, not a diagnosis. These are possible matches to discuss with a doctor."
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
- **Monarch Initiative** semantic similarity service (monarchinitiative.org) for ranking. Monarch tools are not for diagnosis or medical decisions.
- **Orphanet** data, CC BY 4.0 (orpha.net, orphadata.com), through Orphanet-sourced HPO annotations.
- **ClinicalTrials.gov**, U.S. National Library of Medicine, for recruiting studies.
- **phenopacket-store** (Monarch Initiative), BSD-3-Clause, as the source of the synthetic demo cases and the benchmark cases.
- **OMIM is not used** beyond ids and outbound links already present in HPO annotations and Monarch cross-references. No OMIM API calls.

## How we built it with Kiro

- Kiro CLI authored the files for Ian's tasks, ran the checks and integrated reviewed tasks into `main`, with parallel sessions in separate worktrees on disjoint paths. The engine was written by Jerry with Kiro; his tool details are not logged yet.
- Spec-driven: EARS requirements, a design with correctness properties P1–P14, and a ticked task list in `.kiro/specs/rare-disease-detective/`, next to the interface contract.
- Two custom agents: `rdd-builder` writes code behind hook guardrails; `rdd-reviewer` is read-only and gave first-pass reviews, kept in `docs/reviews/`.
- Steering (always, fileMatch and manual), MCP (Context7 and biomcp) and a project power `rdd-medical-data`.
- Every claim is backed by the log in [docs/KIRO_USAGE.md](docs/KIRO_USAGE.md). Full write-up: [docs/KIRO_WRITEUP.md](docs/KIRO_WRITEUP.md).

## License

The code and documentation in this repository are licensed under the [Apache License 2.0](LICENSE). Data, fonts and libraries keep their own licences; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The demo cases are synthetic and derived from [phenopacket-store](https://github.com/monarch-initiative/phenopacket-store) (BSD-3-Clause).
