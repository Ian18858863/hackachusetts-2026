#!/usr/bin/env bash
#
# build-site.sh — build the whole site into a single dist/ folder at the repo root.
#
# Layout produced:
#   dist/            <- landing/dist (Peter's landing page, served at /)
#   dist/app/        <- app/dist     (Vite + React app, served at /app/)
#   functions/       <- stays at the repo root; Cloudflare Pages Functions (/api/*)
#
# Build (from anywhere):
#   ./scripts/build-site.sh
#
# Preview locally (from the repo root, serves dist/ plus functions/):
#   npx wrangler pages dev
#
# Deploy (from the repo root, after the team has approved deploying):
#   npx wrangler login                 # once per machine
#   ./scripts/build-site.sh
#   npx wrangler pages deploy          # reads wrangler.toml: project + dist/
#
#   Run deploy from the repo root so wrangler picks up ./functions and
#   ./wrangler.toml. The Pages project is "hackachusetts-2026".
#
# Requirements for the sub-projects:
#   - app/ must build to app/dist with Vite `base: "/app/"`, otherwise its
#     asset URLs point at /assets/... and break under /app/.
#   - landing/ must build to landing/dist and must not ship its own app/ folder.
#   - If landing/ has no package.json yet, a temporary dist/index.html that
#     links to /app/ is written instead.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT/app"
LANDING_DIR="$ROOT/landing"
DIST_DIR="$ROOT/dist"

log() { printf '[build-site] %s\n' "$*"; }
die() { printf '[build-site] ERROR: %s\n' "$*" >&2; exit 1; }

command -v npm >/dev/null 2>&1 || die "npm not found on PATH. Install Node.js (v20+)."

# Install dependencies (npm ci when a lockfile exists) and run `npm run build`
# inside the given directory; then check the expected output folder exists.
build_project() {
  local dir="$1" name="$2"
  log "Building $name ($dir)"
  (
    cd "$dir"
    if [ -f package-lock.json ]; then
      npm ci --no-audit --no-fund
    else
      log "$name has no package-lock.json; using npm install"
      npm install --no-audit --no-fund
    fi
    npm run build
  )
  [ -f "$dir/dist/index.html" ] || die "$name build finished but $dir/dist/index.html is missing. Check its build output directory."
}

# Fail fast, before touching dist/, if the app is not there yet.
[ -f "$APP_DIR/package.json" ] || die "app/package.json not found. The app (Vite + React + TypeScript) must exist in $APP_DIR before the site can be built."

log "Repo root: $ROOT"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# 1. Landing page -> dist/
if [ -f "$LANDING_DIR/package.json" ]; then
  build_project "$LANDING_DIR" "landing"
  [ ! -e "$LANDING_DIR/dist/app" ] || die "landing/dist/app exists and would clash with the app at /app/. Rename it in landing/."
  cp -R "$LANDING_DIR/dist/." "$DIST_DIR/"
  LANDING_RESULT="landing/dist -> dist/"
else
  log "landing/package.json not found; writing a TEMPORARY placeholder dist/index.html"
  cat > "$DIST_DIR/index.html" <<'HTML'
<!doctype html>
<!-- TEMPORARY placeholder written by scripts/build-site.sh because landing/ has no package.json yet. Replace by building landing/. -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hackachusetts 2026</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; }
    a { font-size: 1.25rem; padding: 0.75rem 1.25rem; }
  </style>
</head>
<body>
  <a href="/app/">Open the app</a>
</body>
</html>
HTML
  LANDING_RESULT="placeholder dist/index.html (TEMPORARY, landing/ not built)"
fi

# 2. App -> dist/app/
build_project "$APP_DIR" "app"
mkdir -p "$DIST_DIR/app"
cp -R "$APP_DIR/dist/." "$DIST_DIR/app/"

# Warn if the app was built without base "/app/" (root-absolute asset URLs).
if grep -Eq '(src|href)="/assets/' "$DIST_DIR/app/index.html"; then
  log "WARNING: dist/app/index.html references /assets/...; set base: \"/app/\" in app/vite.config.ts"
fi

FILE_COUNT="$(find "$DIST_DIR" -type f | wc -l | tr -d ' ')"
log "Done. Built:"
log "  landing: $LANDING_RESULT"
log "  app:     app/dist -> dist/app/"
log "  output:  $DIST_DIR ($FILE_COUNT files)"
log "Functions in $ROOT/functions are deployed alongside dist/ by 'npx wrangler pages deploy' (run from the repo root)."
