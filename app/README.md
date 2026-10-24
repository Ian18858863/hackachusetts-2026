# app/ — Rare Disease Detective (web app)

Vite + React + TypeScript, served under the base path **`/app/`**. The app calls only
`/api/*` on the site root (Cloudflare Pages Functions); shapes follow
[`docs/CONTRACT.md`](../docs/CONTRACT.md) v0.1.

## Run

```bash
cd app
npm ci
npm run dev        # http://localhost:5173/app/
npm run typecheck  # tsc on src/ and vite.config.ts
npm run build      # typecheck + production build to app/dist (assets under /app/)
npm run preview    # serve app/dist at http://localhost:4173/app/
```

Node 20.19+ or 22.12+ (Vite 8 requirement).

Useful URLs:

| URL | What it does |
|---|---|
| `/app/` | Notes step |
| `/app/?demo=demo-dmd` | Loads that demo case and opens the Features step (`demo-dmd`, `demo-marfan`, `demo-kabuki`, `demo-cdls`). The landing page links here |
| `/app/?mock=1` | Forces the offline mocks for every endpoint (UI work without a backend) |
| `/app/#primitives` | Internal component kit, not linked from the UI |

### Backend in local dev

Without functions running, `/api/*` calls fail and the client answers from the bundled
offline mocks, and every view shows **Demo data (offline mock)**. To use a local backend:

```bash
API_PROXY_TARGET=http://localhost:8788 npm run dev
```

## Structure

```
src/
  App.tsx                 flow shell: top bar, step header, step body, footer
  main.tsx                entry; imports fonts, tokens, base styles
  styles/tokens.css       ALL design values (colour, type, spacing, radius, borders, shadow, motion)
  styles/base.css         reset and element defaults
  lib/                    useHashRoute, useDemoParam (?demo= deep link)
  components/ui/          primitives: Button, Card, EmptyState, ErrorState, Skeleton*, Spinner, Icon, RevealText
  components/shell/       TopBar, StepNav, StepHeader, PrimitivesPreview
  shared/                 contract types, API client, case store, mocks, shared UI (see below)
  features/<name>/        one folder per feature task; index.tsx starts as a stub
```

## How feature tasks plug in

Each feature task owns **one folder** and replaces its stub `index.tsx`, keeping the export name:

| Folder | Export | Rendered on step | Spec task | Requirements |
|---|---|---|---|---|
| `src/features/intake/` | `IntakeStep` | Notes (`#/notes`) | 3.2 | R1, R10 |
| `src/features/review/` | `ReviewStep` | Features (`#/features`) | 3.3 | R2 |
| `src/features/ranking/` | `RankingStep` | Possible matches (`#/matches`) | 3.4 | R3, R4 |
| `src/features/trials/` | `TrialsPanel` | Possible matches, below the ranking | 3.6 | R7 |
| `src/features/questions/` | `QuestionsStep` | What to check next (`#/questions`) | 3.5 | R5 |
| `src/features/brief/` | `BriefStep` | Brief (`#/brief`) | 3.7 | R6 |

The exports take no props. A feature may add any files inside its own folder (components,
CSS modules, hooks, tests).

**What the shell already does, so features must not repeat it:** the view's single `<h1>`
and lede (from `shared/steps.ts`), the demo case label, the offline-mock and demo-cache
labels, the safety line on result steps (matches, questions, brief), the footer with HPO
version and credits, focus moving to `<main>` on step change, and the offline notice.

### Store (`shared/store.tsx`)

```ts
const { caseObject, meta, extractStatus } = useCase();   // read
const actions = useCaseActions();                         // write (stable functions)
```

- `caseObject` is the contract section 8 `CaseObject`, saved to `localStorage` as `rdd.case.v0.1`.
- `meta` holds app-only details the case object does not: extraction `warnings`, `model`,
  `source`, `origin`; `rankingOrigin`; questions origin; latest `hpoVersion`.
- `extractStatus`: `{ state: 'idle' | 'loading' | 'error', error? }` for `/api/extract`.

Actions: `loadDemoCase(caseId)`, `setNotes(notes)`, `runExtraction(text?)`,
`setExtraction(response, origin)`, `setTermStatus(hpoId, status)`,
`addManualTerm(term, status?)`, `setRanking(request, response, origin)`,
`setQuestions(questions, { origin, source, dataVersions })`, `selectCandidate(diseaseId)`,
`goToStep(step)`, `reset()`.

Selectors: `observedIds(c)`, `excludedIds(c)`, `currentRankRequest(c, limit?)` (sorted,
deduplicated), `isRankingStale(c)`, `termCounts(c)`.

### API client (`shared/api.ts`)

`extract`, `searchTerms`, `rank`, `nextQuestions`, `trials`, `brief`, `health`. Each returns
`Promise<ApiResult<T>>` = `{ data, origin: 'api' | 'mock' }` and takes
`{ signal?, timeoutMs? }`.

- Timeouts are the contract budgets plus 2 s (extract 22 s, terms 4 s, rank 14 s,
  next-questions 7 s, trials 8 s, brief 4 s).
- Errors throw `ApiRequestError` with `code`, `message` (safe to show as is), `retryable`,
  `status`. Show it with `<ApiErrorState error onRetry />`. Ignore `isAbortError(e)`.
- Debounced re-rank: keep one `AbortController`, abort it before each new `rank()` call.
- Offline mocks answer only for a network error, HTTP 404/501 or a non-JSON 2xx (endpoint not
  built yet). Real 4xx/5xx contract errors are thrown, never mocked. Pass `origin` into the
  store so the shell shows the label.

### Shared UI (`shared/ui`)

Import from `../../shared/ui`: `Disclaimer`, `DemoCaseLabel`, `DataOriginLabel`,
`OfflineMockLabel`, `LoadingPanel` (real step name above a skeleton at final size),
`ApiErrorState`, `useOnlineStatus`, `useAnnounce` (polite live region, e.g. "Ranking
updated"), plus the primitives `Button`, `Card`, `EmptyState`, `ErrorState`, `Icon`,
`Skeleton`, `SkeletonGroup`, `SkeletonText`, `Spinner`. Contract types come from
`shared/contract.ts`; safety and attribution strings from `shared/text.ts`.

### The rule

**Features never edit shared files.** Shared means everything outside your own
`src/features/<name>/` folder: `shared/**`, `components/**`, `styles/**`, `lib/**`,
`App.tsx`, `main.tsx`, `index.html`, `package.json` and the lockfile. If a feature needs a
new store action, API change, token, icon or dependency, ask for a shared change in the
group chat; the shared-file editor makes it. Features use tokens only, never raw colours or
sizes.

## Design tokens

Provisional white look; the final palette and faces are being designed. Re-theming is a
change to `styles/tokens.css` only (plus the font import in `main.tsx` if the face changes):
the `Palette` block holds the only raw colours, and every role token derives from it. One
theme, no dark mode. Contrast ratios are listed at the top of the file.

Reduced motion: `prefers-reduced-motion: reduce` sets the motion duration tokens to ~0.
Looping animations (spinner, skeleton shimmer) handle it in their own CSS.

## Data in the mocks

`shared/mocks/` holds the four demo cases verbatim from contract section 9 and deterministic
answers for every endpoint. Disease ids, names, genes and extra HPO terms in the mocks were
checked against the JAX HPO and Monarch APIs on 2026-10-24. All frequencies, scores and
overlap labels in the mocks are illustrative, comparison candidates are named "Mock
comparison condition B/C/…", and the trials mock returns no studies.
