---
inclusion: always
---

# Team workflow

- Three people work in this repo at the same time from different laptops.
- Each person only edits their own folder: `app/` (builder), `landing/` (storyteller), `docs/` and `data/` (researcher). Shared files (`README.md`, `.kiro/`) are edited by the builder only, unless agreed in chat.
- Before starting work: pull / Sync. After each small working step: commit with a clear English message, then Sync.
- Never delete or rewrite another person's files. Never force-push.
- Never commit secrets (API keys, tokens). Use `.env`, which is gitignored.
- Write all project files (code comments, README, specs, UI copy, commit messages) in English.
- After using a Kiro feature in a new way (spec, hook, steering, MCP, property-based test, power, CLI, Crew), add one line to `docs/KIRO_USAGE.md`.
