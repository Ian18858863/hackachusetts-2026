# How we built Rare Disease Detective with Kiro

Kiro authored every project file, spec, steering file and this write-up. Ian planned tasks and reviewed diffs with a separate planning assistant; that assistant wrote no project content. Two early steering drafts are the exception, disclosed in [Corrections](#corrections) at the end.

Every claim below cites a commit, a path or a row in the usage log [docs/KIRO_USAGE.md](KIRO_USAGE.md). Everything we did not do or did not verify is in one table, [Known limits](#known-limits), at the end. Times are Eastern Time on 2026-10-24.

## How a task flows

```text
Ian (human)
  │  task prompt: task id, claimed paths, contract sections, QA to run
  ▼
rdd-builder  (.kiro/agents/rdd-builder.json, Kiro CLI)
  │  hooks: 3 scripts on 4 triggers (session context, shell guard, typecheck after write)
  │  MCP: 2 servers (Context7, biomcp)    steering: 4 files    power: rdd-medical-data (3 skills)
  │  writes code in its own git worktree and branch
  ▼
rdd-reviewer (.kiro/agents/rdd-reviewer.json, read-only: read, grep, glob, read-only git)
  │  numbered findings, each tagged blocker / should-fix / nit, citing R-ids and CONTRACT §
  ▼
rdd-builder fix session  ──►  Ian's assistant reads the diff and the QA output
  ▼
Kiro integration session (docs/PROTOCOL.md 6A)
     cherry-pick → scope check → smoke test → push without force → deploy to Cloudflare Pages
```

**Counts**, each from a file in the repo: 24 `rdd-reviewer` reviews in `docs/reviews/`, with 2 blocker, 60 should-fix and 71 nit findings by their own labels · 8 deploys in the usage log, each after a passing smoke test · 2 commands blocked live by the shell-guard hook (usage-log row "Kiro CLI agent hooks (`preToolUse`)") · 2 custom agents (`.kiro/agents/`) · 5 hooks (3 CLI hook scripts in `.kiro/hooks/scripts/`, 2 IDE hooks in `.kiro/hooks/*.json`) · 4 steering files · 2 MCP servers (`.kiro/settings/mcp.json`) · 1 power · 3 specs (`.kiro/specs/`) · 8 fast-check properties in `engine/test/` · 1 pre-registered benchmark with a negative result.

## What the loop caught: three before/after stories

| Task | Before | Caught by | After |
|---|---|---|---|
| T13a app foundation | The offline mocks gave four real diseases (Duchenne, Marfan, Kabuki 1, CdLS 1) invented frequency bands, labelling the patient's own features "Very frequent" / "Frequent" by position, and a production build fell back to those mocks on network errors | `rdd-reviewer`, 2 blockers citing CONTRACT §1 and R9.3 ([review](reviews/T13a.md)) | Real JAX annotation values in the mocks, and mocks only in dev or with `?mock=1` (`87febca`). A production build shows "The service could not be reached … Try again" instead of mock data |
| T18d next-questions hierarchy filter | Ancestor lookups ran in series with no overall cap, close to the Cloudflare Workers limit of 50 subrequests per invocation | `rdd-reviewer` flagged the 50-subrequest risk ([review](reviews/T18d.md), finding 2); in the fix session a **Context7** lookup of the Cloudflare docs showed that Cache API calls (`match`, `put`, `delete`) count toward the same limit | A `SubrequestMeter` caps the hierarchy phase at 40 subrequests, counting `fetch` and cache calls; a 4,750 ms deadline skips the filter instead of failing; 10 Node tests (`1e79554`) |
| T18f trial relevance | A ClinicalTrials.gov search for "Niemann-Pick disease, type C1" matched the drug name NPC-1 and returned an unrelated Alzheimer's study (NCT07236190). The first filter accepted one shared word, so "niemann" would also pass Pick disease studies | A live ClinicalTrials.gov query on 2026-10-24 (contract §7.6), then `rdd-reviewer` on the first filter ([review](reviews/T18f.md), finding 3) | A study is kept only when a listed condition contains all distinctive words of the disease name (`6b73f5d`, `cf07006`; contract §7.6). The T18l re-recording has 6 Niemann-Pick type C studies and no NCT07236190 (`a6b4286`) |

## Kiro tools: IDE, CLI, Web, Crew

**Kiro CLI** did most of the work. `kiro-cli chat --no-interactive` (model claude-opus-5.5) authored the commits for Ian's tasks, ran builds, tests and smoke checks, and ran both custom agents. Each task had one git worktree and one branch; several sessions ran in parallel on disjoint paths claimed on the board in `BRIEFING.md` section 6. Kiro also integrated each reviewed task into `main` under Ian's standing authorization (`docs/PROTOCOL.md` section 6A), and the integration rows in the usage log list every `main` SHA pushed. Before the event, `kiro-cli chat` committed and pushed to a private test repo to check GitHub access (`Ian18858863/kiro-connection-test`, `28aac81`).

**Custom agents** (T19, `dd8a079`, both pass `kiro-cli agent validate`). `rdd-builder` writes code in the claimed paths; its prompt limits MCP queries to library names, technical questions, HPO ids and labels, and synthetic demo data (`0dca96f`). `rdd-reviewer` has no write tool. Both load the steering files, the contract, the spec and `BRIEFING.md` as resources. From 12:35 ET every diff from Ian's Kiro got a first-pass `rdd-reviewer` review; each file in `docs/reviews/` ends with an Outcome line naming the fix commit or the findings still open.

**Kiro IDE.** At 15:44 ET, in Kiro IDE 1.4.26, the agent edited `app/src/components/shell/TopBar.tsx` with its file tool and the v1 `PostFileSave` hook `typecheck-app-on-save` (`.kiro/hooks/typecheck-on-save.json`) fired. The chat showed "1 hook triggered" and "Run Command Hook", and the Kiro log records `"actionType":"ContextualHookInvoked"` at 15:44:46. This ran in a separate worktree on a branch that is not merged (`ian/t27-ide-hook-demo`). The first two takes did not fire, because the window had opened untrusted (`isTrusted=false`, `hooks.v2.executionDisabledUntrustedWorkspace`); it worked after granting trust, reloading the window and starting a new chat. Details are in the usage-log row for 15:44.

**Kiro Web and Kiro Crew** were not used (see Known limits).

**Other contributors.** The engine (`engine/**`) was written by Jerry, and his commit messages say "Authored by Jerry's Kiro" (for example `f6a3ebe`). Peter's Kiro wrote landing v1/v2 and its spec, imported unchanged in `a28e4f5`; Ian's Kiro re-implemented the page (T04, `08941fe`, `6c89a84`). Which Kiro tools Jerry and Peter used is not in the log.

## Spec-driven development compared with vibe coding

- **Specs.** `.kiro/specs/rare-disease-detective/` has `requirements.md` (12 requirements in EARS form, for example "WHEN the user submits text longer than 8,000 characters THE SYSTEM SHALL keep the text…"), `design.md` (architecture, error handling, testing strategy and correctness properties P1–P14) and `tasks.md` (five lanes with owners and paths). Kiro wrote them with the interface contract `docs/CONTRACT.md` v0.1 in `f77cc31`. `.kiro/specs/landing/` (T04) and `.kiro/specs/i18n/` (T28s, `83a1b77`, written before any i18n code) follow the same pattern.
- **The contract sits next to the spec** and wins on conflict. Changes follow its section 14 and are logged in its changelog: v0.1.1 (`629c869`), v0.1.2 (`18556d7`), v0.1.3 (`820e7ff`).
- **The spec changed when the evidence changed.** T09c (`629c869`) made `demo-npc1` the primary demo case after the T23 benchmark showed Monarch ranks its source condition first while it ranks Duchenne #40 for `demo-dmd`. Requirements, design, tasks and contract changed in the same commit.
- **Ticks.** Kiro ticks `tasks.md` as work ships (`5508f1a`, then T11m `6c14f5b`); partly done items say what is missing.
- **Why it mattered.** Parallel sessions needed one shared reference. The app foundation (T13a) was built against the contract's example JSON before any function existed, and the functions (T18a, T18b) later matched those shapes. Review findings cite requirement ids and contract sections (R1.2, R9.1, CONTRACT §4), so each one can be checked. Small polish with no interface change was a direct prompt without a spec change (T15b, `253641b`).

## Agent hooks

- **CLI hooks, used live** (`dd8a079`), in `.kiro/agents/rdd-builder.json` with scripts in `.kiro/hooks/scripts/`:
  - `session-context.sh` on `agentSpawn` and `userPromptSubmit` prints repo root, branch, HEAD and `git status --short` into the session. In kiro-cli 2.34.0 `agentSpawn` does not fire in `--no-interactive` mode, so `userPromptSubmit` runs the same script.
  - `guard-shell.sh` on `preToolUse` (shell) blocks `git push`, `git reset --hard`, `git clean`, `push --force`, `wrangler deploy`, `wrangler pages deploy`, `pkill` and `killall`. It blocked a `git push origin main` in T19 and a QA command containing the literal push string in the T21 fix session.
  - `post-write-check.sh` on `postToolUse` (write) runs the app or engine typecheck after an edit.
- **IDE hooks in the 1.x format** (T21, `6c6ce91`, `68ec5cb`): `typecheck-on-save.json` (`PostFileSave` on `app/src/**/*.ts(x)`, a command hook) fired once in Kiro IDE, as described above. `contract-drift-check.json` (`PostFileSave` on `docs/CONTRACT.md`, an `agent` action that reports drift between contract, spec and code types) has not been observed firing. `.kiro/hooks/README.md` states their limits.
- No hook commits, pushes or deploys.

## Steering

- `design.md` (always): the design method, including section 7 on medical safety framing ("never look like a verdict", no false precision, sources next to claims). Re-authored by Kiro in `38291ac`.
- `team.md` (always): claim-first, shared-file and git rules. Re-authored by Kiro in `cac4d5a`.
- `medical-data.md` (`inclusion: fileMatch` for `engine/**` and `functions/**`; `6c6ce91`, `68ec5cb`): medical-data rules from the contract; it pulls the contract in with `#[[file:docs/CONTRACT.md]]`.
- `release-check.md` (`inclusion: manual`, `#release-check`): the deploy and submission checklist, reported as PASS / FAIL / NOT RUN.

Both custom agents load all four as resources (`file://.kiro/steering/**/*.md`). Reviews cite design.md sections 7 and 12 by number, for example in [T13a](reviews/T13a.md) and [T18d](reviews/T18d.md).

## MCP

Configured in `.kiro/settings/mcp.json` and, since `0dca96f`, in `rdd-builder`'s own `mcpServers`. The shipped app calls no MCP server; MCP is a development tool here.

- **Context7** (T20, `b3dce59`): resolved Cloudflare Workers AI and fast-check and read how to bind Workers AI in a Pages Function. In the T18d fix it supplied the Cache API subrequest rule (story above, `1e79554`).
- **biomcp** (T20b, `d35a18e`): two biomcp-only sessions cross-checked the demo cases. Results are in `docs/research/biomcp-checks.md`, with two findings: biomcp caps phenotype search at 10 HPO terms (Monarch accepts 12), and it marks 6 of 10 Duchenne terms `not_supported`. A live session at 12:47 ET called `@biomcp/get` (OMIM:310200 → Duchenne muscular dystrophy) and Context7 (`0dca96f`).

## Property-based testing

- The design names 14 correctness properties (P1–P14 in `.kiro/specs/rare-disease-detective/design.md`; full wording in `docs/CONTRACT.md` section 11).
- On `main`, Jerry's engine tests hold 8 fast-check properties (count of `fc.assert` calls), all with the fixed seed 20261024:
  - `engine/test/ground.test.ts` (`c2ffb08`): 1 property for P1–P3 on `groundTerms` (only HPO-confirmed ids, exact quote offsets with the HPO primary name, no duplicate ids), 200 runs.
  - `engine/test/rank.test.ts` (`f6a3ebe`): 1 property for P4–P6 on `rankCandidates` (order and duplicate independence, ranks 1..n, matched plus unmatched covers every observed term), and 1 property that removing a matched phenotype never raises another candidate's matched count.
  - `engine/test/questions.test.ts` (`eaf9c0d`): 5 properties on `nextQuestions`: P9 plus the hierarchy filter, limit and order, determinism, no fabricated frequencies, and a cap on fetch calls.
- P12 (`normalizeFrequency`, `engine/test/skeleton.test.ts`) and P14 (demo offsets, `engine/test/demo.test.ts`) are example-based tests, not fast-check.
- Ian's functions have Node tests: `functions/_lib/fallback/hierarchy.test.ts` (10 tests, `1e79554`) and `functions/_lib/rerank.test.ts` (8 tests, `4682cdd`).
- How Jerry authored his tests is not in the usage log.

## Powers

`.kiro/powers/rdd-medical-data/` (T22, `c5f619f`, `47521fa`): `plugin.json` plus three skills (`rdd-upstream-services`, `rdd-demo-fixtures`, `rdd-attribution-text`) with content copied verbatim from the contract. `kiro-cli powers install` exited 0. A fresh `kiro-cli chat` session in an empty directory called `activate` on `rdd-medical-data` and `readSkill` on `rdd-upstream-services`, then answered with the contract's timeout, cache and licence rules (session `sess_150850c3-e089-422c-92ef-dc8134af184a`).

## Measured decisions

- **Pre-registered benchmark** (T23, `4682cdd`, [docs/research/ranking-benchmark.md](research/ranking-benchmark.md)). Kiro wrote the method of a frequency-aware re-rank at 12:57 ET, before any result. The first run was invalid: the benchmark's fetch cache kept HTTP 429 answers as final (281 of 773 JAX responses). Kiro kept that run in the file, marked it invalid, fixed only the script and changed no scoring constant. The corrected run was negative (top-1 5 → 4, top-3 6 → 6 over 14 cases), so the re-rank is not shipped.
- **LLM choice** (T17, `cd1a1a4`). In a bake-off on the demo narratives, `@cf/meta/llama-3.3-70b-instruct-fp8-fast` matched `gpt-oss-120b` on quality and was 2–3 times faster (2.3–4.9 s; `gpt-oss-120b` reached 10.4 s). Both models got most HPO ids wrong, so the prompt stopped asking for ids and the engine grounds by label.
- **Engine parity before switching** (T18h, T18i; `310ea07`, `50cfc74`, `0f36748`). Kiro compared Ian's fallback ranking with Jerry's engine on `demo-npc1` and `demo-dmd`, found that the fallback counted non-HP shared ancestors (`UPHENO:` terms), aligned it, and got identical top 5 before `/api/rank` moved to the engine (T18k, `820e7ff`). The same check on `nextQuestions` (T18n, on `eaf9c0d`) failed, so that endpoint did not move (see Known limits).

## Lessons

- `kiro-cli chat --resume` resumes the latest session in the current directory; one reviewer session was resumed by mistake, so we switched to `--resume-id <session id>`.
- Two sessions hung while headless Chrome ran in the foreground; stopping those Chrome child processes unblocked them.
- The Kiro service throttled requests at about five heavy sessions at once; we capped parallel sessions and retried with backoff.
- Kiro IDE hooks do not run in an untrusted workspace, and granting trust alone did not start them; a window reload and a new chat did.
- Grounding untrusted LLM output against the ontology was necessary (T17).

## Known limits

| Item | Status | Evidence |
|---|---|---|
| Kiro Web | Not used; it needs a paid plan | — |
| Kiro Crew | Not used; skipped to save time | — |
| Kiro IDE hook firing | Seen once, for the command hook `typecheck-app-on-save`, on the unmerged branch `ian/t27-ide-hook-demo`; the first two takes did not fire (untrusted window) | Usage-log row 15:44 |
| `contract-drift-check` IDE hook | Not observed firing | — |
| Steering fileMatch and manual modes in Kiro IDE | Not exercised; the CLI agents load all four files as resources | `.kiro/agents/*.json` |
| MCP in Kiro IDE | Not verified that the IDE reads `.kiro/settings/mcp.json`; `kiro_default` sessions get both servers without `rdd-builder`'s query rule | Usage log, MCP section |
| Power in Kiro IDE and custom agents | IDE Powers panel not checked; not checked whether custom agents load the power | Usage log, Powers section |
| `/api/next-questions` on the engine | Parity check FAIL (T18n): for ORPHA candidates the engine reads only the ORPHA annotation set, which produced a false "not listed for" line on `demo-dmd`. The endpoint stays on the fallback. The engine applied the hierarchy filter correctly where the fallback did not (Gait ataxia on `demo-npc1`), and that fallback bug needs its own claim | Usage-log row T18n; `wrangler.toml` sets only `RDD_ENGINE_PATH_RANK` |
| `/api/trials`, `/api/brief` on the engine | Engine `searchTrials` and `buildBrief` are placeholders; both endpoints run on the fallback | `README.md`, "What runs where today" |
| Property-based tests | P7, P8, P10, P11 and P13 have no tests; P12 and P14 are example-based | `engine/test/` |
| Function tests (spec task 2.8) | Not started; T18f finding 5 (no tests for the relevance filter) open | `tasks.md`; [T18f review](reviews/T18f.md) |
| 50-case benchmark (contract §12) | Not run; the T23 benchmark used 14 cases | `docs/research/ranking-benchmark.md` |
| Forced-upstream-failure smoke run | NOT RUN; `scripts/smoke.mjs` prints it as a NOTE | Usage-log row T24 |
| Review text for T18l, T18j/T18k and T11m | Logged in the usage log; the files are not yet in `docs/reviews/` | Usage-log rows |
| T18j/T18k review findings 3 and 4 (HPO version open question, brief default) | Claimed as T18m; not on `main` | `BRIEFING.md` T18m |
| Contract v0.1.3 | Still a draft; APPROVE by Jerry and Ian not recorded | `docs/CONTRACT.md` header |
| Jerry's and Peter's Kiro tool usage | Not in the usage log | `docs/KIRO_USAGE.md` |

## Corrections

- At 10:55 ET Ian's assistant (Claude, outside Kiro) committed a draft of `.kiro/steering/design.md` in `c31e29f`, and an early usage-log line claimed Kiro had used it. Kiro had not. The log's Corrections section records this, and Kiro re-authored the file under T02 (`38291ac`).
- `.kiro/steering/team.md` was also drafted by Ian's assistant outside Kiro, in `926bfee` and `c9c7c03`. Kiro re-authored it under T02b (`cac4d5a`).
