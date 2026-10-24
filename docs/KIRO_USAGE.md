# How we used Kiro

Judges score how deeply and strategically we used Kiro. Log every meaningful use here during the day; turn it into the final write-up at 18:00.

## How we drive Kiro

Ian's assistant (Claude, outside Kiro) writes natural-language task prompts and reviews the diffs and QA. Kiro CLI (`kiro-cli chat --no-interactive`, model claude-opus-5.5) authors every file and runs the checks. Under Ian's ratified standing authorization (`docs/PROTOCOL.md` section 6A), Kiro also commits each task on its own worktree branch and then integrates it into `main` one task at a time: cherry-pick, scope check, ancestry check, push without force. Each task gets one worktree and one branch, and several Kiro sessions run in parallel on disjoint paths.

## Tools
- Kiro IDE: Not yet used today for project work. The IDE hook file `.kiro/hooks/typecheck-on-save.kiro.hook` exists (commit `dd8a079`) but has not been exercised in Kiro IDE.
- Kiro CLI: `kiro-cli chat` edited, committed and pushed a README change in the private test repo `Ian18858863/kiro-connection-test` (commit `28aac81`) to verify Kiro-to-GitHub access before the event. Since 11:40 ET, `kiro-cli chat --no-interactive` has authored every project commit listed in the log below, run the builds and checks, created and deployed the Cloudflare Pages project, and run the custom agents `rdd-builder` and `rdd-reviewer`.
- Kiro Crew / Web:

## Spec-driven development
- Specs created (`.kiro/specs/...`): In progress under task T09. Nothing to claim yet.
- How specs compared with vibe coding:

## Steering
- `.kiro/steering/design.md` was re-authored by Kiro from the disclosed assistant draft (task T02, commit `38291ac`).
- `.kiro/steering/team.md` was re-authored by Kiro from the disclosed assistant draft (task T02b, commit `cac4d5a`).
- Both steering files are loaded as resources (`file://.kiro/steering/**/*.md`) by the custom agents `rdd-builder` and `rdd-reviewer` in `.kiro/agents/` (commit `dd8a079`).

## Agent hooks
- Kiro CLI agent hooks (commit `dd8a079`), configured in `.kiro/agents/rdd-builder.json` with scripts in `.kiro/hooks/scripts/`:
  - `session-context.sh` on `agentSpawn` and `userPromptSubmit`: injects session context.
  - `guard-shell.sh` on `preToolUse` (shell): blocks `git push`, `git reset --hard`, `git clean`, `push --force`, `wrangler deploy`, `pkill` and `killall`. In a real `rdd-builder` session it blocked a `git push` attempt live (evidence: assistant's run log).
  - `post-write-check.sh` on `postToolUse` (write): runs the typecheck after writes.
- Finding: in kiro-cli 2.34.0, `agentSpawn` does not fire in `--no-interactive` mode, so `userPromptSubmit` was added to run the same context script.
- Kiro IDE hook `.kiro/hooks/typecheck-on-save.kiro.hook` (runs `npm --prefix app run typecheck` when `app/src/**/*.ts(x)` is edited): written, NOT yet exercised in Kiro IDE.

## MCP
-

## Property-based testing
-

## Powers
-

## Log

Every row must describe an action Kiro actually performed, with evidence (a file path or commit). Teammates post their real usage lines in the group chat, and Ian's Kiro appends them here one at a time.

| Time (ET) | Human | Kiro feature | Exact action | Result | Evidence (path or commit) |
|---|---|---|---|---|---|
| 2026-10-24 07:50 | Ian | Kiro CLI (`kiro-cli chat`) | The CLI agent edited `README.md` in the private test repo `Ian18858863/kiro-connection-test`, then committed and pushed it | Kiro-to-GitHub access verified before the event | `Ian18858863/kiro-connection-test` commit `28aac81` ("Test commit from Kiro") |
| 2026-10-24 11:40–11:43 | Ian | Kiro CLI | T11: Kiro updated `BRIEFING.md` and added `docs/PROTOCOL.md` to adopt the approved team briefing and protocol v4 | 2 files changed, 364 insertions, 29 deletions | commit `fa0180f` |
| 2026-10-24 11:40–11:43 | Ian | Kiro CLI | T10: Kiro corrected `docs/KIRO_USAGE.md` so it lists only real Kiro actions and recorded the first real Kiro CLI use | Usage log made honest; Corrections section added | commit `e4d0c8e` |
| 2026-10-24 11:40–11:43 | Ian | Kiro CLI (Steering) | T02: Kiro re-authored `.kiro/steering/design.md` from the disclosed assistant draft (`c31e29f`) | Design steering now authored by Kiro, with provenance note | commit `38291ac` |
| 2026-10-24 11:40–11:59 | Ian | Kiro CLI | T01a: Kiro built the Vite + React + TypeScript app shell under `app/`, ran `npm install`, typecheck and build, took headless Chrome screenshots at 1440 px and 375 px in light and dark, found a 375 px horizontal overflow and fixed it itself | Topic-neutral app shell builds and typechecks; no horizontal overflow at 375 px | commit `5d54ab9`; screenshots and overflow fix: assistant's run log |
| 2026-10-24 11:41–11:59 | Ian | Kiro CLI | T03: Kiro wrote `wrangler.toml`, `scripts/build-site.sh` and `functions/api/health.ts`, and tested them with `wrangler pages functions build` and `wrangler pages dev` | Cloudflare Pages deploy path works locally | commit `53263d4`; test runs: assistant's run log |
| 2026-10-24 11:44–11:56 | Ian | Kiro CLI (Steering) | T02b: Kiro re-authored `.kiro/steering/team.md` from the disclosed assistant draft (`926bfee`, `c9c7c03`) | Team steering now authored by Kiro, with provenance note | commit `cac4d5a` on `main` |
| 2026-10-24 11:55–11:57 | Ian | Kiro CLI | T11c: Kiro edited `BRIEFING.md` to record the topic decision (Rare Disease Detective) and refresh the claim board | Topic and claims recorded | commit `b180493` |
| 2026-10-24 12:00–12:03 | Ian | Kiro CLI (deploy) | After a passing local smoke test on `main` `53263d4` (`scripts/build-site.sh`, `wrangler pages dev`, curl of `/`, `/app/`, `/api/health`), Kiro created the Cloudflare Pages project `hackachusetts-2026` and deployed | Live https://hackachusetts-2026.pages.dev returned 200 on `/`, `/app/` and `/api/health`; `/api/health` reports commit `53263d4` | assistant's run log |
| 2026-10-24 12:01–12:09 | Ian | Kiro CLI custom agents + agent hooks | T19: Kiro created `.kiro/agents/rdd-builder.json` and `.kiro/agents/rdd-reviewer.json` (resources: steering, contract, spec, briefing; reviewer has no write tool and a git read-only shell allowlist), hook scripts under `.kiro/hooks/scripts/` (session context on `agentSpawn`/`userPromptSubmit`, `preToolUse` shell guard, `postToolUse` typecheck after writes) and the IDE hook `.kiro/hooks/typecheck-on-save.kiro.hook`; validated both agents with `kiro-cli agent validate` | Both agents validate; in a real `rdd-builder` session the guard blocked a `git push` live; finding: in kiro-cli 2.34.0 `agentSpawn` does not fire in `--no-interactive` mode, so `userPromptSubmit` was added; IDE hook NOT yet exercised in Kiro IDE | commit `dd8a079`; validation and live block: assistant's run log |
| 2026-10-24 12:06–12:08 | Ian | Kiro CLI | T11d: Kiro edited `BRIEFING.md` to record topic approval, teammate claims and the first deploy on the claim board | Board updated | commit `69fe53d` |
| 2026-10-24 11:56–12:09 | Ian | Kiro CLI (Git integration under `docs/PROTOCOL.md` 6A) | Kiro integrated tasks into `main` one at a time (cherry-pick, scope check, ancestry check, push without force) | `main` SHAs pushed: `cac4d5a`, `b180493`, `5d54ab9`, `53263d4`, `69fe53d`, `dd8a079` | `git log origin/main` |

## Corrections (not Kiro actions)

- 2026-10-24 10:58: An earlier log row claimed Kiro steering usage for `.kiro/steering/design.md`. That file was drafted by Ian's assistant (Claude) outside Kiro and committed in `c31e29f`; Kiro had not used it. Kiro will re-author it under task T02.
- `.kiro/steering/team.md` was also drafted by Ian's assistant (Claude) outside Kiro, in commits `926bfee` and `c9c7c03`. The earlier Steering bullet describing it was removed. Kiro will re-author it under task T02b.
