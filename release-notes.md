# Release Notes

This document lists new features, bug fixes and other changes implemented during a particular build (version or patch).

For a comprehensive tracker of Anthropic's advisor tool API changes (including features not yet implemented in this app), see [claude-advisor-tool-updates.md](docs/reference/claude-advisor-tool-updates.md).

- [v1.3.0 — Conversation Totals Dashboard (2026-04-13)](#v130--conversation-totals-dashboard---2026-04-13)
- [v1.2.1 — UI Polish & Railway Deployment (Patch) (2026-04-11)](#v121--ui-polish--railway-deployment-patch---2026-04-11)
- [v1.2.0 — Security Hardening (2026-04-11)](#v120--security-hardening---2026-04-11)
- [v1.1.0 — Welcome Screen & Bug Fixes (2026-04-11)](#v110--welcome-screen--bug-fixes---2026-04-11)
- [v1.0.0 — Initial Public Release (2026-04-11)](#v100--initial-public-release---2026-04-11)

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
