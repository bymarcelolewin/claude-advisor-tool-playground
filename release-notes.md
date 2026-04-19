# Release Notes

This document lists new features, bug fixes and other changes implemented during a particular build (version or patch).

For a comprehensive tracker of Anthropic's advisor tool API changes (including features not yet implemented in this app), see [claude-advisor-tool-updates.md](docs/reference/claude-advisor-tool-updates.md).

- [v1.6.0 — Advisor Tool API Catch-up (Opus 4.7) (2026-04-18)](#v160--advisor-tool-api-catch-up-opus-47---2026-04-18)
- [v1.5.0 — Code View & Syntax Highlighting (2026-04-17)](#v150--code-view--syntax-highlighting---2026-04-17)
- [v1.4.0 — Advisor Tool API Catch-up (2026-04-16)](#v140--advisor-tool-api-catch-up---2026-04-16)
- [v1.3.0 — Conversation Totals Dashboard (2026-04-13)](#v130--conversation-totals-dashboard---2026-04-13)
- [v1.2.1 — UI Polish & Railway Deployment (Patch) (2026-04-11)](#v121--ui-polish--railway-deployment-patch---2026-04-11)
- [v1.2.0 — Security Hardening (2026-04-11)](#v120--security-hardening---2026-04-11)
- [v1.1.0 — Welcome Screen & Bug Fixes (2026-04-11)](#v110--welcome-screen--bug-fixes---2026-04-11)
- [v1.0.0 — Initial Public Release (2026-04-11)](#v100--initial-public-release---2026-04-11)

---

# v1.6.0 — Advisor Tool API Catch-up (Opus 4.7) - 2026-04-18

## Overview
Brings the playground up to date with Anthropic's April 2026 advisor tool documentation changes. Claude Opus 4.7 is now the only documented advisor model (replacing Opus 4.6), Opus 4.7 is a new executor option, a new `xhigh` effort level is available on Opus 4.7 only, and advisor-side caching carries a new "keep consistent mid-conversation" guidance. The Anthropic evaluator judge is upgraded to Opus 4.7. Also corrects a stale Opus 4.6 price ($15/$75 → $5/$25 per MTok) that had been rendering inflated cost estimates in the trace pane, and adds Anthropic's pricing URL to the reference doc and the `/check-advisor-tool-updates` command so future catch-up runs surface pricing drift.

## Key Features
- **Claude Opus 4.7 as advisor and executor.** Executor dropdown adds `claude-opus-4-7` alongside Haiku 4.5, Sonnet 4.6, and Opus 4.6. Advisor dropdown replaces Opus 4.6 with Opus 4.7 as the sole documented advisor option (selected by default). Per Anthropic's current compatibility table, Opus 4.7 is the only supported advisor; Opus 4.6 is no longer listed.
- **New `xhigh` effort level, Opus 4.7 only.** Sits between `high` and `max`. Anthropic describes it as *"Extended capability for long-horizon work"* and the recommended starting point for coding and agentic tasks on Opus 4.7. The playground shows xHigh in the effort dropdown only when the executor is Opus 4.7, mirroring the existing pattern where effort is hidden for Haiku 4.5. The user's xHigh selection is preserved across executor switches.
- **Anthropic evaluator judge upgraded to Opus 4.7.** `EVAL_MODEL_ANTHROPIC` now points at `claude-opus-4-7`. Settings modal labels updated accordingly. Judge always uses the best available Anthropic model; no 4.6 option.
- **Advisor Caching locks after first message.** Anthropic's caching-consistency guidance says toggling `caching` mid-conversation shifts the cache prefix and causes misses. The Advisor Caching dropdown in the Settings modal now joins the existing lock set (Mode, Executor, Advisor, Effort) and is disabled after the first successful turn with a tooltip explaining why. Unlocks on New Chat.

## Enhancements
- **Corrected stale Opus 4.6 pricing.** The `PRICES` table in `public/app.js` had Opus 4.6 at $15/$75 per MTok — Anthropic's authoritative pricing page shows it at $5/$25 per MTok (and has for some time). All in-app cost estimates on Opus 4.6 conversations drop roughly 3×. Opus 4.7 added at the same $5/$25 rates.
- **Tokenizer note on the cost-estimates blurb.** Opus 4.7 uses a new tokenizer that may use up to ~35% more tokens for the same text — effective cost can be higher than the per-MTok rate suggests. Called out in the Settings modal cost-estimates paragraph.
- **Reference doc refresh.** `docs/reference/claude-advisor-tool-updates.md` has a full executor/advisor compatibility table, a per-level effort availability table with Opus 4.7-specific notes (stricter effort adherence, no manual extended thinking, recommended `max_tokens` when running xhigh/max), the "keep caching consistent" warning, and a new "Pricing Snapshot" section capturing verified rates + cache multipliers + batch discount + data-residency multiplier.
- **`/check-advisor-tool-updates` command hardened.** Added `https://platform.claude.com/docs/en/about-claude/pricing` as a third WebFetch in the catch-up diff. Added "Model pricing" to the diff checklist so future runs surface pricing drift the same way they surface API-surface drift.

## Bug Fixes
- Fixed stale Opus 4.6 price in `public/app.js` (`{ in: 15.0, out: 75.0 }` → `{ in: 5.0, out: 25.0 }`) and in the Settings modal cost-estimates blurb. The mismatch had been inflating trace-pane cost estimates for Opus 4.6 conversations by roughly 3×.

## Other Notes
- **No code changes to the Code View modal.** Code View reads live state from the config selectors and serializes through `JSON.stringify(snap.effort)` and pass-through for model IDs — the new `xhigh` value and `claude-opus-4-7` model ID flow through automatically with no additional work.
- **Opus 4.6 may still be accepted as advisor by the API during a grace period**, but the playground sticks to Anthropic's documented compatibility table (Opus 4.7-only). If Anthropic publishes an explicit deprecation date for 4.6-as-advisor, add a tracking note here.
- **`max_tokens` guidance for xhigh/max:** Anthropic recommends starting at 64k tokens when running Opus 4.7 at `xhigh` or `max` effort. The playground's `max_tokens` default (8192) may be too low for full xHigh-caliber responses; users running those effort levels should bump Settings → Chat & Advisor → Max tokens.
- **MIT license added.** The repo now ships with a top-level `LICENSE` file (MIT, Copyright (c) 2026 Red Pill Blue Pill Studios) and a License badge + bottom-of-README section linking to it. Makes the open-source status unambiguous for anyone forking or reusing.

---

# v1.5.0 — Code View & Syntax Highlighting - 2026-04-17

## Overview
Adds a **Code View** popup that shows the exact Anthropic API call for the user's current configuration in TypeScript, Python, and curl — generated dynamically from whatever Executor/Advisor/Effort/max_uses/caching/max_tokens/system-prompt settings are active. Bundled with **Prism-based syntax highlighting** applied everywhere code is displayed (Code View snippets + Full I/O viewer JSON) and per-block **copy buttons** on the Full I/O viewer.

## Key Features
- **Code View modal.** New `</>` icon in the top-nav cluster opens a centered modal with three tabs (TypeScript / Python / curl). The snippet is **fully dynamic** — reflects every current setting with omission rules applied (effort omitted on Haiku, `max_uses`/`caching`/`system` omitted when off/empty). Every snippet starts with a self-documenting comment block listing all current settings, including the ones intentionally omitted and why. The user prompt is hoisted to a `prompt` / `PROMPT` variable at the top of each snippet for obvious editing. Beta header `advisor-tool-2026-03-01` always included.
- **Prism syntax highlighting.** Self-hosted Prism 1.30.0 in `/public/vendor/prism/` (no CDN — keeps the same-origin security posture from v1.2.0 intact). Custom dark theme tuned to the app palette. Applied to both the Code View snippets and the Full I/O viewer JSON blocks.
- **Copy buttons.** Reusable `makeCopyButton()` helper with "✓ Copied" success state and "Copy failed" error state. One header button in the Code View that copies the active tab. Per-section buttons on the Full I/O viewer (request and response JSON) for every branch, every turn.
- **Global "Wrap code" toggle in the Trace pane.** New checkbox next to "Sync panes" — affects every Full I/O JSON block in the trace pane simultaneously. Default on (wraps long lines), off falls back to horizontal scroll. Wrap uses `overflow-wrap: anywhere` so long unbreakable strings (like JSON-stringified system prompts) break correctly.
- **"Original prompt" toggle in Code View.** Second checkbox in the tab-row actions. Disabled until the user sends a prompt in the current conversation, unchecked by default when enabled. When ticked, substitutes the user's most recent prompt for `"prompt here"` across all three snippets with proper escaping per language (JS/Python via `JSON.stringify`; curl via a new `bashDoubleQuote()` helper). New Chat resets the checkbox.
- **Top-nav redesigned as a pill cluster.** The `</>` + ⓘ + ⚙ buttons now live inside a single rounded container with hairline dividers. All three use consistent SVG outline icons (replacing the previous mix of Unicode chars and mono text). Code View button tinted accent-blue to differentiate it. Selected from a 4-variation mockup during design.

## Enhancements
- **Sentinel stripping in the Code View.** The `<!-- advisor:only -->` / `<!-- /advisor:only -->` markers are playground-specific — they're inert HTML comments to Anthropic but noise in user-facing code. The Code View strips just the sentinel tags before embedding the system prompt in snippets, preserving all content inside AND outside the tags. Users who copy the code get Anthropic's recommended prompt content without the playground's internal plumbing.
- **Tab keyboard navigation.** Per WAI-ARIA tablist pattern: Left/Right arrow keys cycle between Code View tabs, Home/End jump to first/last. Existing Tab/Shift+Tab focus trap unchanged.
- **Consistent modal height across tabs.** The Code View body has a fixed height (`min(620px, 100vh - 240px)`) so the modal doesn't resize when you switch between languages with different snippet lengths.
- **Horizontal scroll hoisted to the panel.** When wrap is off, the scrollbar appears at the bottom of the visible panel viewport (not at the bottom of the pre, which would be hidden below the scroll area on long snippets). `min-width: max-content` on the pre + `overflow: auto` on the panel gives a single always-visible scrollbar.
- **Single-source `ADVISOR_BETA` constant** on the frontend. The beta header string (`"advisor-tool-2026-03-01"`) now lives as a top-level constant in `app.js`, used by the Code View snippet generators. Future beta-header bumps are a one-line change on the frontend.

## Bug Fixes
None (v1.5.0 is additive).

## Other Notes
- **New dependency:** Prism 1.30.0, self-hosted at `/public/vendor/prism/`. Includes `prism.min.js`, five language components (JSON, TypeScript, JavaScript, Python, Bash), a custom dark theme (`prism-theme.css`), and a `README.md` documenting the pinned version and source URLs for future regeneration.
- **End-to-end validation.** The generated curl snippet was tested against the real Anthropic API with both a trivial prompt (no advisor call — correct per the Recommended preset's timing guidance) and a substantive prompt (full advisor-tool flow fired with `advisor_message` in the iterations array).
- **TypeScript and Python snippets** were structurally validated against the Anthropic SDK docs but not executed end-to-end. Any SDK signature drift will surface as a runtime error on the user's side.

---

# v1.4.0 — Advisor Tool API Catch-up - 2026-04-16

## Overview
Brings the app up to date with the latest Anthropic advisor tool API capabilities. Adds effort settings, `max_uses` cap, expanded caching options (1h TTL), system prompt presets, and better error/redacted-result handling. Also restructures the UI: model selectors moved from the header into a dedicated config panel on the chat side, and all config selectors (mode, executor, advisor, effort) now lock together after the first message for consistent comparisons across a conversation.

## Key Features
- **Model configuration panel.** Executor, Advisor, and Mode dropdowns moved from the header into a "Config Models" panel on the chat side. Cleaner layout, more room in the main header, and a natural home for the new Effort dropdown.
- **Effort settings (`output_config.effort`).** New dropdown next to the executor model with Low / Medium / High (default) / Max. Applied to all branches in compare mode so comparisons stay fair. Disabled and shown as "n/a" when Haiku 4.5 is selected (Haiku doesn't support effort). The user's real selection is preserved when Haiku is temporarily chosen.
- **`max_uses` setting.** New number input in Settings → Chat & Advisor to cap advisor calls per API request. Empty = unlimited. When the cap is reached, the advisor returns an `advisor_tool_result_error` with `max_uses_exceeded` and the executor continues without further advice.
- **Advisor call counter in trace.** Advisor step cards now label themselves "Advisor · call N" (or "Advisor · call N of M" when a cap is set). Turn summary pill shows "N / M advisor calls" accordingly.
- **Caching dropdown (Off / 5m / 1h).** Replaces the old checkbox. 1h TTL is a new Anthropic API option — useful for long-running agent loops that span tens of minutes between calls.
- **System prompt presets.** New dropdown with three options: **Recommended** (Anthropic's timing + advice-treatment blocks), **Precise** (Recommended + conciseness instruction, reported to cut advisor output tokens 35-45%), and **Custom** (your own content, pre-populated with a sentinel-tag skeleton). Editing the textarea auto-switches the dropdown to Custom, and custom content is preserved across preset swaps.
- **Config selectors lock together after first message.** Mode, Executor, Advisor, and Effort all lock when you send your first message — preventing mid-conversation changes that would make turn comparisons unfair. All unlock on new conversation (`+` button) or if the first send fails.
- **Effort shown in the conversation totals dashboard.** Yellow-accented entry in the legend with the current effort level (or "n/a (haiku-4-5)" when Haiku is the executor).
- **"New Chat" button.** The plain `＋` icon in the chat header is now a labeled "＋ New Chat" button with a purple-tinted highlight — more discoverable as a primary action.
- **About modal tagline + last updated.** About modal now shows "A Playground for the [Claude Advisor Tool](...)" below the title (linking to the official docs) and a "Last updated: YYYY-MM-DD" footer line sourced from `package.json`.

## Enhancements
- **`advisor_redacted_result` handling.** When the advisor model returns encrypted output, the trace now shows a clear message: "Advisor response is encrypted — content not visible to the client. The executor still received the plaintext advice server-side." (Currently no advisor model returns encrypted results — future-proofing.)
- **Advisor error code display.** All six documented error codes (`max_uses_exceeded`, `too_many_requests`, `overloaded`, `prompt_too_long`, `execution_time_exceeded`, `unavailable`) now render with red-tinted step cards, a bold human-readable message, the raw error code, and a clarifying note that the request itself succeeded.
- **Effort sent even at "high"** for trace transparency (the API treats `high` and omitting identically, but including it in the JSON makes it clear what was selected).
- **`cache_r` / `cache_w` removed from executor step cards.** These fields were always zero on executor steps (the app doesn't set `cache_control` breakpoints on executor content) and misleading. They now appear only on advisor step cards, where they track the advisor-side caching toggle.
- **Config panel header** uses `--panel` to match other pane headers; body uses a slightly lighter gray (`#262b37`) to read as an elevated configuration surface.
- **Lockable config rows.** Added `.locked` CSS state for the new config panel rows, matching how mode locking worked before.

## Bug Fixes
- **`SUGGESTED_SYSTEM_PROMPT` renamed** to `SYSTEM_PROMPT_RECOMMENDED` to align with the new preset vocabulary. No functional change; internal cleanup.

## Other Notes
- **About box link updated** from `CHANGELOG.md` to `release-notes.md` (the former file was renamed earlier and the About modal was still pointing at the old URL).
- **`package.json` now has a `lastUpdated` field** that's exposed via `/api/version` and displayed in the About modal. Keeps the timestamp source-of-truth in one place.
- **New reference file:** [`docs/reference/claude-advisor-tool-updates.md`](docs/reference/claude-advisor-tool-updates.md) — tracks every advisor tool API change from Anthropic's docs, whether implemented in this app or not. Linked from both the README and this release notes file.
- **Haiku 4.5 executor note:** Haiku doesn't support the `effort` parameter per Anthropic's docs. The app detects this, disables the effort dropdown, and sends `effort: null` to the server so no `output_config` is included in Haiku requests.

---

# v1.3.0 — Conversation Totals Dashboard - 2026-04-13

## Overview
Major feature update focused on making branch comparisons easier to read at a glance across a whole conversation, not just per turn.

## Key Features
- **Conversation totals dashboard** pinned at the top of the Trace pane. Five tiles (`in`, `out`, `cost`, `time`, and a shared `turns` count) show cumulative per-branch totals for every turn in the current conversation. Refreshes automatically after every successful turn, hidden until the first turn completes.
- **Color-coded per-branch values inside each tile.** Each metric gets one tile, with each branch's value stacked inside it in the branch's existing color (purple for advisor, blue for executor-model-solo, amber for advisor-model-solo). A legend below the tiles ties color to branch, and includes the actual model names (e.g., `ADVISOR · sonnet-4-6 → opus-4-6`).
- **Leader indicator.** In compare modes with 2+ branches, a small green `←` appears next to the lowest (winning) value in each tile, giving an instant read on which branch is ahead on efficiency. Updates per turn. Ties get marked on all tied branches. Branches with unknown pricing are excluded from the leader calculation on the `cost` tile only.
- **Mode locking for honest comparisons.** The `Mode` dropdown now locks the moment you send the first message of a conversation — and stays locked until you start a new conversation. This prevents mid-conversation mode changes that would create asymmetric turn counts and cold-start history divergence across branches.

## Enhancements
- **Per-turn summary grid reduced from 5 tiles to 4.** The `cache_r` and `cache_w` tiles have been removed from the turn-level summary grid and replaced with a single `time` tile. Final layout: `in / out / cost / time` — matching the dashboard's vocabulary exactly. Cost already reflects cache savings at the correct rates, so the cache tiles were redundant at this aggregation level.
- **Per-turn summary tile labels** renamed from `input` / `output` / `est. cost` to `in` / `out` / `cost` for consistency with the dashboard.

## Bug Fixes
None

## Other Notes
- **Advisor caching toggle** in Settings → Chat & Advisor is unchanged.
- **Per-step cache diagnostics** (`cache_r` and `cache_w` on individual executor/advisor step cards inside each turn) are unchanged.
- The mid-conversation "Mode changed to ..." system note was removed (now unreachable because the mode selector is locked after the first turn).

---

# v1.2.1 — UI Polish & Railway Deployment (Patch) - 2026-04-11
- **Type:** Small Enhancement
- **Summary:** Minor UI polish across the chat and trace panes. App launched on Railway as a hosted version at [advisor-tool-playground.up.railway.app](https://advisor-tool-playground.up.railway.app/).

---

# v1.2.0 — Security Hardening - 2026-04-11

## Overview
Comprehensive security hardening pass to prepare the app for public deployment.

## Key Features
None

## Enhancements
- **Same-origin CORS lock-down** on `/api` routes — cross-origin requests blocked with 403.
- **Per-IP rate limiting** — 60 requests/hour using in-memory Map, configurable via environment variables. Returns `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers.
- **HTTPS redirect + HSTS headers** when deployed behind a TLS-terminating proxy. Skipped on localhost.
- **Security headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- **XSS hardening** — Full audit of all 35 `innerHTML` render sites. Hardened `escapeHtml()` covering all five OWASP-recommended characters.
- **2MB request payload cap** via `express.json({ limit: "2mb" })`.

## Bug Fixes
None

## Other Notes
Keys and conversations are never persisted server-side. The server is fully stateless.

---

# v1.1.0 — Welcome Screen & Bug Fixes - 2026-04-11

## Overview
Added onboarding experience for new users and fixed a quality evaluation bug.

## Key Features
- **Welcome slideshow** on first launch — introduces the advisor strategy, explains what the playground does, and walks through initial API key setup.

## Enhancements
- Added **advisor flow SVG diagram** (`images/advisor-flow.svg`) showing the executor → advisor escalation pattern.
- Added app screenshot and evaluation screenshot for documentation.
- Comprehensive README rewrite with clearer structure and image references.

## Bug Fixes
- Fixed a bug in the Quality Evaluation panel where judge responses with unusual JSON formatting were not parsed correctly.

## Other Notes
None

---

# v1.0.0 — Initial Public Release - 2026-04-11

## Overview
First release of the Claude Advisor Tool Playground — a web app for experimenting with Anthropic's advisor tool beta.

## Key Features
- **Chat with advisor tool tracing** — Send prompts through executor + advisor, see a step-by-step timeline of every API interaction with model names, token counts (input, output, cache read, cache write), cost estimates, and raw content per step.
- **Compare modes** — Run the same prompt through up to 3 execution paths in parallel (advisor, executor-model-solo, advisor-model-solo) with delta pills showing cost/latency/token differences.
- **LLM-as-judge quality evaluation** — Opt-in per-turn scoring using Claude Opus or GPT as judge, with 2-pass position-bias mitigation, blinded candidates, 4-dimension rubric (correctness, completeness, clarity, depth), and judge-disagreement detection.
- **Full I/O viewer** — Inspect the exact JSON request and response for any branch on any turn.
- **Settings modal** — Four collapsible sections: Anthropic API, Chat & Advisor, Quality Evaluation, Notices & Disclaimers.

## Enhancements
None (initial release)

## Bug Fixes
None (initial release)

## Other Notes
- Built with Node.js + Express backend and vanilla JS frontend (no frameworks, no build step).
- Only 2 production dependencies: `@anthropic-ai/sdk` and `express`.
- Server is fully stateless — conversation history and API keys live in the browser only.
- Sentinel convention (`<!-- advisor:only -->`) strips advisor-specific system prompt sections from baseline branches for fair comparison.
