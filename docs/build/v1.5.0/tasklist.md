# Version Tasklist – v1.5.0 — Code View & Syntax Highlighting
This document outlines all the tasks to work on to deliver this particular version, grouped by phases.

| Status |      |
|--------|------|
| 🔴 | Not Started |
| 🟡 | In Progress |
| 🟢 | Completed |

## Phase 1: Prism Foundation

Self-host Prism 1.30.0, build the dark theme, wire it into the page. Both F33 and F34/F35 depend on this, so it ships first.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 1.1 | Download and stage Prism files | Created `/public/vendor/prism/` and downloaded Prism v1.30.0 minified files from cdnjs: `prism.min.js` (19 KB), `prism-json.min.js`, `prism-typescript.min.js`, `prism-javascript.min.js`, `prism-python.min.js`, `prism-bash.min.js`. Total ~33 KB unminified. | None | 🟢 Completed | AGENT |
| 1.2 | Write vendor README | Wrote `/public/vendor/prism/README.md` documenting the pinned version (1.30.0), file list, source URLs (cdnjs), why we self-host, and license. | 1.1 | 🟢 Completed | AGENT |
| 1.3 | Build custom dark theme CSS | Wrote `/public/vendor/prism/prism-theme.css` with token colors mapped to the app palette per design.md §3.3 (uses `var(--bg)`, `var(--text)`, `var(--muted)` from styles.css; literals for accent colors). Top-of-file comment records pinned version. JSON, TypeScript, Python, Bash all covered including bash variables and JSON property keys. | 1.1 | 🟢 Completed | AGENT |
| 1.4 | Wire Prism into index.html | Added `<link rel="stylesheet" href="vendor/prism/prism-theme.css" />` in `<head>` after `styles.css`. Added 6 `<script>` tags before `app.js`: core, then javascript, typescript, python, bash, json. | 1.1, 1.3 | 🟢 Completed | AGENT |
| 1.5 | Smoke test Prism | Added a temporary banner with 4 highlighted blocks (JSON, TypeScript, Python, Bash). USER visually verified all 4 languages render correctly with the new theme. Banner removed. | 1.4 | 🟢 Completed | AGENT |
| 1.6 | Test phase 1 | USER confirmed: all 4 languages highlighted correctly, theme colors match palette intent (purple keywords, green strings, amber numbers, blue properties/functions, muted-italic comments), no console errors. | 1.1-1.5 | 🟢 Completed | USER |
| 1.7 | Commit phase 1 | USER committed phase 1 to git. | 1.6 | 🟢 Completed | USER |

## Phase 2: Shared Copy Button Helper

Build the reusable `makeCopyButton()` helper and `.copy-btn` styling. Used by both F33 (Code View) and F35 (Full I/O viewer) — extracted first to keep both call sites consistent.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 2.1 | Implement makeCopyButton helper | Added `makeCopyButton(getText, opts)` to `public/app.js` (after `escapeHtml`). Returns a `<button class="copy-btn">` with shared `COPY_ICON_SVG` + "Copy" label span. Lazy `getText()` invocation, async clipboard write, "✓ Copied" success state for 1400ms with green class, "Copy failed" error state with `--danger` class. Resets cleanly even if clicked rapidly (clears prior timer). | None | 🟢 Completed | AGENT |
| 2.2 | Add copy-btn CSS | Added `.copy-btn` styles to `public/styles.css` (after `.btn-danger`). Dark panel background, accent-blue hover, `.copy-btn.copied` in `#7ed58a` green, `.copy-btn.failed` in `var(--danger)` red, focus-visible outline for keyboard users. Sized to fit comfortably in code-block corners. | 2.1 | 🟢 Completed | AGENT |
| 2.3 | Test phase 2 | USER confirmed via smoke harness: pasted text matched expected three-line content; "✓ Copied" state and hover both worked. Smoke harness removed from index.html and app.js. | 2.1-2.2 | 🟢 Completed | USER |
| 2.4 | Commit phase 2 | USER committed phase 2 to git. | 2.3 | 🟢 Completed | USER |

## Phase 3: Full I/O Viewer Upgrades (F34 + F35)

Apply Prism highlighting and copy buttons to the existing Full I/O viewer JSON blocks. Easier of the two features, validates Prism + copy button in production context before tackling the Code View modal.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 3.1 | Wrap I/O JSON in language-json blocks | Refactored the Full I/O viewer renderer in `public/app.js` to build DOM imperatively. Added `renderIOSection(label, jsonText, copyable)` helper that creates `<pre><code class="language-json">` blocks with `textContent` (preserves XSS safety from the previous `escapeHtml` path). | 1.4 | 🟢 Completed | AGENT |
| 3.2 | Apply Prism highlighting to I/O blocks | `renderIOSection()` calls `Prism.highlightElement(code)` immediately after appending the code block. Guarded with `typeof Prism !== "undefined"` so dev failures don't break the viewer. | 3.1 | 🟢 Completed | AGENT |
| 3.3 | Add copy buttons to I/O blocks | `renderIOSection()` adds a `makeCopyButton()` to the section header (right-aligned next to the label). Closed-over `jsonText` so the button always copies the original JSON. Skipped for "(unavailable)" requests. | 2.1, 3.1 | 🟢 Completed | AGENT |
| 3.4 | Verify no layout regression | Added `.raw-toggle pre[class*="language-"]` override in `styles.css` to restore the I/O viewer's compact 10px font. Added `.io-section-header` flex container with `margin-bottom: 8px` for breathing room between the label/copy row and the code block. Label now stands alone (rounded all corners) instead of "hanging onto" the pre. | 3.1-3.3 | 🟢 Completed | AGENT |
| 3.4a | Add global "Wrap code" toggle (added during phase) | Added a global `Wrap code` checkbox to the trace pane header next to `Sync panes`. Replaces the per-section wrap toggle from an earlier iteration. Toggling it instantly applies/removes `.io-nowrap` on all rendered I/O code blocks and is inherited by newly rendered sections. Default checked. Session-only state (not persisted to localStorage). Wrap mode uses `white-space: pre-wrap` + `overflow-wrap: anywhere` (both on `<pre>` and inner `<code>` since Prism's theme sets `white-space: pre` on the inner code element). | 3.3 | 🟢 Completed | AGENT |
| 3.5 | Test phase 3 | USER confirmed: syntax colors render correctly across multiple branches/turns; per-block copy works; global Wrap toggle affects all branches simultaneously and is inherited by new sections; no layout regressions. | 3.1-3.4a | 🟢 Completed | USER |
| 3.6 | Commit phase 3 | USER committing phase 3 to git. | 3.5 | 🟢 Completed | USER |

## Phase 4: Code View Modal Shell (F33 part 1)

Build the static UI shell for the Code View modal — top-nav button, modal markup, styling, open/close mechanics. No snippet generation yet; tabs render placeholder content.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 4.1 | Add `</>` button to top-nav | Added `#toggle-code-view` button in `public/index.html` left of `#toggle-about`. Uses `.btn-icon` + new `.btn-icon-mono` modifier (mono font, 12px, slight negative letter-spacing) so `</>` reads as code. `aria-label="Code View"`, `title="View code for current configuration"`. | None | 🟢 Completed | AGENT |
| 4.2 | Add Code View modal markup | Added `#code-view-modal` in `public/index.html` mirroring the settings-modal pattern. Header with `</>` glyph + title + subtitle + close button. Empty `#code-view-pill-rail`, tablist with 3 tabs (TS/Python/curl) using ARIA roles, body with 3 `<div class="code-view-panel">` slots, footer with docs link. | None | 🟢 Completed | AGENT |
| 4.3 | Style Code View modal | Added Code View modal styles to `public/styles.css` (after the welcome modal section). New: `.btn-icon-mono`, `.code-view-modal`, `.code-view-card`, `.code-view-header`, `.code-view-icon`, `.code-view-pill-rail` + `.pill` variants, `.code-view-tabs` + `.code-view-tab` (active state, focus-visible), `.code-view-body`, `.code-view-panel`, `.code-view-footer`. Matches Mockup A. | 4.2 | 🟢 Completed | AGENT |
| 4.4 | Wire open/close mechanics | Added `openCodeView()` / `closeCodeView()` in `public/app.js`. Click `</>` opens. Esc, backdrop, close button close. Stores `codeViewLastFocus` on open and restores it on close. | 4.1, 4.2 | 🟢 Completed | AGENT |
| 4.5 | Implement tab switching | Added `setCodeViewActiveTab(tabId)` that toggles `.active`, `aria-selected`, and `tabindex` on tabs and shows/hides panels via the `hidden` attribute. Click handlers on each tab. Default active tab on every open: TypeScript. Panels currently show a Phase 4 placeholder; Phase 5 will populate with real snippets. | 4.2 | 🟢 Completed | AGENT |
| 4.6 | Add focus trap | Added Tab/Shift+Tab focus trap in the global keydown handler — cycles focus inside the modal while it's open. Esc still closes. On open, focus moves to the active tab. | 4.4 | 🟢 Completed | AGENT |
| 4.6a | Top-nav button cluster redesign (added during phase) | Replaced the original `</> ⓘ ⚙` mixed-glyph buttons (Unicode chars + mono text rendered at uneven visual weight) with the V2 pill-cluster design — single rounded `.topnav-cluster` container holding three `.topnav-btn`s with hairline dividers, all using consistent SVG outline icons (code brackets, info circle, gear). Code View keeps the accent blue. Selected from a 4-variation mockup at [mockups/topnav-button-variations.html](mockups/topnav-button-variations.html). Removed obsolete `.btn-icon`, `.btn-icon-mono`, `.header-sep`, and the per-button size overrides. Button IDs unchanged so JS wiring continued to work. | 4.1, 4.3 | 🟢 Completed | AGENT |
| 4.7 | Test phase 4 | USER confirmed: pill-cluster top-nav reads cleanly, Code View modal opens/closes correctly via button, Esc, backdrop, and close icon; tabs switch; focus returns to the `</>` button on close. Phase 5 will replace the placeholder snippets with real generated code. | 4.1-4.6a | 🟢 Completed | USER |
| 4.8 | Commit phase 4 | USER committing phase 4 locally; not pushing to GitHub yet (holding the v1.5.0 work back from the live deploy until the version is complete). | 4.7 | 🟢 Completed | USER |

## Phase 5: Code View Snippet Generation (F33 part 2)

Generate the actual snippets from current state, render the settings pill rail, apply Prism, wire copy buttons. This is the core feature work.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 5.1 | Define ADVISOR_BETA constant | Added `const ADVISOR_BETA = "advisor-tool-2026-03-01";` at the top of the Code View section in `public/app.js`. No existing references in app.js needed to be replaced (the beta header was previously only used server-side). | None | 🟢 Completed | AGENT |
| 5.2 | Implement snapshotSettings helper | Added `snapshotCodeViewSettings()` that reads `executorEl`, `advisorEl`, `effortEl`, `maxTokensEl`, `advisorCachingEl`, `maxUsesEl`, `systemEl` and returns a normalized object. Applies all omission rules: `effort=null` for Haiku or "na", `maxUses=null` when unset, `caching=null` when "off", `systemPrompt=null` when whitespace-only. | None | 🟢 Completed | AGENT |
| 5.3 | Implement renderPillRail | Added `renderCodeViewPillRail(snap)` which populates `#code-view-pill-rail` with pills in design-doc order. Executor pill uses `.exec` accent, advisor uses `.adv` accent. Skips effort/max_uses/caching when null. System pill always present (shows preset label). | 5.2, 4.3 | 🟢 Completed | AGENT |
| 5.4 | Implement settings comment block generators | Added `buildSettingsCommentRows(snap)` which returns label/value pairs with omission reasons baked in (e.g. `Effort: n/a (Haiku does not support effort — omitted from call)`). `formatSettingsComment(lang, rows)` renders rows in `/** ... */` for TS, `# ...` lines for Python and Bash, with key-padding alignment. | 5.2 | 🟢 Completed | AGENT |
| 5.5 | Implement TypeScript snippet generator | Added `generateTypeScriptSnippet(snap)`: comment block + Anthropic SDK import + client init + hoisted `const prompt = "prompt here";` + `client.beta.messages.create({...}, { betas: [ADVISOR_BETA] })`. Tool object includes max_uses/caching only when set. `output_config` only when effort set. `system` only when present. All string escaping via `JSON.stringify`. | 5.1, 5.2, 5.4 | 🟢 Completed | AGENT |
| 5.6 | Implement Python snippet generator | Added `generatePythonSnippet(snap)`: comment block + import + client init + hoisted `prompt = "prompt here"` + `client.beta.messages.create(...)` with same omission rules as TS. `betas=["..."]` as kwarg. | 5.1, 5.2, 5.4 | 🟢 Completed | AGENT |
| 5.7 | Implement curl snippet generator | Added `generateCurlSnippet(snap)` + `escapeForBashHeredoc()`. Builds the JSON body with a unique `__CATP_PROMPT_PLACEHOLDER__` token, JSON-stringifies, escapes shell metas (`\`, `$`, `` ` ``) for the unquoted heredoc, then swaps the token for `"$PROMPT"` so the shell expands it at runtime. Headers include the beta header from `ADVISOR_BETA`. | 5.1, 5.2, 5.4 | 🟢 Completed | AGENT |
| 5.8 | Render and highlight snippets on modal open | Added `populateCodeView()` invoked from `openCodeView()`. Snapshots settings, renders pill rail, generates all three snippets, replaces each panel's content with `<pre><code class="language-X">` + Prism-highlighted snippet. Always defaults to TypeScript tab on open. | 5.2, 5.3, 5.5, 5.6, 5.7, 4.4 | 🟢 Completed | AGENT |
| 5.9 | Wire per-tab copy buttons | `populateCodeView()` attaches a `makeCopyButton()` to each panel via the shared helper from Phase 2. The `getText` callback closes over the raw snippet string (not the Prism HTML), positioned top-right via the `.code-view-panel .copy-btn` rule from Phase 4. | 2.1, 5.8 | 🟢 Completed | AGENT |
| 5.10 | Test phase 5 | USER worked through all 7 scenarios in [test.md](test.md) and ticked every checkbox. Bonus Test 5.7 (end-to-end curl) validated against the real Anthropic API: a trivial prompt correctly produced 1 iteration with no advisor call (matching the Recommended preset's timing guidance), and a substantive prompt (URL shortener design) produced 3 iterations with a clean advisor_message sandwiched between executor calls — proving the generated curl snippet exercises the full advisor-tool flow correctly. | 5.1-5.9 | 🟢 Completed | USER |
| 5.11 | Commit phase 5 | USER committing phase 5 to git. | 5.10 | 🟢 Completed | USER |

## Phase 6: Polish & Edge Cases

Final pass on accessibility and rough edges before the version bump.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 6.1 | Verify long system prompt rendering | Verified during Phase 5 Test 5.3 with a custom prompt containing quotes, backslashes, `$` signs, and newlines. All three snippets escape correctly; Prism highlights without breaking. | 5.10 | 🟢 Completed | AGENT |
| 6.1a | Add "Original prompt" checkbox (new feature) | Added a second checkbox to the tab-row actions (next to Wrap). Disabled until the user has sent a prompt in this conversation, otherwise unchecked. When ticked, all three snippets substitute the user's most recent prompt for `"prompt here"` (TS/Python via `JSON.stringify`, curl via a new `bashDoubleQuote()` helper for safe shell escaping). Unticking reverts. New Chat resets the checkbox. Scoped to advisor branch history (`branchHistories.advisor`). | 5.2 | 🟢 Completed | AGENT |
| 6.2 | Tab keyboard navigation | Added arrow-key navigation per WAI-ARIA tablist pattern: Left/Right cycle between tabs, Home/End jump to first/last. Existing Tab/Shift+Tab focus trap unchanged. Enter/Space already activated tabs via native button semantics. | 4.5 | 🟢 Completed | AGENT |
| 6.3 | Verify Code View button works without API key | Verified by design — the snippet generator reads DOM state (models, settings, system prompt), not the API key field. Button opens the modal and snippets render correctly even with an empty API key input. Educational by intent (users can copy the snippet, paste their own key, and run it elsewhere). | 4.4, 5.8 | 🟢 Completed | AGENT |
| 6.4 | Verify mode-independence | Verified by design — `snapshotCodeViewSettings()` does not read the Mode dropdown. The snippet always shows the advisor-tool call regardless of which Mode (advisor, executor-solo, advisor-solo, all-three) is selected. Matches the design-doc decision in §4.5. | 5.8 | 🟢 Completed | AGENT |
| 6.5 | Test phase 6 | USER confirmed the Original prompt feature works end-to-end (enabled/disabled states, toggle behavior, special-character escaping across all three languages). Other Phase 6 items verified during Phase 5 testing or by design. | 6.1-6.4 | 🟢 Completed | USER |
| 6.6 | Commit phase 6 | USER committing phase 6 to git along with phase 5. | 6.5 | 🟢 Completed | USER |

## Phase 7: Version Bump & Finalize

Bump version, update all user-facing content (README, About, Welcome), refresh release notes, write retrospective.

| ID  | Task             | Description                             | Dependencies | Status | Assigned To |
|-----|------------------|-----------------------------------------|--------------|--------|-------------|
| 7.1 | Bump version in package.json | Update `version` in `package.json` from `1.4.0` to `1.5.0`. | None | 🔴 Not Started | AGENT |
| 7.2 | Bump version in index.html | Update the version string shown in the top-nav (e.g. `v1.4.0` → `v1.5.0`) in `public/index.html`. | None | 🔴 Not Started | AGENT |
| 7.3 | Update README.md | Update the project README: bump version references, add Code View + syntax highlighting to the features section, update any screenshots or feature lists that mention what the app can do, refresh changelog or "What's new" if present. | 7.1 | 🔴 Not Started | AGENT |
| 7.4 | Review and update Welcome slideshow | Audit `public/app.js` welcome slideshow content. Add a slide (or update an existing slide) introducing the Code View feature if it fits the intro narrative. Update any feature mentions that have changed. Verify the "Next steps" slide still renumbers correctly. | 7.1 | 🔴 Not Started | AGENT |
| 7.5 | Review and update About modal | Update About modal content: verify `lastUpdated` date refreshes from `package.json` via `/api/version` (existing wiring from v1.4.0); update tagline / feature list if it mentions the app's capabilities; ensure the modal lists v1.5.0 highlights if appropriate. | 7.1 | 🔴 Not Started | AGENT |
| 7.6 | Update release-notes.md | Add v1.5.0 section per the release-notes.md template/instructions. Include all three features, mention Prism 1.30.0 as a new self-hosted dependency, link to the design doc. | 7.1 | 🔴 Not Started | AGENT |
| 7.7 | Update feature backlog status | Mark v1.5.0 as 🟢 Completed in `docs/build/feature-backlog.md`, including all three features (F33, F34, F35). | 7.6 | 🔴 Not Started | AGENT |
| 7.8 | Update cody.json | Set `version` to `1.5.0` and `updatedAt` to today's date in the `cody-product-builder` section of `cody.json`. | 7.1 | 🔴 Not Started | AGENT |
| 7.9 | Write retrospective | Create `docs/build/v1.5.0/retrospective.md` from the template, capturing what went well, what didn't, and notes for the next version. | 7.7 | 🔴 Not Started | AGENT |
| 7.10 | Final test | USER does a final smoke test on the deployed/local app with v1.5.0. | 7.1-7.9 | 🔴 Not Started | USER |
| 7.11 | Commit phase 7 | USER commits the version bump and finalization. | 7.10 | 🔴 Not Started | USER |
