# How we used Kiro

Judges score how deeply and strategically we used Kiro. Log every meaningful use here during the day; turn it into the final write-up at 18:00.

## Tools
- Kiro IDE:
- Kiro CLI: `kiro-cli chat` edited, committed and pushed a README change in the private test repo `Ian18858863/kiro-connection-test` (commit `28aac81`) to verify Kiro-to-GitHub access before the event.
- Kiro Crew / Web:

## Spec-driven development
- Specs created (`.kiro/specs/...`):
- How specs compared with vibe coding:

## Steering
- Not used yet. `.kiro/steering/team.md` and `.kiro/steering/design.md` are currently drafts written by Ian's assistant (Claude) outside Kiro. Kiro will re-author them: `design.md` under task T02 and `team.md` under task T02b.

## Agent hooks
-

## MCP
-

## Property-based testing
-

## Powers
-

## Log

Every row must describe an action Kiro actually performed, with evidence (a file path or commit). Teammates post their real usage lines in the group chat, and Ian's Kiro appends them here one at a time.

| Time (ET) | Human | Kiro feature | Exact action | Result | Evidence (path or commit) |
|---|---|---|---|---|---|
| 2026-10-24 07:50 | Ian | Kiro CLI (`kiro-cli chat`) | The CLI agent edited `README.md` in the private test repo `Ian18858863/kiro-connection-test`, then committed and pushed it | Kiro-to-GitHub access verified before the event | `Ian18858863/kiro-connection-test` commit `28aac81` ("Test commit from Kiro") |

## Corrections (not Kiro actions)

- 2026-10-24 10:58: An earlier log row claimed Kiro steering usage for `.kiro/steering/design.md`. That file was drafted by Ian's assistant (Claude) outside Kiro and committed in `c31e29f`; Kiro had not used it. Kiro will re-author it under task T02.
- `.kiro/steering/team.md` was also drafted by Ian's assistant (Claude) outside Kiro, in commits `926bfee` and `c9c7c03`. The earlier Steering bullet describing it was removed. Kiro will re-author it under task T02b.
