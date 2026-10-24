#!/bin/sh
# preToolUse hook for the shell tool: block Git history/remote changes and deploys.
# Git push/reset/clean and deploys run only in separate, explicitly authorized
# integration sessions (docs/PROTOCOL.md 6A). Read-only Git commands stay allowed.
# Input: hook event JSON on stdin. Exit 2 blocks the tool call; stderr goes to the model.
# This is a guard against mistakes, not a sandbox.

payload=$(cat)

# Extract tool_input.command; if no JSON parser is available, scan the raw payload.
if command -v jq >/dev/null 2>&1; then
  cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)
elif command -v node >/dev/null 2>&1; then
  cmd=$(printf '%s' "$payload" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s).tool_input.command||""))}catch(e){}})')
else
  cmd=""
fi
[ -n "$cmd" ] || cmd=$payload

# Normalise whitespace so "git    push" and multi-line commands are caught.
norm=$(printf '%s' "$cmd" | tr '\n\t\r' '   ' | tr -s ' ')

# git [global options] <subcommand>, e.g. "git -C dir push" or "git --no-pager push".
git_opts='git( +-[A-Za-z]( +[^ -][^ ]*)?| +--[^ ]+)*'

reason=""
if printf '%s' "$norm" | grep -Eq "$git_opts +push( |$)"; then
  reason="git push"
elif printf '%s' "$norm" | grep -Eq "$git_opts +reset( +[^ ]+)* +--hard"; then
  reason="git reset --hard"
elif printf '%s' "$norm" | grep -Eq "$git_opts +clean( |$)"; then
  reason="git clean"
elif printf '%s' "$norm" | grep -Eq 'push( +[^ ]+)* +--force'; then
  reason="push --force"
elif printf '%s' "$norm" | grep -Eq 'wrangler( +-[^ ]+)* +(pages +)?deploy( |$)'; then
  reason="wrangler deploy"
fi

# Killing processes by name or pattern is forbidden on Ian's machine: a past
# pattern-based kill closed all of his apps. Matches pkill/killall anywhere in
# the command (after sudo, xargs, a pipe, ;, &&, or as /usr/bin/pkill).
if printf '%s' "$norm" | grep -Eq '(^|[ ;|&(`/])(pkill|killall)( |;|$)'; then
  echo "BLOCKED by .kiro/hooks/scripts/guard-shell.sh: pkill/killall (killing processes by name or pattern) is not allowed on this machine." >&2
  echo "Kill only an exact PID that this session started (e.g. kill <pid> using the PID saved from \$!). Never kill by name or pattern." >&2
  exit 2
fi

if [ -n "$reason" ]; then
  echo "BLOCKED by .kiro/hooks/scripts/guard-shell.sh: '$reason' is not allowed in this session." >&2
  echo "Git push/reset/clean and deploy steps run only in a separate, explicitly authorized integration session (docs/PROTOCOL.md section 6A). Read-only git commands (status, diff, log, show) are fine. Stop and report to your human instead." >&2
  exit 2
fi
exit 0
