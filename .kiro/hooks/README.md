# Kiro agents and hooks

Two CLI agents in `.kiro/agents/` load `.kiro/steering/`, `docs/CONTRACT.md`, the `rare-disease-detective` spec and `BRIEFING.md` into every session.

- `rdd-builder` authors code in the paths a task claims. Hooks:
  - `agentSpawn` and `userPromptSubmit` → `scripts/session-context.sh`: prints repo root, branch, HEAD SHA and `git status --short`. kiro-cli 2.34.0 skips `agentSpawn` under `--no-interactive`, so `userPromptSubmit` carries it there.
  - `preToolUse` (shell) → `scripts/guard-shell.sh`: exits 2 (blocks) on `git push`, `git reset --hard`, `git clean`, `push --force`, `wrangler deploy`, `wrangler pages deploy`, and `pkill`/`killall` (also after `sudo` or in a pipeline; kill only an exact PID the session started). Read-only git and `kill <pid>` are allowed.
  - `postToolUse` (write) → `scripts/post-write-check.sh`: after an edit under `app/` runs `npm --prefix app run typecheck`; under `engine/` runs its `typecheck` (or `test`) script if `engine/package.json` exists. 90 s timeout, silent on pass, last 20 lines on failure.
- `rdd-reviewer` is read-only: no write or code tool, shell limited to read-only git (`status/diff/log/show`), same Git-state hooks. It reviews a diff against the contract, the EARS requirements, and design.md sections 7 and 12.
- `typecheck-on-save.kiro.hook` (Kiro IDE): when `app/src/**/*.ts(x)` is saved, runs the app typecheck.

Why it is safe: every hook is a read-only check or a guard. None commits, pushes, deploys or edits repo files. The shell guard matches text patterns, so it catches mistakes; it is not a sandbox. Git and deploy steps stay in separate, authorized integration sessions (`docs/PROTOCOL.md` 6A).

Use (from the repo root, with `npm --prefix app ci` done once):

```sh
kiro-cli chat --agent rdd-builder
kiro-cli chat --agent rdd-reviewer "Review git diff origin/main...HEAD"
```
