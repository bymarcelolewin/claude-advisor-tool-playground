# Feature Backlog

This document lists features and enhancements derived from the plan. It is a living document that will evolve throughout the project. It is grouped by version, with the Backlog tracking all features not added to a version yet. It is used to create versions to work on.

| Status |  | Priority |  |
|--------|-------------|---------|-------------|
| 🔴 | Not Started | High | High priority items |
| 🟡 | In Progress | Medium | Medium priority items |
| 🟢 | Completed | Low | Low priority items |


## Backlog

| #  | Feature             | Description                               | Source |
|----|---------------------|-------------------------------------------|--------|
| — | No items | All planned features have been implemented | — |

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

## v1.4.0 — Advisor Tool API Catch-up - 🔴 Not Started
Bring the app up to date with the latest Anthropic advisor tool API capabilities and add new configuration options for cost control and experimentation.

| ID  | Feature                 | Description                              | Priority | Status |
|-----|-------------------------|------------------------------------------|----------|--------|
| F24 | Model config panel | Move executor/advisor/mode dropdowns from header into config panel above chat | High | 🔴 Not Started |
| F25 | Effort settings | New dropdown next to executor (low/medium/high/max) via `output_config.effort` | High | 🔴 Not Started |
| F26 | `max_uses` setting | New number input in Settings → Chat & Advisor to cap advisor calls per request | Medium | 🔴 Not Started |
| F27 | Advisor call counter | Show "Call N of M" in trace when multiple advisor calls occur | Medium | 🔴 Not Started |
| F28 | Caching dropdown | Replace checkbox with Off / 5m / 1h dropdown | Medium | 🔴 Not Started |
| F29 | `advisor_redacted_result` handling | Gracefully display encrypted advisor responses in trace | Low | 🔴 Not Started |
| F30 | Error codes display | Render advisor error codes clearly in trace step cards | Medium | 🔴 Not Started |
| F31 | System prompt presets | Dropdown: Recommended / Precise / Custom | High | 🔴 Not Started |
| F32 | About box link fix | Change CHANGELOG.md reference to release-notes.md | Low | 🟢 Completed |
