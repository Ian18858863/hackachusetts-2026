# Design: Landing page

> Status: DRAFT, IN PROGRESS (T04, owner Ian). Not approved by the team yet.
> Provenance: Started from Peter's Kiro v2 spec (hand-over 14:50 ET); re-written by Ian's Kiro.
> Requirement numbers refer to `requirements.md` in this folder.

## Stack and build

- Vite + React + TypeScript in `landing/`, the same tool versions as `app/` (pinned in `landing/package.json`).
- `npm run build` runs `tsc --noEmit -p tsconfig.json`, then `vite build` into `landing/dist` (R7.6). `scripts/build-site.sh` copies it to `dist/`; the app goes to `dist/app/`.
- No router and no client state. The page is static content rendered by React.

## Files

| File | Role |
|---|---|
| `landing/index.html` | Meta title and description, favicon, root element |
| `landing/src/main.tsx` | Font imports (same @fontsource packages and files as `app/src/main.tsx`), stylesheet, render |
| `landing/src/content.ts` | Every fact, number, link and contract section 13 string, each next to its source |
| `landing/src/App.tsx` | Sections: header, hero with proof, problem, how it works, evidence, closing call to action, footer |
| `landing/src/styles.css` | The token sheet copied from `docs/ART_DIRECTION.md`, a small reset, section styles, real `:hover` and `:focus-visible` states. No inline style objects |
| `landing/public/proof-matches-demo-npc1.webp` | True screenshot of the live app (R1.3) |
| `landing/public/favicon.svg` | Copy of `app/public/favicon.svg` (R7.2) |

## Look

- White B1 page from `docs/art-direction/final.html`: generous whitespace, one rounded surface panel per idea, almost no borders, hairlines between items, black pill primary button. No full-bleed colour hero.
- Header matches the app's top bar: brand mark and name in Newsreader 500, quiet text links in `--ink-3`, the pill on the right. Under 900px the section links wrap onto their own row, so they work at every width without a hidden menu (R7.3).
- Hero: two columns from 901px (copy left, proof right) so the proof sits above the fold at 1000×600 (R1.5); one column below.
- The accent blue appears only inside the screenshot (rank 1) and on the focus ring, as in the art direction.

## Proof moment

- Captured by Ian's Kiro on 2026-10-24 at about 14:59 ET from `https://hackachusetts-2026.pages.dev/app/?demo=demo-npc1`, step `#/matches`, at 1440×900 with device scale 2, after a warm-up load, in background headless Chrome via CDP.
- Cropped to the rank-1 focal panel (657×600 CSS px, 1314×1200 px). It shows Niemann-Pick disease, type C1, strong overlap, 6 of 12 present features described plus 6 through broader terms, and the first evidence rows.
- The image has `width` and `height` attributes (R1.4). A CSS mask fades the bottom edge of the crop.
- If the live ranking changes, re-capture it; never edit the image.

## Copy rules

- Facts come only from the sources listed in `requirements.md`. Numbers sit next to their citation.
- The safety line and credits are the contract section 13 strings, kept in `content.ts`.
- The HPO version in the footer is a single constant (`HPO_VERSION` in `content.ts`). It is set to 2026-09-01, the latest HPO GitHub release (checked 2026-10-24). The engine on `main` still reports `"unknown"` (contract open question 6), so the two must be brought in step before release.

## Motion

- The headline sharpens from a light blur (600ms), the proof fades in (520ms), with the art-direction easing. Native scroll; smooth anchor scrolling only without reduced motion. `prefers-reduced-motion: reduce` turns all of it off (R7.5).

## Accessibility

- One `<h1>`, a skip link, `<nav aria-label="Sections">`, `<main>`, `<footer>`; sections labelled by their `<h2>`.
- Focus ring `2px solid var(--focus)`, offset 3px, on every interactive element (R7.4). Tap targets at least 44px high.
- The header pill shows "Demo" on phones; its accessible name stays "Open the demo".
