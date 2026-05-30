# Feature Backlog

This document lists features and enhancements derived from the plan. It is a living document that will evolve throughout the project. It is grouped by version, with the Backlog tracking all features not added to a version yet. It is used to create versions to work on.

| Status |  | Priority |  |
|--------|-------------|---------|-------------|
| 🔴 | Not Started | High | High priority items |
| 🟡 | In Progress | Medium | Medium priority items |
| 🟢 | Completed | Low | Low priority items |


## Backlog

_No items currently in the backlog._

## v1.8.0 — Advisor Tool API Catch-up (Opus 4.8) - 🟢 Completed
Brings the playground up to date with Anthropic's advisor tool documentation changes since the 2026-05-14 review. Claude Opus 4.8 (`claude-opus-4-8`) is now Anthropic's default advisor model and a new executor option. The compatibility rule "the advisor must be at least as capable as the executor" means every executor below 4.8 (Haiku 4.5, Sonnet 4.6, Opus 4.6, Opus 4.7) accepts **either** Opus 4.7 or Opus 4.8 as advisor, while the Opus 4.8 executor accepts **only** Opus 4.8. Invalid pairs are rejected server-side with `400 invalid_request_error`, so the playground enforces the rule client-side. Also: `xhigh` effort is now available on Opus 4.8 (in addition to Opus 4.7); the Anthropic evaluator judge bumps to Opus 4.8; and the reference doc gets pricing, fast-mode, conciseness-guidance, and tool-use-overhead corrections. OpenAI evaluator (`gpt-5.5`) is unchanged — no work needed there.

Decisions locked during discovery: advisor dropdown offers **both** Opus 4.7 and Opus 4.8, with **Opus 4.8 preselected** (mirrors Anthropic's current default code samples). When the executor is Opus 4.8, the Opus 4.7 advisor option is **disabled (grayed out)** with a dynamic hint, and the selection falls back to Opus 4.8 — same conditional-option pattern already used for the effort dropdown (`xhigh`/`na`). Architecturally, all model facts move into a single **`public/models.json`** registry read by both `app.js` (client `fetch`) and `server.js` (startup file read); the executor/advisor/evaluator dropdowns, `PRICES`, effort options, advisor pairings, and the server judge selection all derive from it. Pairings are stored as explicit per-executor lists (a 1:1 mirror of Anthropic's compatibility table), **not** a capability-rank assumption. See `v1.8.0-advisor-opus-4-8-catchup/design.md` for the full technical design.

| ID  | Feature                 | Description                              | Priority | Status |
|-----|-------------------------|------------------------------------------|----------|--------|
| F54 | `public/models.json` registry + bootstrap + Opus 4.8 | Create `public/models.json` as the single source of truth for model facts (`provider`, role flags `executor`/`advisor`/`eval`, `label`, `price`, `aliases`, `effort`, `advisors`). Client `app.js` `await`s `fetch('/models.json')` in an async bootstrap and **derives** the executor + advisor dropdowns, the `PRICES` lookup, and (with F56) effort options — replacing the static HTML `<option>` lists and the hand-written `PRICES` table. Add the `claude-opus-4-8` entry (executor + advisor + eval, $5/$25, effort low→max incl. xhigh, advisors `["claude-opus-4-8"]`) and migrate `gpt-5.5` in as an eval-only OpenAI entry. `label` equals `value` for now (adjustable later, no code change). Preselect Opus 4.8 as the default advisor. CRITICAL: fetch+parse, then generate options, then `applySettings` (so persisted selections don't blank). `models.json` is load-bearing — on fetch/parse failure show a hard error state, NOT a silent degrade or hardcoded fallback. Update the reference doc's current-API-status + compatibility table to the new 5-row matrix and remove the obsolete "Opus 4.6 grace period" advisor language. | High | 🟢 Completed |
| F55 | Executor→advisor pairing guard | New `updateAdvisorAvailability()` driven by `MODELS[executor].advisors` (explicit per-executor lists — a 1:1 mirror of Anthropic's table, NOT a capability-rank assumption). Gray out (via `option.disabled`) any advisor invalid for the current executor; if the current selection becomes invalid, restore the user's last explicit choice if still valid, else fall back to the highest valid advisor. Track `savedAdvisorValue`, respect the first-turn lock, and `saveSettings()` on side-effect changes. Concretely: Opus 4.8 executor grays out the 4.7 advisor and flips to 4.8; every other executor allows both. Prevents the `400 invalid_request_error` Anthropic returns for invalid pairs. | High | 🟢 Completed |
| F56 | Effort options from registry + generalized state machine | Drive the effort dropdown from `MODELS[executor].effort`: collapse `ensureXhighOption`/`removeXhighOption`/`ensureNaOption`/`removeNaOption` and the `isHaiku`/`isOpus47` branches into a generic `rebuildEffortOptions(allowed)`; empty array ⇒ "n/a" + disabled. Keep the stateful demotion/restore behavior but make it model-agnostic (`allowed.includes(savedEffortValue)` instead of model-name checks; fallback to `high` else first allowed). `xhigh` now surfaces for both Opus 4.7 and Opus 4.8 purely as data. Update the effort `<select>` `title` in `public/index.html`. Update the reference doc's effort-availability table (`xhigh`: Opus 4.7 + Opus 4.8; `max`: add Opus 4.8) and add an Opus 4.8 per-level note (adaptive thinking only, `budget_tokens` returns 400, start at `xhigh` for coding/agentic). | High | 🟢 Completed |
| F57 | `eval` role + `provider` — data-driven judge | Make the evaluator judge data-driven from `models.json` instead of hardcoded constants. Server reads `public/models.json` at startup (fail-fast if missing/malformed) and resolves the judge as the `eval: true` entry whose `provider` matches the request's `evalProvider`, retiring `EVAL_MODEL_ANTHROPIC`/`EVAL_MODEL_OPENAI` (server.js lines 384–385). Client derives the eval-provider dropdown (`index.html` lines 150–151) from `eval: true` entries, labelled `"{Provider} · {label}"`, keeping value = provider so `updateOpenAIKeyVisibility` is unaffected; update/derive the Settings hint (line 147). The Anthropic judge becomes Opus 4.8 via data (`eval: true` on the 4.8 entry, `false` on 4.7). Conceptually the judge is the playground's own concern (not the advisor tool API) — it shares the file as storage only, tagged distinctly via the `eval` role. | Medium | 🟢 Completed |
| F58 | Pricing + fast-mode refresh | Reference doc only (PRICES table handled in F54). Add an Opus 4.8 row to the Pricing Snapshot ($5 in / $25 out, same cache multipliers and batch discount as the Opus tier). Correct the Fast mode subsection: Opus 4.8 fast mode is **$10 / MTok input, $50 / MTok output** (~2× standard), distinct from Opus 4.6/4.7 fast mode which stays at **$30 / $150** (~6×). | Medium | 🟢 Completed |
| F59 | Advisor conciseness guidance update | Reference doc only. Anthropic's "Trimming advisor output length" guidance moved from a third-person system-prompt instruction to a **user-message, second-person** line — `(Advisor: please keep your guidance under 80 words — I need a focused starting point, not a comprehensive plan.)` — because the advisor sees system + user content as quoted context and follows direct second-person instructions more reliably. Note that it also slightly raised consult frequency but netted lower total cost. Update the "Suggested System Prompts" section (currently the "Conciseness Instruction" subsection) to reflect the new technique. | Medium | 🟢 Completed |
| F60 | Tool-use overhead per-model correction | Reference doc only. The pricing page now publishes per-model tool-use system-prompt overhead, replacing the flat 346/313 figure currently recorded. Update the "Tool-use system-prompt overhead" subsection to the published per-model values (auto·none / any·tool): Opus 4.8 290/410, Opus 4.7 675/804, Opus 4.6 497/589, Sonnet 4.6 497/589, Haiku 4.5 496/588. Informational — the playground does not hardcode these. | Low | 🟢 Completed |
| F61 | Reference doc "Last reviewed" + README/version-bump consistency | Bump the reference doc's "Last reviewed" date to today and sweep README for any `claude-opus-4-7` advisor/judge references that should mention 4.8. Standard release version bump (per the version-bump checklist): `cody.json`, `package.json` (+`lastUpdated`), `package-lock.json`, README version badge, `release-notes.md`, and this build folder. | Medium | 🟢 Completed |

## v1.7.0 — Sample Prompts Library - 🟢 Completed
Adds a curated library of sample prompts users can insert into the chat input with one click. Removes the "what should I type?" friction for new and returning users. Surfaces both prompts that should fire the advisor and prompts that shouldn't, so the comparison is visible at a glance. The library is a JSON file (`public/sample-prompts.json`) fetched on load — no build step, no API endpoint, no server-side state — keeping the stack as flat as the rest of the app.

Design locked via the mockup at [v1.7.0-sample-prompts-library/mockups/option-c-inline-with-see-all.html](v1.7.0-sample-prompts-library/mockups/option-c-inline-with-see-all.html). Schema: `{ title, prompt, shouldTriggerAdvisor: bool, complexity: "quick" | "standard" | "heavy" }`. Eight seed prompts (4 triggers / 4 skips).

| ID  | Feature                 | Description                              | Priority | Status |
|-----|-------------------------|------------------------------------------|----------|--------|
| F45 | Sample prompts JSON + loader | New file `public/sample-prompts.json` with the 8 seed prompts. Frontend fetches it once on load (alongside `/api/version`). Defensive — if the fetch fails or the file is malformed, the feature degrades silently (no pill row shown, no error to user). Schema documented inline. | High | 🟢 Completed |
| F46 | Empty-state pill row | New container above the chat input that's visible when the conversation is empty. Shows 5 featured prompt pills + a `+ See all (N)` pill at the end. Each pill: small colored dot (🟢 triggers / 🟡 skips), prompt title, hover tooltip showing the full prompt body + a triggers/skips badge with ~250ms delay. Click a pill = insert into the textarea (or fire confirm-replace if textarea has content). Header has a `▾` to manually collapse the row. | High | 🟢 Completed |
| F47 | Collapsed-state single pill | After the first user message is sent (or when manually collapsed), the full row is replaced by a single small pill `💡 Sample prompts ▾`. Click it = re-expands the row. Persists for the rest of the conversation; resets on New Chat. | Medium | 🟢 Completed |
| F48 | "See all" modal | New modal opened from the `+ See all (N)` pill (and from a "See all" entry in the collapsed pill if we go that route). Fixed height `min(640px, 85vh)` so it doesn't jump when filters are applied. Three filter chips: `All`, `🟢 Triggers advisor`, `🟡 Skips advisor`. Modal body lists prompt cards. Each card: 3-bar complexity meter (left of title, hover for tier tooltip), title, badge, `+` insert button (22px square in the actions area), 2-line truncated body. Click anywhere on the card body = expand the body in-place. Click the `+` button = insert + close modal. Header has `×` close, click-outside-to-dismiss, Esc to close. Footer shows "N of M prompts" count + the click hint. | High | 🟢 Completed |
| F49 | Confirm-replace mini-modal | When inserting a prompt would overwrite existing textarea content, show a small centered confirm modal: "Replace current message?" with Keep / Replace buttons. Same dark-theme styling as the existing confirm modal used for New Chat. Esc dismisses (cancels). | Medium | 🟢 Completed |
| F50 | Complexity meter visual | 3-bar indicator: Quick = 1 muted-gray bar, Standard = 2 accent-blue bars, Heavy = 3 orange bars. Rendered (a) to the left of each prompt's title in the modal cards, (b) in the modal-footer legend with token ranges baked into always-visible text, and (c) inside the inline pill hover tooltip alongside the triggers/skips badge. Token ranges are always visible (card hint line + footer legend + tooltip) — no reliance on the native `title` tooltip, which felt broken with its ~1s delay. Documented as **not** a real cost estimate. | Medium | 🟢 Completed |
| F51 | Welcome slide update | Update Slide 4 of the welcome slideshow ("Try one of these prompts") to point users at the new pill row instead of listing 2 prompts inline. Reduces redundancy and surfaces the new feature on first launch. Bumps the welcome-seen storage key from `v1` to `v2` so existing users see the updated slideshow once. | Low | 🟢 Completed |
| F52 | GPT-5.5 evaluator bump + OpenAI pricing tracking | Mid-build scope addition. Bumped `EVAL_MODEL_OPENAI` from `gpt-5.4` → `gpt-5.5` across 8 references (server constant, Settings hint, dropdown label, cost-estimates blurb, `PRICES` table, README × 3). Live-verified pricing on the OpenAI pricing page — gpt-5.5 is $5 in / $30 out per MTok (corrected a placeholder that had output at $15). Added the OpenAI pricing URL as a 4th WebFetch in `/check-advisor-tool-updates` and added a new **OpenAI Evaluator Pricing** subsection to `docs/reference/claude-advisor-tool-updates.md` so future catch-up runs surface evaluator-pricing drift. | Medium | 🟢 Completed |
| F53 | Sentinel-marker strip + newline collapse on system prompts | Mid-build scope addition. Advisor branch's outgoing `params.system` now passes through a new `stripSentinelMarkers()` helper in `server.js` (same regex as Code View's `stripAdvisorSentinels()`) — the `<!-- advisor:only -->` / `<!-- /advisor:only -->` marker tags no longer leak into the live API request. Additionally, all three strip functions (`stripAdvisorOnly`, `stripSentinelMarkers`, `stripAdvisorSentinels`) collapse `\n+` to a single space + collapse double-spaces back to single after marker handling. System prompts sent to the API are now one continuous line. Code View and the real request produce identical output. | Low | 🟢 Completed |

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

## v1.6.1 — Documentation Update (Patch) - 🟢 Completed
Reference-doc-only refresh triggered by `/check-advisor-tool-updates`. No API-surface or pricing changes since the 2026-04-18 review; no app code touched. Mirrored new upstream guidance that had appeared on Anthropic's published docs.

| ID  | Feature                 | Description                              | Priority | Status |
|-----|-------------------------|------------------------------------------|----------|--------|
| F41 | Reference doc refresh | Refreshed `docs/reference/claude-advisor-tool-updates.md` to mirror new upstream guidance. Added per-level effort recommendation tables for Opus 4.7 and Sonnet 4.6, a new "Effort with tool use" guidance block, a `budget_tokens` deprecation note for Opus 4.6 / Sonnet 4.6, the multi-turn `400 invalid_request_error` rule when omitting the advisor tool while `advisor_tool_result` blocks remain in history, and four pricing sub-notes (tool-use system-prompt overhead numbers `auto`/`none` = 346 tokens / `any`/`tool` = 313 tokens, long-context standard pricing on Opus 4.7/4.6 + Sonnet 4.6, Opus 4.6 fast-mode beta pricing, AWS Bedrock / Vertex regional 10% premium). Bumped "Last reviewed" to 2026-04-20 and fixed stale Opus 4.6 example references to Opus 4.7. | Medium | 🟢 Completed |

## v1.6.2 — Documentation Refresh (Patch) - 🟢 Completed
Reference-doc-only refresh triggered by `/check-advisor-tool-updates` against Anthropic's docs since the 2026-04-22 review. Added an explicit scope statement (the user-driven structural addition) so future catch-up runs only surface upstream changes that affect the advisor tool or playground, plus four content updates for items that do affect the playground. No app code touched.

| ID  | Feature                 | Description                              | Priority | Status |
|-----|-------------------------|------------------------------------------|----------|--------|
| F42 | Reference-doc scope statement | Added a "Scope" block to `docs/reference/claude-advisor-tool-updates.md` (after Source URLs, before "Last reviewed") and a "Scope" note at the top of Step 3 in `.claude/commands/check-advisor-tool-updates.md`. Explicitly lists what is in scope (advisor tool API + advisor effort behavior + pricing of models/features the playground uses) and what is out of scope (Claude Platform on AWS billing, Claude Managed Agents, Bedrock/Vertex/Foundry, unrelated server-side tool pricing, and models outside the advisor compatibility table such as Opus 4.5 / 4.1 / Sonnet 4.5). Overlap items (e.g., fast mode on Opus 4.7) stay tracked. Goal: stop re-litigating which upstream changes belong in the reference doc on every catch-up run. | Medium | 🟢 Completed |
| F43 | Reference doc accuracy refresh | Updated `docs/reference/claude-advisor-tool-updates.md` for upstream changes since 2026-04-22 that affect the advisor tool or playground: (1) Platform availability extended — advisor tool now available on Claude API AND Claude Platform on AWS (was Claude API only); (2) Fast mode extended to Opus 4.7 — section heading and body updated from "Opus 4.6 only" to "Opus 4.6 and Opus 4.7" (Opus 4.7 is the playground's advisor model and a valid executor); (3) `clear_thinking` per-model default nuance — refined the caching warning and the standalone `clear_thinking` section to clarify that the lossy `keep: {type: "thinking_turns", value: 1}` default only applies to earlier Opus/Sonnet models and all Haiku models; Opus 4.5+ and Sonnet 4.6+ default to `keep: "all"`. Added a playground-specific note that the warning is moot for all four current executors; (4) New "When to call (Anthropic's framing)" sub-section in Suggested System Prompts — captures the two-timings pattern (early first call after exploratory reads; final call after writes/test outputs) and the planner-tool funnel recommendation that Anthropic added to the advisor tool docs. Bumped "Last reviewed" to 2026-05-14. | Low | 🟢 Completed |
| F44 | README release-notes pill | Replaced the prose "Most recent: **vX.Y.Z** ..." blurb in the README's `## Release Notes` section with a stable `Release Notes` pill in the top badge row that links to `release-notes.md`. The section body is now a single-sentence pointer. Two benefits: (1) the link is more discoverable (top of page, alongside Version / License / iBuildWith.ai / GitHub stars) and (2) the version-bump checklist drops one item — no per-release prose update on the README. The version badge still requires a per-release bump. Updated the saved version-bump-checklist memory accordingly. | Low | 🟢 Completed |
