# QA: accessibility, responsive and definition of done (T25)

- **Date:** 2026-10-24, 14:35–14:50 ET
- **Target:** production, https://hackachusetts-2026.pages.dev/app/ (deploy `cf07006`; repo `main` at `6188c11` when checked)
- **Case:** `/app/?demo=demo-npc1` (synthetic demo case from phenopacket-store `PMID_27900365_patient`)
- **Browser:** headless Chrome 155.0.8059.85 on macOS, driven over the Chrome DevTools Protocol (device metrics override, deviceScaleFactor 1; touch emulation at 375 px). One warm-up pass at 1440×900 before the recorded pass.
- **Tools:** axe-core 4.10.2 from `https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js`, rule tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice`. The QA scripts lived outside the repo (`/tmp/t25qa/*.mjs`) and are not committed; their raw JSON output is in [`docs/qa/`](qa/).
- **Scope:** spec tasks 3.8, 5.2, 5.3; design steering section 12; requirements R11.1–R11.6 and R12.1–R12.6. No app code was changed.

## Summary

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Screenshots of all five steps at 1440×900, 1000×600, 375×812 | PASS | 15 screenshots, [section 1](#1-screenshots) |
| 2a | No horizontal page scroll, all steps, all sizes, scrolled top to bottom | PASS | `scrollWidth == clientWidth` in all 15 views |
| 2b | One `<h1>` per view | PASS | exactly 1 `h1` in all 15 views |
| 2c | No console errors | PASS | 0 errors or exceptions in every run |
| 2d | No layout shift | PASS (one tiny shift) | CLS 0.0008 once on matches and brief at 1440×900 |
| 3 | Keyboard-only happy path, focus visible | PASS, with 2 issues | [section 3](#3-keyboard-only-happy-path); focus lost after answering a question (S1) |
| 4 | `prefers-reduced-motion: reduce` | PASS | 0 running animations; same text length as with motion |
| 5 | axe scan of every step at every size | PASS for critical and serious; 2 moderate rules on matches | [section 5](#5-automated-accessibility-scan-axe-core) |
| 6 | Contrast (axe `color-contrast`) | PASS for the nodes axe could decide; up to 61 nodes "incomplete" on matches | [section 6](#6-contrast) |
| 7 | Loading, empty, error and offline states triggered on purpose | PASS | 10 state screenshots, [section 7](#7-loading-empty-error-and-offline-states) |
| 8 | Safety line, demo labels, attribution footer | PASS, with 1 issue | HPO version shows "unknown" (S2) |
| 8b | Tap targets ≥ 44×44 px (steering, R12.5) | FAIL in places | [section 8b](#8b-tap-targets-at-375812) |
| 9 | Not checked | listed | [section 9](#9-not-checked) |

## 1. Screenshots

Viewport screenshots (first screen of each step, JPEG quality 78), all from the recorded pass after the demo case loaded from `/app/?demo=demo-npc1`.

| Step | 1440×900 | 1000×600 | 375×812 |
|---|---|---|---|
| Notes | [1440x900-notes.jpg](qa/1440x900-notes.jpg) | [1000x600-notes.jpg](qa/1000x600-notes.jpg) | [375x812-notes.jpg](qa/375x812-notes.jpg) |
| Features | [1440x900-features.jpg](qa/1440x900-features.jpg) | [1000x600-features.jpg](qa/1000x600-features.jpg) | [375x812-features.jpg](qa/375x812-features.jpg) |
| Possible matches | [1440x900-matches.jpg](qa/1440x900-matches.jpg) | [1000x600-matches.jpg](qa/1000x600-matches.jpg) | [375x812-matches.jpg](qa/375x812-matches.jpg) |
| What to check next | [1440x900-questions.jpg](qa/1440x900-questions.jpg) | [1000x600-questions.jpg](qa/1000x600-questions.jpg) | [375x812-questions.jpg](qa/375x812-questions.jpg) |
| Brief | [1440x900-brief.jpg](qa/1440x900-brief.jpg) | [1000x600-brief.jpg](qa/1000x600-brief.jpg) | [375x812-brief.jpg](qa/375x812-brief.jpg) |

Reviewed by eye (by the agent, from the image files):

- **Proof moment above the fold at 1000×600: PASS.** The lead candidate card ("Niemann-Pick disease, type C1", "Strong overlap. 6 of 12 present features…", "6 of 12 features described") is visible in the first screen.
- At 375×812 the step navigation scrolls sideways inside its own box ("What to check n…" is cut at the edge) and keeps the current step in view. This is the intended design (StepNav), not page scroll.
- Demo load to Features step: about 525 ms at each size (`demoLoadMs` in [pass-report.json](qa/pass-report.json)).

## 2. Horizontal scroll, h1, console, layout shift

Method: after each view was ready, the script scrolled from top to bottom in steps of 80 % of the viewport (120 ms apart), recorded the largest `document.documentElement.scrollWidth`, counted `h1` elements, and collected console errors and `layout-shift` entries.

| Size | Notes | Features | Matches | Questions | Brief |
|---|---|---|---|---|---|
| 1440×900 | 1440/1440, h1=1 | 1440/1440, h1=1 | 1440/1440, h1=1 | 1440/1440, h1=1 | 1440/1440, h1=1 |
| 1000×600 | 1000/1000, h1=1 | 1000/1000, h1=1 | 1000/1000, h1=1 | 1000/1000, h1=1 | 1000/1000, h1=1 |
| 375×812 | 375/375, h1=1 | 375/375, h1=1 | 375/375, h1=1 | 375/375, h1=1 | 375/375, h1=1 |

(max scrollWidth / clientWidth.) The h1 texts are "Describe what you have noticed", "Check the features we found", "Possible matches to discuss", "What to check next", "Specialist brief".

- Console: 0 errors, 0 exceptions, 0 error log entries in every run (pass, keyboard, states).
- Layout shift: one entry of 0.0008 at 1440×900 on matches (t≈4.6 s) and on brief (t≈9.4 s), source `DIV._end_ce6u8_64`. Far under the 0.1 "good" threshold and not visible; recorded as nit N3. No other shifts.

## 3. Keyboard-only happy path

Method (1440×900, fresh storage, `/app/`): only `Tab`, `Shift+Tab` and `Enter` key events sent through `Input.dispatchKeyEvent`. After every key press the script read `document.activeElement`, whether it matches `:focus-visible`, its computed outline, and the outline colour's contrast against the nearest opaque background. Raw log: [keyboard-report.json](qa/keyboard-report.json).

| Step | Keys | Tab order (focused elements, in order) | Result |
|---|---|---|---|
| Notes → demo | Tab ×10, Enter | Skip to content → logo link → nav Notes → Features → Possible matches → What to check next → Brief → notes textarea → "Find the features" → demo case "A 54-year-old with worsening memory…" | `#/features` loaded; focus moved to `main#main` |
| Features → matches | Tab ×42, Enter | 13 quote marker buttons ("Feature 1: Prolonged neonatal jaundice, present. Go to this feature" …) → per term: Present/Not present radio, "Remove feature n" (13 pairs) → "Search features" → "Add as" radio → "See possible matches" | `#/matches` loaded, ranking shown; focus on `main` |
| Matches → questions | Shift+Tab ×3, Enter | Prepare brief → nav Brief → nav What to check next | `#/questions` loaded; focus on `main` |
| Questions: answer one | Tab ×1, Enter | "Yes" for HP:0001249 Intellectual disability | Question shows "Recorded as present"; term stored as `observed`; re-rank started ("Updating the ranking with your answers"). **Focus fell back to `<body>`** (S1) |
| Questions → brief | Shift+Tab ×1, Enter | Prepare brief | `#/brief` loaded; focus on `main` |
| Brief → export | Tab ×2, Enter | "Print or save as PDF" → "Export phenopacket" | Downloaded `phenopacket-rdd-demo-npc1-20261024T183847Z.json` |

- **Focus visible: PASS.** All 59 focused controls matched `:focus-visible` with `outline: solid 2px rgb(43, 85, 192)`. Ring contrast against the background: 6.64:1 on white, lowest 4.71:1 on the grey notes panel (`--focus` on the quote markers). All ≥ 3:1.
- **Visual order: PASS.** Tab order follows reading order on every step.
- **Export content:** `phenopacketSchemaVersion` "2.0"; 14 features (13 from the demo plus the "Yes" answer), 1 with `excluded: true`; no `diseases` or `interpretations`; `subject.id` "DEMO-synthetic-demo-npc1"; `externalReferences` says "DEMO DATA … Not a real patient." The HP resource `version` is "unknown" (S2).
- Screenshots with focus: [keyboard-1-notes-demo-focus.jpg](qa/keyboard-1-notes-demo-focus.jpg), [keyboard-2-features-see-matches-focus.jpg](qa/keyboard-2-features-see-matches-focus.jpg), [keyboard-3-matches-nav-questions-focus.jpg](qa/keyboard-3-matches-nav-questions-focus.jpg), [keyboard-4-questions-yes-focus.jpg](qa/keyboard-4-questions-yes-focus.jpg), [keyboard-4b-questions-answered.jpg](qa/keyboard-4b-questions-answered.jpg), [keyboard-6-brief-export-focus.jpg](qa/keyboard-6-brief-export-focus.jpg).
- The print dialog ("Print or save as PDF") was not opened by keyboard; headless Chrome has no print dialog. NOT RUN.

## 4. Reduced motion

Method (1440×900): `Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce` (confirmed by `matchMedia(...).matches === true`). For each step the script changed the route, sampled `document.getAnimations()` after 60 ms (when the view dissolve and headline sharpen would run) and again after the view was ready, then compared `main.innerText.length` with a no-preference run.

| Step | Running animations, reduce (60 ms / settled) | Running animations, no-preference (60 ms) | Text length reduce / no-preference |
|---|---|---|---|
| Notes | 0 / 0 | 4 (`color` transition, `_dissolve`, `_sharpen`) | 1835 / 1835 |
| Features | 0 / 0 | 4 | 3410 / 3410 |
| Matches | 0 / 0 | 4 | 11326 / 11326 |
| Questions | 0 / 0 | 4 | 4700 / 4700 |
| Brief | 0 / 0 | 4 | 10482 / 10482 |

**PASS:** no movement and identical content. Screenshots: [reduced-motion-1440x900-matches.jpg](qa/reduced-motion-1440x900-matches.jpg), [reduced-motion-1440x900-brief.jpg](qa/reduced-motion-1440x900-brief.jpg). The loading spinner was not sampled under reduced motion (every view was already cached by then). NOT RUN for the spinner.

## 5. Automated accessibility scan (axe-core)

axe-core 4.10.2 injected through `Runtime.evaluate` into each of the 15 views after it was ready. Full results per view: `sizes.<size>.<step>.axe` in [pass-report.json](qa/pass-report.json).

| Impact | Count | Rule | Where | Selector |
|---|---|---|---|---|
| critical | 0 | — | — | — |
| serious | 0 | — | — | — |
| moderate | 1 node | `heading-order` (heading levels should only increase by one) | Possible matches, all 3 sizes | `._lead_10t7p_58 > ._group_10t7p_336 > h4` (an `h4` inside the lead candidate card, after an `h2`) |
| moderate | 2 nodes | `landmark-complementary-is-top-level` (aside inside another landmark) | Possible matches, all 3 sizes | `._others_10t7p_450` ("Also worth discussing" column), `._notes_10t7p_841` |
| minor | 0 | — | — | — |

Notes, Features, What to check next and Brief: 0 violations at every size. axe does not cover everything (for example meaning, focus order or screen reader output); section 3 covers the keyboard part by hand.

## 6. Contrast

From axe's `color-contrast` rule (WCAG 2 AA, 4.5:1 body, 3:1 large text):

- **Violations: 0** in all 15 views.
- **Incomplete** (axe could not decide, usually because of overlapping or semi-transparent backgrounds): notes 1–3, features 2–9, matches 57–61, questions 0–1, brief 0–1 nodes depending on size. These nodes were not checked with another tool. Partly NOT RUN (S4).
- Focus ring: 6.64:1 on white, 4.71:1 lowest (section 3). Ring colour `rgb(43, 85, 192)`.

## 7. Loading, empty, error and offline states

All at 1440×900 on production. Raw output: [states-report.json](qa/states-report.json).

| State | How it was triggered | What the app showed | Screenshot | Result |
|---|---|---|---|---|
| Loading, extraction | Own non-demo text, 3 s added network latency | Button "Reading the notes" (busy), textarea read-only, live note "Matching phrases to medical features. This can take up to 20 seconds." | [state-loading-extract.jpg](qa/state-loading-extract.jpg) | PASS (R11.1) |
| Error 422, no features | Text "We went to the park on Sunday. The weather was sunny and we had sandwiches for lunch." (written for this test, no symptoms) | `/api/extract` → **422**. "No features found in these notes … add features by hand", button "Add features by hand", "HTTP 422 · NO_TERMS_FOUND"; text kept (85 characters, counter "7,915 of 8,000 characters left") | [state-error-422-no-features.jpg](qa/state-error-422-no-features.jpg) | PASS (R2.9) |
| Loading, ranking | Demo case, "Falls" marked not present, 4 s latency, then Possible matches | Skeleton of the lead card and side column at final size, step text "Matching 11 present features with known conditions", `aria-busy=true` | [state-loading-matches.jpg](qa/state-loading-matches.jpg) | PASS (R11.1, R4.2) |
| Offline on matches | `Network.emulateNetworkConditions { offline: true }` (`navigator.onLine` false) | Banner "You are offline. Your case is saved in this browser. Actions that need the network are paused until you reconnect." Results stay | [state-offline-matches.jpg](qa/state-offline-matches.jpg) | PASS (R11.5) |
| Offline, after a change | While offline: "Falls" set back to present, then matches | "Offline. The ranking updates when you reconnect"; previous results kept; 13 terms still in `localStorage`. Back online: re-ranked by itself | [state-offline-matches-after-change.jpg](qa/state-offline-matches-after-change.jpg) | PASS |
| Error 504, ranking | `/api/rank` intercepted with `Fetch.fulfillRequest`: 504 and the contract body `UPSTREAM_TIMEOUT`, `retryable: true` (simulated in the browser, the server was not failing) | "These results are for the earlier features", "A data service is slow right now", the server message, "Try again", "Technical details"; earlier results kept below | [state-error-504-rank.jpg](qa/state-error-504-rank.jpg) | PASS (R11.3) |
| Empty, trials | Chose "Ichthyosis-hepatosplenomegaly-cerebellar degeneration syndrome" (ORPHA:2274) in "Show studies for"; `/api/trials` returned `studies: []`, `total: 0` (also checked with curl at 14:38 ET) | "No recruiting studies found", plain explanation, link "search ClinicalTrials.gov for …" (opens in a new tab), credit line | [state-empty-trials.jpg](qa/state-empty-trials.jpg) | PASS (R7.2) |
| Empty, features | Fresh storage, `#/features` | "No notes yet", actions "Write the notes", "Try a demo patient", manual feature search | [state-empty-features.jpg](qa/state-empty-features.jpg) | PASS |
| Empty, matches | Fresh storage, `#/matches` | "No present features to match yet", "Review the features"; trials "Studies appear after matching" | [state-empty-matches.jpg](qa/state-empty-matches.jpg) | PASS |
| Empty, brief | Fresh storage, `#/brief` | "The brief needs at least one feature", "Add notes" | [state-empty-brief.jpg](qa/state-empty-brief.jpg) | PASS |

Not triggered: a real upstream failure on the server (the demo-cache fallback path of R11.2), 413 text too long, 503 `LLM_UNAVAILABLE`, and the questions and brief error states. NOT RUN.

## 8. Safety framing, demo labels, attribution

Checked by text search of `document.body.innerText` in all 15 views ([pass-report.json](qa/pass-report.json), `facts`):

| Item | Notes | Features | Matches | Questions | Brief |
|---|---|---|---|---|---|
| "Decision support, not a diagnosis. These are possible matches to discuss with a doctor." | footer | footer | header + footer | header + footer | header + inside the brief + footer |
| "Demo case (synthetic narrative from phenopacket-store PMID_27900365_patient)" | yes | yes | yes | yes | yes, plus "Demo data, not a real patient." in the brief |
| HPO attribution "This product uses the Human Phenotype Ontology (version …)" | yes | yes | yes | yes | yes |
| Monarch credit | — | — | yes | yes | yes |
| Orphanet credit | — | — | yes | yes | yes |
| ClinicalTrials.gov credit | — | — | yes | — | yes |
| phenopacket-store, BSD-3-Clause | yes | yes | yes | yes | yes |
| Any "nn%" on screen | none | none | none | none | none |

- **PASS** for R9.1, R10.2 and R8.2: the safety sentence is in body size under the h1 of every result screen and in the brief; demo labels are present wherever the demo case appears.
- **Issue S2:** the HPO version reads "unknown" everywhere ("This product uses the Human Phenotype Ontology (version unknown)") and in the phenopacket's HP resource. The contract allows "unknown" while open question 6 is open, but the HPO licence asks for the version, and every demo case records its release (`2025-11-24` for demo-npc1).

### 8b. Tap targets at 375×812

Visible interactive elements smaller than 44 px in either dimension ([tap-report.json](qa/tap-report.json)):

| Step | Element | Size (px) |
|---|---|---|
| Features | Quote marker buttons `button._footnote_…` ("Feature n: … Go to this feature"), 13 | 24×24 |
| Features | Present / Not present radios (`[data-testid^=term-keep-]`, `[data-testid^=term-absent-]`), 13 pairs, and the "Add as" radios | 94–120 × 36 |
| Brief | Candidate source links "OMIM", "Monarch", "Orphanet" (13) | 31–52 × 18 |
| Matches, brief | Trial title links `a._studyLink_…` | ~300 × 43 |
| All | Nav "Notes", "Brief" | 37×44, 31×44 |
| All | Footer link https://hpo.jax.org (inline in text) | 110×20 |

These pass WCAG 2.2 AA 2.5.8 (24×24 minimum or inline exception) but fail the steering and R12.5 target of 44×44 (S3).

## 9. Not checked

- Real devices and other engines: iPhone/iOS Safari, Android Chrome, desktop Safari, Firefox, Edge. Only headless Chrome 155 with device emulation was used.
- Screen reader audio (VoiceOver, NVDA): `aria-live` announcements were not listened to.
- Print output: the one-page A4/Letter print of the brief and the print dialog (headless).
- Contrast of the axe "incomplete" nodes (section 6) with a second tool.
- Zoom to 200 % and text spacing (WCAG 1.4.4, 1.4.12); Windows high contrast / forced colours.
- Touch gestures and the on-screen keyboard on a phone (modal above keyboard).
- Keyboard path at 1000×600 and 375×812 (only 1440×900).
- Landing page (`/`, Peter's T04) and its call to action; only the app was checked.
- Server-side demo-cache fallback on a real upstream failure (R11.2), 413 and 503 errors (section 7).
- Performance (frame rate, long tasks) beyond the absence of stalls while scripted scrolling.

## Issues found

Prioritised. No blockers were found.

**Blocker**

- None.

**Should-fix**

- **S1. Focus is lost after answering a question.** Step: What to check next, press Enter on "Yes" (`[data-testid="answer-yes-HP:0001249"]`). The Yes/No buttons are replaced by "Recorded as present" and "Undo", and `document.activeElement` becomes `<body>`. Keyboard and screen reader users lose their place. Move focus to the "Undo" button or the question item (`[data-testid="question-HP:0001249"]`). R12.1.
- **S2. HPO version shows "unknown".** Footer, brief and phenopacket HP resource `metaData.resources[0].version`. The HPO licence asks for the version; demo-npc1 is on HPO `2025-11-24`. Contract open question 6. R8.1.
- **S3. Tap targets under 44×44 px at 375×812.** Features: quote markers `button._footnote_*` 24×24 and status radios `[data-testid^=term-keep-]` / `[data-testid^=term-absent-]` 36 px high; Brief: source links "OMIM", "Monarch", "Orphanet" 18 px high. R12.5, steering section 9.
- **S4. Contrast not fully verified.** axe reported 57–61 "incomplete" `color-contrast` nodes on Possible matches (and up to 9 on Features). Check them with a second tool before submission. R12.2.

**Nit**

- **N1. Heading order on Possible matches.** `._lead_10t7p_58 > ._group_10t7p_336 > h4` follows an `h2` (axe `heading-order`, moderate). Use `h3`.
- **N2. Nested complementary landmarks on Possible matches.** `aside._others_10t7p_450` and `aside._notes_10t7p_841` sit inside `main` (axe `landmark-complementary-is-top-level`, moderate). Use `section` or `div`.
- **N3. Tiny layout shift.** CLS 0.0008 from `DIV._end_ce6u8_64` on matches and brief at 1440×900, not visible.
- **N4. No in-content route to the next step on Possible matches.** A keyboard user goes back to the step nav (Shift+Tab ×3) to reach "What to check next"; the Features step has "See possible matches" but Matches has no matching "What to check next" button.
- **N5. Long Tab path on Features.** 42 Tab presses from `main` to "See possible matches" for 13 terms (quote markers plus two controls per term). Acceptable, but a later shortcut would help.
