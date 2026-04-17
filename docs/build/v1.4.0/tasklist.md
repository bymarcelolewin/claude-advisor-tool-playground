# Version Tasklist – v1.4.0
This document outlines all the tasks to work on to deliver this particular version, grouped by phases.

| Status |      |
|--------|------|
| 🔴 | Not Started |
| 🟡 | In Progress |
| 🟢 | Completed |

## Phase 1: UI Layout Restructure

Move the model selectors out of the header and into a dedicated config panel on the chat side, preparing the layout for the new effort dropdown.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 1.1 | Remove dropdowns from header | Remove executor/advisor/mode dropdowns from the main header bar in `public/index.html`. Keep only app title (left) + info/gear icons (right). | None | 🟢 Completed | AGENT |
| 1.2 | Create config panel markup | Add new config panel section in `public/index.html` on the chat side, above the chat header. Pane header titled "Config Models" with a layers icon, plus rows for EXECUTOR, ADVISOR, MODE labels + dropdowns. | 1.1 | 🟢 Completed | AGENT |
| 1.3 | Style config panel | Add CSS in `public/styles.css` for the config panel: header uses `--panel` (matches other pane headers), panel body uses `#262b37` (lighter gray for distinct elevation), compact vertical spacing, label + dropdown alignment per row. | 1.2 | 🟢 Completed | AGENT |
| 1.4 | Wire up JS for moved dropdowns | Update `public/app.js` so existing dropdown event handlers and state management work with the relocated dropdowns. Changed `modeLabelEl` from `.closest("label")` to `modeRowEl` using `.closest(".config-row")` for mode locking class. | 1.2 | 🟢 Completed | AGENT |
| 1.5 | Update header grid | Simplify the main header CSS grid in `public/styles.css` from 3-column grid to flex space-between (title left + icons right). Removed obsolete `.header-select` and `.header-actions` classes. | 1.1 | 🟢 Completed | AGENT |
| 1.6 | Test phase 1 | USER tests: dropdowns still work, mode locking still works after first message, styling looks right. | 1.1-1.5 | 🟢 Completed | USER |
| 1.7 | Commit phase 1 | USER commits phase 1 to git. | 1.6 | 🟢 Completed | USER |

## Phase 2: Effort Settings

Add the effort dropdown on the executor row and wire it through to the API.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 2.1 | Add effort dropdown markup | Added `<select id="effort">` on the same row as executor in `public/index.html` with options Low/Medium/High (default)/Max. Inline `EFFORT` label. | 1.2 | 🟢 Completed | AGENT |
| 2.2 | Add effort settings state | Added `effort` to `saveSettings`/`applySettings` in `public/app.js`. Default "high". Persists to localStorage. Added to auto-save listeners. | 2.1 | 🟢 Completed | AGENT |
| 2.3 | Disable effort for Haiku | `updateEffortAvailability()` in `public/app.js` disables the effort dropdown when executor starts with `claude-haiku`. Sets tooltip "Effort not supported for Haiku 4.5". Called on executor change and on load. | 2.2 | 🟢 Completed | AGENT |
| 2.4 | Send effort to server | Request payload includes `effort: effortEl.disabled ? null : effortEl.value`. | 2.2 | 🟢 Completed | AGENT |
| 2.5 | Apply effort to all branches on server | Added `withEffort(params)` helper in `server.js` that adds `output_config: { effort }` when effort is set and not "high". Applied to all three `buildXxxParams` functions. Also added `output_config` to the safe request copy for the Full I/O viewer. | 2.4 | 🟢 Completed | AGENT |
| 2.6 | Style effort dropdown | Added `.config-label-inline`, `.config-select-narrow`, and `.config-select:disabled` styles in `public/styles.css`. Effort dropdown sits flush after executor on the same row. | 2.1 | 🟢 Completed | AGENT |
| 2.7 | Lock effort after first turn | Added `setEffortLocked()` paralleling `setModeLocked()`. Coordinates with Haiku-disable logic via `effortLocked` state + refactored `updateEffortAvailability()`. Lock triggers on first send, unlocks on new conversation or first-send failure. | 2.1-2.6 | 🟢 Completed | AGENT |
| 2.8 | Show effort in dashboard | Added effort indicator to totals-legend (`Effort: <value>` or `n/a (Haiku)`). Styled with `.totals-legend-meta`. | 2.7 | 🟢 Completed | AGENT |
| 2.9 | Test phase 2 | USER tests: effort applies to all branches in compare mode, Haiku disables effort correctly, effort locks after first turn, dashboard shows effort correctly, all 4 effort levels produce different token counts. Also tested: executor + advisor locking, "n/a" display in effort dropdown for Haiku, yellow-styled effort legend item, "New Chat" button styling. | 2.1-2.8 | 🟢 Completed | USER |
| 2.10 | Commit phase 2 | USER commits phase 2 to git. | 2.9 | 🟢 Completed | USER |

## Phase 3: max_uses Setting & Advisor Call Counter

Add the `max_uses` input to settings and display advisor call counter in the trace.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 3.1 | Add max_uses input to settings | Added `<input type="number" min="1" step="1" placeholder="unlimited">` to Settings → Chat & Advisor. Label + detailed help text explaining cap behavior and `max_uses_exceeded` error. | None | 🟢 Completed | AGENT |
| 3.2 | Validate max_uses input | Added `parseMaxUses()` helper that accepts positive integers only; empty/invalid/non-integer → null. Blur handler normalizes the input field. | 3.1 | 🟢 Completed | AGENT |
| 3.3 | Send max_uses to server | `maxUses` captured at send-time via `turnMaxUses = parseMaxUses(maxUsesEl.value)` and included in the `/api/chat` request payload. | 3.2 | 🟢 Completed | AGENT |
| 3.4 | Add max_uses to advisor tool definition | Server `buildAdvisorParams()` includes `max_uses` on the advisor tool only when client sent a positive integer. | 3.3 | 🟢 Completed | AGENT |
| 3.5 | Show per-call counter on advisor step cards | `renderStep()` now accepts `opts.advisorCallIdx` + `opts.maxUses`. Shows "Advisor · call N of M" (cap set) or "Advisor · call N" (unlimited). `renderTurnCard()` counts advisor iterations and threads index through. | None | 🟢 Completed | AGENT |
| 3.6 | Show aggregate counter in turn summary | `renderTurnSummary()` now accepts `maxUses` — shows "N / M advisor calls" when cap is set, otherwise "N advisor calls". Only applies to advisor branch. | 3.5 | 🟢 Completed | AGENT |
| 3.7 | Test phase 3 | USER tested: max_uses validation works, server restart picked up max_uses in advisor tool definition, counter displays correctly on step cards ("Advisor · call 1 of 5") and turn summary ("N / M advisor calls"). Note: single-turn prompts often produce only 1 advisor call regardless of max_uses — the counter UI works correctly either way. | 3.1-3.6 | 🟢 Completed | USER |
| 3.8 | Commit phase 3 | USER commits phase 3 to git. | 3.7 | 🟢 Completed | USER |

## Phase 4: Caching Dropdown

Replace the caching checkbox with an Off / 5m / 1h dropdown.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 4.1 | Replace caching checkbox with dropdown | Replaced the "Enable advisor-side caching" checkbox with `<select>` containing Off (default) / 5 min / 1 hour in `public/index.html`. Updated help text to mention 1h for long-running agent loops. | None | 🟢 Completed | AGENT |
| 4.2 | Update caching state handling | Changed `advisorCaching` from boolean to string in `saveSettings`/`applySettings`. No migration needed (single-user project). | 4.1 | 🟢 Completed | AGENT |
| 4.3 | Send caching TTL to server | Request payload now sends `advisorCaching: advisorCachingEl.value` ("off"/"5m"/"1h"). | 4.2 | 🟢 Completed | AGENT |
| 4.4 | Update server to use caching TTL | Server's `buildAdvisorParams()` now checks for "5m" or "1h" and includes `caching: { type: "ephemeral", ttl: value }` using the selected TTL. "off" omits caching entirely. | 4.3 | 🟢 Completed | AGENT |
| 4.5 | Hide cache_r/cache_w from executor steps | Removed `cache_r` and `cache_w` metrics from non-advisor step cards in `renderStep()`. They were always 0 on executor steps (the app doesn't set `cache_control` breakpoints on executor content) and misleading. Now only advisor step cards show them — which is where they actually vary with the caching dropdown. | 4.4 | 🟢 Completed | AGENT |
| 4.6 | Test phase 4 | USER tested: all three caching options work, executor step cards no longer show cache_r/cache_w (only advisor steps do), Full I/O viewer shows correct `caching: { type: "ephemeral", ttl: "5m" | "1h" }` on the advisor tool. | 4.1-4.5 | 🟢 Completed | USER |
| 4.7 | Commit phase 4 | USER commits phase 4 to git. | 4.6 | 🟢 Completed | USER |

## Phase 5: Error Codes & Redacted Result Handling

Handle `advisor_tool_result_error` and `advisor_redacted_result` content types in the trace.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 5.1 | Detect advisor error content | Already existed via `hasAdvisorError()` and content-type checks in `blockPreview()`. Verified in place. | None | 🟢 Completed | AGENT |
| 5.2 | Map error codes to messages | Added `ADVISOR_ERROR_MESSAGES` map in `public/app.js` with all 6 Anthropic error codes (max_uses_exceeded, too_many_requests, overloaded, prompt_too_long, execution_time_exceeded, unavailable). | 5.1 | 🟢 Completed | AGENT |
| 5.3 | Style advisor error step cards | Red-tinted step styling already exists via `.step-error` CSS class. Block preview now shows bold human-readable message above the error code, plus a clarifying note that the request still succeeded. | 5.2 | 🟢 Completed | AGENT |
| 5.4 | Handle advisor_redacted_result | Updated redacted result rendering to show: "Advisor response is encrypted — content not visible to the client. The executor still received the plaintext advice server-side." Includes the encrypted_content length. | None | 🟢 Completed | AGENT |
| 5.5 | Test phase 5 | USER tested: `max_uses_exceeded` error displays correctly with red styling, bold human-readable message, error code, and clarifying note. Fixed minor grammar in the turn summary pill ("2 / 1 advisor call" → "2 / 1 advisor calls"). Redacted handling is future-proofed. | 5.1-5.4 | 🟢 Completed | USER |
| 5.6 | Commit phase 5 | USER commits phase 5 to git. | 5.5 | 🟢 Completed | USER |

## Phase 6: System Prompt Presets

Add Recommended / Precise / Custom preset dropdown above the system prompt textarea.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 6.1 | Define preset constants | Defined `SYSTEM_PROMPT_RECOMMENDED` (timing + advice treatment blocks from Anthropic docs), `SYSTEM_PROMPT_PRECISE` (Recommended + conciseness instruction at top), and the `SYSTEM_PROMPT_PRESETS` map. Added `detectSystemPromptPreset()` helper to derive active preset from text content. | None | 🟢 Completed | AGENT |
| 6.2 | Add preset dropdown markup | Added `<select id="system-prompt-preset">` above the textarea with options: Recommended, Precise, Custom. Updated the setting-hint to explain each preset. | None | 🟢 Completed | AGENT |
| 6.3 | Wire preset dropdown | On dropdown change, populate textarea with preset content and save. On load, derive the dropdown value from the current textarea content via `detectSystemPromptPreset()`. New users default to Recommended. | 6.1, 6.2 | 🟢 Completed | AGENT |
| 6.4 | Auto-switch to Custom on manual edit | Added `input` listener on textarea that re-derives the preset dropdown. Any divergence from Recommended or Precise (even whitespace) flips the dropdown to Custom. | 6.3 | 🟢 Completed | AGENT |
| 6.5 | Preserve custom content across preset swaps | Custom preset starts with a sentinel-tag skeleton. Added `customSystemPromptText` state + `customSystemPrompt` localStorage field that tracks the user's custom content separately from the active textarea value. Switching to Precise/Recommended and back to Custom now restores the user's previous work. | 6.4 | 🟢 Completed | AGENT |
| 6.6 | Test phase 6 | USER tested: all three presets load correctly, sentinels present in Recommended/Precise, Custom starts with sentinel skeleton, auto-switch to Custom works on manual edit, custom content survives preset round-trips. | 6.1-6.5 | 🟢 Completed | USER |
| 6.7 | Commit phase 6 | USER commits phase 6 to git. | 6.6 | 🟢 Completed | USER |

## Phase 7: Version Bump & Finalize

Bump version numbers, update release notes, write retrospective, final test.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 7.1 | Bump package.json version | Updated `package.json` version from "1.3.0" to "1.4.0". | All prior phases | 🟢 Completed | AGENT |
| 7.2 | Add lastUpdated field to package.json | Added `"lastUpdated": "2026-04-16"` field to `package.json`. | 7.1 | 🟢 Completed | AGENT |
| 7.3 | Expose lastUpdated from server | Updated `/api/version` endpoint to return `{ version, lastUpdated }` from `package.json`. | 7.2 | 🟢 Completed | AGENT |
| 7.4 | Add tagline + last updated to About modal | Added tagline: "A Playground for the [Claude Advisor Tool](link)" with the link opening in a new tab. Added "Last updated: YYYY-MM-DD" as a muted meta line at the bottom of the About card. Wired `/api/version` fetch to populate the date. Added `.about-tagline` and `.about-meta` styles. | 7.3 | 🟢 Completed | AGENT |
| 7.5 | Update README version badge | Bumped version badge to 1.4.0. | 7.1 | 🟢 Completed | AGENT |
| 7.5b | Update README content for v1.4.0 | Updated "Pick your models" section to describe the new Config Models panel + Effort dropdown + locking behavior. Added new subsections under "System prompts": Presets (Recommended/Precise/Custom), expanded Caching dropdown description (Off/5m/1h), and new "Capping advisor calls per request" section documenting `max_uses`. | 7.5 | 🟢 Completed | AGENT |
| 7.6 | Add release notes entry | Added comprehensive v1.4.0 entry to `release-notes.md` with Overview, Key Features, Enhancements, Bug Fixes, Other Notes sections. Updated TOC. | 7.1 | 🟢 Completed | AGENT |
| 7.7 | Update cody.json | Updated `version` to "1.4.0". (`updatedAt` was already 2026-04-16.) | 7.1 | 🟢 Completed | AGENT |
| 7.8 | Update feature backlog | Marked v1.4.0 status as 🟢 Completed. Marked all v1.4.0 features (F24–F32) as 🟢 Completed. | 7.1 | 🟢 Completed | AGENT |
| 7.9 | Update welcome slideshow | Updated Slide 3 step 1 from "from the dropdowns at the top" to "from the *Config Models* panel above the chat". | 7.1 | 🟢 Completed | AGENT |
| 7.10 | Write retrospective | Created `docs/build/v1.4.0/retrospective.md` covering summary, what went well, what could have gone better, lessons learned, and action items (incl. backlog items F33, F34 for follow-up). | 7.1 | 🟢 Completed | AGENT |
| 7.11 | Adaptive welcome slide | Restructured welcome Slide 4 into three numbered steps (API key / Eval setup / Try a prompt). Added `updateWelcomeNextSteps()` that hides already-configured steps and renumbers the remaining ones on each welcome open. | 7.9 | 🟢 Completed | AGENT |
| 7.12 | End-to-end test | USER tested: all features work together, About box shows correct version/last updated/tagline with working link, welcome slide adapts based on current config (confirmed by user: "adaptive welcome works great"). Server restart confirmed to pick up `/api/version` changes. | 7.1-7.11 | 🟢 Completed | USER |
| 7.13 | Final commit | USER commits version bump + release notes + retrospective + welcome update + About modal changes to git. | 7.12 | 🟢 Completed | USER |
