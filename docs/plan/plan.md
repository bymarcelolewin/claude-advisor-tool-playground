# Product Implementation Plan
This document defines how the product will be built and when.

## Section Explanations
| Section                  | Overview |
|--------------------------|--------------------------|
| Overview                 | A brief recap of what we're building and the current state of the PRD. |
| Architecture             | High-level technical decisions and structure (e.g., frontend/backend split, frameworks, storage). |
| Components               | Major parts of the system and their roles. Think modular: what pieces are needed to make it work. |
| Data Model               | What data structures or models are needed. Keep it conceptual unless structure is critical. |
| Major Technical Steps    | High-level implementation tasks that guide development. Not detailed coding steps. |
| Tools & Services         | External tools, APIs, libraries, or platforms this app will depend on. |
| Risks & Unknowns         | Technical or project-related risks, open questions, or blockers that need attention. |
| Milestones    | Key implementation checkpoints or phases to show progress. |
| Environment Setup | Prerequisites or steps to get the app running in a local/dev environment. |

## Overview
This plan covers the Claude Advisor Tool Playground — a web app for experimenting with Anthropic's advisor tool beta. The app is feature-complete at v1.3.0 and deployed live on Railway. This plan documents the architecture and implementation as built, serving as a reference for future maintenance or updates if Anthropic changes the advisor tool API.

## Architecture
The app follows a simple **client-server monolith** pattern:

- **Backend:** Single Node.js + Express server (`server.js`) that proxies API calls to Anthropic and OpenAI. Fully stateless — no database, no session store, no file persistence.
- **Frontend:** Vanilla JavaScript single-page application served as static files from `/public/`. No build step, no framework, no bundler.
- **Communication:** REST API over JSON. The client sends the full conversation history on each request; the server forwards it to the AI provider and returns the response.
- **Deployment:** Railway with automatic HTTPS termination. The server detects the reverse proxy via `x-forwarded-proto` and activates HTTPS redirect + HSTS headers accordingly.

```
┌─────────────────────────────────────────────────┐
│  Browser (public/index.html + app.js + styles.css) │
│                                                   │
│  localStorage: API keys, settings                 │
│  JS memory: conversation histories, eval results  │
└────────────────────┬──────────────────────────────┘
                     │ REST (JSON)
                     ▼
┌─────────────────────────────────────────────────┐
│  Express Server (server.js)                       │
│                                                   │
│  /api/chat      → Anthropic SDK (advisor + beta)  │
│  /api/evaluate  → Anthropic SDK or OpenAI fetch   │
│  /api/version   → package.json version            │
│                                                   │
│  Middleware: CORS, rate limit, security headers    │
│  State: in-memory rate-limit map only             │
└─────────────────────────────────────────────────┘
```

## Components
- **Express Server** (`server.js`) — Single entry point handling all API routes, security middleware (CORS, rate limiting, HTTPS, headers), and AI provider calls. Key functions: `clientFor()` (API key validation), `stripAdvisorOnly()` (sentinel-based prompt splitting for fair baseline comparison), `branchesForMode()` (determines which execution paths to run), `callOne()` (fires a single branch), `runJudgeOnce()` (executes one evaluation pass).
- **Chat Engine** (server `/api/chat`) — Accepts a user message + per-branch conversation histories, runs 1–3 branches in parallel via `Promise.all`, returns per-branch results with content, usage, timing, and the safe request copy.
- **Evaluation Engine** (server `/api/evaluate`) — LLM-as-judge with 2-pass position-bias mitigation. Builds blinded candidate blocks in two orderings, fires both judge calls in parallel, parses/un-blinds results, averages scores, detects disagreement.
- **Frontend App** (`public/app.js`) — All client logic: settings persistence, chat send loop, conversation history management per branch, trace rendering (step timeline, delta pills, summary tiles), evaluation trigger/display, thinking indicators, welcome slideshow, confirm modal.
- **UI Shell** (`public/index.html` + `styles.css`) — Static markup and dark-themed styling. Split-pane layout (chat 30% / trace 70%), floating chat input, settings modal with 4 collapsible sections, CSS Grid-based trace with dynamic column count.

## Data Model
No persistent data model. All state is ephemeral:

- **Conversation Histories** (client JS memory) — Per-branch arrays of `{role, content}` message objects. Sent to the server on each request and maintained independently per branch.
- **Settings** (client `localStorage`) — API keys (Anthropic, OpenAI), executor/advisor model selections, max tokens, advisor caching toggle, system prompt, judge provider, judge prompt.
- **Turn State** (client JS memory) — Per-turn metadata: branch results, evaluation data, UI collapse state.
- **Rate Limit Map** (server memory) — `Map<IP, {start, count}>`, cleared on a timer interval. The only server-side state.

## Major Technical Steps
These reflect the phases the project went through to reach v1.3.0:

1. **Single-branch chat with trace** — Express server + vanilla JS frontend, `/api/chat` endpoint, step-by-step trace rendering from `usage.iterations[]` with token counts and cost estimates.
2. **Step timeline visualization** — Map content blocks to iterations, per-step cards with model/tokens/cost, collapsible turn groups with always-visible summary tiles.
3. **Compare mode** — Mode dropdown, parallel branch execution, per-branch conversation histories, `stripAdvisorOnly()` for fair baseline prompts, delta pills, CSS Grid trace layout.
4. **Full I/O viewer** — Capture safe request copies server-side, render request + response JSON per branch per turn.
5. **LLM-as-judge evaluation** — `/api/evaluate` endpoint, 2-pass position-bias mitigation, blinded candidates, 4-dimension rubric, Anthropic + OpenAI judge support, robust JSON parsing.
6. **Settings modal** — Four collapsible sections, API key management, configurable system prompt and judge prompt, advisor caching toggle.
7. **UI polish** — Floating chat input, thinking indicators with elapsed timer, centered header layout, welcome slideshow, confirm modal, security hardening.
8. **Conversation totals dashboard** — Cumulative per-branch totals pinned at top of trace pane, leader indicators, mode locking.

## Tools & Services
| Tool / Service | Purpose |
|----------------|---------|
| **Node.js 18+** | Server runtime |
| **Express 4.x** | HTTP framework |
| **Anthropic SDK** (`@anthropic-ai/sdk`) | Advisor tool calls, baseline calls, Anthropic judge calls |
| **OpenAI API** (via `fetch`) | Optional GPT judge calls — no SDK dependency |
| **Railway** | Hosting with automatic HTTPS termination |
| **GitHub** | Source code repository |

## Risks & Unknowns
- **Advisor tool beta stability** — The app depends on `advisor-tool-2026-03-01`. If Anthropic changes the beta header, response format, or deprecates the feature, the app will need updates.
- **Hardcoded model names and pricing** — Model names in `server.js` (`EVAL_MODEL_ANTHROPIC`, `EVAL_MODEL_OPENAI`) and pricing in `public/app.js` (`PRICES`) must be manually updated when models turn over. No automated discovery mechanism.
- **No streaming** — The advisor sub-inference doesn't support streaming, so there's a visible pause during advisor calls. Users see a thinking indicator but no progressive output.
- **In-memory rate limiting** — Rate limit state resets on server restart. Acceptable for a learning tool, not for a production service.
- **Single-file frontend** — `app.js` is 61K, `styles.css` is 50K. Manageable for the current scope but would benefit from modularization if the app grows significantly.

## Milestones
All milestones are complete:

| Version | Milestone | Status |
|---------|-----------|--------|
| v1.0.0 | Initial release — chat, trace, compare modes, LLM-as-judge evaluation | Done (2026-04-11) |
| v1.1.x | Welcome slideshow, evaluation bug fix, documentation | Done (2026-04-11) |
| v1.2.0 | Security hardening — CORS, rate limiting, HTTPS, headers, XSS audit | Done (2026-04-11) |
| v1.2.1 | UI polish, Railway deployment | Done (2026-04-11) |
| v1.3.0 | Conversation totals dashboard, mode locking, tile cleanup | Done (2026-04-13) |

Future milestones will be added if/when Anthropic updates the advisor tool API.

## Environment Setup
1. **Prerequisites:** Node.js 18+ installed
2. **Clone:** `git clone https://github.com/bymarcelolewin/claude-advisor-tool-playground.git`
3. **Install:** `cd claude-advisor-tool-playground && npm install`
4. **Run:** `npm start`
5. **Open:** http://localhost:3000 in your browser
6. **Configure:** Click the gear icon (⚙), paste your Anthropic API key, optionally add an OpenAI key for GPT-based evaluations
7. **Test:** Use the test prompts from the README to verify the advisor fires correctly
