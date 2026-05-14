# Patch – v1.3.0 — Conversation Totals Dashboard
This document captures the conversation totals dashboard, mode locking, and tile cleanup.

## Patch Version
v1.3.0 — Conversation Totals Dashboard

## Date
2026-04-13

## Type
Small Enhancement

## Original Prompt
Make branch comparisons easier to read at a glance across a whole conversation, not just per turn. Add cumulative totals and prevent mid-conversation mode changes that break comparison fairness.

## Problem
In compare mode, users could see per-turn deltas but had no way to see which branch was winning across the entire conversation. They had to mentally sum up costs, tokens, and timing across every turn. Additionally, nothing prevented users from switching modes mid-conversation, which would create branches with different turn counts and cold-start histories, making comparisons meaningless.

## Plan
- Add a conversation totals dashboard pinned at the top of the trace pane
- Show cumulative per-branch totals for input, output, cost, and time
- Add leader indicators (green arrow) marking the winning branch per metric
- Lock the mode dropdown after the first message is sent
- Clean up per-turn summary tiles (remove redundant cache tiles, add time)

## Solution
- **Conversation totals dashboard:** Five tiles (in, out, cost, time, turns) pinned at the top of the trace pane. Each metric tile shows per-branch values stacked in branch colors (purple/blue/amber). A legend below ties color to branch and shows actual model names (e.g., `ADVISOR · sonnet-4-6 → opus-4-6`). Auto-refreshes after each turn, hidden until the first turn completes.
- **Leader indicators:** In compare modes with 2+ branches, a small green `←` appears next to the lowest (winning) value in each tile. Ties marked on all tied branches. Branches with unknown pricing excluded from cost leader calculation.
- **Mode locking:** Mode dropdown locks after the first successful turn. Released on new conversation via `+` button. If the first send fails before recording a turn, the lock auto-releases so users can retry with a different mode.
- **Tile cleanup:** Per-turn summary tiles reduced from 5 to 4 — removed `cache_r` and `cache_w`, added `time`. Labels shortened from `input`/`output`/`est. cost` to `in`/`out`/`cost` to match the dashboard vocabulary.
- **CHANGELOG.md** created with full release history from v1.0.0 through v1.3.0.

## Files Changed

| File | Action |
|------|--------|
| public/app.js | Modified (dashboard rendering, mode locking, tile cleanup, +199/-13 lines) |
| public/index.html | Modified (dashboard container markup) |
| public/styles.css | Modified (dashboard styling, leader indicators, +132 lines) |
| package.json | Modified (version bump to 1.3.0) |
| package-lock.json | Modified |
| README.md | Modified (documented dashboard, mode locking) |
| CHANGELOG.md | Created (full release history) |
| images/claude-advistor-tool-playground.png | Modified (updated screenshot) |

## Testing Notes
- Start a conversation in "All three" compare mode
- Verify the dashboard appears after the first turn with all 5 tiles
- Send multiple turns and verify totals accumulate correctly
- Check the green `←` leader indicator appears next to the lowest value per metric
- Verify the Mode dropdown is disabled after the first turn
- Click `+` to start new conversation and verify Mode dropdown is re-enabled
- Verify per-turn summary shows 4 tiles (in/out/cost/time) not 5
