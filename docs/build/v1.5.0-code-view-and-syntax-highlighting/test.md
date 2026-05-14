# v1.5.0 Test Plan

User-facing test scenarios for v1.5.0 — Code View & Syntax Highlighting. Work through each phase's tests before closing it out.

---

## Phase 5 — Code View Snippet Generation

Open the Code View modal via the `</>` button in the top-nav for each scenario. Verify the listed behaviors before moving on.

### Test 5.1 · Default settings (Sonnet + Recommended preset)

**Setup**
- Executor: `claude-sonnet-4-6`
- Advisor: `claude-opus-4-6`
- Effort: `Medium`
- max_uses: blank (unset)
- Caching: `Off`
- System prompt preset: `Recommended`

**Verify**
- [x] Pill rail shows 5 pills: `executor`, `advisor`, `effort: medium`, `max_tokens`, `system: Recommended preset`. No `max_uses` or `caching` pills.
- [x] Comment block at the top of every snippet lists ALL 7 settings, including `max_uses: (not set — unlimited)` and `Caching: off (omitted from call)`.
- [x] TypeScript snippet body has `output_config` and `system` lines but NO `max_uses` or `caching` keys on the tool object.
- [x] Python snippet matches the TypeScript shape.
- [x] curl snippet has the system prompt embedded in JSON; no `max_uses` / `caching` keys on the tool.
- [x] System prompt embedded in snippets has NO `<!-- advisor:only -->` markers.

### Test 5.2 · Haiku omits Effort

**Setup**
- Switch Executor to `claude-haiku-4-5`. The Effort dropdown should show "n/a".

**Verify**
- [x] Pill rail no longer has the `effort` pill.
- [x] Comment block reads: `Effort: n/a (Haiku does not support effort — omitted from call)`.
- [x] TypeScript / Python / curl snippet bodies all have NO `output_config` line.

### Test 5.3 · All optional features set + Custom preset

**Setup**
- Executor: `claude-opus-4-6` (or Sonnet)
- Effort: `Max`
- max_uses: `3`
- Caching: `1h`
- System prompt preset: `Custom`, with this content in the textarea:

  ```
  You are a careful planner.
  Think step by step before answering.
  Use "quotes" and \backslashes liberally.
  Cost is $5 per call.
  ```

**Verify**
- [x] Pill rail has all 7 pills, including `max_uses: 3`, `caching: 1h`, `system: Custom preset`.
- [x] TypeScript snippet's tool block includes `max_uses: 3,` and `caching: { type: "ephemeral", ttl: "1h" },`.
- [x] TypeScript / Python `system:` line is one line with `\"`, `\\`, and `\n` properly escaped (no actual line breaks in the string literal).
- [x] In the curl snippet, `$5` should be escaped (e.g., `\$5`) inside the JSON body so the shell doesn't expand it. Backticks (if any) should be escaped too.

### Test 5.4 · Empty system prompt

**Setup**
- Clear the system prompt textarea entirely.

**Verify**
- [x] Pill rail still shows the system pill (preset will read as `Custom preset` since it no longer matches Recommended/Precise).
- [x] Comment block reads: `System: Custom preset (empty — system parameter omitted from call)`.
- [x] TypeScript / Python / curl snippets have NO `system` line/key at all.

### Test 5.5 · Sentinel-only system prompt

**Setup**
- Paste this into the system prompt textarea (only the sentinels, nothing inside):

  ```
  <!-- advisor:only -->
  <!-- /advisor:only -->
  ```

**Verify**
- [x] Comment block treats it as empty (`(empty — system parameter omitted from call)`).
- [x] All three snippets have NO `system` parameter.

### Test 5.6 · Copy + Wrap

**Verify**
- [x] Click each tab, click Copy. Paste into a text editor — you should get the raw snippet text (with `\n` literals as the two characters `\n`, not actual newlines inside string literals).
- [x] Toggle Wrap **off** → horizontal scrollbar appears at the bottom of the panel viewport (always visible, not hidden below the snippet). You can scroll horizontally and vertically independently.
- [x] Toggle Wrap **on** (default) → long lines wrap, no horizontal scroll.

### Test 5.7 (bonus) · Actually run the curl

**Setup**
- Copy the curl snippet from Test 5.1 (Sonnet + Recommended).
- Set `ANTHROPIC_API_KEY` in your shell.
- Paste and run.

**Verify**
- [x] curl returns a valid 200 response from Anthropic with a real `content` array.
- [x] No shell errors about unescaped `$` or `` ` ``.

This is the strongest end-to-end test — it proves the generated code is actually valid against the real API.

---

## Phase 6 — Polish & Edge Cases

Most Phase 6 items were covered incidentally during Phase 5 testing. One new feature (Original prompt checkbox) and one polish item (arrow-key tab navigation) were added here.

### Test 6.1 · Long system prompt rendering

**Setup**
- Already covered by Phase 5 Test 5.3 (custom prompt with quotes, backslashes, `$`, newlines).

**Verify**
- [x] All three snippets escape special characters correctly.
- [x] Prism highlighting still renders without breaking.

### Test 6.2 · Tab keyboard navigation

**Setup**
- Open Code View. Use Tab until a tab button (TypeScript / Python / curl) is focused.

**Verify**
- [x] Right Arrow moves to the next tab and activates it.
- [x] Left Arrow moves to the previous tab and activates it.
- [x] Home jumps to TypeScript; End jumps to curl.
- [x] Tab / Shift+Tab still cycles focus through the modal as a whole (unchanged from Phase 4).

### Test 6.3 · Code View works without API key

**Setup**
- Open Settings → Anthropic API → clear the API key field and save.
- Open Code View.

**Verify**
- [x] Button opens the modal (not disabled).
- [x] All three snippets render correctly with the current settings.

### Test 6.4 · Mode-independence

**Setup**
- Cycle Mode through each option (Advisor only, Advisor vs executor-solo, Advisor vs advisor-solo, All three).

**Verify**
- [x] At every Mode setting, the snippet always shows the advisor-tool call shape.

### Test 6.5 · Original prompt checkbox

**Setup**
- Open Code View before sending any prompt.

**Verify**
- [x] "Original prompt" checkbox is disabled and dimmed; tooltip says "Send a prompt first to enable this".
- [x] Close modal, send a chat prompt, reopen Code View — checkbox is enabled and unchecked by default.
- [x] Tick it — all three snippets immediately re-render with the actual prompt substituted for `"prompt here"`.
- [x] Try a prompt with special characters (`"`, `\`, `$`, `` ` ``, newlines) — TS/Python string literals use `JSON.stringify` escaping, curl's `PROMPT="..."` uses proper bash double-quote escaping.
- [x] Untick — reverts to `"prompt here"`.
- [x] Click "New Chat" to clear history, reopen Code View — checkbox returns to disabled + unchecked.
