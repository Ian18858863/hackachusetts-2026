# How we built Rare Disease Detective with Kiro

This write-up is built from the log in [docs/KIRO_USAGE.md](KIRO_USAGE.md) plus git history and the files under [`.kiro/`](../.kiro/). Every claim cites a commit or a path. Where something was not checked, we say so. Times are Eastern Time on 2026-10-24.

## At a glance

| Kiro feature | What exists | Status |
|---|---|---|
| Kiro CLI | `kiro-cli chat --no-interactive` authored the project commits listed in the usage log, ran the checks and deploys | Used all day |
| Custom agents | `.kiro/agents/rdd-builder.json` (writes), `.kiro/agents/rdd-reviewer.json` (read-only) | Used live (`dd8a079`) |
| Agent hooks (CLI) | Session context, shell guard, typecheck after writes, in `rdd-builder.json` and `.kiro/hooks/scripts/` | Fired live; the guard blocked commands (T19, T21) |
| Agent hooks (IDE 1.x) | `.kiro/hooks/typecheck-on-save.json`, `.kiro/hooks/contract-drift-check.json` | On `main` (`6c6ce91`, `68ec5cb`); firing in Kiro IDE NOT yet recorded |
| Steering | `design.md`, `team.md` (always), `medical-data.md` (fileMatch), `release-check.md` (manual) | Loaded by the CLI agents; fileMatch and manual modes not yet exercised in Kiro IDE |
| Specs | `.kiro/specs/rare-disease-detective/` with EARS requirements, design with properties P1–P14, tasks | Written in `f77cc31`; spec ticks as of 13:30 ET (`5508f1a`); an update is in progress |
| MCP | Context7 and biomcp in `.kiro/settings/mcp.json` and in `rdd-builder`'s own `mcpServers` | Real calls logged (`b3dce59`, `d35a18e`, `0dca96f`, T18d fix) |
| Powers | `.kiro/powers/rdd-medical-data/` | Installed and activated in kiro-cli (`c5f619f`, `47521fa`) |
| Property-based testing | fast-check property for P1–P3 in `engine/test/ground.test.ts` | On `main` from Jerry's engine commit `c2ffb08`; P4–P14 not written yet |

## How we drive Kiro

Ian's assistant (Claude, outside Kiro) plans each task, writes a natural-language prompt and reviews the resulting diff and QA output. For Ian's tasks, Kiro CLI (`kiro-cli chat --no-interactive`, model claude-opus-5.5) authors every file and runs the builds, tests and smoke checks. The engine (`engine/**`) was written by Jerry with Kiro; which Kiro tools he used is not logged yet. Under Ian's standing authorization (`docs/PROTOCOL.md` section 6A), Kiro also commits each task on its own worktree branch and integrates it into `main` one task at a time: cherry-pick, scope check, ancestry check, push without force. The integration rows in `docs/KIRO_USAGE.md` list every `main` SHA pushed this way.

Each task has one git worktree and one branch, and several Kiro sessions run in parallel on disjoint claimed paths (claims on the board in `BRIEFING.md` section 6). No two writers touch the same file.

Before the event, `kiro-cli chat` edited, committed and pushed a README change in a private test repo to verify Kiro-to-GitHub access (`Ian18858863/kiro-connection-test`, commit `28aac81`).

Deploys to Cloudflare Pages ran from Kiro only after a passing smoke test (usage-log rows for `53263d4`, `cd1a1a4`, `3c99583`, `eb86f02`, `2254286`, `cf07006`). From T24 on, that smoke test is the script `scripts/smoke.mjs` (`00ff364`).

## Spec-driven development

- **Spec.** `.kiro/specs/rare-disease-detective/requirements.md` (12 requirements in EARS form, for example "WHEN the user submits text longer than 8,000 characters THE SYSTEM SHALL keep the text…"), `design.md` (architecture, components, error handling, testing strategy and correctness properties P1–P14) and `tasks.md` (five parallel lanes with owners and paths). Written by Kiro in `f77cc31` together with the interface contract `docs/CONTRACT.md` v0.1.
- **Contract next to the spec.** `docs/CONTRACT.md` fixes request and response shapes, error codes, timeouts and demo cases. The spec refers to contract sections instead of repeating them, and the contract wins on conflict. Contract changes follow a written process (section 14) and are logged in its changelog: v0.1.1 (`629c869`, new primary demo case) and v0.1.2 (`18556d7`, timeouts, overlap counting, question filter, trial relevance).
- **Ticks.** Kiro ticks tasks as they ship (T09b, `5508f1a`). The ticks in `tasks.md` are as of 13:30 ET; work shipped since then (for example the rank, questions, trials and brief functions, the brief and trials UI, and the smoke script `00ff364`) is not ticked yet, and an update is in progress. Partially done items carry a note saying what is missing.
- **The spec changed when the evidence changed.** T09c (`629c869`) made `demo-npc1` the primary demo case after the T23 benchmark showed Monarch ranks its source condition first, while Duchenne ranks #40 for `demo-dmd`. Requirements, design, tasks and contract were updated in the same commit.

### Specs compared with vibe coding

Parallel sessions on different paths needed one shared reference, and the contract plus spec gave them that. The app foundation (T13a) was built against the contract's example JSON before any function existed, and the functions (T18a, T18b) later matched those shapes. Review findings from `rdd-reviewer` cite requirement ids and contract sections (for example R1.2, R9.1, CONTRACT §4), which made each finding checkable; see `docs/reviews/`. Small polish tasks (for example T15b, `253641b`) were done as direct prompts without a spec change, because they did not change any interface.

## Custom agents

Both agents are in `.kiro/agents/` (T19, `dd8a079`) and validate with `kiro-cli agent validate`. They load all steering files, the contract, the spec and `BRIEFING.md` as resources.

- **`rdd-builder`** writes code in the paths a task claims. Its prompt limits MCP queries to library names, technical questions, HPO ids and labels and synthetic demo data (`0dca96f`).
- **`rdd-reviewer`** is read-only: tools `read`, `grep`, `glob` and a shell limited to read-only git. It reviews a diff against the contract, the EARS requirements and `.kiro/steering/design.md` sections 7 (medical safety) and 12 (definition of done).

## First-pass review workflow

From 12:35 ET, every task diff from Ian's Kiro got a first-pass review by `rdd-reviewer` before the assistant's review. Sixteen reviews are kept in `docs/reviews/` (T13a, T13c, T13d, T13e, T14, T15, T16, T18a–T18f, T20, T21, T22). Each ends with an Outcome line naming the commit on `main` that fixed the findings, or the findings still open.

Examples of what the reviewer caught:

- T13a ([review](reviews/T13a.md)): 2 blockers. The offline mocks gave real diseases invented frequency bands, and a production build fell back to those mocks on network errors. Fixed in `87febca`: real JAX annotation values in the mocks, and mock fallback only in dev or with `?mock=1`.
- T18b ([review](reviews/T18b.md)): 6 should-fix findings, for example the rank cache stored partial results and questions sent MONDO ids to the JAX API. Fixed before the first commit, in `3c99583`.
- T18f ([review](reviews/T18f.md)): findings 1–4 fixed in `cf07006`; finding 5 (missing tests) is still open, and the review says so.

Several reviews ran on uncommitted work (T14, T13d, T18a, T18b, T16, T13e), so the fixes are in the task's first commit.

## Agent hooks

**Kiro CLI hooks, used live** (`dd8a079`), configured in `.kiro/agents/rdd-builder.json` with scripts in `.kiro/hooks/scripts/`:

- `session-context.sh` on `agentSpawn` and `userPromptSubmit`: prints repo root, branch, HEAD and `git status --short` into the session.
- `guard-shell.sh` on `preToolUse` (shell): blocks `git push`, `git reset --hard`, `git clean`, `push --force`, `wrangler deploy`, `wrangler pages deploy`, `pkill` and `killall`. It blocked commands in real `rdd-builder` sessions: a `git push origin main` in T19, and a QA command containing the literal push string in the T21 fix session.
- `post-write-check.sh` on `postToolUse` (write): runs the app or engine typecheck after an edit.

Finding: in kiro-cli 2.34.0, `agentSpawn` does not fire in `--no-interactive` mode, so `userPromptSubmit` runs the same context script.

**Kiro IDE hooks in the 1.x format** (T21, `6c6ce91`, `68ec5cb`): `.kiro/hooks/typecheck-on-save.json` (`PostFileSave` on `app/src/**/*.ts(x)`) and `.kiro/hooks/contract-drift-check.json` (`PostFileSave` on `docs/CONTRACT.md`, an `agent` action that reports drift between the contract, the spec and the code types). They replaced a 0.x hook file, deleted in `6c6ce91`. Firing in Kiro IDE is NOT yet recorded. `.kiro/hooks/README.md` states their limits: file triggers fire only on agent changes, and the drift check is read-only only by its prompt.

None of the hooks commits, pushes or deploys.

## Steering

- `.kiro/steering/design.md` (always): the design method, including section 7 on medical safety framing ("never look like a verdict", no false precision, sources next to claims). Re-authored by Kiro in `38291ac` from a disclosed assistant draft.
- `.kiro/steering/team.md` (always): claim-first, shared-file and git rules. Re-authored by Kiro in `cac4d5a` from a disclosed assistant draft.
- `.kiro/steering/medical-data.md` (`inclusion: fileMatch` for `engine/**` and `functions/**`, `6c6ce91`, `68ec5cb`): medical-data rules from the contract, and it pulls the contract in with `#[[file:docs/CONTRACT.md]]`.
- `.kiro/steering/release-check.md` (`inclusion: manual`, used as `#release-check`): the deploy and submission checklist, reported as PASS / FAIL / NOT RUN.

The CLI agents load all four files as resources (`file://.kiro/steering/**/*.md`). The fileMatch and manual inclusion modes have not yet been exercised in Kiro IDE.

## MCP

Configured in `.kiro/settings/mcp.json` and, since `0dca96f`, in `rdd-builder`'s own `mcpServers`.

- **Context7** (T20, `b3dce59`): `rdd-builder` resolved Cloudflare Workers AI and fast-check and read how to bind Workers AI in a Pages Function. During the T18d fix, a Context7 lookup of the Cloudflare docs confirmed that Cache API calls count toward the 50-subrequest limit per invocation; the next-questions hierarchy lookups now count both kinds of call against a cap of 40 (`1e79554`).
- **biomcp** (T20b, `d35a18e`): two `rdd-builder` sessions used only biomcp tools to cross-check the demo cases. Results are in `docs/research/biomcp-checks.md`, including two findings: biomcp caps phenotype search at 10 HPO terms (Monarch accepts 12), and it marks 6 of 10 Duchenne terms as `not_supported`. A live session at 12:47 ET called `@biomcp/get` (OMIM:310200 → Duchenne muscular dystrophy) and Context7 (`0dca96f`).
- The shipped app calls no MCP server. MCP is a development tool here.
- Not verified: whether Kiro IDE reads the workspace `mcp.json`. `kiro_default` sessions get both servers from it without `rdd-builder`'s query rule.

## Powers

`.kiro/powers/rdd-medical-data/` (T22, `c5f619f`, `47521fa`): `plugin.json` plus three skills (`rdd-upstream-services`, `rdd-demo-fixtures`, `rdd-attribution-text`) with content copied verbatim from the contract. `kiro-cli powers install` exited 0. A fresh `kiro-cli chat` session in an empty directory called `activate` on `rdd-medical-data` and `readSkill` on `rdd-upstream-services`, then answered with the contract's timeout, cache and licence rules (session `sess_150850c3-e089-422c-92ef-dc8134af184a`). Not checked: the Kiro IDE Powers panel, and whether custom agents load the power.

## Property-based testing

- The design names 14 correctness properties (P1–P14 in `.kiro/specs/rare-disease-detective/design.md`, full wording in `docs/CONTRACT.md` section 11).
- On `main`: one fast-check property in `engine/test/ground.test.ts` covers P1–P3 for `groundTerms` (only HPO-confirmed ids, exact quote offsets with the HPO primary name, no duplicate ids), with 200 runs and a fixed seed. It came with Jerry's engine commit `c2ffb08`. Jerry's own Kiro usage line for it has not been added to `docs/KIRO_USAGE.md` yet, so this write-up does not describe how it was authored.
- P4–P14 are in progress; they depend on engine functions (`rankCandidates`, `nextQuestions`, `buildBrief`) that are still placeholders on `main`.

## Rigour: a pre-registered benchmark

T23 (`4682cdd`, [docs/research/ranking-benchmark.md](research/ranking-benchmark.md)) tested whether a frequency-aware re-rank improves on Monarch's order.

1. Kiro wrote the method, constants and case-selection rule at 12:57 ET, before computing any result.
2. The first run had a bug: the benchmark's fetch cache stored HTTP 429 answers as final (281 of 773 JAX responses). Kiro kept that run in the file, marked it invalid, fixed only the script (retry with backoff, lower concurrency) and changed no scoring constant.
3. The corrected run was negative: top-1 5 → 4, top-3 6 → 6, top-10 6 → 6 over 14 cases. The re-rank is not shipped, and `/api/rank` keeps Monarch's order.

The same benchmark changed the product: it is why `demo-npc1` is the primary demo case (T09c, `629c869`).

## Other measured decisions

- **LLM choice** (T17, `cd1a1a4`): a bake-off on the demo narratives through the Workers AI REST API. `@cf/meta/llama-3.3-70b-instruct-fp8-fast` matched `gpt-oss-120b` on quality and was 2–3 times faster (2.3–4.9 s; `gpt-oss-120b` reached 10.4 s). Both models got most HPO ids wrong, so the prompt stopped asking for ids and the engine grounds by label.
- **Trial relevance** (T18f, `6b73f5d`, `cf07006`): a ClinicalTrials.gov search for "Niemann-Pick disease, type C1" matched a drug named NPC-1 and returned an unrelated study (NCT07236190). Studies are now kept only when a listed condition contains all distinctive words of the disease name.

## Lessons

- `kiro-cli chat --resume` resumes the most recent session in the current directory; one reviewer session was resumed by mistake. We switched to `--resume-id <session id>`.
- Two sessions hung while headless Chrome ran in the foreground. Stopping those Chrome child processes unblocked them.
- The Kiro service throttled requests with about five heavy sessions at once. We capped parallel sessions and retried with backoff.
- Grounding untrusted LLM output against the ontology was necessary: both bake-off models got most HPO ids wrong (T17).
- An honest record took correction. The first steering files were drafted by Ian's assistant outside Kiro; an early log line claimed Kiro had used them. The log's Corrections section records this, and Kiro re-authored both files (`38291ac`, `cac4d5a`).

## Not used, and why

- **Kiro Web:** not used, because it needs a paid plan.
- **Kiro Crew:** not used; we skipped it to save time during the event.
- **Kiro IDE:** not yet used for Ian's tasks. Usage by Peter and Jerry will be added to `docs/KIRO_USAGE.md` when their usage lines arrive.
