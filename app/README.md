# app/ — web app shell

Vite + React + TypeScript. Topic-neutral shell the team builds the real demo on.
Served under the base path **`/app/`**; the API is expected at the site root (`/api/*`).

## Run

```bash
cd app
npm install
npm run dev        # http://localhost:5173/app/
npm run typecheck  # tsc on src/ and vite.config.ts
npm run build      # typecheck + production build to app/dist (assets under /app/)
npm run preview    # serve app/dist at http://localhost:4173/app/
```

Node 20.19+ or 22.12+ (Vite 8 requirement).

### Backend in local dev

The status pill in the top bar calls `GET /api/health`. Without a backend it shows
**API offline (local)**, which is expected. To talk to a local backend, proxy `/api`:

```bash
API_PROXY_TARGET=http://localhost:8788 npm run dev
```

The pill counts the API as online only for a 2xx response with a JSON body, so an HTML
fallback page never looks healthy. Click the pill to check again.

## Structure

```
src/
  styles/tokens.css      design tokens (colour, type, spacing, radius, shadow, motion, layers)
  styles/base.css        reset and element defaults
  lib/                   theme (light/dark), API health hook, hash route hook
  components/ui/         reusable primitives (import from "components/ui")
  components/shell/      top bar, footer, status pill, placeholder home, component kit
```

## Design tokens

Pages and components use CSS variables only. To re-theme once art direction is approved,
change `--hue-accent` / `--chroma-accent`, the neutral tint and `--font-display` /
`--font-text` in `tokens.css`. Dark values live in the `:root[data-theme='dark']` block.
The theme follows the OS until the user toggles it (stored in `localStorage` as `app-theme`);
an inline script in `index.html` sets it before first paint.

Reduced motion: `prefers-reduced-motion: reduce` sets the motion duration tokens to ~0.
Looping animations (spinner, skeleton shimmer, status halo) handle it in their own CSS.

## Primitives

| Component | Notes |
|---|---|
| `Button` | `primary` / `secondary` / `ghost`, `sm` / `md`. The hover fill spreads from where the pointer enters. `loading` keeps size and focus. |
| `Card` | Static container with optional eyebrow, title, description, actions and footer. Not clickable by itself. |
| `Skeleton`, `SkeletonText`, `SkeletonGroup` | Group announces "Loading" once; blocks are `aria-hidden`. Static under reduced motion. |
| `EmptyState` | Icon, one-line title, short text, one action. |
| `ErrorState` | Same layout, danger tone, optional retry and hidden technical details. |
| `RevealText` | Headline characters go from blurred to sharp; screen readers get plain text. |
| `Icon`, `Spinner` | Inline SVG icons (no emoji); small busy indicator. |

See them all in both themes at **`/app/#primitives`** (internal page, not linked from the UI).

## Placeholder content

The product name ("Project name TBD"), the home screen (`BuildingState.tsx`) and the brand mark
are placeholders. Replace them once the topic and name are chosen. The home screen shows no data.
