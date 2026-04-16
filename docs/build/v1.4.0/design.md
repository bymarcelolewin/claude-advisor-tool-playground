# Version Design Document — v1.4.0
Technical implementation and design guide for the upcoming version.

## 1. Features Summary
This version brings the app up to date with the latest Anthropic advisor tool API capabilities and adds new configuration options for cost control and experimentation.

| Feature | Description |
|---------|-------------|
| UI layout: model config panel | Move executor/advisor/mode dropdowns from header into a config panel on the chat side, stacked vertically |
| Effort settings | New dropdown next to executor model to control thinking effort |
| `max_uses` setting | New number input in Settings → Chat & Advisor to cap advisor calls per request |
| Advisor call counter | Show "Call N of M" in the trace when multiple advisor calls occur |
| Caching dropdown | Replace caching checkbox with Off / 5m / 1h dropdown |
| `advisor_redacted_result` handling | Gracefully display encrypted advisor responses in the trace |
| Error codes display | Render advisor error codes (`advisor_tool_result_error`) clearly in the trace |
| System prompt presets | Dropdown with Recommended / Precise / Custom |
| About box link fix | Changed CHANGELOG.md reference to release-notes.md (already done) |

### Advisor Tool API Changes Tracker

The full details of all advisor tool API changes (implemented or not) are documented in [claude-advisor-tool-updates.md](../../reference/claude-advisor-tool-updates.md).

| Anthropic Addition | Included in v1.4.0? | Notes |
|--------------------|---------------------|-------|
| `max_uses` parameter | Yes | New setting in Chat & Advisor section |
| `caching.ttl: "1h"` option | Yes | Dropdown replaces checkbox |
| `advisor_redacted_result` variant | Yes | Future-proofing for encrypted advisor responses |
| Expanded error codes (6 types) | Yes | Display in trace step cards |
| Effort settings (`output_config.effort`) | Yes | New dropdown next to executor model |
| Official suggested system prompts | Yes | Offered as Recommended / Precise presets |
| `pause_turn` support | No | Not relevant for interactive playground |
| Batch processing support | No | Offline/bulk workload, not interactive |
| `clear_thinking` / cache interaction | No | App doesn't use extended thinking |
| Zero Data Retention (ZDR) eligibility | No | Informational only, no app impact |

## 2. Technical Architecture Overview
No architectural changes. Same Node.js + Express backend with vanilla JS frontend. All changes are additive:

- **Backend (`server.js`):** Pass through new parameters (`max_uses`, updated `caching` shape, `output_config.effort`). Handle `advisor_redacted_result` and `advisor_tool_result_error` content types in responses.
- **Frontend (`public/app.js`):** New UI controls (dropdowns, number input), relocated model config panel, updated trace rendering for new content types, system prompt preset management, advisor call counter.
- **Frontend (`public/index.html`):** New config panel above chat, updated settings modal, about box link update.
- **Frontend (`public/styles.css`):** Styling for config panel, new controls, and trace elements.

## 3. Implementation Notes

### 3.1 UI Layout: Model Configuration Panel
Move the executor model, advisor model, and mode dropdowns from the header bar into a config panel on the **chat side only**, positioned between the chat pane header and the chat messages area.

**Layout (based on mockup):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ (compass) Claude Advisor Tool Playground v1.4.0          (i) (gear)│  ← Main header
├──────────────────────────────┬──────────────────────────────────────┤
│ (icon) Config                │ Trace                 ☐ Sync panes  │  ← Pane headers
├──────────────────────────────┤                                      │
│ EXECUTOR [haiku-4-5 ▾] [Effort ▾] │                                │  ← Config row 1
│ ADVISOR  [opus-4-6  ▾]            │                                │  ← Config row 2
│ MODE     [All three (3x cost)  ▾] │                                │  ← Config row 3
├──────────────────────────────┤                                      │
│ □ Chat                     + │                                      │  ← Chat header (+ = new conversation)
│                              │                                      │
│                              │                                      │
│ [Type a message...]      (↑) │                                      │
└──────────────────────────────┴──────────────────────────────────────┘
```

**Config panel details:**
- Stacked vertically, one dropdown per row with a label to the left
- Row 1: `EXECUTOR` label + executor model dropdown + `EFFORT` dropdown (same line)
- Row 2: `ADVISOR` label + advisor model dropdown
- Row 3: `MODE` label + mode dropdown (spans wider)
- Effort dropdown sits on the same line as executor because effort applies to the executor model
- Subtle background to visually separate from the chat area below
- Compact vertical spacing — should not take too much height

**Header bar simplification:**
- Main header now contains only: app title + version (left), info icon + settings gear icon (right)
- No more dropdowns in the header — cleaner and less cluttered

### 3.2 Effort Settings
**API parameter (verified from Anthropic docs):**
```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 8192,
  "output_config": {
    "effort": "medium"
  },
  "messages": [...]
}
```

**Parameter:** `output_config.effort`

**Valid values for our supported executor models:**

| Value | Description |
|-------|-------------|
| `low` | Most efficient. Significant token savings with some capability reduction. |
| `medium` | Balanced. Recommended starting point for Sonnet 4.6 per Anthropic. |
| `high` | Default. Complex reasoning, difficult coding, agentic tasks. |
| `max` | Absolute maximum capability, no constraints on token spending. |

**Dropdown options:** Low / Medium / High (default) / Max

**Model compatibility:**
- **Sonnet 4.6:** Supported (all 4 levels). Anthropic recommends `medium` as the default for most applications.
- **Opus 4.6:** Supported (all 4 levels).
- **Haiku 4.5:** **NOT supported.** When Haiku is selected as executor, disable the effort dropdown and show it grayed out with a tooltip: "Effort not supported for Haiku 4.5"

**Compare mode:** The effort setting applies to all branches equally so the comparison is fair. Pass `output_config.effort` on every branch's API call (advisor, executorSolo, advisorSolo).

**Server changes (`server.js`):**
- Accept `effort` from request body
- Add `output_config: { effort }` to all branch request params when effort is not "high"
- Omit `output_config` entirely when effort is "high" (omitting = same as high)

### 3.3 `max_uses` Setting
- Add a number input to Settings → Chat & Advisor section
- Label: "Max advisor calls per request" with a help note: "Leave empty for unlimited. Caps how many times the executor can consult the advisor in a single API request."
- **Validation:**
  - Accept positive integers only (1, 2, 3, ...)
  - Empty = unlimited (parameter omitted from tool definition)
  - No upper cap — user can put any positive integer they want (Anthropic doesn't specify a max)
  - Reject: decimals, negative numbers, zero, non-numeric input
  - Use `<input type="number" min="1" step="1">` and additionally validate in JS before submit to strip any non-integer input
- Store in localStorage alongside other settings (as a number or empty string)
- Pass to the advisor tool definition in `server.js` when building request params:
  ```json
  {
    "type": "advisor_20260301",
    "name": "advisor",
    "model": "claude-opus-4-6",
    "max_uses": 3
  }
  ```
- Only include `max_uses` in the tool definition if the user sets a value (omit for unlimited)
- Only applies to the advisor branch — baseline branches don't use the advisor tool

### 3.4 Advisor Call Counter in Trace
When multiple advisor calls occur in a single turn:
- Show a counter on each advisor step card: **"Advisor call 1 of 3"** (when `max_uses` is set) or **"Advisor call 1"**, **"Advisor call 2"** (when unlimited)
- Count is derived from the `usage.iterations[]` array — count entries with `type: "advisor_message"`
- In the turn summary, enhance the existing "N advisor calls" to show **"N / M advisor calls"** when `max_uses` is set
- If an `advisor_tool_result_error` with `error_code: "max_uses_exceeded"` appears, show clearly: **"Advisor call limit reached (3/3)"**

### 3.5 Caching Dropdown
- Replace the "Enable advisor-side caching" checkbox with a `<select>` dropdown:
  - **Off** (default) — `caching` omitted from tool definition
  - **5 min** — `{"type": "ephemeral", "ttl": "5m"}`
  - **1 hour** — `{"type": "ephemeral", "ttl": "1h"}`
- Update `server.js` to read the selected TTL value and construct the caching object accordingly
- Update localStorage to store string value ("off" / "5m" / "1h")

### 3.6 `advisor_redacted_result` Handling
- In the trace rendering logic (`app.js`), check `content.type` on advisor tool results:
  - `advisor_result` → render `content.text` as before (current behavior)
  - `advisor_redacted_result` → render a notice: "Advisor response is encrypted — content not visible to client" with a muted/dimmed style
- The Full I/O viewer already shows raw JSON, so encrypted content will appear there as-is
- No server changes needed — the server passes through whatever the API returns
- Currently Opus 4.6 returns readable `advisor_result`. This is future-proofing for if Anthropic introduces models that use encryption.

### 3.7 Error Codes Display
- In the trace rendering logic, check for `advisor_tool_result_error` content type
- Render the error code prominently in the advisor step card with a red/warning style
- Map error codes to human-readable descriptions:

| Error Code | Display Text |
|------------|-------------|
| `max_uses_exceeded` | "Advisor call limit reached for this request" |
| `too_many_requests` | "Advisor rate-limited" |
| `overloaded` | "Advisor capacity exceeded" |
| `prompt_too_long` | "Conversation too long for advisor" |
| `execution_time_exceeded` | "Advisor timed out" |
| `unavailable` | "Advisor unavailable" |

- These errors don't fail the request — the executor continues without advice. Show the error in the advisor step but don't treat it as a turn-level failure.
- Style: red-tinted step card with the error code badge and human-readable description.

### 3.8 System Prompt Presets
- Add a dropdown above the system prompt textarea in Settings → Chat & Advisor:
  - **Recommended** (default) — Anthropic's timing guidance + advice treatment blocks
  - **Precise** — Recommended content + the conciseness instruction ("respond in under 100 words, use enumerated steps"). Results in 35-45% fewer advisor output tokens.
  - **Custom** — Blank textarea for the user to create their own system prompt from scratch
- When the user selects a preset, populate the textarea with the preset content
- All preset content is wrapped in `<!-- advisor:only -->...<!-- /advisor:only -->` sentinels so `stripAdvisorOnly()` on the server produces clean baseline prompts
- Store the selected preset name in localStorage so it persists across sessions
- If the user modifies a preset's text manually, auto-switch the dropdown to "Custom" so they know they've diverged from the preset
- The preset content is defined as constants in `app.js` (sourced from Anthropic's official docs — see [claude-advisor-tool-updates.md](../../reference/claude-advisor-tool-updates.md) for the full text)

### 3.9 About Box Link
- Already done: changed `CHANGELOG.md` → `release-notes.md` in `public/index.html`

## 4. Other Technical Considerations
- **System prompt sentinels:** All presets must wrap advisor-specific instructions in `<!-- advisor:only -->...<!-- /advisor:only -->` sentinels so `stripAdvisorOnly()` on the server can produce clean baseline prompts. The Anthropic recommended prompts are entirely advisor-specific, so they should be fully wrapped.
- **Effort parameter on baselines:** When running compare mode, the effort setting applies to all branches equally so the comparison is fair.
- **`max_uses` in compare mode:** Only applies to the advisor branch. Baseline branches don't use the advisor tool, so the parameter is irrelevant for them.
- **Effort + Haiku compatibility:** The effort dropdown must be disabled when Haiku 4.5 is selected as executor. Listen for executor model changes and toggle the dropdown's disabled state accordingly.
- **Effort parameter is NOT beta:** Unlike the advisor tool itself, the effort parameter is generally available — no beta header needed. It goes on the main request body as `output_config.effort`, not on the advisor tool definition.
- **No backwards compatibility needed:** Single-user project. No migration logic required for localStorage format changes (caching boolean → string, system prompt preset).

## 5. Open Questions
All questions resolved — none remaining.

## 6. Reference URLs
Documentation used to ground this design:

- **Advisor tool documentation:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool — Source for `max_uses`, `caching` TTL options, `advisor_redacted_result` variant, error codes, suggested system prompts, `pause_turn`, batch processing, `clear_thinking` interaction, and ZDR eligibility.
- **Effort parameter documentation:** https://platform.claude.com/docs/en/build-with-claude/effort — Source for `output_config.effort` parameter structure, valid values (low/medium/high/max), and model compatibility (Sonnet 4.6 and Opus 4.6 supported; Haiku 4.5 not supported).

The full notes extracted from these docs are consolidated in [claude-advisor-tool-updates.md](../../reference/claude-advisor-tool-updates.md).
