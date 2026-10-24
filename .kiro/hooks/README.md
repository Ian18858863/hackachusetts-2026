# Kiro agents and hooks

Two CLI agents in `.kiro/agents/` load `.kiro/steering/`, `docs/CONTRACT.md`, the `rare-disease-detective` spec and `BRIEFING.md` into every session.

- `rdd-builder` authors code in the paths a task claims. Hooks:
  - `agentSpawn` and `userPromptSubmit` → `scripts/session-context.sh`: prints repo root, branch, HEAD SHA and `git status --short`. kiro-cli 2.34.0 skips `agentSpawn` under `--no-interactive`, so `userPromptSubmit` carries it there.
  - `preToolUse` (shell) → `scripts/guard-shell.sh`: exits 2 (blocks) on `git push`, `git reset --hard`, `git clean`, `push --force`, `wrangler deploy`, `wrangler pages deploy`, and `pkill`/`killall` (also after `sudo` or in a pipeline; kill only an exact PID the session started). Read-only git and `kill <pid>` are allowed.
  - `postToolUse` (write) → `scripts/post-write-check.sh`: after an edit under `app/` runs `npm --prefix app run typecheck`; under `engine/` runs its `typecheck` (or `test`) script if `engine/package.json` exists. 90 s timeout, silent on pass, last 20 lines on failure.
- `rdd-reviewer` is read-only: no write or code tool, shell limited to read-only git (`status/diff/log/show`), same Git-state hooks. It reviews a diff against the contract, the EARS requirements, and design.md sections 7 and 12.
## Kiro IDE 1.x hooks

Standalone files in the v1 schema (`"version": "v1"`, `hooks[]` with `name`, `trigger`, `matcher`, `action.type`, `action.command` or `action.prompt`; see https://kiro.dev/docs/hooks). They replace the 0.x `typecheck-on-save.kiro.hook` (`when`/`then` form), which Kiro IDE 1.x does not run; its `fileEdited` trigger maps to `PostFileSave`.

- `typecheck-on-save.json`: trigger `PostFileSave`, matcher `(^|/)app/src/.+\.tsx?$`, command `npm --prefix app run --silent typecheck 1>&2`, timeout 90 s. Output goes to stderr because the IDE sends stderr to the agent when a command exits non-zero; on success nothing is added.
- `contract-drift-check.json`: trigger `PostFileSave`, matcher `(^|/)docs/CONTRACT\.md$`, `agent` action. The prompt has the agent compare `docs/CONTRACT.md` with `.kiro/specs/rare-disease-detective/{requirements,design,tasks}.md` and `app/src/shared/contract.ts` (if present) and reply with a drift list. It forbids editing any file; fixes go through contract section 14.

Limits from the docs: file triggers fire only on changes made by the agent, not on manual saves in the editor (https://kiro.dev/docs/hooks/types, "File Create"). An `agent` action starts a new agent loop and uses credits; it cannot block.

## Steering added with these hooks

- `.kiro/steering/medical-data.md` (`inclusion: fileMatch`, `fileMatchPattern: ["engine/**", "functions/**"]`): medical data rules from contract sections 1, 10, 13 and design section 7; pulls in the contract with `#[[file:docs/CONTRACT.md]]`.
- `.kiro/steering/release-check.md` (`inclusion: manual`): type `#release-check` (or `/release-check`) to have the agent walk the deploy, incognito and submission checklist and report PASS / FAIL / NOT RUN per item.

## Safety

Why it is safe: every hook is a read-only check or a guard. None commits, pushes, deploys or edits repo files. The shell guard matches text patterns, so it catches mistakes; it is not a sandbox. Git and deploy steps stay in separate, authorized integration sessions (`docs/PROTOCOL.md` 6A).

Use (from the repo root, with `npm --prefix app ci` done once):

```sh
kiro-cli chat --agent rdd-builder
kiro-cli chat --agent rdd-reviewer "Review git diff origin/main...HEAD"
```
