# Requirements: Rare Disease Detective

> Status: v0.1 DRAFT, written with `docs/CONTRACT.md` v0.1 (pending APPROVE by Jerry and Ian). Shapes, field names and error codes are defined in the contract; this file says what the system must do.

## Introduction

A parent or clinician pastes a plain-language symptom history. The system extracts HPO phenotype terms with the exact source fragment, lets the user review them, ranks candidate rare diseases with traceable evidence, suggests what to check next, lists recruiting trials, and exports a specialist brief and a GA4GH Phenopacket v2. The product is decision support for a conversation with a doctor, not a diagnosis. The ontology and ranking services rank; the LLM only translates notes into candidate terms.

## Glossary

- **System**: the app (`app/**`), the Pages Functions (`functions/api/*`) and the engine (`engine/**`) together.
- **Observed / excluded / removed**: term statuses in the case object (contract section 8).
- **Demo case**: one of the bundled synthetic narratives from phenopacket-store (contract section 9).
- **Upstream**: a third-party API listed in contract section 10.

## Requirement 1: Intake

**User story:** As a parent or clinician, I want to paste a symptom history in my own words, so that I do not need medical vocabulary to start.

1.1 THE SYSTEM SHALL provide a labelled multi-line text input that accepts up to 8,000 characters and shows the remaining character count.
1.2 WHEN the user submits text longer than 8,000 characters THE SYSTEM SHALL keep the text and show "Text is too long" with the limit, without calling `/api/extract`.
1.3 WHEN the user submits empty or whitespace-only text THE SYSTEM SHALL keep focus on the input and explain that some text is needed.
1.4 THE SYSTEM SHALL offer a "Try a demo example" action next to the input that loads a demo case narrative.
1.5 THE SYSTEM SHALL keep the case object only in the browser and SHALL NOT store or log note text on the server.

## Requirement 2: Extraction and review

**User story:** As a user, I want to see which phrases became which medical terms, so that I can check and correct them before anything is ranked.

2.1 WHEN the user submits valid text THE SYSTEM SHALL call `POST /api/extract` and show each returned term with its plain-language source quote and its HPO label and id.
2.2 THE SYSTEM SHALL return only HPO ids that the HPO API confirmed during grounding; WHEN a proposed id is unknown or does not match its label THE SYSTEM SHALL re-map it by label search or drop it with a warning.
2.3 THE SYSTEM SHALL return for every term a `quote` that is an exact substring of the submitted text, with `start` and `end` such that `text.slice(start, end) === quote`.
2.4 WHEN a term has `negated: true` THE SYSTEM SHALL show it in the "Not present" group with status excluded.
2.5 WHEN the user hovers or focuses a term THE SYSTEM SHALL highlight its quote in the original text.
2.6 THE SYSTEM SHALL let the user confirm, remove (with undo), mark absent, or mark present each term, using keyboard and pointer.
2.7 WHEN the user searches for a term to add THE SYSTEM SHALL query `GET /api/terms` and add the chosen HPO term with provenance manual.
2.8 WHEN extraction returns warnings THE SYSTEM SHALL list them in plain words below the terms.
2.9 WHEN extraction returns zero terms THE SYSTEM SHALL say so, keep the text, and offer manual term search.

## Requirement 3: Ranking with evidence

**User story:** As a user, I want to see possible matching conditions with the reasons for each, so that I can judge them and discuss them with a doctor.

3.1 WHEN at least one observed term exists and the user asks to rank THE SYSTEM SHALL call `POST /api/rank` with the observed and excluded ids.
3.2 WHEN fewer than 6 observed terms exist THE SYSTEM SHALL show a calm note that more features usually give more useful matches.
3.3 THE SYSTEM SHALL show at most 5 candidates by default, ranked 1..n, each with name, overlap label (strong, partial or weak), and links to Monarch and, when present, Orphanet and OMIM.
3.4 THE SYSTEM SHALL show for each candidate which patient features matched (exactly or through a shared broader term), which did not, how frequent each matched feature is in that disease according to HPO annotations, frequent disease features not mentioned, and excluded features the disease usually has.
3.5 THE SYSTEM SHALL NOT show any percentage or probability derived from a similarity score; WHERE the raw score is shown THE SYSTEM SHALL label it "raw service score".
3.6 THE SYSTEM SHALL produce the same ranking for the same set of terms regardless of the order in which they were entered.
3.7 WHEN a frequency is not annotated THE SYSTEM SHALL say "frequency not listed" rather than implying absence.
3.8 THE SYSTEM SHALL list the data sources and data versions used for the ranking next to the results.

## Requirement 4: Re-ranking on term changes

**User story:** As a user, I want the list to update when I correct terms, so that I can see how each feature changes the picture.

4.1 WHEN the observed or excluded set changes after a ranking THE SYSTEM SHALL mark the ranking as out of date and re-rank after the user pauses (about 600 ms) or presses "Update ranking".
4.2 WHILE a re-rank is in progress THE SYSTEM SHALL keep the previous results visible at their final size with an "Updating" status and SHALL NOT shift the layout.
4.3 WHEN a re-rank finishes THE SYSTEM SHALL announce the update through an `aria-live="polite"` region and indicate candidates whose rank changed.
4.4 WHEN the user marks absent a feature that a candidate usually has THE SYSTEM SHALL NOT raise that candidate's overlap label.

## Requirement 5: What to check next

**User story:** As a family preparing for an appointment, I want a short list of questions that would best tell the top possibilities apart, so that the visit is more useful.

5.1 WHEN a ranking with at least 2 candidates is shown THE SYSTEM SHALL call `POST /api/next-questions` with the top 3 to 5 candidate ids.
5.2 THE SYSTEM SHALL show up to 5 questions, each in plain language, with the HPO label and a "why" line naming the frequency per candidate.
5.3 THE SYSTEM SHALL NOT suggest a feature that is already observed or excluded.
5.4 THE SYSTEM SHALL derive each suggested feature and its justification only from HPO annotation data; any LLM rephrasing SHALL change wording only.
5.5 WHEN the user answers a question with "Yes" or "No" THE SYSTEM SHALL add the term as observed or excluded with provenance manual and trigger re-ranking (Requirement 4).

## Requirement 6: Brief and phenopacket export

**User story:** As a user, I want a one-page brief and a standard file for the specialist, so that the clinic can read it quickly and run its own tools.

6.1 WHEN the user opens the brief THE SYSTEM SHALL call `POST /api/brief` with the case object and render the brief with a print stylesheet that fits one A4 or Letter page for a typical case.
6.2 THE SYSTEM SHALL include in the brief the observed and excluded features with HPO ids and source quotes, the candidates with evidence, the questions, the disclaimer, data versions and attributions.
6.3 THE SYSTEM SHALL include specialist suggestions only when they come from a row of the documented mapping table, and test suggestions only as "genetic testing that includes <gene>" for genes annotated to a top-3 candidate; otherwise those sections SHALL be omitted.
6.4 WHEN the user chooses "Download phenopacket" THE SYSTEM SHALL download a GA4GH Phenopacket v2 JSON with `phenopacketSchemaVersion` "2.0", the HPO resource with version, and every observed and excluded feature with the correct `excluded` flag.
6.5 THE SYSTEM SHALL NOT put candidate diseases into the phenopacket's `diseases` or `interpretations`.
6.6 WHERE the case is a demo case THE SYSTEM SHALL mark the brief and the phenopacket as demo data with the source phenopacket id.

## Requirement 7: Trials

**User story:** As a family, I want to see recruiting studies for a candidate condition, so that I can ask the doctor whether any are relevant.

7.1 WHEN the user opens trials for a candidate THE SYSTEM SHALL call `GET /api/trials` with the candidate name and ids and show at most 5 recruiting studies with title, phase, conditions, countries and a link to ClinicalTrials.gov.
7.2 WHEN no recruiting study is found THE SYSTEM SHALL say so plainly and link to a ClinicalTrials.gov search for the condition.
7.3 THE SYSTEM SHALL show only studies with status RECRUITING.

## Requirement 8: Attribution

**User story:** As the team, we want to meet the data licences, so that the project can be published and judged without issues.

8.1 THE SYSTEM SHALL show the HPO attribution sentence with the HPO version in the app footer and in the brief.
8.2 WHERE Monarch, Orphanet, ClinicalTrials.gov, PubCaseFinder or phenopacket-store data appear THE SYSTEM SHALL show the matching credit from contract section 13.
8.3 THE SYSTEM SHALL NOT call the OMIM API and SHALL use OMIM only as ids and outbound links.

## Requirement 9: Safety framing

**User story:** As a user, I want the results framed honestly, so that I do not mistake a list of possibilities for a diagnosis.

9.1 THE SYSTEM SHALL show "Decision support, not a diagnosis. These are possible matches to discuss with a doctor." in body size on every result screen (ranking, questions, trials) and in the brief.
9.2 THE SYSTEM SHALL present results as a ranked list of possible matches and SHALL NOT present a single answer or use alarm or celebration colours for candidates.
9.3 THE SYSTEM SHALL NOT present any disease fact, frequency, gene, specialist or test that does not come from a named data source.
9.4 THE SYSTEM SHALL show plain language first and the medical term second.

## Requirement 10: Demo mode

**User story:** As a judge, I want to see the product working in one click, so that I can evaluate it without setup.

10.1 THE SYSTEM SHALL bundle the five demo cases of contract section 9 (`demo-npc1` first as the primary case, then `demo-dmd`, `demo-marfan`, `demo-kabuki`, `demo-cdls`), each derived from phenopacket-store with at least 6 observed terms and a prepared extraction.
10.2 WHERE a demo case is loaded THE SYSTEM SHALL show "Demo case (synthetic narrative from phenopacket-store <id>)" near the notes, the results and the exports.
10.3 WHEN `/api/extract` receives a demo case's exact narrative with its `caseId` THE SYSTEM SHALL return the prepared extraction with `source` "demo".
10.4 WHILE the Workers AI binding `AI` is missing (for example in some local runs), WHEN non-demo text is submitted THE SYSTEM SHALL return 503 `LLM_UNAVAILABLE`, and the app SHALL offer the demo cases and manual term entry.
10.5 THE SYSTEM SHALL label every response that came from the demo cache with `source` "demo", and the app SHALL show that label.
10.6 WHEN the landing page's main call to action is used THE SYSTEM SHALL open the app at `/app/?demo=demo-npc1` with that demo case preloaded.

## Requirement 11: Slow or failed upstream and offline

**User story:** As a user, I want clear feedback when a service is slow or down, so that I know what happened and do not lose my work.

11.1 WHILE a request is pending for more than about 1 second THE SYSTEM SHALL show the real step in progress (for example "Matching 9 features") inside a skeleton of the final layout.
11.2 WHEN an upstream exceeds its timeout (contract section 10) and a demo cache entry applies THE SYSTEM SHALL return the cached payload with `source` "demo".
11.3 WHEN an upstream fails or times out and no demo cache entry applies THE SYSTEM SHALL return the contract error shape with `retryable` true and the app SHALL offer "Try again" while keeping all input.
11.4 WHEN a secondary source (Orphadata, PubCaseFinder, one annotation call) fails THE SYSTEM SHALL still return the ranking and omit only that source's data.
11.5 WHEN the browser is offline THE SYSTEM SHALL say so, keep the case, and disable actions that need the network.
11.6 THE SYSTEM SHALL return every error in the shape `{ "error": { "code", "message", "retryable" } }` with the HTTP status from the contract.

## Requirement 12: Accessibility

**User story:** As a user with a keyboard, screen reader or small screen, I want to complete the whole flow, so that the tool works for everyone.

12.1 THE SYSTEM SHALL support the full happy path (intake, review, rank, questions, brief, export) with the keyboard alone, in visual order, with a visible focus ring of at least 3:1 contrast.
12.2 THE SYSTEM SHALL meet WCAG 2.2 AA contrast for text and controls.
12.3 THE SYSTEM SHALL use semantic HTML (one `<h1>` per view, `<button>` for actions, labelled inputs) and announce results through `aria-live="polite"`.
12.4 THE SYSTEM SHALL NOT use colour alone to show match, no-match or contradiction; each state SHALL also have a text label or icon.
12.5 THE SYSTEM SHALL work without horizontal page scroll at 1440×900, 1000×600 and 375×812, with tap targets of at least 44×44 px.
12.6 WHEN `prefers-reduced-motion: reduce` is set THE SYSTEM SHALL show the same content without animation.
