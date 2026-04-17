# Version Design Document — v1.5.0
Technical implementation and design guide for the upcoming version.

## 1. Features Summary
This version adds a **Code View** popup that shows the user the exact Anthropic API call for their current configuration (TypeScript / Python / curl), and introduces **Prism-based syntax highlighting** everywhere code is displayed in the app. Both features share Prism as a dependency, so they're bundled.

| ID  | Feature | Description |
|-----|---------|-------------|
| F33 | Code View popup | New `</>` icon in the top-nav cluster (`</>` `ⓘ` `⚙`) opens a centered modal with three tabs: TypeScript, Python, curl. Snippet is **dynamic** — reflects every current setting. User prompt hoisted to a top-level variable. Per-tab copy button. |
| F34 | Prism syntax highlighting | Self-hosted Prism applied to the Full I/O viewer JSON blocks and the Code View snippets. Dark theme tuned to the app palette. |
| F35 | Copy button on Full I/O viewer | Copy-to-clipboard buttons on the request and response JSON blocks in the Full I/O viewer, matching the Code View copy-button style. |

### Reference mockup
The visual target is [mockup-a-centered-modal.html](mockups/mockup-a-centered-modal.html). Mockups B and C are for reference only.

## 2. Technical Architecture Overview
No architectural changes. Same Node.js + Express backend with vanilla JS frontend. All changes are **frontend-only and additive**:

- **Frontend (`public/index.html`):** New `</>` button in the top-nav cluster. New Code View modal markup. New `<link>` for the Prism CSS and `<script>` tags for Prism JS (self-hosted from `/public/vendor/prism/`).
- **Frontend (`public/app.js`):** New Code View module: opens/closes modal, generates snippet from current state on open, manages tab switching, copy button. Updates to the Full I/O viewer renderer to invoke Prism highlighting and attach copy buttons.
- **Frontend (`public/styles.css`):** Code View modal styling (reusing existing `.settings-modal` + `.settings-card` patterns). Prism theme overrides to match the app palette. Copy-button styles shared between Code View and Full I/O viewer.
- **New folder:** `/public/vendor/prism/` containing Prism core, the languages we need, and our dark-theme CSS.
- **Backend (`server.js`):** No changes.

## 3. Implementation Notes

### 3.1 Top-nav `</>` Icon (F33)

Placement in `index.html` top-nav cluster, left of the info icon:

```
[logo] Claude Advisor Tool Playground v1.5.0   ...   [</>] [ⓘ] [⚙]
```

- Same button element structure, size, border, and hover behavior as the existing `ⓘ` and `⚙` buttons. The glyph `</>` renders in `var(--mono)` so it visually reads as code.
- Button `aria-label="Code View"` and `title="View code for current configuration"`.
- Clicking toggles the Code View modal open; pressing `Esc` or clicking the backdrop closes it. Same open/close mechanics as the Settings modal.

### 3.2 Code View Modal (F33)

**Structure** (reuses the `.settings-modal` + `.settings-card` DOM pattern from the Settings modal so we inherit backdrop, blur, z-index, padding, and scroll behavior for free):

```
┌──────────────────────────────────────────────────────────────────────┐
│  </>  Code View     Generated from your current configuration    ×   │  ← header
├──────────────────────────────────────────────────────────────────────┤
│  [executor: sonnet-4-6] [advisor: opus-4-6] [effort: medium] ...    │  ← settings pill rail
├──────────────────────────────────────────────────────────────────────┤
│  [TypeScript]  [Python]  [curl]                                      │  ← tab row
├──────────────────────────────────────────────────────────────────────┤
│                                                      [Copy]          │  ← floating copy button
│  import Anthropic from "@anthropic-ai/sdk";                          │
│  const client = new Anthropic(...)                                   │
│  ...                                                                 │  ← code body (Prism-highlighted)
├──────────────────────────────────────────────────────────────────────┤
│  Replace "prompt here" with your actual user message.   docs →       │  ← footer
└──────────────────────────────────────────────────────────────────────┘
```

**Settings pill rail** — reads the current state and renders a compact row of monospaced pills. Order matches the Config Models panel:

| Pill | Value source | Shown when |
|------|--------------|------------|
| `executor` | Config Models → Executor | Always |
| `advisor` | Config Models → Advisor | Always (since snippet is always the advisor-tool call) |
| `effort` | Config Models → Effort | Only when executor supports effort (skip for Haiku) |
| `max_uses` | Settings → Chat & Advisor | Only when user set a positive integer |
| `caching` | Settings → Chat & Advisor | Only when TTL is `5m` or `1h` |
| `max_tokens` | Settings → Chat & Advisor | Always |
| `system_prompt` | Settings → Chat & Advisor (preset label: Recommended / Precise / Custom) | Always |

Pill colors: executor pill accent = `--executor` (#4a7aff), advisor pill accent = `--advisor` (#b86bff). Other pills use default panel styling.

**Tabs** — three tabs: TypeScript, Python, curl. TypeScript is the default. Tab state is local to the modal (not persisted).

**Snippet generation** — a single function `generateSnippet(lang, state)` reads the current state (executor, advisor, effort, max_uses, caching, max_tokens, system prompt) and returns a string. Called fresh every time the modal opens so the snippet always reflects the latest settings. No caching.

**Settings comment block (top of every snippet)** — every generated snippet starts with a comment block listing **all** current settings, including ones that are intentionally omitted from the actual API call (with the reason). This makes the snippet self-documenting when pasted elsewhere — a reader can see at a glance what configuration produced it and why certain parameters aren't in the call.

Example (TypeScript / JS comment style):
```
/**
 * Generated by Claude Advisor Tool Playground v1.5.0
 *
 * Current settings:
 *   Executor:    claude-haiku-4-5
 *   Advisor:     claude-opus-4-6
 *   Effort:      n/a (Haiku does not support effort — omitted from call)
 *   max_uses:    3
 *   Caching:     5m
 *   max_tokens:  8192
 *   System:      Custom preset
 */
```

The comment is rendered in the language's native comment syntax: `/** ... */` for TypeScript, `# ...` lines for Python, `# ...` lines for the curl Bash block (placed above `PROMPT=`). For each setting that is omitted from the actual API call, show the value as `n/a (reason)` or `(not set — unlimited)` so the omission is intentional and explained, not invisible.

**Prompt-as-variable** — each tab hoists the user prompt to a top-level variable so it's obvious where to edit. Default value is the literal string `"prompt here"`.

- TypeScript: `const prompt = "prompt here";`
- Python: `prompt = "prompt here"`
- curl: `PROMPT="prompt here"` at the top of the shell block, with the JSON body sent via heredoc so shell variable interpolation works (`"content": "$PROMPT"`).

**Dynamic omissions in the generated code** (not just the pill rail):

| Setting | Omit from code when |
|---------|---------------------|
| `output_config: { effort }` | Executor is Haiku (doesn't support effort) |
| `max_uses` | Unset / null / 0 |
| `caching` object on the tool | TTL is `"off"` |
| `system` parameter | System prompt is empty or whitespace-only |

All three languages must apply identical omission rules so the snippets stay in sync.

**Beta header** — always included. TypeScript and Python use `betas: ["advisor-tool-2026-03-01"]`. curl uses `--header "anthropic-beta: advisor-tool-2026-03-01"`. The beta string is a constant sourced from a single place in `app.js` (e.g. `ADVISOR_BETA = "advisor-tool-2026-03-01"`) so future beta-header bumps are one-line changes that cascade to the trace and the snippet.

**System prompt escaping** — the snippet embeds the active system prompt as a string literal. The generator must escape the prompt per language:
- TypeScript / Python: escape `\`, `"`, and newlines (`\\`, `\"`, `\n`). Prefer a single-line double-quoted string even for multi-line prompts — keeps the snippet compact and avoids language-specific heredoc syntax.
- curl / JSON body: escape the prompt as a JSON string via `JSON.stringify()` to get correct JSON escaping for free.

**Copy button** — one per tab, top-right of the code area. Copies the raw snippet text (not HTML) via `navigator.clipboard.writeText()`. On success, flips to "✓ Copied" in green for ~1.4 seconds, then reverts. On failure (rare — clipboard permission denied), shows "Copy failed" briefly.

**Accessibility**:
- Tabs use `role="tablist"` / `role="tab"` / `aria-selected`.
- `Esc` closes the modal.
- Focus trap inside the modal while open; return focus to the `</>` button on close.
- Copy button has `aria-label="Copy snippet"`.

### 3.3 Prism Integration (F34)

**Self-hosted** in `/public/vendor/prism/`. No CDN. Rationale:
1. Preserves the same-origin security posture established in v1.2.0 — no third-party script domains.
2. One fewer network round-trip for users. Railway serves it directly.
3. Works in local dev without connectivity.
4. Reproducible — Prism version is pinned in the repo.

**Prism version: 1.30.0** (latest stable, verified against [npm registry](https://registry.npmjs.org/prismjs/latest)). Pinned — do not auto-upgrade. Update only via a deliberate, tested version bump. The version is recorded in:
- The path / filename of the downloaded files (e.g. document the version in `prism/README.md`)
- A top-of-file comment in `prism-theme.css` (e.g. `/* Prism v1.30.0 — see vendor/prism/README.md */`)
- The `vendor/prism/README.md` itself

**Files to include in `/public/vendor/prism/`:**

```
/public/vendor/prism/
  prism.min.js                 ← core
  prism-json.min.js            ← language: JSON (for Full I/O viewer)
  prism-typescript.min.js      ← language: TypeScript (Code View)
  prism-javascript.min.js      ← language: JavaScript (TypeScript depends on JS)
  prism-python.min.js          ← language: Python (Code View)
  prism-bash.min.js            ← language: Bash (curl tab in Code View)
  prism-theme.css              ← our custom dark theme
  README.md                    ← version, source URL, regeneration instructions
```

Download from the official Prism download page with exactly these languages selected, minified. Include a `README.md` inside the folder documenting the version and the language selection so a future maintainer can regenerate it.

**Loading strategy** — include `prism-theme.css` in `<head>`, then the JS files at end of `<body>` before `app.js`. The core `prism.min.js` loads first, then the language files (each registers itself on the global `Prism` object). `Prism.manual = true` is NOT set — we'll let Prism auto-highlight on load, and call `Prism.highlightElement(el)` manually for code we inject after load (Code View snippets, Full I/O viewer).

**Theme** — starting point is Prism Tomorrow Night, then override colors to match our palette. Target mappings:

| Token | Color | Rationale |
|-------|-------|-----------|
| Background | `var(--bg)` #0f1115 | Matches app background; no "island" effect |
| Plain text | `var(--text)` #e6e8ee | Matches app body text |
| Comments | `var(--muted)` #8a91a3 | De-emphasized |
| Strings | `#a6da95` (soft green) | Readable against dark bg |
| Keywords / control flow | `#b86bff` (advisor purple) | Ties syntax to the app's purple accent |
| Numbers / booleans | `#e0b25c` (amber, matches eval accent) | Pops without clashing |
| Function names | `#7aa2ff` (app accent blue) | Matches `--accent` |
| Property names (JSON keys, object keys) | `#7aa2ff` | Same as function names |
| Punctuation | `var(--muted)` | De-emphasized |
| Operators | `var(--text)` | Default text |

Exact hex codes will be tuned during implementation; above is the intent.

**Where Prism is applied:**
1. **Code View modal** — TS / Python / curl tabs (languages: `typescript`, `python`, `bash`).
2. **Full I/O viewer** — the request and response JSON blocks (language: `json`).

Anywhere else code is shown (e.g. error messages, inline snippets in the UI), leave as-is unless it's wrapped in a `<pre><code class="language-X">` block. Don't retrofit casual code mentions.

### 3.4 Full I/O Viewer Updates (F34 + F35)

Current state: the Full I/O viewer renders `<pre>`-wrapped JSON strings inside the trace pane without highlighting and without a copy button.

Changes:
- Wrap each JSON block in `<pre><code class="language-json">...</code></pre>` and call `Prism.highlightElement()` on it after insertion.
- Add a copy button to the top-right of each JSON block (request and response, per branch, per turn). Same styling as the Code View copy button. Copies the raw JSON text.
- No layout or sizing changes — the viewer keeps its existing max-height, scroll behavior, and collapse state.

The existing `escapeHtml()` path that protects against XSS is preserved. Prism operates on the DOM after `textContent` has been set, so there's no HTML-injection risk introduced.

### 3.5 Shared Copy-Button Component

Extract a single `makeCopyButton(getText)` helper in `app.js` used by both the Code View tabs and the Full I/O viewer. It returns a `<button>` element with:
- SVG icon + "Copy" label
- Click handler that calls `getText()` (lazy — so we always copy the currently displayed content) and writes it to the clipboard
- "✓ Copied" success state for 1400ms with color swap to `#7ed58a`
- Error state "Copy failed" on `navigator.clipboard` rejection

CSS class `.copy-btn` styled once and reused.

## 4. Other Technical Considerations

### 4.1 Security / CSP
- Prism is self-hosted from the same origin — no CSP changes required.
- Prism's runtime does not use `eval` or inline event handlers, so any future CSP tightening won't break it.
- Copy-to-clipboard requires a secure context (HTTPS or localhost). Both production (Railway HTTPS) and dev (localhost) satisfy this.

### 4.2 Bundle size
- Prism core + 5 languages + theme, all minified, is approximately 30–60 KB total (uncompressed). Gzipped even smaller. No meaningful impact on page load.
- No build step introduced. Prism files are shipped as-is from `/public/vendor/prism/`.

### 4.3 Modal open performance
- Snippet generation is synchronous string concatenation. Even with a long system prompt, it's sub-millisecond.
- Prism highlights three code blocks on modal open (one per tab, pre-rendered and hidden via `display: none`). Still negligible — tens of milliseconds worst case.

### 4.4 State-change regeneration
- The snippet reflects state **at the moment the modal opens**. If the user changes a setting while the modal is open, the snippet is not live-updated. They close and reopen to see the refreshed code.
- We won't wire up live updates in v1.5.0 — adds complexity for marginal benefit. Footer text says "Reflects current settings at time of open."

### 4.5 Mode awareness
- The Code View always shows the **advisor-tool call** (i.e. the `advisor` branch's request shape), regardless of which Mode the user has selected. This is the teaching focus of the app. Baseline branches (executor-solo, advisor-solo) don't get their own snippets — including them would dilute the teaching objective.

### 4.6 Versioning of the beta header
- The beta string `advisor-tool-2026-03-01` lives as a single constant in `app.js`. Used by both the trace UI (where applicable) and the snippet generator. One-line change when Anthropic ships a new beta version.
- The `claude-advisor-tool-updates.md` reference file should be updated whenever this changes.

### 4.7 Testing checklist
Each of these combinations should produce a snippet that is syntactically valid and runnable (after setting API key + prompt):
- Executor = Sonnet 4.6, Effort = Medium, max_uses = unset, caching = Off, Recommended preset
- Executor = Haiku 4.5 (effort should be omitted from snippet), max_uses = 5, caching = 5m, Custom preset
- Executor = Opus 4.6, Effort = Max, max_uses = 3, caching = 1h, Precise preset
- Very long custom system prompt with quotes, newlines, and backslashes — verify escaping in all three languages
- Empty system prompt — `system` parameter omitted entirely in all three languages

## 5. Open Questions

_All open questions resolved. Decisions captured below for the record:_

| Question | Decision |
|----------|----------|
| Prism theme fine-tuning | Mapping in §3.3 is the starting point; tune during implementation against real output. Not a blocker. |
| Should the Code View button be disabled when no API key is set? | **No.** The snippet is educational without a key — users can copy it, paste their own key, and run elsewhere. Button stays enabled regardless of API key state. |
| Screen-reader announcement on copy success | **Visual only.** "✓ Copied" state with color swap is sufficient. No `aria-live` region added — keeps the implementation simple. |
