# Art direction: Rare Disease Detective (working name)

Method: `.kiro/steering/design.md` section 1. Specimens: [Option A, Casebook](art-direction/option-a.html) (recommended) and [Option B, Instrument](art-direction/option-b.html), with screenshots at 1440×900 and 375×812 in `docs/art-direction/`. Main sections describe Option A.

**Promise.** Turn a parent's scattered notes into a specialist-ready brief in minutes: possible conditions to discuss with a doctor, each with its evidence.

**Proof.** The ranking screen. Each candidate is a small case file that lists the patient's confirmed features with a frequency mark for each one, and every feature footnotes back to the exact sentence it came from.

**Mood.** Calm, exact, humane.

**Signature interaction.**
1. *Case files gather their evidence.* When a feature is confirmed, a row appears in every candidate that has that feature, its frequency marks fill in, and the candidates re-order by sliding to their new places. This is a calm version of the atlas ideas Pixel to Voxel Drop (scattered pieces settle into a structure) and Domed Grid (motion without WebGL). Rows have fixed slots, so nothing shifts while someone reads, and nothing bounces.
2. *Footnote linking.* Hovering or focusing a feature, its source sentence, or one of its evidence rows highlights the other two. This borrows the footnote convention of scientific papers and makes the reasoning traceable.

**Type, colour, motion.**
- *Display and reading: Newsreader* (OFL, Google Fonts; weights 400, 500 and 600, plus 400 italic; optical sizes). It is a screen serif with a calm, literary voice, and it carries headlines, disease names and the parent's notes at 19px.
- *UI text: Public Sans* (OFL, Google Fonts; weights 400, 500 and 600). It is plain and civic and has tabular figures, so it handles labels, HPO IDs and controls. No monospace face.
- *Colour.* Warm paper `#F4F0E6`, ink `#1D1B17`, secondary text `#4B463E` (8.2:1) and `#625C51` (5.8:1). One accent, ink blue `#22457A`, is used only for the primary action, rank 1, footnote numbers and frequency marks. It measures 8.4:1 on paper, 7.3:1 on the highlight tint `#DFE2E3`, and white on accent is 9.5:1. Empty marks `#8C826E` are 3.3:1. The palette has no red or green, and status colours appear only for real errors.
- *Motion.* One easing curve, `cubic-bezier(0.2, 0, 0, 1)`. UI feedback takes 160–220ms. The proof moment takes 480ms, with marks staggered 40ms each and the re-order done as a 400ms translate plus fade. Views dissolve in place and scrolling stays native. With `prefers-reduced-motion: reduce`, the page renders in its final state with no movement, and rank changes are announced through `aria-live="polite"`.

**Screens.**
1. *Intake.* A single centred column with the product name, one line of purpose, a large notes field and a "Try a demo patient" button. Nothing else.
2. *Feature review.* The notes on the left with footnoted highlights, and the numbered feature list on the right showing the plain label, the quieter HPO term and ID, and Keep/Remove.
3. *Ranking and evidence.* The notes and features in 5 columns and the three case files in 7 columns. On phone, the matches come first and the notes follow below.
4. *What to check next.* A ranked list of 3–5 plain questions. Each question names the candidates it separates and why.
5. *Brief.* A one-page A4/Letter document preview in the same typography with the timeline, HPO-coded features, candidates with evidence, questions and the safety line. Actions are Download PDF and Export phenopacket, plus a short list of recruiting trials.

**Option B, Instrument (alternative).** A cool white surface with a graphite header, IBM Plex Sans with Plex Mono for IDs, and a teal accent `#0B6B69` (6.3:1 on white). Evidence appears as a matrix: rows are features with the HPO label first, columns are the three candidates, and each cell shows the HPO frequency band as a range bar such as 80–99%. It is clinician-first and denser, and the comparison between candidates is very clear. **Why A instead:** the main audience is a worried family and the brief they bring to a clinician. A reads like a careful case write-up and does not look like a dashboard or a verdict, and its case files deliver Ian's "evidence lining up" moment directly. B's range bars are worth reusing for the clinician-facing PDF brief.

**Kept and dropped.** Kept: restraint, typography-led hierarchy, one accent, reserved space, proof moment above the fold at 1440×900, the full medical safety framing in section 7 (calm "not a diagnosis" line next to results and in the footer, overlap words instead of scores, reasoning per candidate, demo labels, HPO/Orphanet attribution), and reduced motion. Dropped on purpose: any WebGL or 3D, sound, dark mode, decorative illustration, and probability percentages. At 1000×600 the first case file is above the fold, but the second and third need a scroll.

**Open items.** The ORPHAcodes, HPO IDs and frequencies in the specimens are demo values and must come from live data (T07) before the video. The HPO release placeholder must show the real version.

**Approved by Ian:** PENDING (date and chosen screenshot).
