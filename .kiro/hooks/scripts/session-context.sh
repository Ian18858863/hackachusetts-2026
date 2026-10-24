#!/bin/sh
# agentSpawn hook: print the real Git state so the session starts with it in context.
# Read-only: uses --no-optional-locks so even `git status` does not touch the index.
root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "Not inside a Git repository: $(pwd)"
  exit 0
}
cd "$root" || exit 0

status=$(git --no-optional-locks status --short 2>&1)
echo "Repo root: $root"
echo "Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
echo "HEAD: $(git rev-parse HEAD 2>/dev/null)"
echo "git status --short:"
if [ -n "$status" ]; then echo "$status"; else echo "(clean)"; fi
exit 0
