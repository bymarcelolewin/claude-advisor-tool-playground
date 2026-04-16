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
| 3.1 | Add max_uses input to settings | Add `<input type="number" min="1" step="1">` to Settings → Chat & Advisor section in `public/index.html`. Label: "Max advisor calls per request". Help text: "Leave empty for unlimited". | None | 🔴 Not Started | AGENT |
| 3.2 | Validate max_uses input | In `public/app.js`, validate on input: strip non-numeric, reject decimals, reject zero and negatives. Empty = unlimited. Persist to localStorage (number or empty string). | 3.1 | 🔴 Not Started | AGENT |
| 3.3 | Send max_uses to server | Include `maxUses` in the `/api/chat` request payload. | 3.2 | 🔴 Not Started | AGENT |
| 3.4 | Add max_uses to advisor tool definition | In `server.js`, when `maxUses` is provided and is a positive integer, include `max_uses` in the advisor tool definition. Otherwise omit. | 3.3 | 🔴 Not Started | AGENT |
| 3.5 | Show per-call counter on advisor step cards | In `public/app.js` trace rendering, show "Advisor call N" (or "Advisor call N of M" when max_uses is set) on each advisor step card. Count advisor iterations. | None | 🔴 Not Started | AGENT |
| 3.6 | Show aggregate counter in turn summary | Enhance turn summary in `public/app.js` to show "N / M advisor calls" when max_uses is set, or just "N advisor calls" when unlimited. | 3.5 | 🔴 Not Started | AGENT |
| 3.7 | Test phase 3 | USER tests: max_uses validation works, advisor respects the cap, counter displays correctly on step cards and turn summary. | 3.1-3.6 | 🔴 Not Started | USER |
| 3.8 | Commit phase 3 | USER commits phase 3 to git. | 3.7 | 🔴 Not Started | USER |

## Phase 4: Caching Dropdown

Replace the caching checkbox with an Off / 5m / 1h dropdown.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 4.1 | Replace caching checkbox with dropdown | In `public/index.html`, replace the "Enable advisor-side caching" checkbox with a `<select>` dropdown containing: Off (default), 5 min, 1 hour. | None | 🔴 Not Started | AGENT |
| 4.2 | Update caching state handling | In `public/app.js`, change `advisorCaching` setting from boolean to string ("off" / "5m" / "1h"). Default to "off". | 4.1 | 🔴 Not Started | AGENT |
| 4.3 | Send caching TTL to server | Update request payload to send the selected caching value instead of boolean. | 4.2 | 🔴 Not Started | AGENT |
| 4.4 | Update server to use caching TTL | In `server.js`, read the caching value. If "off", omit caching from tool definition. If "5m" or "1h", include `caching: { type: "ephemeral", ttl: value }`. | 4.3 | 🔴 Not Started | AGENT |
| 4.5 | Test phase 4 | USER tests: all three caching options work, 1h option produces expected cache hits on long-running conversations. | 4.1-4.4 | 🔴 Not Started | USER |
| 4.6 | Commit phase 4 | USER commits phase 4 to git. | 4.5 | 🔴 Not Started | USER |

## Phase 5: Error Codes & Redacted Result Handling

Handle `advisor_tool_result_error` and `advisor_redacted_result` content types in the trace.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 5.1 | Detect advisor error content | In `public/app.js` trace rendering, check for `advisor_tool_result_error` content type on advisor tool results. | None | 🔴 Not Started | AGENT |
| 5.2 | Map error codes to messages | Add error code → human-readable message mapping (6 codes: max_uses_exceeded, too_many_requests, overloaded, prompt_too_long, execution_time_exceeded, unavailable). | 5.1 | 🔴 Not Started | AGENT |
| 5.3 | Style advisor error step cards | Add red-tinted styling in `public/styles.css` for error step cards. Show error code badge + human-readable description. | 5.2 | 🔴 Not Started | AGENT |
| 5.4 | Handle advisor_redacted_result | In `public/app.js`, when content.type is `advisor_redacted_result`, render a muted notice: "Advisor response is encrypted — content not visible to client". | None | 🔴 Not Started | AGENT |
| 5.5 | Test phase 5 | USER tests: error codes display correctly (can simulate via max_uses=1 + multi-call prompt). Redacted handling is future-proofed (no current way to trigger). | 5.1-5.4 | 🔴 Not Started | USER |
| 5.6 | Commit phase 5 | USER commits phase 5 to git. | 5.5 | 🔴 Not Started | USER |

## Phase 6: System Prompt Presets

Add Recommended / Precise / Custom preset dropdown above the system prompt textarea.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 6.1 | Define preset constants | In `public/app.js`, define three constants: `SYSTEM_PROMPT_RECOMMENDED` (timing guidance + advice treatment from Anthropic docs, wrapped in sentinels), `SYSTEM_PROMPT_PRECISE` (Recommended + conciseness instruction), `SYSTEM_PROMPT_CUSTOM` (empty string). | None | 🔴 Not Started | AGENT |
| 6.2 | Add preset dropdown markup | Add a `<select>` dropdown above the system prompt textarea in Settings → Chat & Advisor section of `public/index.html`. Options: Recommended (default), Precise, Custom. | None | 🔴 Not Started | AGENT |
| 6.3 | Wire preset dropdown | In `public/app.js`, populate textarea with preset content when preset is selected. Persist selected preset to localStorage. Default to Recommended. | 6.1, 6.2 | 🔴 Not Started | AGENT |
| 6.4 | Auto-switch to Custom on manual edit | Listen for manual edits to the textarea. If content diverges from the selected preset's content, switch dropdown to "Custom" automatically. | 6.3 | 🔴 Not Started | AGENT |
| 6.5 | Test phase 6 | USER tests: all three presets load correctly, sentinels present in Recommended/Precise, Custom starts blank, auto-switch to Custom works on manual edit. | 6.1-6.4 | 🔴 Not Started | USER |
| 6.6 | Commit phase 6 | USER commits phase 6 to git. | 6.5 | 🔴 Not Started | USER |

## Phase 7: Version Bump & Finalize

Bump version numbers, update release notes, write retrospective, final test.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 7.1 | Bump package.json version | Update `package.json` version from "1.3.0" to "1.4.0". | All prior phases | 🔴 Not Started | AGENT |
| 7.2 | Add lastUpdated field to package.json | Add a `"lastUpdated": "YYYY-MM-DD"` field to `package.json` with today's date. This field will be the source of truth for "last updated" across the app. | 7.1 | 🔴 Not Started | AGENT |
| 7.3 | Expose lastUpdated from server | Update `/api/version` endpoint in `server.js` to also return `lastUpdated` from package.json alongside the version. | 7.2 | 🔴 Not Started | AGENT |
| 7.4 | Add tagline + last updated to About modal | In `public/index.html` About modal, add below the title: "A Playground for the [Claude Advisor Tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool)" (with the link opening in a new tab). Also add a "Last updated: YYYY-MM-DD" line that reads the value from `/api/version`. Update `public/app.js` to fetch and populate the lastUpdated field. | 7.3 | 🔴 Not Started | AGENT |
| 7.5 | Update README version badge | Update version badge in `README.md` to v1.4.0. | 7.1 | 🔴 Not Started | AGENT |
| 7.6 | Add release notes entry | Add v1.4.0 entry to `release-notes.md` at the project root with all changes. Update the TOC. | 7.1 | 🔴 Not Started | AGENT |
| 7.7 | Update cody.json | Update `cody.json` in project root: set `version` to "1.4.0" and `updatedAt` to today's date. | 7.1 | 🔴 Not Started | AGENT |
| 7.8 | Update feature backlog | Mark v1.4.0 status as 🟢 Completed in `docs/build/feature-backlog.md`. Mark all v1.4.0 features as 🟢 Completed. | 7.1 | 🔴 Not Started | AGENT |
| 7.9 | Update welcome slideshow | In `public/index.html`, update Slide 3 step 1 to reference the new config panel location instead of "at the top" (where the dropdowns used to be in the header). Review all other welcome content for accuracy against v1.4.0. | 7.1 | 🔴 Not Started | AGENT |
| 7.10 | Write retrospective | Create `docs/build/v1.4.0/retrospective.md` from the template. Fill in what went well, what could have gone better, lessons learned, action items. | 7.1 | 🔴 Not Started | AGENT |
| 7.11 | End-to-end test | USER performs full end-to-end test: all features work together, no regressions in existing functionality. About box shows correct version, last updated date, and tagline with working link. | 7.1-7.10 | 🔴 Not Started | USER |
| 7.12 | Final commit | USER commits version bump + release notes + retrospective + welcome update + About modal changes to git. | 7.11 | 🔴 Not Started | USER |
