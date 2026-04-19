# Feature Backlog

This document lists features and enhancements derived from the plan. It is a living document that will evolve throughout the project. It is grouped by version, with the Backlog tracking all features not added to a version yet. It is used to create versions to work on.

| Status |  | Priority |  |
|--------|-------------|---------|-------------|
| 🔴 | Not Started | High | High priority items |
| 🟡 | In Progress | Medium | Medium priority items |
| 🟢 | Completed | Low | Low priority items |


## Backlog

_No items currently in the backlog._

## v1.0.0 — Initial Release - 🟢 Completed
Core playground with chat, tracing, compare modes, evaluation, and full I/O viewer.

| ID  | Feature                 | Description                              | Priority | Status |
|-----|-------------------------|------------------------------------------|----------|--------|
| F1  | Chat with advisor tracing | Send prompts through executor + advisor, trace every step with tokens/cost | High | 🟢 Completed |
| F2  | Step timeline visualization | Per-step cards with model, tokens (in/out/cache_r/cache_w), cost, content preview | High | 🟢 Completed |
| F3  | Compare modes | Run same prompt through up to 3 execution paths in parallel with delta pills | High | 🟢 Completed |
| F4  | Full I/O viewer | Inspect exact JSON request + response per branch per turn | Medium | 🟢 Completed |
| F5  | LLM-as-judge evaluation | 2-pass position-bias mitigated scoring with 4-dimension rubric | High | 🟢 Completed |
| F6  | Settings modal | API key management, system prompt, advisor caching, judge config in 4 collapsible sections | Medium | 🟢 Completed |
| F7  | Floating chat input | ChatGPT/Claude-style floating input with auto-grow textarea and icon send button | Low | 🟢 Completed |
| F8  | Confirm modal for reset | Custom dark-themed confirmation dialog before clearing conversation | Low | 🟢 Completed |

## v1.1.0 — Welcome Screen & Bug Fixes - 🟢 Completed
Added onboarding slideshow and fixed evaluation bug.

| ID  | Feature                 | Description                              | Priority | Status |
|-----|-------------------------|------------------------------------------|----------|--------|
| F9  | Welcome slideshow | First-launch walkthrough introducing the advisor strategy and playground | Medium | 🟢 Completed |
| F10 | Evaluation bug fix | Fixed bug in quality evaluation panel | High | 🟢 Completed |
| F11 | Advisor flow diagram | SVG diagram showing executor → advisor interaction pattern | Low | 🟢 Completed |

## v1.2.0 — Security Hardening - 🟢 Completed
Comprehensive security pass for production deployment.

| ID  | Feature                 | Description                              | Priority | Status |
|-----|-------------------------|------------------------------------------|----------|--------|
| F12 | Same-origin CORS | Lock API routes to only accept requests from the served page | High | 🟢 Completed |
| F13 | Per-IP rate limiting | 60 requests/hour per IP on API routes | High | 🟢 Completed |
| F14 | HTTPS enforcement | HTTP → HTTPS redirect + HSTS behind TLS proxy | High | 🟢 Completed |
| F15 | Security headers | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy | High | 🟢 Completed |
| F16 | XSS hardening | Audit of all innerHTML sites, hardened escapeHtml() | High | 🟢 Completed |
| F17 | Payload cap | 2MB request body limit | Medium | 🟢 Completed |

## v1.2.1 (Patch) — UI Polish & Railway Deploy - 🟢 Completed
Minor UI updates and launch on Railway.

| ID  | Feature                 | Description                              | Priority | Status |
|-----|-------------------------|------------------------------------------|----------|--------|
| F18 | UI polish | Minor visual refinements across chat and trace panes | Low | 🟢 Completed |
| F19 | Railway deployment | Deployed live instance at advisor-tool-playground.up.railway.app | Medium | 🟢 Completed |

## v1.3.0 — Conversation Totals Dashboard - 🟢 Completed
Major feature for at-a-glance branch comparison across whole conversations.

| ID  | Feature                 | Description                              | Priority | Status |
|-----|-------------------------|------------------------------------------|----------|--------|
| F20 | Conversation totals dashboard | Cumulative per-branch totals (in/out/cost/time) pinned at top of trace pane | High | 🟢 Completed |
| F21 | Leader indicators | Green arrow marking the winning branch per metric in compare modes | Medium | 🟢 Completed |
| F22 | Mode locking | Lock mode dropdown after first message for fair comparisons | High | 🟢 Completed |
| F23 | Tile cleanup | Reduced per-turn tiles from 5 to 4 (removed cache_r/cache_w, added time) | Low | 🟢 Completed |

## v1.4.0 — Advisor Tool API Catch-up - 🟢 Completed
Bring the app up to date with the latest Anthropic advisor tool API capabilities and add new configuration options for cost control and experimentation.

| ID  | Feature                 | Description                              | Priority | Status |
|-----|-------------------------|------------------------------------------|----------|--------|
| F24 | Model config panel | Move executor/advisor/mode dropdowns from header into config panel above chat | High | 🟢 Completed |
| F25 | Effort settings | New dropdown next to executor (low/medium/high/max) via `output_config.effort` | High | 🟢 Completed |
| F26 | `max_uses` setting | New number input in Settings → Chat & Advisor to cap advisor calls per request | Medium | 🟢 Completed |
| F27 | Advisor call counter | Show "Call N of M" in trace when multiple advisor calls occur | Medium | 🟢 Completed |
| F28 | Caching dropdown | Replace checkbox with Off / 5m / 1h dropdown | Medium | 🟢 Completed |
| F29 | `advisor_redacted_result` handling | Gracefully display encrypted advisor responses in trace | Low | 🟢 Completed |
| F30 | Error codes display | Render advisor error codes clearly in trace step cards | Medium | 🟢 Completed |
| F31 | System prompt presets | Dropdown: Recommended / Precise / Custom | High | 🟢 Completed |
| F32 | About box link fix | Change CHANGELOG.md reference to release-notes.md | Low | 🟢 Completed |

## v1.5.0 — Code View & Syntax Highlighting - 🟢 Completed
Added a Code View popup that shows the exact Anthropic API call for the user's current configuration (TypeScript / Python / curl), and introduced Prism-based syntax highlighting everywhere code is displayed. Both features shared Prism as a dependency, so they were bundled.

| ID  | Feature                 | Description                              | Priority | Status |
|-----|-------------------------|------------------------------------------|----------|--------|
| F33 | Code View popup | New `</>` icon in the top-nav cluster opens a centered modal with three tabs: TypeScript, Python, curl. Snippet is dynamic — reflects all current settings with omission rules applied. Self-documenting comment block at top of every snippet. User prompt hoisted to a top-level variable. Settings pill rail summarizes the config. Header Copy button + Wrap toggle + Original-prompt toggle. Top-nav redesigned as a unified pill cluster with SVG icons. | High | 🟢 Completed |
| F34 | Prism syntax highlighting | Self-hosted Prism 1.30.0 in `/public/vendor/prism/` (JSON, TypeScript, JavaScript, Python, Bash). Custom dark theme matching the app palette. Applied to Full I/O viewer JSON and Code View snippets. No CDN — preserves the same-origin security posture from v1.2.0. | High | 🟢 Completed |
| F35 | Copy button on Full I/O viewer | Shared `makeCopyButton()` helper with "✓ Copied" / "Copy failed" states. Applied to request and response JSON blocks in the Full I/O viewer. Global "Wrap code" toggle added to the Trace pane header next to "Sync panes" — affects all branches simultaneously. | Medium | 🟢 Completed |

## v1.6.0 — Advisor Tool API Catch-up (Opus 4.7) - 🟢 Completed
Brought the playground up to date with Anthropic's April 2026 advisor tool documentation changes: Opus 4.7 is now the only documented advisor model (replacing Opus 4.6), Opus 4.7 is also a new executor option, a new `xhigh` effort level is available on Opus 4.7, and advisor-side caching carries a new "keep consistent mid-conversation" guidance. Also upgraded the Anthropic evaluator judge to Opus 4.7, corrected a stale Opus 4.6 price ($15/$75 → $5/$25), and added Anthropic's pricing URL to the reference doc + `/check-advisor-tool-updates` command so future catch-up runs surface pricing drift.

| ID  | Feature                 | Description                              | Priority | Status |
|-----|-------------------------|------------------------------------------|----------|--------|
| F36 | Opus 4.7 advisor + executor upgrade | Added `claude-opus-4-7` to the executor dropdown (alongside Haiku 4.5, Sonnet 4.6, Opus 4.6). Replaced `claude-opus-4-6` with `claude-opus-4-7` as the sole advisor option, selected by default. Added Opus 4.7 to the `PRICES` table at $5/$25 per MTok, and corrected the stale Opus 4.6 entry from $15/$75 → $5/$25. Updated the cost-estimates blurb with both model prices plus a tokenizer note (Opus 4.7 uses a new tokenizer that may use up to ~35% more tokens for the same text). Updated the reference doc compatibility table. | High | 🟢 Completed |
| F37 | `xhigh` effort level (Opus 4.7 only) | Added `xhigh` as a new effort value, inserted via JS only when executor = `claude-opus-4-7` (mirroring the `ensureNaOption`/`removeNaOption` pattern used for Haiku). Preserved the user's xhigh selection across executor switches via `savedEffortValue`. Patched `applySettings` to `ensureXhighOption()` before restoring a saved "xhigh" on page load. Extended the effort tooltip. Rewrote the reference doc's Effort Settings section with a per-level availability table and Opus 4.7-specific notes. | High | 🟢 Completed |
| F38 | Evaluator judge upgrade to Opus 4.7 | Changed `EVAL_MODEL_ANTHROPIC` in `server.js` from `"claude-opus-4-6"` to `"claude-opus-4-7"`. Updated the Settings modal evaluator label and hint. No 4.6 fallback — judge always uses the best available Anthropic model. | Medium | 🟢 Completed |
| F39 | Caching-consistency lock | Added a `setCachingLocked()` helper and wired it into the first-turn lock, the retry-unlock path, and the new-chat unlock. Extended the Advisor Caching setting-hint to explain why it locks. Added Anthropic's "keep caching consistent" warning to the reference doc's Caching Details section. | Low | 🟢 Completed |
| F40 | Pricing source-of-truth + command hardening | Added `https://platform.claude.com/docs/en/about-claude/pricing` to the reference doc's Source URLs and a new "Pricing Snapshot" section capturing verified rates + cache multipliers + batch discount + data-residency multiplier. Added the pricing URL as a third WebFetch in `.claude/commands/check-advisor-tool-updates.md` Step 3 and added "Model pricing" to the diff checklist. Future catch-up runs will now surface pricing drift. | Medium | 🟢 Completed |
