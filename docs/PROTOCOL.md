# Hackachusetts 2026 — Assistant × Kiro Agent Collaboration Protocol v4

**Updated:** 2026-10-24  
**Audience:** Ian + his Assistant (Claude) + Kiro; Peter + his Assistant (ChatGPT) + Kiro; Jerry + his Assistant + Kiro.  
**Status:** APPROVED — v4 approved by all three humans (Ian, Peter, Jerry) in the team chat at ~11:35 ET on 2026-10-24. This file lives at `docs/PROTOCOL.md`. Companion: [`BRIEFING.md`](../BRIEFING.md) v4 at the repo root.  
**Repository:** `https://github.com/Ian18858863/hackachusetts-2026`.

> **Read this first:** This v4 replaces the **fixed B0/B1 + Patch handoff + Integration-branch** workflow previously discussed for this hackathon. The new default is **claim → Kiro edits → Assistant reviews actual diff/evidence → QA → authorized human or Ian-only Kiro commit/push to shared main → Ian verifies demo**. The Campus Market fixed-patch workflow remains appropriate for that separate project; do not bring it into this six-and-a-half-hour hackathon without an explicit new team decision.

## 1. Three layers: Human / Assistant / Agent

| Layer | Responsible for | Must not |
|---|---|---|
| **Human** (Ian, Peter, Jerry) | Claims tasks; approves shared changes; confirms QA expectations; directly approves Git actions **or expressly grants a narrowly scoped standing authorization**; forwards state to group | Override another owner's file claim; force-push or erase work |
| **Assistant** (Claude / ChatGPT) | Reads briefing, contract, claims and Git; writes natural-language tasks; can direct Kiro through approved tools; independently reviews diffs, QA, interfaces and UI | Write/patch project code; fabricate evidence; bypass review; initiate Git actions beyond the human-approved authorization |
| **Kiro Agent** (IDE/CLI) | Authors/fixes project code, tests and submission artifacts in claimed paths; runs checks and reports evidence; may conduct **Ian-only, post-review Git operations under explicit standing authorization** | Self-claim overlapping paths; edit unapproved shared files; fabricate QA/Kiro usage; force-push; independently deploy |

Ian's Assistant **may call `kiro-cli` to send prompts to Kiro and read the results**. This is still an Assistant supervising a Kiro coding Agent, not Claude writing the code. No alternative AI coding agent may write the competition project code.

**Document authorship boundary:** An Assistant may draft **internal coordination materials** (`BRIEFING.md`, `docs/CONTRACT.md`, this protocol), which a designated human editor may submit after the team agrees. This is a planning-document exception, **not permission to author competition code**. **Kiro must write/edit all competition source code, tests and judge-facing deliverables** (README, `.kiro/steering/`, `.kiro/specs/`, Kiro methodology/usage write-up, public application copy). Keep genuine attribution and Kiro execution evidence. All judge-facing content must be in English. Ian's Kiro remains the sole serial editor of `docs/KIRO_USAGE.md` when it is a submitted evidence document.

## 2. One repo / one fast main / no formal B0-B1

**Repository:** `Ian18858863/hackachusetts-2026`  
**Former main SHA (historical):** `c9c7c030dd7e5ab8f6a913c42b761be18b954e76`. **New main SHA pushed by Ian's Assistant at 10:55 ET:** `c31e29feaeac861e3498fe65f53e6c571dd82618` (**verified** as `origin/main` by Ian's Assistant at 11:39 ET; still re-check `origin/main` before new tasks). No frozen B0/B1.  
**Default branch:** `main` for all three participants; **no required feature branches or Integration branch**.

- Every task records the **main SHA seen at start**. Its purpose is traceability, not a frozen baseline.
- Each person works in a separate **local clone/workspace**. For Ian's multiple concurrent Kiro sessions, use one distinct Git **worktree + distinct temporary branch per task/session**; Git normally does not allow the same `main` branch to be checked out in multiple worktrees. Never run two Kiro writers on the same dirty files, branch, or claimed paths. Ian serializes reviewed integrations into his clean `main` worktree.
- Before starting a new task: verify remote, current branch, `git status`, current remote main, and file claim. On a clean tree use `git fetch origin` + `git pull --ff-only origin main`. Do not pull blindly on dirty files.
- After Kiro finishes a small unit, the Assistant independently inspects the diff and actual tests/build; only approved claimed files may be staged. **Peter and Jerry require their human's explicit Git approval**. **Ian may rely on his human's written, revocable, scope-limited standing authorization** for Kiro to commit/push after Assistant review and genuine QA (see section 6A). Share updates about every 20–30 minutes when safe.
- If push is rejected due to someone else's newer commits: **stop**. Notify group, preserve commits, examine the latest remote changes. Authorized, reviewed reconciliation (and renewed QA) is required. **No** force-push, `reset --hard`, silent conflict overwrite, or automatic rebase with uncommitted changes. A short-lived topic branch/PR is a permitted escape hatch for conflicts or risky changes, not the routine route.
- Ian checks the latest remote `main` and **actually runs the full demo** at least hourly and at milestones; a pushed commit is not automatically a working integrated demo.

**Important difference from Campus Market:** No formal full-replacement Patch round-trips; Kiro edits live files and fixes its own work in response to natural-language Assistant findings. `git diff` / `git show` / actual execution are the review artifacts. If a user wants a temporary diff exported for remote review, it can be supplied as supplementary evidence, but is **not** a required precondition for each 20-minute checkpoint.

## 3. Claim-based division of work, not fixed job titles

The team's suggested initial allocation is:

| Person | Starting suggestion | Boundaries |
|---|---|---|
| **Ian** | Main demo frontend **and** backend, API integration, deployment, visual direction | Main app routes, server, root config; owns `.kiro/steering/design.md` |
| **Peter** | Topic-neutral `landing/` experience, English pitch, 3-minute video script, README template, Kiro usage write-up | **Separate landing path**; no change to Ian's app entry/routes without agreement |
| **Jerry** | After topic confirmation: domain engine, public data and tests including actual Kiro property-based testing | Own domain/data/tests paths, no API/visual global changes unilaterally |

The assignment can change. **An individual task/folder only has one editor at a time.** See the live claim table in `BRIEFING.md` section 6. A task marked `OPEN` is not actually assigned even if a recommended owner appears.

**Fast claim protocol:**

```text
[CLAIM] T## | Owner: Ian/Peter/Jerry | Paths: <exact paths>
Start main SHA: <SHA> | ETA: HH:MM ET | Dependencies: <none or contract>
```

Post the claim before work, confirm no overlap, and have Ian reflect it in `BRIEFING.md` via the one-editor process before substantive editing. If changing ownership, prior owner releases task and new owner claims it in the group. **Ownership is not acquired merely because a Kiro Agent started editing a file.**

**Shared-file owner lock:** One writer at a time for `BRIEFING.md`, `docs/CONTRACT.md`, `docs/KIRO_USAGE.md`, `package.json` / lockfiles, deployment config, root app entrypoint and `.kiro/steering/`. Any affected team member approves contract-breaking or stack-wide changes. Ian is default coordinator/sole shared-document editor; announce a delegated editor when needed.

## 3A. Existing 10:55 ET commit — provenance and remediation

Ian's Assistant reported that `c31e29feaeac861e3498fe65f53e6c571dd82618` was already pushed before v3 review (verified on `origin/main` at 11:39 ET). It adds `.kiro/steering/design.md` drafted by **Claude, not Kiro**, and a premature `docs/KIRO_USAGE.md` entry. **Do not hide this provenance and do not count the draft as Kiro-authored/used.**

- Preserve Git history; do **not** force-push, reset shared history or silently delete the commit.
- Ian claims a small remediation task. Ian's **Kiro** reads the Claude draft as an input, independently creates/revises `design.md` within the accepted visual direction, and reports its actual changes. Teammates review the final result. Kiro rewriting the draft does not change who authored the earlier committed version; record the chronology accurately.
- Ian's **Kiro** corrects the premature usage line so it reflects only a real Kiro action with time/evidence, or explicitly marks the original as a planning-only entry (not Kiro usage). Do not backdate or invent a Kiro action.
- Other Kiro sessions must not rely on the draft as an **approved** visual specification until the team publishes an accepted `[DESIGN UPDATE]` SHA.
- If the event rules leave any authorship ambiguity, obtain an organizer ruling rather than claiming guaranteed compliance.

## 4. One vision via Kiro Steering

Ian assigns **Kiro**, not Claude, to author the approved revision of `.kiro/steering/design.md`, starting from the existing disclosed draft if helpful. It should specify layout rhythm, typography, colors, interactions, motion, responsive breakpoints, accessibility and what the landing and demo should share visually.

1. Ian posts `[DESIGN UPDATE]` and the SHA containing a new approved `design.md`.
2. Peter and Jerry bring their clean local clones up to date **before** asking their Kiro to act on any affected UI files.
3. Kiro IDE/CLI project steering is available from `.kiro/steering/`; if a custom Agent does not include it, explicitly configure its steering resources or instruct it to read the file. Do not assume an unsynced file automatically exists on other machines.
4. Ian is final visual reviewer, but a new design requirement must not silently override an already claimed code area.

Kiro reference: https://kiro.dev/docs/steering/ . Do not claim a Steering score merely for proposing the file—record the real use after Kiro has used it.

## 5. Contract first, parallel after

Before the first end-to-end hookup, the API producer and consumers agree on `docs/CONTRACT.md`: endpoints, JSON examples, required/optional fields, status/errors, versions, upstream behavior and clear `demo/live` source labels.

- Ian is the default **single editor** of the document; Jerry and any other affected owner confirm the medical/data interface fields.
- Frontend may work against clearly labeled deterministic **mock responses**, without waiting for the backend to finish.
- Jerry may build pure data functions independently once the actual topic is confirmed.
- Breaking changes require an explicit `[CONTRACT CHANGE]` group message, approvals from affected owners, one designated editor and a pushed SHA **before dependent Agents change their interfaces**.
- Until the topic is finalized in `BRIEFING.md` sections 4–5, do **only topic-neutral work** (landing skeleton, deployment channel, README outline, storyboard template, shared visual primitives that do not assert unapproved claims).

## 5A. Contract timing vs. topic-neutral work

- **Before 12:30 ET:** Ian and impacted teammates agree on a **minimum viable versioned contract** if a topic has been selected; no dependent Kiro task invents final endpoints while the contract is unresolved. Ian is the one editor of `docs/CONTRACT.md`.
- While the topic is undecided, topic-neutral UI shell, deployment channel, README outline and video storyboard **may start after explicit claims and authorization**, without waiting for the contract. Such work must not assert an unapproved product identity or fake live data.
- There are **two different cadences**: task status/push updates every **20–30 minutes when appropriate**, and Ian's **actual integrated demo smoke at least hourly and at the 12:30 / 14:30 / 16:30 milestones**. They are not interchangeable.

## 6. Per-task workflow, deliberately lightweight

```text
Human claims a non-overlapping task in group
        ↓
Human's Assistant reads BRIEFING + CONTRACT + design steering + latest Git
        ↓
Assistant sends specific natural-language task to its Kiro Agent
        ↓
Kiro authors/edits only claimed project files and runs checks
        ↓
Assistant inspects git diff / git show + genuine QA results + visual output
        ↓
If deficient: Assistant describes what to fix → SAME Kiro fixes the files
        ↓
Git actor follows per-human authorization: Peter/Jerry approve manually; Ian's Kiro may act under scoped standing approval after review + QA
        ↓
Human posts full SHA + task status → Ian checks whole demo at checkpoints
```

Each **Assistant task** must state: task ID, human owner, exact allowed file scope, current main SHA and branch, objective, dependencies, acceptance criteria, build/test commands (when known), no-secret/no-fake-data rules, deliverable = working files + diff/test evidence, and restrictions on shared files/Git actions. **No code implementations or replacement code in the Assistant's response.**

**Review statuses and what they mean:**

| Status | Meaning |
|---|---|
| `CHANGES_REQUESTED` | Assistant found an issue; send natural-language fix to Kiro, no commit |
| `REVIEWED` | Assistant independently inspected diff and evidence; **not** proof that QA, commit or push happened |
| `QA_PASS` / `QA_FAIL` | Actual tests/visual checks for that current local state; identify commands and failures |
| `PUSHED` | Owner reports verified remote `main` SHA; for Ian, authorized Kiro may perform the check and Ian remains accountable |
| `DEMO_VERIFIED` | Ian ran current integrated main and checked it works at specified SHA |
| `DEPLOYED_VERIFIED` | Actual public URL tested successfully, not just deployment command succeeded |
| `BLOCKED` | Ownership, contract, Git, dependency, secrets, or QA prevents safe advance |

The Assistant may view/operate `kiro-cli`, but it must not itself edit source files or replace Kiro's code. Kiro cannot self-approve an unsafe action. Testing evidence must be real; `NOT RUN` is preferable to fabricated `PASS`.

## 6A. Ian-only standing Git authorization — approved exception after human ratification

Ian has granted an explicit standing authorization: his Assistant may direct Ian's **Kiro** via `kiro-cli` to commit/push **only Ian-claimed paths**, following these gates. This exception was **ratified by the three humans with this protocol at ~11:35 ET** and can be revoked by Ian at any time.

1. Each parallel Kiro task has its own `T##a/T##b` subtask ID, claimed **non-overlapping paths**, distinct worktree and temporary local branch. Document claims in group/board before modification.
2. Kiro alone authors code. Ian's Assistant reviews the actual diff/file scope and logs `REVIEWED` (or sends natural-language fixes); real applicable tests/build and integration QA must pass, with results preserved. **Kiro's own success message alone is not review or proof of QA.**
3. Only after both gates, Ian's Assistant may instruct Kiro to integrate the approved worktree **one subtask at a time into a clean, updated local main**, verify the resultant diff, then stage only approved paths and commit/push under Ian's standing consent. Do not bypass the gate by using an automated commit/push hook.
4. Before each push, verify latest `origin/main` and ancestry. If another member advanced main, use a safe reviewed fast-forward/reconciliation path, rerun impacted QA, or stop for human resolution. **No force-push, destructive reset, silent conflict overwrite or unreviewed auto-rebase.**
5. Shared-file edits (BRIEFING, CONTRACT, KIRO_USAGE, root config, steering) require the **specific claim and approval** of affected teammates; the standing permission does not override this. **Confirmed stack (~11:35 ET):** `app/` is Vite + React + TypeScript served under `/app`; backend APIs are Cloudflare Pages Functions in the repo-root `functions/` folder, one file per endpoint (`functions/api/<name>.ts`), each claimed separately; deployment to Ian's Cloudflare Pages runs from the repo root, with `scripts/build-site.sh` building `landing/` into `dist/` and `app/` into `dist/app/`; Peter chooses the landing stack (same stack recommended) and landing must output to `landing/dist` via `npm run build`. **Deployment pre-authorization:** Ian pre-approved his Kiro deploying the demo to his Cloudflare Pages **only after a real smoke test passes**. Making the repo public and submitting the form remain Ian's personal actions and are not included in any Kiro permission.
6. After push, Ian posts the real **full remote SHA**, associated task IDs, test results and file paths. Peter and Jerry still authorize their own Git actions personally.

If any prerequisite fails, mark `BLOCKED`; preserve branches/worktrees and existing history. No action counts as "approved" solely because it happened under automation.

## 7. How three independent Assistants actually synchronize

**They do not share memory or chat history.** Synchronization is mediated through **the three humans**, the group chat, and commits in the single GitHub repo.

**Every 20–30 minute checkpoint after review/push:** the owner posts a message like:

```text
[TEAM CHECKPOINT] 2026-10-24 HH:MM ET
Owner / Task: Peter / T04
Paths: landing/ (or agreed exact route)
Review: REVIEWED (diff scope, visual state, tests actually checked)
QA: PASS|FAIL|NOT_RUN; command/evidence: ...
Remote main SHA: <FULL 40-CHAR SHA> | NOT_PUSHED
Contract or shared file change: NONE|<details>
Next: ... | ETA: ... | Blocker: ...
```

**The relay is:**

1. Ian, Peter or Jerry forwards their own Assistant's review findings and Kiro test evidence into the group. `REVIEWED` means **only reviewed**, never automatically committed.
2. After **human-approved** commit/push (or **Ian's reviewed Kiro push under his standing consent**), the owner posts the actual remote main SHA. The other humans bring their own clean working trees current before new dependent work.
3. Each human forwards important group messages into **their own Assistant chat**. Those Assistants compare the new shared file states/commit SHA and revise their next task instructions. Acknowledgment in one chat does not automatically update the other two.
4. Ian reports `[MAIN SMOKE]` with the exact SHA and proof after integrated QA, plus `[DEPLOYED]` with the tested public URL when applicable.
5. In a conflict, stop the affected task and post `[BLOCKED]`. Assign one human/Kiro owner to fix. Preserve local and remote history.

**Long-lived coordination:** `BRIEFING.md` = final decisions and claim board; `docs/CONTRACT.md` = interface; `docs/KIRO_USAGE.md` = genuine Kiro-feature log; GitHub SHA = actual committed state; group chat = current coordination signals. Do **not** force frequent commits to `BRIEFING.md` merely to mirror every assistant conversation.

## 8. Real Kiro usage evidence (judging)

Keep an accurate running log: `YYYY-MM-DD HH:MM ET | Human | Kiro feature | Exact action | Benefit/result | Evidence path/commit`.

- Ian: steering and CLI/Kiro; optional safe Hooks or deployment checks when actually used.
- Peter: Kiro Specs for landing/requirements and narrative/UI artifacts, as appropriate; **do not invent** Specs for the sake of checking a box.
- Jerry: property-based tests (actual generated inputs/assertions), data validation, and approved MCP source work if actually used.
- No one may claim a feature as used if they only planned to use it. Record real failures and outcomes honestly; do not fake evidence. Hooks must never silently push or deploy.
- Everyone sends one genuine usage line to group when completed; Ian's Kiro serially appends to `docs/KIRO_USAGE.md` and pushes. This preserves the requested centralized usage file without three people writing it simultaneously.

## 9. Stop-the-line safety and release scope

- Never commit API keys, tokens, personal medical information, patient records, or unlicensed datasets.
- Do not pretend a live API worked if only mocks were used. Demo data must be clearly labeled. If Rare Disease Detective is selected, explanations are **discussion support, not diagnosis**; don't invent phenotype IDs or diagnostic probabilities.
- If shared `main` becomes broken, Ian documents which SHA last passed an actual demo. Protect existing commits and choose a human-approved minimal fix/recovery strategy—**not a destructive history rewrite**.
- At **17:30 ET feature freeze**, stop new scope; only critical bug fixes, deployment reliability, recording and submission. Avoid changing framework/database/provider at the last minute.
- Submission gate: public repo with license and `.kiro/`, README, HPO attribution if relevant, free working demo, incognito check, <3-minute public video, Kiro methodology write-up, Sundai project card and event submission before 20:00 ET (target 19:00).

## 10. Checkpoints (ET, per original team briefing)

| Time | Expected proof |
|---|---|
| 11:30 | Development starts only with explicit non-overlapping claims; topic-neutral work can proceed while topic undecided |
| 12:30 | Contract and runnable skeleton |
| 14:30 | End-to-end happy path |
| 16:30 | Real reachable public deployment |
| 17:30 | Feature freeze |
| 18:00 | Record truthful <3-minute demo |
| 19:00 | Target submission |
| 20:00 | Hard deadline |

## 11. Steps to adopt this v4 (not coding tasks)

Steps 1 to 3 are **DONE (~11:35 to 11:45 ET)**. Steps 4 and 5 remain standing rules.

1. **DONE.** Ian, Peter and Jerry read both v4 files and confirm **which claims they accept**, shared-main discipline and single file owners in group.
2. **DONE.** Ian or the designated editor reviews the difference between the existing GitHub `BRIEFING.md` and this v4 draft; after three human approvals, uses the approved, safe document update process to commit it on `main`. Do not overwrite intervening teammates' edits.
3. **DONE.** Ian checks/publishes the **actual current full `origin/main` SHA** (verified at 11:39 ET: `c31e29feaeac861e3498fe65f53e6c571dd82618`) and explicitly discloses/claims the steering + usage-log remediation.
4. **Standing rule.** Explicitly claim work before each Agent task. Next-stage prompts can be sent to all three Assistants in parallel, but each Assistant/Human decides its own Kiro tasks within currently claimed paths.
5. **Standing rule.** **This file alone is not authorization for an Agent to start modifying the repository.**

### Assistant acknowledgment (reply to your human, no Kiro task yet)

```text
I read BRIEFING v4 and Assistant–Agent Protocol v4.
My human: Ian / Peter / Jerry.
I understand that Kiro—not the Assistant—authors project code.
I understand the shared main + task-claim + diff-review workflow.
The previous B0/B1, Patch handoff, and Integration branch rules no longer apply to this hackathon.
I know my current proposed tasks, shared-file exceptions and pending decisions.
I understand Ian's conditional, scoped standing Git authorization; Peter/Jerry still require direct human approval.
I understand the disclosed Claude-authored steering draft / premature usage-log entry and truthful Kiro remediation.
No coding task was issued by reading this document alone.
```
