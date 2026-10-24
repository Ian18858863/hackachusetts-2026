---
inclusion: always
---

# Design steering: how we choose and build the interface

> Provenance: re-authored by Kiro on 2026-10-24 from a disclosed draft by Ian's assistant (commit c31e29f).

This is a method, not a template. It fixes the constraints every design choice must meet and the way choices get made. It does not fix colours, fonts or layouts: each product gets its look from what it needs to say. Ian owns the final visual call. When two good options exist, show both as screenshots and let him pick.

## 1. Art direction note first

Before any UI code, write `docs/ART_DIRECTION.md` (one screen, kept current) and get Ian's OK. Changing direction later is expensive.

1. **Promise.** One sentence a judge should understand within 5 seconds.
2. **Proof.** The single on-screen moment that makes the promise believable (a live result, a number, a before/after). Everything else supports it.
3. **Mood.** Three words, derived from the subject and the audience.
4. **Signature interaction.** One, at most two, chosen because it expresses the idea (see the atlas in section 11).
5. **Type, colour, motion.** The chosen faces, the accent, the motion signature, each with one line of why.
6. **Kept and dropped.** Which parts of this steering serve this product and which you are deliberately not applying.
7. **Approved by Ian:** date, plus the screenshot he picked.

## 2. Build order

1. **Tokens** as CSS variables: colour, type scale, spacing, radius, shadow, z-index, motion duration and easing. Components use tokens, never raw values.
2. **Real content from the start**: real copy, real numbers with a source, realistic demo data. No lorem ipsum; it hides layout problems.
3. **The proof moment end to end**, then the screens around it. A polished happy path beats many half-built features.
4. **Polish last**: spacing rhythm, alignment, states (section 8), mobile.

## 3. Taste principles

- **Restraint.** One idea per screen, generous space, few elements. Decoration that carries no meaning goes.
- **Typography carries the design.** Hierarchy comes from size, weight and space before it comes from boxes, borders or colour.
- **Concrete copy.** A specific claim with a real number beats a slogan. Name things plainly. Every button goes somewhere different; two buttons doing the same thing is a bug.
- **Motion has a reason** (section 6).
- **Performance is part of the look.** Jank reads as cheap.
- **Consistency.** Custom-styled controls (selects, segmented controls, modals, tooltips) so nothing falls back to the OS look. One radius scale, one shadow scale, one spacing scale.
- **No template look**: purple-to-blue gradients, glassmorphism everywhere, emoji as icons, stock illustration, equal-weight card grids with no hierarchy, a loading screen before first content.

Rejected before (calibration, not rules): a crowded first screen overlapping the nav; a loading page before the home page; text bouncing up on every page; cards stretched to fill space; prices in a stretched font; modals with three paragraphs, or so bare they have no identity (aim for logo, one-line purpose, the input, the main action); result panels that resize after appearing; areas that look clickable but aren't, or the reverse.

## 4. Layout rhythm and grid

- **Spacing** on a 4px base, used mostly in steps of 8 (8, 16, 24, 32, 48, 64, 96, 128). Larger gaps separate ideas; smaller gaps group them.
- **Grid**: 12 columns on desktop, 8 on laptop/tablet, 4 on phone, with fixed gutters from the spacing scale. Content max width around 1200px; reading text max 60–75 characters per line.
- **Hierarchy**: one dominant element per screen. Group by proximity and alignment first, add a container only when grouping fails.
- **Reserve space.** Anything that loads or changes (results, charts, panels, images) has its final size from the first frame. No layout shift.
- The proof moment must sit above the fold at 1000×600, not only at 1440×900.

## 5. Typography and colour

**Choosing faces.** One display face and one text face, at most; add a monospace only if the product shows codes or IDs (e.g. ontology terms).
- Pick the display face for voice (what the mood words sound like); pick the text face for long-form screen reading at 16–18px.
- Both need clear numerals with tabular figures available. Numbers use the heading family at natural width; never condensed or expanded faces that squeeze them.
- Open licence (e.g. OFL), self-hosted or with `font-display: swap`, only the weights you use.
- Type scale from one ratio (about 1.2–1.333); body 16px minimum, line-height about 1.5 for text and 1.1–1.2 for headlines.

**Headline rules.**
- Fit on one line where possible; reduce size rather than wrap (wrapping is fine below roughly 22px and on phone).
- No trailing punctuation and no commas in headlines. Buttons, toasts and hints are one short phrase.
- Emphasise with colour or weight, never by switching font mid-headline.

**Colour.**
- Neutrals do most of the work. One accent, reserved for the primary action and the proof moment, so it means "look here".
- Status colours (error, warning, success) are separate from the accent and muted; they appear only when they carry state.
- One theme done well; no dark mode unless the art direction asks for it.
- Contrast meets WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text, icons, control borders and focus rings. Check with a contrast tool, not by eye.
- Never encode meaning by colour alone; pair it with a label, icon or pattern (matters for charts and match/no-match states).

## 6. Interaction and motion

- Every animation answers "what does this help the user notice?" If nothing, remove it.
- Prefer subtle reveals (headline going from blurred to sharp, paragraphs fading in) over generic slide-up bounces.
- Hover responds to the pointer (e.g. a fill spreading from where the cursor entered) rather than a fixed wipe.
- Page and view changes dissolve in place. Durations roughly 150–250ms for UI feedback, up to about 600ms for the proof moment; one easing family.
- **No scroll hijacking.** Native scroll first. Smooth-scroll libraries plus sticky stacking layers caused stalls and black gaps before.
- Ambient 3D/WebGL is decoration: it never blocks clicks or scrolling and never stutters. Cap canvas device pixel ratio near 1.5, upload textures incrementally, lazy-load heavy media, make animation frame-rate independent, pause when off-screen.
- `prefers-reduced-motion: reduce` gets a static, complete version: same content, no movement, no autoplay.

## 7. Serious subjects and medical safety framing

A serious subject (health, money, civic life) calls for calm, trustworthy, editorial clarity. The wow comes from the moment of insight, not from spectacle. For health products:

- **Never look like a verdict.** Frame results as "possible matches to discuss with a doctor", ranked, never as a single answer. No alarm-red for candidates and no celebratory green for "found it".
- **"Not a diagnosis" is visible, calm and permanent**: one plain sentence near every result and on every exported document, in body size, not hidden in fine print and not a scary banner.
- **Show the reasoning.** Each result shows why: which inputs matched, which did not, and how common each is. Traceability is the trust signal.
- **Show uncertainty honestly.** Use ranks, ranges or plain words ("strong overlap", "partial overlap") unless the number really is a probability. No false precision (no "87.3%" from a similarity score).
- **Sources next to claims.** Each statistic and each result links to its source and data version (e.g. ontology release). Attribution in the footer as the licence requires.
- **Demo data is labelled** as demo data wherever it appears. Never real patients.
- Plain language first, medical term second (term on hover or in a quieter style), so families and clinicians both read it.

## 8. Loading, empty and error states

All three are designed screens, in the product's voice, using the same tokens.
- **Loading**: a skeleton of the final layout at its final size. For multi-step work longer than about 1s, show the real steps as they happen (e.g. "Matching 6 features"), not a bare spinner.
- **Empty**: say what this area will show and offer one action, ideally "Try a demo example" with preloaded data.
- **Error**: say what happened in plain words and what the user can do; keep their input; offer retry. For the demo, every external API has a cached fallback so a live failure never kills the video or the judge's click.

## 9. Responsive and accessibility

| Target | Check at | Notes |
|---|---|---|
| Desktop | 1440×900 | Main design size; video recorded here |
| Laptop | ~1000×600 | Short viewport; proof moment still above the fold |
| Phone | 375×812 | Single column; first-class, not an afterthought |

- No horizontal page scroll at any size. Wide tables scroll inside their own box.
- Tap targets at least 44×44px. Modals stay above the on-screen keyboard.
- Full keyboard path through the happy path, in visual order. Visible focus ring on every interactive element (never `outline: none` without a replacement), meeting 3:1 contrast.
- Semantic HTML first (buttons are `<button>`, links are `<a>`, one `<h1>` per view, labelled inputs). ARIA only where HTML falls short. Live results announce via `aria-live="polite"`.
- Images and charts have text alternatives; charts also offer the numbers as text.

## 10. Landing page, app and video

- **The landing page sells the vision; the app proves it.** They share tokens, type, accent, motion signature, logo, nav and voice; a judge should not notice the switch.
- The landing hero shows the real proof moment (live or a true screenshot), not an abstract illustration.
- The main call to action opens the app with a demo example preloaded. No sign-up, no setup, no empty first screen for a judge.
- Judges may only watch the 3-minute video and click the link. The first 7 seconds of both must land the promise: what it is, for whom, and the proof. The end lifts to the bigger vision.
- Every number on screen is real and sourced, or clearly labelled as demo data. Everything user-facing is in English.

## 11. Interaction atlas: borrow the idea, not the code

Use these to talk about a signature interaction with Ian ("like X, but for our data"). Study the live site, then translate the feeling; never copy code, shaders or assets. The tympanus.net demos block automated browsers (HTTP 403 to scripts on 2026-10-24); open them by hand. The others returned 200 on that date.

| Site | URL | The idea worth borrowing |
|---|---|---|
| Zeyna | https://zeyna.pethemes.com/webgl-carousel/ | Horizontal WebGL gallery; hovered card turns from grey to colour |
| Paper Crumple | https://tympanus.net/Demos/PaperCrumble/ | Work as paper you can grab and throw |
| ITom | https://itomdev.com/ | Hand-drawn doors; walk into each project |
| Henry Heffernan | https://henryheffernan.com/ | Camera flies from a 3D desk into a working retro PC |
| Glass Xylophone | https://tympanus.net/Tutorials/Xylophone/ | Sound plus glass material; interaction you can hear |
| Bruno Simon | https://bruno-simon.com/ | Drive a car around the portfolio; navigation as a game |
| Jesper Landberg | https://jesperlandberg.com/ | Curved, perspective wall of work |
| Try It On | https://tympanus.net/Development/InteractiveStylingUI/ | Drag items onto a model; tactile product UI |
| Domed Grid | https://grid-no-webgl.jesperlandberg.com/ | Drag a sphere of photos; infinite canvas without WebGL |
| My Little Storybook | https://exp-my-little-storybook.lusion.co/ | Watercolour mask reveals a 3D pop-up story |
| Infinite Jelly Glass | https://infinite-jelly-glass.shader.se/ | Infinite wall of liquid-glass video tiles |
| Blobmixer | https://blobmixer.14islands.com/ | A mixing desk for morphing 3D forms |
| Sean Galt | https://seanaiux.com/ | Arc of videos over reflective water; sky changes as you scroll |
| Pixel to Voxel Drop | https://tympanus.net/Tutorials/PixelVoxelDrop/ | Video pixels collapse into physical voxels |
| Infinite Passerella | https://exp-infinite-passerella.lusion.co/ | Endless runway with free camera |
| Choo-Choo World | https://choochooworld.com/ | Build a miniature world; construction as play |
| Patatap | https://patatap.com/ | Every key fires a shape and a sound |
| WebGL Fluid | https://paveldogreat.github.io/WebGL-Fluid-Simulation/ | Pointer injects swirling colour |
| The Boat | https://www.sbs.com.au/theboat/ | Scroll-driven comic with sound and parallax |
| Poolsuite | https://poolsuite.net/ | A whole retro operating system as the interface |
| Igloo Inc. | https://www.igloo.inc/ | Camera dives through iridescent fog into the content |
| Meech | https://www.meech213.com/ | Minimal photography on a clock-hand arc |
| Andreas Antonsson | https://www.andreasantonsson.dev/ | Big tilted panels in perspective as you scroll |
| 3D Gradient Carousel | https://tympanus.net/Tutorials/3DGradientCarousel/ | Background colour follows the active item |
| Typatone | https://typatone.com/ | Typing turns into music |

These are mostly portfolio and art sites. For a product, apply the feeling (tactile, cinematic, responsive) to the one moment that matters: data assembling into an answer, evidence lining up behind a result, a before/after reveal. For a serious subject, choose the calmest reference that still delivers that moment. The rest of the product stays quiet and usable.

## 12. Definition of done

- [ ] `docs/ART_DIRECTION.md` exists and is approved by Ian.
- [ ] Screenshots at 1440×900, 1000×600 and 375×812 of landing, proof moment and output, reviewed by eye.
- [ ] Scrolled top to bottom at each size: no stalls, no layout shift, no horizontal scroll, no console errors.
- [ ] Happy path completed with keyboard only; focus always visible.
- [ ] Reduced-motion mode checked; content complete and static.
- [ ] Contrast checked with a tool for text, accent and focus ring.
- [ ] Loading, empty and error states triggered on purpose and screenshotted.
- [ ] Every number has a source or a "demo data" label; safety line present on results and exports.
- [ ] Live URL works in a private window with no login.
- [ ] Report what was not checked (e.g. real iPhone, Safari) instead of claiming it works.
