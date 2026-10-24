---
inclusion: always
---

# Team steering: how we work in this repo

> Provenance: re-authored by Kiro on 2026-10-24 from a draft by Ian's assistant (commits 926bfee, c9c7c03).

This file points to the real rules; it does not replace them. Decisions and the live claim board are in `BRIEFING.md`. The step-by-step workflow is in `docs/PROTOCOL.md`. If anything here disagrees with those files, they win; stop and ask your human.

## Who does what

- Three humans (Ian, Peter, Jerry). Each has an assistant (planning and review) and a Kiro agent (authoring).
- Kiro authors all project code, tests and judge-facing files (README, `.kiro/` specs and steering, app copy, Kiro write-up). Assistants never write project code. `.kiro/` stays committed and is never gitignored.

## Before you edit

- Read `BRIEFING.md` and check its section 6 claim board. Do not assume what your human owns.
- Claim first. Edit only the paths claimed for your task; never two writers on the same files.
- Shared files (`BRIEFING.md`, `docs/CONTRACT.md`, `docs/KIRO_USAGE.md`, `.kiro/steering/`, manifests and lockfiles, app entry, deploy config) each have one named editor. Do not edit them unless you are that editor for this task.
- Topic-neutral work only until the topic is confirmed in `BRIEFING.md` sections 4–5. Do not invent product features or medical facts before then.
- Contract first: interfaces between modules follow `docs/CONTRACT.md`. Until it is agreed, use clearly labelled mock data.
- UI work follows the design method in `.kiro/steering/design.md`.

## Git discipline

- Start with a clean tree: `git status`, `git fetch origin`, `git pull --ff-only origin main`.
- Small, reviewed commits with meaningful English messages. Stage only claimed paths.
- No force-push, `reset --hard`, silent conflict overwrites or other destructive commands.
- If a push is rejected, stop, keep your commits and tell your human. Do not auto-rebase.
- Git actions need your human's approval, except Ian's scoped standing authorization (`docs/PROTOCOL.md` section 6A).

## Always

- English for all repo content.
- No secrets in the repo; use `.env` (gitignored) or hosting secrets.
- Report only real results. `NOT RUN` beats a made-up `PASS`.
- Kiro usage: report only what Kiro actually did, with time and evidence, to your human for the group chat. Ian's Kiro is the single editor of `docs/KIRO_USAGE.md`; nobody else edits it.
