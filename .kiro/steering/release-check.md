---
inclusion: manual
---

# Release check

> Provenance: written by Ian's Kiro on 2026-10-24 (T21) from `BRIEFING.md` section 8 (submission checklist), `scripts/build-site.sh` (build and deploy steps), `docs/PROTOCOL.md` sections 6A and 9, and `BRIEFING.md` section 7 item 7 (incognito check), contract sections 7.1, 7.2 and 13, requirements R6.6, R8, R9.1 and R10, and `.kiro/steering/design.md` sections 7 and 12. If they disagree with this file, they win.

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
- [ ] Local smoke test: `npx wrangler pages dev` from the repo root, then `/` and `/app/` return 200. If the end-to-end smoke script from spec task 5.1 exists under `scripts/`, run it instead of the manual checks below and report its output.
- [ ] `GET /api/health` returns 200 with `version: "0.1"`, `source` and `llm.binding`. Report the `llm.binding` value: `false` means non-demo extraction returns 503 `LLM_UNAVAILABLE` (contract section 7.1).
- [ ] `POST /api/extract` with the exact `demo-dmd` narrative and `"caseId": "demo-dmd"` returns 200 with `source: "demo"` and the prepared terms (contract sections 7.2 and 9.1; R10.3).

## 2. Deploy (Ian-authorized step only)

- [ ] `npx wrangler login` is done on this machine (once).
- [ ] From the repo root: `npx wrangler pages deploy` (reads `wrangler.toml`: project `hackachusetts-2026`, output `dist/`, functions from `./functions`).
- [ ] Record the deployment URL and the Git SHA it was built from.

## 3. Live and incognito check

- [ ] `https://hackachusetts-2026.pages.dev/`, `/app/` and `/api/health` return 200 (show the `curl -sS -o /dev/null -w '%{http_code}'` output). Repeat the `/api/health` field check and the `demo-dmd` `POST /api/extract` check from section 1 against the live URL.
- [ ] Open the live URL in a private/incognito window: no login, the happy path completes, no console errors.
- [ ] The landing page's main call to action opens `/app/?demo=demo-dmd` with that demo case preloaded (R10.6).
- [ ] The demo label `Demo case (synthetic narrative from phenopacket-store <id>)` appears near the notes, the results, the brief and the phenopacket export (R10.2, R6.6).
- [ ] The safety line `Decision support, not a diagnosis. These are possible matches to discuss with a doctor.` is visible in body size on every result screen (ranking, questions, trials) and on the exported brief (R9.1, design section 7).
- [ ] The HPO attribution with version is in the footer and the brief (R8.1).
- [ ] Each credit from contract section 13 appears where its data appear: Monarch on the ranking, Orphanet when Orphanet data show, ClinicalTrials.gov on trials, phenopacket-store (`phenopacket-store, BSD-3-Clause.`) on demo data, PubCaseFinder only if it is enabled (R8.2).
- [ ] Status is `DEPLOYED_VERIFIED` only after the public URL itself was tested, not after the deploy command succeeded.

## 3b. Design definition of done (`.kiro/steering/design.md` section 12)

Report PASS / FAIL / NOT RUN for each item. Do not report the release as ready while any of these is FAIL; list every NOT RUN item in the report.

- [ ] Screenshots at 1440×900, 1000×600 and 375×812 of landing, proof moment and output, reviewed by eye.
- [ ] Scrolled top to bottom at each size: no stalls, no layout shift, no horizontal scroll, no console errors.
- [ ] Happy path completed with keyboard only; focus always visible.
- [ ] Reduced-motion mode checked; content complete and static.
- [ ] Contrast checked with a tool for text, accent and focus ring.
- [ ] Loading, empty and error states triggered on purpose and screenshotted.
- [ ] Every number has a source or a "demo data" label.
- [ ] What was not checked (for example real iPhone, Safari) is written down as NOT RUN, not claimed to work.

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
