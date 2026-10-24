---
inclusion: manual
---

# Release check

> Provenance: written by Ian's Kiro on 2026-10-24 (T21) from `BRIEFING.md` section 8 (submission checklist), `scripts/build-site.sh` (build and deploy steps), `docs/PROTOCOL.md` sections 6A and 9, and `BRIEFING.md` section 7 item 7 (incognito check). If they disagree with this file, they win.

Include this file with `#release-check` (or `/release-check`). Walk the list top to bottom. For each item, check the real state and report one line: `PASS` with the evidence (command and output, URL and status code, file path), `FAIL` with what is missing, or `NOT RUN` with the reason. Never mark an item PASS from memory or from a teammate's claim.

## Limits on what the agent may do

- Read, build and test freely. Do not commit, push, deploy or change repository settings unless Ian authorized that exact step in this session (`docs/PROTOCOL.md` section 6A).
- Deploy only after a real smoke test passes (`docs/PROTOCOL.md` section 6A, item 5).
- Making the repo public and submitting the SundAI form are Ian's personal actions. The agent only checks and reports them.
- The CLI agents' shell guard blocks `wrangler pages deploy` and `git push`. Run those only in a separate, authorized integration session.

## 1. Before deploy

- [ ] `git status` is clean and `git log -1` matches the `main` SHA you mean to release; `git fetch origin` shows `origin/main` at the same SHA.
- [ ] `npm --prefix app run typecheck` passes.
- [ ] Engine tests pass, if `engine/package.json` exists (`npm --prefix engine test`).
- [ ] `./scripts/build-site.sh` finishes with "Done. Built:" and no `WARNING ... /assets/` line.
- [ ] Local smoke test: `npx wrangler pages dev` from the repo root, then `/`, `/app/` and `/api/health` return 200.

## 2. Deploy (Ian-authorized step only)

- [ ] `npx wrangler login` is done on this machine (once).
- [ ] From the repo root: `npx wrangler pages deploy` (reads `wrangler.toml`: project `hackachusetts-2026`, output `dist/`, functions from `./functions`).
- [ ] Record the deployment URL and the Git SHA it was built from.

## 3. Live and incognito check

- [ ] `https://hackachusetts-2026.pages.dev/`, `/app/` and `/api/health` return 200 (show the `curl -sS -o /dev/null -w '%{http_code}'` output).
- [ ] Open the live URL in a private/incognito window: no login, the app opens with a demo example preloaded, the happy path completes, no console errors.
- [ ] The safety line and the HPO attribution with version are visible on results and on the exported brief.
- [ ] Status is `DEPLOYED_VERIFIED` only after the public URL itself was tested, not after the deploy command succeeded.

## 4. Submission checklist (BRIEFING.md section 8)

- [ ] Repo switched to **public**, license added (Ian's personal action; agent checks only).
- [ ] README: what it does, how to run, live link, video link, "Built at Sundai", HPO attribution and version.
- [ ] `.kiro/` committed (specs, steering, hooks).
- [ ] Kiro write-up finished from `docs/KIRO_USAGE.md`.
- [ ] Live demo works in a private/incognito window (section 3 above).
- [ ] Video < 3 min, public on YouTube or Vimeo.
- [ ] SundAI form: all members added, track selected, description, repo, live link, video link (Ian's personal action; agent checks only).
- [ ] Sundai project card created.

## 5. Report

End with the release record from `BRIEFING.md` section 11: final Git SHA, public repo URL, live demo URL, incognito smoke result, video URL, submission status, and every item still `FAIL` or `NOT RUN`.
