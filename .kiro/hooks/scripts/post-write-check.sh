#!/bin/sh
# postToolUse hook for file-write tools: typecheck the module that was just edited.
#   app/**    -> npm --prefix app run typecheck
#   engine/** -> npm --prefix engine run typecheck (or test), only if engine/package.json exists
# Silent and exit 0 when the check passes or the path is elsewhere.
# On failure: last 20 lines on stderr, exit 1 (shown as a warning). Never writes repo files.

TIMEOUT_SECS=${KIRO_CHECK_TIMEOUT_SECS:-90}
payload=$(cat)

json_get() { # $1 = jq filter
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$payload" | jq -r "$1 // empty" 2>/dev/null
  fi
}

if ! command -v jq >/dev/null 2>&1; then
  echo "post-write-check: jq not found, skipping typecheck." >&2
  exit 0
fi

# The code tool is in the write group but most of its operations only read.
op=$(json_get '.tool_input.operation')
if [ -n "$op" ] && [ "$op" != "pattern_rewrite" ]; then exit 0; fi

file=$(json_get '.tool_input.path')
[ -n "$file" ] || file=$(json_get '.tool_input.file_path')
[ -n "$file" ] || exit 0

root=$(json_get '.cwd')
[ -n "$root" ] || root=$(pwd)
root=$(git -C "$root" rev-parse --show-toplevel 2>/dev/null || printf '%s' "$root")

# Make the path relative to the repo root.
case "$file" in
  "$root"/*) rel=${file#"$root"/} ;;
  /*) exit 0 ;;   # absolute path outside this repo
  *) rel=${file#./} ;;
esac

case "$rel" in
  app/*) dir=app; script=typecheck ;;
  engine/*)
    dir=engine
    [ -f "$root/engine/package.json" ] || exit 0
    if [ -n "$(jq -r '.scripts.typecheck // empty' "$root/engine/package.json")" ]; then script=typecheck
    elif [ -n "$(jq -r '.scripts.test // empty' "$root/engine/package.json")" ]; then script=test
    else exit 0
    fi ;;
  *) exit 0 ;;
esac

if [ ! -d "$root/$dir/node_modules" ]; then
  echo "post-write-check: skipped $dir $script, $dir/node_modules is missing (run: npm --prefix $dir ci)." >&2
  exit 1
fi

log=$(mktemp "${TMPDIR:-/tmp}/kiro-check.XXXXXX") || exit 0
trap 'rm -f "$log"' EXIT

# POSIX timeout: a watcher polls once per second and kills the check after
# TIMEOUT_SECS; it exits by itself within a second once the check is done.
( cd "$root" && exec npm --prefix "$dir" run "$script" ) >"$log" 2>&1 &
pid=$!
(
  i=0
  while [ "$i" -lt "$TIMEOUT_SECS" ]; do
    sleep 1
    kill -0 "$pid" 2>/dev/null || exit 0
    i=$((i + 1))
  done
  kill "$pid" 2>/dev/null
) >/dev/null 2>&1 &
wait "$pid" 2>/dev/null
rc=$?

[ "$rc" -eq 0 ] && exit 0

if [ "$rc" -ge 128 ]; then
  echo "post-write-check: npm --prefix $dir run $script timed out after ${TIMEOUT_SECS}s (edited: $rel)." >&2
else
  echo "post-write-check: npm --prefix $dir run $script FAILED (exit $rc, edited: $rel). Last 20 lines:" >&2
fi
tail -n 20 "$log" >&2
exit 1
