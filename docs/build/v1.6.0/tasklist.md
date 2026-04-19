# Version Tasklist – v1.6.0 — Advisor Tool API Catch-up (Opus 4.7)
This document outlines all the tasks to work on to deliver this particular version, grouped by phases.

| Status |      |
|--------|------|
| 🔴 | Not Started |
| 🟡 | In Progress |
| 🟢 | Completed |

## Phase 1: Opus 4.7 Models + Pricing (F36)

Add `claude-opus-4-7` to the executor dropdown and make it the only advisor option. Confirm and record pricing. Update the cost-estimates blurb. Foundational phase — F37 (xhigh) gates on the executor being Opus 4.7, so this lands first.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 1.1 | Look up pricing | Fetched `https://platform.claude.com/docs/en/about-claude/pricing`. Recorded rates: Opus 4.7 = $5/$25 per MTok, Opus 4.6 = $5/$25 per MTok (corrects stale $15/$75 in our code), Sonnet 4.6 = $3/$15, Haiku 4.5 = $1/$5. Also noted: Opus 4.7 uses a new tokenizer that may use up to 35% more tokens for the same text. | None | 🟢 Completed | AGENT |
| 1.2 | Add Opus 4.7 to executor dropdown | Added `<option value="claude-opus-4-7">claude-opus-4-7</option>` after the 4.6 entry in `public/index.html`. Default selection unchanged (Sonnet 4.6). | None | 🟢 Completed | AGENT |
| 1.3 | Replace advisor dropdown option | Replaced `claude-opus-4-6` with `claude-opus-4-7` as the sole advisor option in `public/index.html`, selected by default. | None | 🟢 Completed | AGENT |
| 1.4 | Fix Opus 4.6 price + add Opus 4.7 to PRICES table | Corrected `claude-opus-4-6` from `{ in: 15.0, out: 75.0 }` to `{ in: 5.0, out: 25.0 }` in `public/app.js`. Added `"claude-opus-4-7": { in: 5.0, out: 25.0 }`. | 1.1 | 🟢 Completed | AGENT |
| 1.5 | Update cost-estimates blurb | Corrected Opus 4.6 to "$5/$25", added Opus 4.7 at "$5/$25", and appended tokenizer note about Opus 4.7's ~35% token-count overhead. | 1.1 | 🟢 Completed | AGENT |
| 1.6 | Test phase 1 | USER confirmed Phase 1 working end-to-end after the post-ship `setSelectIfValid` fix for the blank-advisor bug. (Note: the blank-advisor bug surfaced during this test and is captured in the retrospective.) | 1.2-1.5 | 🟢 Completed | USER |
| 1.7 | Commit phase 1 | Rolled into the single final push at the end of v1.6.0 rather than a per-phase commit. | 1.6 | 🟢 Completed | USER |

## Phase 2: xHigh Effort Level (F37)

Add `xhigh` to the effort dropdown, gate it on executor = Opus 4.7, and preserve the user's selection across executor changes. Depends on Phase 1 because `claude-opus-4-7` must exist in the executor dropdown first.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 2.1 | Add xhigh option handling | Kept xhigh OUT of the HTML select (to match the existing `ensureNaOption`/`removeNaOption` JS-managed pattern and avoid a flash of xhigh on initial render when default executor is Sonnet). Added via JS in `ensureXhighOption()`. | Phase 1 | 🟢 Completed | AGENT |
| 2.2 | Update effort tooltip | Extended the `title` attribute on `#effort` in `public/index.html`: "Controls thinking depth and overall token spend. Applies to the executor, not the advisor sub-inference. Not supported on Haiku 4.5. xHigh is Opus 4.7 only." | None | 🟢 Completed | AGENT |
| 2.3 | Extend updateEffortAvailability for xhigh | Added `ensureXhighOption()` and `removeXhighOption()` in `public/app.js` mirroring the na-option helpers. In `updateEffortAvailability`, when executor is Opus 4.7 ensure xhigh is present; otherwise remove it and if `effortEl.value === "xhigh"` save to `savedEffortValue` and demote to `"high"`. Also added a guard in the restore path: if saved value is xhigh but current executor is not Opus 4.7, restore "high" instead. | 2.1 | 🟢 Completed | AGENT |
| 2.4 | Preserve xhigh across executor switches + init restore | Saved savedEffortValue restore path handles xhigh symmetrically. Also patched `applySettings` to call `ensureXhighOption()` before setting `effortEl.value = "xhigh"` at page load — without this, a saved "xhigh" would be silently dropped because `updateEffortAvailability()` hasn't run yet. | 2.3 | 🟢 Completed | AGENT |
| 2.5 | Test phase 2 | USER confirmed Phase 2 working end-to-end after the post-ship `savedEffortValue` rewrite. Original implementation had two bugs: (1) the restore path only fired when `effortEl.value === "na"`, so Sonnet→Opus-4.7 round-trips silently lost xHigh, and (2) the Haiku branch clobbered the saved xhigh intent with the post-demotion "high". Fix decoupled `savedEffortValue` from `updateEffortAvailability` via a dedicated change handler that tracks user selections; also added a patch-save to prevent stale localStorage after demotion/restore. All four test scenarios (Sonnet round-trip, Haiku round-trip, explicit override preserved, page-refresh persistence) now pass. Captured in retrospective. | 2.1-2.4 | 🟢 Completed | USER |
| 2.6 | Commit phase 2 | Rolled into the single final push at the end of v1.6.0 rather than a per-phase commit. | 2.5 | 🟢 Completed | USER |

## Phase 3: Evaluator Judge Upgrade to Opus 4.7 (F38)

One string change on the server, two label updates on the client. Small phase but worth isolating so the commit is clean.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 3.1 | Update EVAL_MODEL_ANTHROPIC | Changed `EVAL_MODEL_ANTHROPIC` in `server.js` from `"claude-opus-4-6"` to `"claude-opus-4-7"`. | None | 🟢 Completed | AGENT |
| 3.2 | Update Settings modal evaluator label + hint | Updated the `setting-hint` and the `anthropic` dropdown option label in `public/index.html` to reference `claude-opus-4-7`. | None | 🟢 Completed | AGENT |
| 3.3 | Test phase 3 | USER confirmed Phase 3 working. During review: user asked what effort the evaluator uses → confirmed it's `high` (API default, `callAnthropicJudge` doesn't set `output_config.effort`). Settings modal hint rewritten to remove the stale "hardcoded" note and add effort-level documentation plus a clarification that the Config Models Effort setting applies only to the executor, not the judge. | 3.1-3.2 | 🟢 Completed | USER |
| 3.4 | Commit phase 3 | Rolled into the single final push at the end of v1.6.0 rather than a per-phase commit. | 3.3 | 🟢 Completed | USER |

## Phase 4: Caching-Consistency Lock (F39)

Lock the Advisor Caching dropdown in the Settings modal after the first successful turn. Mirrors the existing Mode/Executor/Advisor/Effort lock pattern but lives in the Settings modal. `disabled` + tooltip only (no visual-parity CSS per decision in design §5 Q4).

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 4.1 | Add setCachingLocked helper | Added `setCachingLocked(locked)` in `public/app.js` alongside `setAdvisorLocked`. Toggles `advisorCachingEl.disabled` and swaps the `title` between default (captured from the element's initial `title`, which is empty for this select, so defaults to `""`) and the locked message. | None | 🟢 Completed | AGENT |
| 4.2 | Wire into first-turn lock | Added `setCachingLocked(true)` alongside the existing lock calls on first-turn send. Added matching `setCachingLocked(false)` in both unlock paths: the `finally` block when send fails before a turn records, and the new-chat reset handler. | 4.1 | 🟢 Completed | AGENT |
| 4.3 | Update caching hint | Extended the hint text at `public/index.html:98`: "…Set once and leave — changing mid-conversation shifts the cache prefix and causes misses, so this dropdown locks after the first message." | None | 🟢 Completed | AGENT |
| 4.4 | Test phase 4 | USER confirmed the caching-consistency lock works end-to-end: dropdown editable before first message, disabled with the locked tooltip after the first successful turn, re-enabled on ＋ new-chat. | 4.1-4.3 | 🟢 Completed | USER |
| 4.5 | Commit phase 4 | Rolled into the single final push at the end of v1.6.0 rather than a per-phase commit. | 4.4 | 🟢 Completed | USER |

## Phase 5: Reference Doc Refresh

Consolidate all changes to `docs/reference/claude-advisor-tool-updates.md` into one commit so the reference file reflects the April 2026 doc state coherently.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 5.1 | Update Current API Status | Updated executor list to add Opus 4.7, advisor list to Opus 4.7-only. Added full executor/advisor compatibility table from Anthropic's docs. Noted 4.6 may still be accepted during a grace period but code should default to 4.7. | None | 🟢 Completed | AGENT |
| 5.2 | Update Effort Settings section | Rewrote the section to include a full per-level availability table. Documented `xhigh` as Opus 4.7-only with guidance on when to use it. Added Opus 4.7-specific notes: stricter effort adherence, no manual extended thinking, set large `max_tokens` at xhigh/max. | None | 🟢 Completed | AGENT |
| 5.3 | Update Caching Details section | Added the "Keep caching consistent" warning alongside the existing `clear_thinking` warning. Noted that the playground enforces this via the lock added in Phase 4. | None | 🟢 Completed | AGENT |
| 5.4 | Add pricing URL + snapshot | Added the pricing URL to Source URLs. Added a new "Pricing Snapshot" section with the verified rates (Opus 4.7/4.6 at $5/$25, Sonnet 4.6 at $3/$15, Haiku 4.5 at $1/$5), cache multipliers, batch discount, data-residency multiplier, and a note that we were previously carrying stale $15/$75 for Opus 4.6. | None | 🟢 Completed | AGENT |
| 5.5 | Bump Last reviewed date | Updated "Last reviewed: 2026-04-16" → "2026-04-18". | None | 🟢 Completed | AGENT |
| 5.6 | Update `/check-advisor-tool-updates` command | Added the pricing URL as a third WebFetch in Step 3 and renumbered the Compare step. Added "Model pricing (input/output rates per MTok, cache multipliers, tokenizer changes)" to the "Look specifically for changes in" list with a pointer to the `PRICES` table and the Pricing Snapshot section of the reference doc. | None | 🟢 Completed | AGENT |
| 5.7 | Test phase 5 | USER reads the reference doc end-to-end and confirms it matches the current state of Anthropic's docs. Also verifies the updated command file references the pricing URL. | 5.1-5.6 | 🔴 Not Started | USER |
| 5.8 | Commit phase 5 | Rolled into the single final push at the end of v1.6.0 rather than a per-phase commit. | 5.7 | 🟢 Completed | USER |

## Phase 6: Version Bump & Finalize

Bump the version, refresh user-facing content, write release notes and retrospective, mark the version done. Last phase — depends on Phases 1-5 being implemented.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 6.1 | Bump version in package.json | Updated `version` from `1.5.0` to `1.6.0` and `lastUpdated` to `2026-04-18`. `/api/version` propagates to header, welcome modal, settings, and About modal. | Phases 1-5 | 🟢 Completed | AGENT |
| 6.2 | Verify index.html no hardcoded version | Grep confirmed no `v1.5.0` or `1.5.0` references in `public/index.html`. No edits needed. | 6.1 | 🟢 Completed | AGENT |
| 6.3 | Update README.md | Bumped version badge (1.5.0 → 1.6.0). Updated Config Models section to include Opus 4.7 executor, xHigh effort level, and Opus 4.7 as advisor. Updated Evaluation section + per-eval cost line to reference Opus 4.7. Updated Release Notes pointer to highlight v1.6.0. | 6.1 | 🟢 Completed | AGENT |
| 6.4 | Review Welcome slideshow | Reviewed. Decision: no slide changes. v1.6.0 is an API catch-up / model refresh, not a new user-facing surface; adding a slide would dilute the onboarding narrative focused on the advisor strategy itself. Users will see the new executor and xHigh options naturally in the Config Models panel. Version string in the welcome header auto-updates from `/api/version`. | 6.1 | 🟢 Completed | AGENT |
| 6.5 | Review About modal | Verified: About modal populates version + `last-updated` from `/api/version`. Bumping `package.json` in 6.1 flows through automatically. No manual changes needed. | 6.1 | 🟢 Completed | AGENT |
| 6.6 | Update release-notes.md | Added v1.6.0 entry at the top with ToC link. Covers Key Features (Opus 4.7 models, xHigh effort, judge upgrade, caching lock), Enhancements (Opus 4.6 price correction, tokenizer note, reference doc refresh, command hardening), Bug Fixes (stale Opus 4.6 price), and Other Notes (Code View compatibility, Opus 4.6-as-advisor grace period, max_tokens guidance for xHigh). | 6.1 | 🟢 Completed | AGENT |
| 6.7 | Update feature backlog status | Changed v1.6.0 section header to `🟢 Completed`. Marked F36-F40 as `🟢 Completed`. Descriptions reflect what shipped including the bundled Opus 4.6 price correction and the new F40 for the pricing source-of-truth hardening. | 6.6 | 🟢 Completed | AGENT |
| 6.8 | Update cody.json | Set `version` to `1.6.0` and `updatedAt` to `2026-04-18` in the `cody-product-builder` section. | 6.1 | 🟢 Completed | AGENT |
| 6.9 | Write retrospective | Created `docs/build/v1.6.0/retrospective.md`. Captures what went well (diff-driven workflow, user intuition catching stale price, strengthened command, clean xhigh pattern, applySettings edge-case catch, no Code View changes needed, caching lock scoped right), what didn't (first pricing fetch ambiguity, xhigh HTML-vs-JS flip, stale 4.6 price going undetected, rough per-eval numbers), lessons learned, and action items. | 6.7 | 🟢 Completed | AGENT |
| 6.10 | Final test | USER runs the full app end-to-end, verifies version strings show 1.6.0, verifies all four features work, confirms no regressions. | 6.1-6.9 | 🟢 Completed | USER |
| 6.11 | Commit phase 6 | Rolled into the single final push at the end of v1.6.0 — one push for the entire version. | 6.10 | 🟢 Completed | USER |
