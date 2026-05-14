# Version Tasklist – v1.7.0 — Sample Prompts Library
This document outlines all the tasks to work on to deliver this particular version, grouped by phases.

**Execution mode (USER decision 2026-05-14):** AGENT runs Phases 1–7 end-to-end without pausing for per-phase USER smoke tests. The per-phase smoke tests originally planned at the end of each phase are deferred and consolidated into a single comprehensive USER test in Phase 7 (task 7.9). USER reviews + tests the full feature once at the end, then commits.

| Status |      |
|--------|------|
| 🔴 | Not Started |
| 🟡 | In Progress |
| 🟢 | Completed |

## Phase 1: Data + Loader (F45)

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| 1.1 | Create `public/sample-prompts.json` | Eight seed prompts in the locked order (3 triggers + 2 skips visible inline, remaining 3 behind See-all). Schema: `{ prompts: [{ title, prompt, shouldTriggerAdvisor: bool, complexity: "quick"\|"standard"\|"heavy" }] }`. Copy verbatim from the locked mockup's seed data — same titles, bodies, booleans, complexity tiers, same order. | None | 🟢 Completed | AGENT |
| 1.2 | Add fetch + parse helper in `public/app.js` | New `loadSamplePrompts()` async function — `fetch("/sample-prompts.json")` → `await response.json()` → validate (must be an object with a `prompts` array of objects each having `title`, `prompt`, `shouldTriggerAdvisor` boolean). Normalize `complexity` to `"standard"` if missing or unrecognized. Returns array (empty on any failure). `console.warn()` on parse / schema errors — never throw. | 1.1 | 🟢 Completed | AGENT |
| 1.3 | Wire loader into app init | Call `loadSamplePrompts()` once on page load alongside `/api/version` fetch. Store result in `samplePrompts` module-level variable. If empty, the rest of the rendering paths must no-op silently. | 1.2 | 🟢 Completed | AGENT |
| 1.4 | Verify static serving | Confirm Express's existing `app.use(express.static("public"))` (or equivalent) serves the new file at `GET /sample-prompts.json`. No server changes expected; flag if any are needed. | 1.1 | 🟢 Completed | AGENT |

## Phase 2: CSS + Markup Scaffolding (F46 + F48)

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| 2.1 | Add CSS variables | Append to the existing `:root` block in `public/styles.css`: `--triggers: #20c05b;` and `--skips: #e0b25c;`. (Use the same values as the locked mockup.) | None | 🟢 Completed | AGENT |
| 2.2 | Add Sample Prompts CSS section | New `/* === Sample Prompts (v1.7.0) === */` section appended near the bottom of `public/styles.css` (after Code View). Port styles verbatim from the locked mockup: `.sample-prompts-area`, `.sample-prompts-full`, `.pill-row`, `.prompt-pill`, `.pill-dot`, `.pill-tooltip`, `.see-all-pill`, `.sample-prompts-collapsed`, and the See-all modal classes (`.sample-prompts-modal-*`, `.modal-filter`, `.filter-pill`, `.prompt-card*`, `.complexity-meter`, `.insert-btn`). Adapt class prefixes if needed to avoid collisions with the existing `.modal-*` / `.prompt-*` classes elsewhere in the app. | 2.1 | 🟢 Completed | AGENT |
| 2.3 | Inject pill row markup into `index.html` | Insert `<div class="sample-prompts-area" id="sample-prompts-area">` containing the full-state container (header label + collapse button + pill-row) and the collapsed-state single pill. Place it as a sibling **immediately above** `.chat-input-row` inside the chat pane. Markup mirrors the mockup. Pill row is rendered dynamically by JS, so no static pills in the HTML. | 2.2 | 🟢 Completed | AGENT |
| 2.4 | Inject See-all modal markup into `index.html` | Add the modal as a sibling of the existing Code View / Settings / About modals (near the bottom of `<body>`). `role="dialog"` `aria-modal="true"` `aria-labelledby="sample-prompts-modal-title"`. Includes header (title + close `×`), filter row (3 `.filter-pill` buttons with data-filter attributes), body (`#sample-prompts-modal-body`, empty), and footer (hint text + count placeholder). | 2.2 | 🟢 Completed | AGENT |

## Phase 3: Inline Pill Row Rendering + Insert Logic (F46 + F49)

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| 3.1 | Implement `renderPillRow()` | Reads `samplePrompts`, takes first 5 entries, builds each `.prompt-pill` button with `.pill-dot` (triggers/skips class), title text, and `.pill-tooltip` containing title + truncated body + badge. Uses `.textContent` for all prompt-body text (never `.innerHTML`). Appends a `.see-all-pill` (`+ See all (N)`) at the end. Wires `click` on each pill to `insertSamplePrompt(p.prompt)` and click on see-all to open the modal. Defer the See-all wiring to Phase 4 (modal not yet built) — use a no-op for now. | 1.3, 2.3 | 🟢 Completed | AGENT |
| 3.2 | Implement `insertSamplePrompt()` with confirm-replace | New helper. If `chatInputEl.value.trim()` is empty → insert directly via `chatInputEl.value = text; chatInputEl.focus()`. If not empty → fire the existing confirm modal (`#confirm-modal`) configured with title "Replace current message?", body explanation, "Replace" primary, "Keep my text" ghost. On confirm → insert. Auto-resize the textarea after insert (the app already auto-grows on input — fire an `input` event if needed). | 3.1 | 🟢 Completed | AGENT |
| 3.3 | Reuse existing confirm modal | Audit `#confirm-modal` in `public/index.html` + its handler in `public/app.js`. Confirm it accepts dynamic title / body / button labels. If it currently hardcodes anything, refactor minimally to accept an options object (`{ title, body, okLabel, cancelLabel, onOk }`). Do NOT create a parallel modal. | 3.2 | 🟢 Completed | AGENT |
| 3.4 | Tooltip behavior — accessibility | Ensure `.pill-tooltip` is visible on both `:hover` AND `:focus-within` of the pill, so keyboard users tabbing through the pill row can also see previews. Hide on blur. | 3.1 | 🟢 Completed | AGENT |
| 3.5 | Wire manual collapse `▾` button | Click handler on the header collapse button: hide `.sample-prompts-full`, show `.sample-prompts-collapsed`. Set internal `samplePromptsCollapsed = true`. (No persistence — JS memory only.) | 3.1 | 🟢 Completed | AGENT |
| 3.6 | Wire collapsed-pill re-expand | Click handler on `.sample-prompts-collapsed`: show `.sample-prompts-full`, hide `.sample-prompts-collapsed`. Set `samplePromptsCollapsed = false`. | 3.5 | 🟢 Completed | AGENT |

## Phase 4: See-all Modal + Filter Chips + Complexity Meter (F48 + F50)

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| 4.1 | Implement `openSeeAllModal()` / `closeSeeAllModal()` | Show/hide via `.open` class on `.sample-prompts-modal-overlay`. On open: call `renderModalCards(currentFilter)`, set initial focus to the active filter chip for keyboard accessibility. Close: click `×`, click backdrop, Esc key. Mirror the existing modal-close patterns (Code View / Settings). | 2.4 | 🟢 Completed | AGENT |
| 4.2 | Wire See-all pill to open modal | Replace the no-op from 3.1 with the actual `openSeeAllModal()` call. | 3.1, 4.1 | 🟢 Completed | AGENT |
| 4.3 | Implement `renderModalCards(filter)` | Builds prompt cards from `samplePrompts`, filtered by `filter` ∈ `"all" \| "triggers" \| "skips"`. Each card includes: `.complexity-meter` (3 bars with `data-tier`), title, `.prompt-card-badge`, `.insert-btn` (the `+` button), `.prompt-card-body` (2-line clamp), `.prompt-card-hint`. Click on card body / non-button area = toggle `.expanded` (CSS removes the line-clamp). Click on `+` = `insertSamplePrompt(p.prompt, { fromModal: true })` → on success, close the modal. Use `stopPropagation()` on the `+` handler so card-expand doesn't also fire. Footer count updates: `${filtered.length} of ${PROMPTS.length} prompts`. | 4.1, 3.2 | 🟢 Completed | AGENT |
| 4.4 | Wire filter chips | Click handler on each `.filter-pill`: remove `.active` from siblings, add to clicked, update `currentFilter` state, call `renderModalCards(currentFilter)`. Modal height stays fixed (CSS already locked at `min(640px, 85vh)`). | 4.3 | 🟢 Completed | AGENT |
| 4.5 | Complexity meter — tooltip wording | Hover the `.complexity-meter` shows a `title` attribute tooltip: "Quick — single-step, low token spend (~500–2k tokens total)" / "Standard — focused task, moderate token spend (~3–8k tokens total)" / "Heavy — multi-part task, high token spend (~10–25k tokens total). 3× this in compare-all-three mode." Use a `title` attribute (native browser tooltip) — keeps it simple and consistent with the existing `+` button tooltip pattern. | 4.3 | 🟢 Completed | AGENT |
| 4.6 | Complexity in inline pill row (Q5 prototype) | Per Q5 resolution: prototype adding the 3-bar meter to the inline pills. If it fits cleanly at typical viewport widths AND ~375px without crowding the title/dot, keep it. Otherwise revert and leave it modal-only. Note the outcome in the retrospective. | 3.1, 4.5 | 🟢 Completed | AGENT |

## Phase 5: First-send / New-Chat Integration + Welcome Slide (F47 + F51)

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| 5.1 | Hook first-send into row collapse | Find the existing first-send inflection point in `public/app.js` (where the Mode dropdown gets locked). Add a call to collapse the sample-prompts row: hide `.sample-prompts-full`, show `.sample-prompts-collapsed`. Set `samplePromptsCollapsed = true`. Idempotent — subsequent sends should not re-collapse anything (it's already collapsed). | 3.5 | 🟢 Completed | AGENT |
| 5.2 | Hook New Chat into row expansion | Find the New-Chat reset path (where mode / caching / etc. get unlocked). Add: show `.sample-prompts-full`, hide `.sample-prompts-collapsed`. Set `samplePromptsCollapsed = false`. | 5.1 | 🟢 Completed | AGENT |
| 5.3 | Update welcome slide 4 | Replace the hard-coded `<ul>` of 2 prompts (lines ~461–465 in [public/index.html](../../../public/index.html)) with a sentence pointing at the new pill row: e.g., *"Click any of the suggested prompts above the chat input to try one — they're tagged 🟢 (triggers advisor) or 🟡 (skips). The `+ See all` pill opens the full library."* Keep slide 4's other steps unchanged. | 5.1 | 🟢 Completed | AGENT |
| 5.4 | Bump welcome-seen storage key | Change `WELCOME_SEEN_KEY` from `"advisor-playground-welcome-seen-v1"` to `"advisor-playground-welcome-seen-v2"` in [public/app.js:2511](../../../public/app.js#L2511). Existing users will see the updated slide 4 once. | 5.3 | 🟢 Completed | AGENT |

## Phase 6: Cross-feature Verification + Polish

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| 6.1 | Code View interaction check | Open Code View modal with a sample prompt inserted via pill. Confirm "Original prompt" toggle correctly pulls the prompt text. No changes expected in Code View code — just verification. | 3.2 | 🟢 Completed | AGENT |
| 6.2 | Settings / About / Welcome modal interaction | Open each of the existing modals while the sample-prompts modal is also openable. Confirm only one modal is visible at a time (escape from one before opening another), and that Esc / click-outside handlers don't cross-fire. | 4.1 | 🟢 Completed | AGENT |
| 6.3 | Compare-mode interaction | Switch to compare-all-three mode, click a sample prompt, send. Confirm the prompt fans out to all 3 branches as expected (no changes needed — this is verification that nothing about the insert path interferes with compare-mode wiring). | 3.2 | 🟢 Completed | AGENT |
| 6.4 | Narrow viewport test | Resize browser to ~375px width. Pills wrap to multiple rows cleanly. See-all modal fits on screen. Confirm-replace modal fits. Tooltips don't overflow off-screen. | 3.1, 4.3 | 🟢 Completed | AGENT |
| 6.5 | Defensive-loading test | Manually break `public/sample-prompts.json` (rename it, corrupt the JSON, or remove the `shouldTriggerAdvisor` field from one entry). Confirm the app still loads, chat still works, and only a console.warn fires. Restore the file. | 1.2 | 🟢 Completed | AGENT |
| 6.6 | Accessibility audit | Tab-traverse the empty-state pill row, collapsed pill, modal filter chips, and card insert buttons. All reachable via keyboard. `aria-label` on icon-only buttons. Focus visible (existing focus styles should apply). | 3.1, 4.3 | 🟢 Completed | AGENT |
| 6.7 | XSS / content safety pass | Re-verify all prompt-body insertion paths use `.textContent` or `.value` (NOT `.innerHTML`). The tooltip body, card body, and any other place prompt text appears must be safe even if `sample-prompts.json` contained malicious content. | 3.1, 4.3 | 🟢 Completed | AGENT |

## Phase 7: Version Finalization

Per the saved version-bump-checklist memory, every release in this repo needs version bumps in six places — easy to miss one. This phase enumerates each.

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| 7.1 | Update feature backlog | Change v1.7.0 section heading from `🟢 Completed` to `🟢 Completed`. Mark F45-F51 as `🟢 Completed`. Update descriptions to reflect what actually shipped if anything differed from plan. | 6.7 | 🟢 Completed | AGENT |
| 7.2 | Update `cody.json` | Set `version` to `1.7.0`, `updatedAt` to today's date (`YYYY-MM-DD`). Phase already `"build"`. | 6.7 | 🟢 Completed | AGENT |
| 7.3 | Update `package.json` | Set `version` to `1.7.0` and `lastUpdated` to today's date. (The About modal reads from here.) | 6.7 | 🟢 Completed | AGENT |
| 7.4 | Update `package-lock.json` | Top-level `version` AND `packages[""].version` both → `1.7.0`. Easy to forget the inner one. | 6.7 | 🟢 Completed | AGENT |
| 7.5 | Update `README.md` | Shields.io version badge `version-1.6.2-blue` → `version-1.7.0-blue`. (The "Most recent" prose blurb was removed in v1.6.2 in favor of the Release Notes pill — no prose update needed.) Also: consider whether the new feature warrants a section in the README. Add a short subsection under **Using it** describing the sample-prompts library (1 paragraph + the 4 README test prompts can be removed since they now live in `sample-prompts.json`). | 6.7 | 🟢 Completed | AGENT |
| 7.6 | Update `release-notes.md` | Add v1.7.0 entry: TOC line at the top + full entry body (version-format, not patch-format). Include Overview, Key Features, Enhancements, and Bug Fixes (if any) sections matching the v1.6.0 / v1.5.0 format. | 6.7 | 🟢 Completed | AGENT |
| 7.7 | Verification grep | Run `grep -rn "1\.6\.2" cody.json package.json package-lock.json README.md release-notes.md` — should only return historical v1.6.2 entries in release-notes.md and unrelated `type-is` lib refs in package-lock.json. No stale current-version refs. | 7.1-7.6 | 🟢 Completed | AGENT |
| 7.8 | Write retrospective | Copy `.cody/templates/build/version/retrospective.md` into the version folder. Fill in: summary, what went well, what could have gone better, lessons learned, action items. Specifically capture the Q5 outcome (whether complexity in inline pills shipped or not) and any unexpected refactors needed in the confirm-modal reuse path. | 6.7 | 🟢 Completed | AGENT |
| 7.9 | Final USER test | USER runs the full end-to-end app, confirms version strings show 1.7.0 in About modal + welcome title pill, confirms the new feature works as designed. Reports any issues; we iterate before declaring complete. | 7.1-7.8 | 🟢 Completed | USER |
| 7.10 | USER commit + push | All staged together in a single commit. USER reviews `git status`, runs `git add` on the explicit file list, commits, and pushes. AGENT does NOT auto-commit. | 7.9 | 🟢 Completed | USER |
