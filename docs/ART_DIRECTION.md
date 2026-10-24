# Art direction: Rare Disease Detective (working name)

Method: `.kiro/steering/design.md` section 1. Reference specimen: [final.html](art-direction/final.html), screenshots [1440×900](art-direction/final-1440.png) and [375×812](art-direction/final-375.png).
History: T12 options A and B were judged ugly; T12b produced white variants B1, B2 and B3; T12c records Ian's merge of B1 and B2 (this note).

**Promise.** Turn a parent's scattered notes into a specialist-ready brief in minutes: possible conditions to discuss with a doctor, each with its evidence.

**Proof.** The ranking screen. One rounded panel holds the closest match: its name, "7 of 7 features described", and Leo's features in a list, each with a frequency glyph and a footnote number that opens the exact sentence it came from. The other candidates sit quieter at the side.

**Mood.** Calm, exact, humane.

**Signature interaction.**
1. *Evidence lines up behind rank 1.* On load the headline sharpens from a light blur, then each evidence row slides in 8px and its dots fill, staggered row by row. Rows have fixed slots, so nothing shifts.
2. *Footnote linking.* Hovering, focusing or tapping a feature shows its source sentence: a floating card in the panel, and a reserved line under the comparison matrix. Both are CSS only and cause no layout shift.

**Type, colour, motion.**
- *Display: Newsreader* (OFL, Google Fonts, weights 500 and 400, optical sizes). Page title 44px/1.1 (34px on phone), disease name 34px (30px on phone), side candidates 21px, section title 34px, big numbers 44px with lining tabular figures, quoted sentences 19px at weight 400. Its calm editorial voice is what Ian liked in B2.
- *UI and body: Source Sans 3* (OFL, weights 400 and 600). Body 17px/1.5 (16px on phone), lead text 19px, labels 14–15px. It is plain, has tabular figures and stays readable small.
- *Colour.* White `#FFFFFF`, panel surface `#F5F6F8`, ink `#14161B` (18.1:1 on white, 16.7:1 on surface), secondary `#454A54` (8.9:1 / 8.2:1), tertiary `#5D636E` (6.0:1 / 5.6:1 / 5.4:1 on accent tint). One accent, blue `#2B55C0` (6.6:1 on white, 6.1:1 on surface, 5.9:1 on tint `#EEF2FB`; white on accent 6.6:1). The accent is reserved for rank 1, its dots, footnote numbers and the focus ring. The primary button is a black pill (white on ink 18.1:1). "Not recorded" dashes `#7A808A` measure 4.0:1 on white and 3.6:1 on tint. Empty glyph dots `#CDD2DA` (1.4:1) are decorative; the word next to them carries the meaning. No red or green.
- *Motion.* One easing curve, `cubic-bezier(0.2, 0, 0, 1)`. Feedback 160–220ms. Headline sharpen 600ms, evidence rows 520ms staggered 60ms, dots 320ms. Scrolling stays native. With `prefers-reduced-motion: reduce` every animation and transition is off and the page is complete and static.

**Screens.**
1. *Intake:* product name, one line of purpose, a large notes field and "Try a demo patient".
2. *Feature review:* the notes with footnoted highlights beside the numbered feature list (plain label first, HPO term quieter, Keep/Remove).
3. *Ranking:* the focal panel for rank 1 and quieter candidates at the side; "Compare side by side" below it with the dot matrix.
4. *What to check next:* 3–5 plain questions, each naming the candidates it separates.
5. *Brief:* one A4/Letter page in the same type with the dot matrix, the safety line and Download PDF / Export phenopacket.

**Kept and dropped.**
- *From B1, kept:* white page, generous whitespace, one rounded focal panel, quieter side candidates, four-dot frequency glyph with a word, black pill primary button, almost no borders, the popover footnote.
- *From B2, kept:* Newsreader for display and Source Sans 3 for everything else, its heading scale and editorial rhythm, and the dot-matrix comparison, used as the secondary "Compare side by side" view and in the clinician brief.
- *Dropped:* B1's Inter and Inter Tight (generic, tight); B2's square blue button, heavy 2px rule and newspaper density; B3 entirely; any WebGL, sound, dark mode and probability percentages.
- *Steering kept:* restraint, one accent, reserved space, section 7 safety framing (calm "not a diagnosis" line by the results and in the footer, overlap words not scores, reasoning per candidate, demo labels, HPO and Orphanet attribution). At 1000×600 the rank-1 name, overlap and first evidence row are above the fold.

**Open items.** ORPHAcodes, HPO terms and frequencies in the specimen are demo values; live data (T07) and the real HPO release must replace them before the video.

**Approved by Ian:** 2026-10-24 12:33 ET — B1 UI + B2 typography. His words: "图一的字体好，图二的 UI 好，你取其精华，去其糟粕。" ("Image one's typography is good, image two's UI is good; take the best of each and drop the rest." Image one was B2, image two was B1.) Reference specimen `docs/art-direction/final.html`.

## Token sheet

Copy into the app's root stylesheet. Components use these names, never raw values.

```css
:root {
  --bg: #FFFFFF;  --surface: #F5F6F8;  --hair: #E7E9ED;
  --ink: #14161B;  --ink-2: #454A54;  --ink-3: #5D636E;
  --mark: #454A54;  --mark-off: #CDD2DA;  --mark-none: #7A808A;
  --accent: #2B55C0;  --accent-soft: #EEF2FB;  --on-dark: #FFFFFF;  --focus: #2B55C0;

  --f-display: "Newsreader", Georgia, "Times New Roman", serif;          /* 400, 500 */
  --f-text: "Source Sans 3", system-ui, -apple-system, "Segoe UI", sans-serif; /* 400, 600 */
  --t-xs: 0.875rem;  --t-sm: 0.9375rem;  --t-base: 1.0625rem;  --t-md: 1.1875rem;
  --t-lg: 1.5rem;  --t-xl: 2.125rem;  --t-2xl: 2.75rem;
  --lh-text: 1.5;  --lh-head: 1.1;

  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px; --s-6: 32px;
  --s-7: 48px; --s-8: 64px; --s-9: 96px; --s-10: 128px;
  --r-s: 10px;  --r-m: 16px;  --r-l: 28px;  --r-pill: 999px;
  --shadow-pop: 0 12px 32px -12px rgba(20, 22, 27, 0.20), 0 2px 6px rgba(20, 22, 27, 0.06);
  --z-pop: 10;

  --ease: cubic-bezier(0.2, 0, 0, 1);
  --dur-fast: 160ms;  --dur-base: 220ms;  --dur-proof: 520ms;  --stagger: 60ms;

  --content: 1056px;  --gutter: 48px; /* 24px under 900px, 16px under 600px */
  --col: 184px; /* comparison matrix candidate column, 64px under 600px */
}
```

Fonts: `https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Source+Sans+3:wght@400;600&display=swap` (self-host for production). Focus ring: `outline: 2px solid var(--focus); outline-offset: 3px`.

## v2 (T35, 2026-10-24, pending Ian's review)

Why: Ian rated v1 3/10 ("密密麻麻", too dense). v2 keeps the promise, proof and safety framing above and changes the visual system only. Rules applied: `handoff/design_lessons_from_ziliaoku.md` sections 1, 4 and 5; reference discipline from https://yezi-library.pages.dev (type scale, rhythm, restraint, motion timing), not its brand effects (no WebGL wall, no grain, no preloader).

**Landing: dark, function first.**
- First screen: one-line headline, one lead line, two actions ("Try the demo case" opens `/app/?demo=demo-npc1`; "For families" opens the same case with `&audience=family`), the safety line, the demo note, then the stat row with cited figures (4.7 years, 73%, 263–446 million), each with one label and its source link. The proof screenshot moved to the next section.
- Colours: page `#0a0a09`, text `#eeebe4` (16.6:1), `#bcb8af` (10.0:1), `#8f8b83` (5.8:1); action accent `#a9bcf5` (10.6:1) with `#0b1430` text (9.7:1).
- Section padding `clamp(96px, 13vw, 200px)`, content max 1328px, gutter `clamp(16px, 4vw, 56px)`.
- Motion: headline characters come into focus (blur 16px → 0, opacity 0 → 1, 1.3s, power2.out, stagger ≤ 0.06s, whole title ≤ 0.9s of stagger). Buttons use the ink hover: a circle grows from the pointer's entry point and shrinks back toward the exit point (0.7s). No preloader. Native scroll.

**App: light "clinical paper".** The brief must print well, so the app stays light: page `#fbfaf7`, surface `#f2f0ea`, ink `#141412`. Same type system and accent discipline as the landing.

**Type.** One display serif for every heading and number in all six languages: Noto Serif 500 (Latin), with Noto Serif SC / JP / KR 500 loaded on demand for zh / ja / ko as unicode-range slices (`shared/fonts.ts`). One sans for the UI: Inter 400 and 600, with the system CJK sans per `:lang()`. `font-synthesis: none` (no faux bold or italic); emphasis inside a heading changes colour only. All fonts self-hosted via @fontsource (OFL-1.1).
- Headings never wrap at desktop widths: `useFitHeading` shrinks the size until the line fits and allows wrapping only at its floor (22px, or about 0.78 of the size on phones), then wraps balanced. Rendered headings drop trailing punctuation (`headingText`); the copy itself is unchanged.
- Scale: app page title `clamp(34px, 3.6vw, 52px)`, section titles `clamp(28px, 2.4vw, 36px)`, body 16px / 1.6; landing section titles `clamp(32px, 4.2vw, 64px)`, stats `clamp(44px, min(5.4vw, 9vh), 84px)` (one shared size per row), body 15px / 1.65. Display tracking −0.028 to −0.032em in Latin, 0 in CJK.

**Colour: exactly two semantic accents.** `--accent` (app `#2348b0`, 8.0:1 with white text) marks the primary action, rank 1 and the focus ring. `--attention` (app `#7a5200` on `#f8f0dc`, 6.1:1) marks needs-attention states (warnings, demo-cache labels). Red (`#a3271b`, 7.0:1) appears only for errors. Candidates never use alarm or success colours (steering section 7).

**Motion in the app.** A step change brings the new step into focus from a 12px blur over 0.7s, in place. We tried the View Transitions API first (old step blurring out over 0.45s): while a transition runs, Chrome sends every pointer event to `<html>` (measured: `elementFromPoint` returned HTML at 0 and 300 ms), so clicks right after a step change were lost, including the recorder's. The CSS version keeps every control clickable. `prefers-reduced-motion: reduce` turns all of it off.

**Controls.** The native language `<select>` is replaced by an in-page dropdown (`components/ui/Dropdown.tsx`, copied to `landing/src/ui/`): a button with `aria-haspopup="listbox"` and `aria-expanded`, a listbox with `aria-activedescendant`, ↑ ↓ Home End to move, Enter or Space to choose, Esc and Tab to close, focus back on the button; it opens below and flips up only without room. Its trigger keeps `data-testid="language-switcher"`.

**Kept.** Section 7 safety framing, every §13 line, the footer attribution and the evaluation sentence (restyled), all `data-testid`s, step order, URLs and query parameters (`?demo`, `?lang`, `?audience`).
