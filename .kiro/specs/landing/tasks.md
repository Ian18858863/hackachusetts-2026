# Tasks: Landing page

> Status: IN PROGRESS (T04, owner Ian). Ticked items were done and checked in this session (2026-10-24, about 15:10 ET), on branch `ian/t04-landing`, not yet on `main` and not yet deployed.
> Provenance: Started from Peter's Kiro v2 spec (hand-over 14:50 ET); re-written by Ian's Kiro.

- [x] 1. Import Peter's Kiro v2 landing and spec unchanged as a provenance commit (`912c57e`).
- [x] 2. Project setup: Vite + React + TypeScript with the app's pinned versions; `npm run build` type-checks, then builds to `landing/dist`; no `landing/dist/app`. _R7.6_
- [x] 3. Tokens copied from the `docs/ART_DIRECTION.md` token sheet into `landing/src/styles.css`; fonts self-hosted through the app's @fontsource packages (Newsreader variable 400/500, Source Sans 3 400/600); app favicon. _R7.1, R7.2_
- [x] 4. Content in `landing/src/content.ts` from the listed sources only, with the links checked in `docs/research/health-visions.md`. _R3, R4, R5, R6_
- [x] 5. Header, hero, problem, how it works, evidence, closing call to action and footer in `landing/src/App.tsx`; every call to action goes to `/app/?demo=demo-npc1`. _R1.1, R1.2, R2, R3, R4, R5, R6_
- [x] 6. Proof screenshot captured from the live app (`#/matches`, `demo-npc1`) and placed in the hero with alt text, size attributes and the demo label caption. _R1.3, R1.4, R1.5_
- [x] 7. QA on `wrangler pages dev` (port 8812): screenshots at 1440×900, 1000×600 and 375×812; one `<h1>`; no horizontal scroll; section links visible at every width; every call to action href checked; Tab order and focus ring checked on the skip link, brand, section links and calls to action; reduced motion turns animation off; axe-core 4.10.2 with zero violations at 1440×900 and 375×812; no console errors while scrolling. _R1.5, R2, R7.3, R7.4, R7.5_
- [x] 8. Footer HPO version and engine in step: resolved by `f6a3ebe` on `origin/main` (Jerry's engine R5), where `engine/hpo.ts` exports `HPO_VERSION = "2026-09-01"` and the fallback rank and questions import it. The remaining `"unknown"` in the demo extract path is being fixed by Ian's task T18j. _R6.2_
- [ ] 9. Assistant review of the diff, then integration into `main` (Ian's authorized integration session). Not done.
- [ ] 10. Live check after deploy: `/` serves this page and the call to action opens the demo case in a private window. Not done.
- [ ] 11. Not checked yet: real iPhone, Safari, Firefox, Windows high-contrast mode, screen reader pass.
