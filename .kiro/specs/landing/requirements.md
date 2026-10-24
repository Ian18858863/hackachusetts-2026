# Requirements: Landing page

> Status: DRAFT, IN PROGRESS (T04, owner Ian). Not approved by the team yet.
> Provenance: Started from Peter's Kiro v2 spec (hand-over 14:50 ET); re-written by Ian's Kiro.
> Sources for every fact on the page: `docs/research/health-visions.md`, `BRIEFING.md` section 4, `docs/CONTRACT.md` section 13, `README.md` "Honest evaluation". Visual rules: `.kiro/steering/design.md`, `docs/ART_DIRECTION.md`.

## Introduction

The landing page at `/` sells the idea in one screen and sends a judge into the app with the primary demo case (`demo-npc1`) preloaded. It shares tokens, type, brand mark, voice and the black pill button with the app at `/app/`, so the switch is not noticeable. It is decision support framing throughout: no claim that the tool diagnoses.

## Requirement 1: Hero and proof

**User story:** As a judge, I want to understand what the product does and see it working within seconds, so that I know whether to open the demo.

1.1 THE PAGE SHALL have exactly one `<h1>`: "A specialist-ready brief in minutes, not a diagnosis in years."
1.2 THE PAGE SHALL show the subline "Turn years of scattered notes into a specialist-ready brief in minutes." directly below the `<h1>`.
1.3 THE PAGE SHALL show a true screenshot of the live app's Possible matches step for `demo-npc1`, with alt text that describes it and says it is a demo case, and a caption with the verbatim demo label from contract section 13.
1.4 THE PAGE SHALL reserve the screenshot's final size from the first frame (width and height attributes) so nothing shifts when it loads.
1.5 WHILE the viewport is 1000×600 or larger THE PAGE SHALL show the rank-1 name and overlap of the screenshot above the fold.

## Requirement 2: Calls to action

**User story:** As a judge, I want one click to a working demo, so that I need no sign-up or setup.

2.1 THE PAGE SHALL point every call to action ("Open the demo" in the header, "Try the demo case" in the hero and the closing section, "Open the demo" in the footer) to `/app/?demo=demo-npc1` (contract 0.1.1, R10.6 of the main spec).
2.2 THE PAGE SHALL style the primary action as the black pill from the art direction, with visible `:hover` and `:focus-visible` states.

## Requirement 3: Problem

**User story:** As a judge, I want sourced numbers for the problem, so that I can trust its size.

3.1 THE PAGE SHALL state 263–446 million people with a rare disease, citing Nguengang Wakap et al., Eur J Hum Genet 2020, linked to the PubMed Central page checked in `docs/research/health-visions.md`.
3.2 THE PAGE SHALL state a mean time to diagnosis of 4.7 years with the median of 0.8 years, and 73% misdiagnosed at least once, citing Faye et al., Eur J Hum Genet 2024, linked to the PubMed Central page checked in `docs/research/health-visions.md`, and SHALL say the survey covered 6,507 patients in 41 European countries in 2022 (Rare Barometer).

## Requirement 4: How it works

4.1 THE PAGE SHALL list the five steps: notes; HPO features with their source sentence, including a Not present group; possible matches with evidence; what to check next; brief, phenopacket and recruiting trials.
4.2 THE PAGE SHALL say "The ontology ranks; the LLM only translates" and explain that terms are kept only when the phrase is in the notes and HPO confirms the term.
4.3 WHERE the page mentions privacy THE PAGE SHALL say only "Your notes are sent to the server only to extract features, using Cloudflare Workers AI. The app does not store them on a server or write them to logs; your case is kept in your browser." (contract sections 2 and 7.2, main spec R1.5) and no other privacy claim.

## Requirement 5: Evidence and honesty

5.1 THE PAGE SHALL cite the Undiagnosed Diseases Network study (424 patients, Stud Health Technol Inform 2025) and DeepRare (Nature 2026) with links from `docs/research/health-visions.md`.
5.2 THE PAGE SHALL show verbatim: "On 10 published cases selected by a fixed rule, the correct condition ranked first in 5 and in the top 3 in 6 (our own small evaluation)."
5.3 THE PAGE SHALL say that a pre-registered re-rank did not improve the result and was not shipped, with a link to `docs/research/ranking-benchmark.md`.
5.4 THE PAGE SHALL NOT show any percentage or probability for a candidate, and SHALL NOT use a Duchenne (`demo-dmd`) example.

## Requirement 6: Footer, safety and attribution

6.1 THE PAGE SHALL show the verbatim contract section 13 disclaimer: "Decision support, not a diagnosis. These are possible matches to discuss with a doctor."
6.2 THE PAGE SHALL show the contract section 13 credits for HPO (with version), Monarch (with its not-for-diagnosis caveat), Orphanet, ClinicalTrials.gov and phenopacket-store.
6.3 THE PAGE SHALL show "Built at Sundai" and link to the GitHub repository and its README.

## Requirement 7: Look, accessibility and build

7.1 THE PAGE SHALL use the token sheet from `docs/ART_DIRECTION.md` as CSS variables and self-hosted Newsreader (400, 500) and Source Sans 3 (400, 600) through @fontsource, with no other weights.
7.2 THE PAGE SHALL use the app's favicon and brand mark.
7.3 THE PAGE SHALL have no horizontal scroll at 1440×900, 1000×600 and 375×812, and section links that are reachable at every width.
7.4 THE PAGE SHALL show a visible focus ring on every link and button, and SHALL have zero serious or critical axe-core violations.
7.5 WHEN `prefers-reduced-motion: reduce` is set THE PAGE SHALL show the same content without animation.
7.6 THE PROJECT SHALL build with `npm run build` (type-check, then Vite) into `landing/dist`, without a `landing/dist/app` folder.
