---
inclusion: always
---

# How we design and build the interface

This is a method, not a template. It distils what worked (and what was rejected) on earlier sites Ian shipped, so every agent on this team starts from the same taste. Each new product has its own subject and its own thing to say, so its look must come from that, not from copying a past site. Keep what serves this product, drop what doesn't, and say which you did.

Ian owns the final visual call. When two good options exist, show both as screenshots and let him pick.

## 1. Start from the message, not from components

Before any UI code, answer in a few lines (put it in `docs/ART_DIRECTION.md` and keep it current):

1. **The promise.** What should a judge understand and feel in the first 5 seconds? One sentence.
2. **The proof.** What single moment on screen makes that promise believable (a live result, a number, a transformation)? This is the "wow" moment; everything else supports it.
3. **The mood.** Three words. A serious subject (health, money, civic life) leans toward calm editorial clarity, where the wow comes from insight and data; a playful subject can lean on spectacle.
4. **One signature interaction.** At most one or two, chosen because they express the idea (see the atlas in section 5). Translate the idea; never copy a site's code or assets.
5. **Type, colour, motion.** One display face and one text face; a restrained palette with one accent; one motion signature (how things enter, how hover responds).

Get Ian's OK on this before building pages. Changing direction later is expensive.

## 2. Build order

1. **Tokens first**: colour, type scale, spacing, radius, shadow, motion durations and easing as CSS variables. Pages use tokens, never raw values.
2. **Real content from the start**: real copy, real numbers (with a source), real or realistic demo data. No lorem ipsum; placeholder text hides layout problems.
3. **The proof moment next**, end to end, then the pages around it. A polished happy path beats many half-finished features.
4. **Polish pass last**: spacing rhythm, alignment, empty/loading/error states, mobile.

## 3. Taste principles (the essence of past feedback)

**Restraint.** Fewer elements, more space, one idea per screen. If in doubt, leave it out. Every element must earn its place; decoration that carries no meaning goes.

**Typography carries the design.**
- Headlines fit on one line where possible; shrink the size to fit rather than wrap (allow wrapping only below roughly 22px).
- No trailing punctuation and no commas inside headlines; buttons, toasts and hints are one short phrase.
- Emphasise with colour, not by switching to another font mid-headline.
- Numbers and prices use the same family as headings, at natural width. Never use condensed or expanded faces that make numbers look squeezed.

**Copy is concrete.** Replace slogans with a specific claim and a real number. Every button leads somewhere different; two buttons that do the same thing is a bug. Name things plainly.

**Motion has a reason.**
- Prefer subtle reveals (e.g. headline characters going from blurred to sharp, paragraphs fading in) over generic slide-up bounces.
- Hover feedback responds to the pointer (e.g. a fill that spreads from where the cursor entered and retreats where it left) rather than a fixed bottom-to-top wipe.
- Page changes dissolve in place.
- No scroll hijacking: smooth-scroll libraries combined with sticky stacking layers caused stalls and black gaps before. Native scroll first.
- Ambient 3D/WebGL is decoration: it must not block clicks or scrolling, and it must not stutter.
- Honour `prefers-reduced-motion` with a static fallback.

**Performance is part of the look.** Jank reads as cheap. Cap device pixel ratio around 1.5 for canvases, upload textures incrementally, lazy-load heavy media, keep animations frame-rate independent.

**Consistency.** Use custom, styled controls (dropdowns, segmented controls, modals) so nothing falls back to the operating system's look. Same radius, same shadows, same spacing everywhere.

**Mobile is first-class.** No horizontal page scroll, tap targets at least 44px, modals that move above the on-screen keyboard, tables that scroll inside their own box.

**Avoid the template look**: purple-to-blue gradients, glassmorphism on everything, emoji as icons, stock illustrations, equal-weight card grids with no hierarchy, a loading screen before the first content.

## 4. Things Ian rejected before (for calibration, not rules)

- First screen crowded and overlapping the navigation; a loading page before the home page.
- Text that bounces up from below on every page.
- Cards stretched to fill space; prices in a stretched font.
- Modals with three paragraphs of explanation; too-minimal modals with no identity. Aim for a logo, a one-line purpose, the input and the main action.
- Payment or result panels that resize after they appear. Reserve the final size from the first frame.
- Decorative areas that look clickable but aren't, or are clickable but shouldn't be.

## 5. Interaction atlas (references, take the idea not the code)

Use these to discuss a signature interaction with Ian ("like X, but for our data"). Open the live site to study it. Three tympanus.net demos block automated browsers.

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

These are mostly portfolio and art sites. For a product, borrow the feeling (tactile, cinematic, responsive) and apply it to the one moment that matters, e.g. the result appearing, data assembling into an answer, or the before/after reveal. The rest of the product stays quiet and usable.

## 6. Hackathon specifics

- Judges may only watch the 3-minute video and click the live link. The first 7 seconds of both must land the promise; the end should lift to the bigger vision.
- The landing page sells the vision; the app proves it. Same visual language for both.
- Every number shown is real and sourced, or clearly labelled as demo data.
- Everything user-facing is in English.

## 7. Done means

- Screenshots at 1440×900, 1000×600 and 375×812 reviewed by eye.
- Scrolled top to bottom with no stalls; no console errors.
- Reduced-motion and keyboard navigation still work.
- Empty, loading and error states look designed, not default.
- Note anything not checked (e.g. real iPhone, Safari) instead of claiming it works.
