# Brownfield Analysis
This document captures the technical audit of an existing codebase performed by the **AGENT**. It serves as the foundation for generating the PRD and Plan documents for a brownfield project.

## Project Overview
The Claude Advisor Tool Playground is a web application for experimenting with Anthropic's advisor tool beta (`advisor-tool-2026-03-01`). It allows users to send prompts through a fast executor model paired with a stronger advisor model, then inspect every step of the interaction — what the executor did, whether and when the advisor was called, what the advisor said, and how it all maps to token counts and costs. It also supports running the same prompt through multiple execution paths in parallel (compare mode) and scoring response quality with an LLM-as-judge.

The project was built as a learning tool — both for the builder and for anyone else who wants to understand what's happening behind the scenes of the advisor tool.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 18+ (ESM modules) |
| **Backend framework** | Express 4.x |
| **Frontend** | Vanilla JavaScript, HTML, CSS (no frameworks) |
| **AI SDK** | Anthropic SDK (`@anthropic-ai/sdk ^0.39.0`) |
| **External API** | OpenAI API via direct `fetch` (for LLM-as-judge, no SDK) |
| **Hosting** | Railway |

## Project Structure
| Folder/File | Purpose |
|-------------|---------|
| `/` (root) | Server entry point, config, documentation |
| `/public/` | Frontend assets served as static files |
| `/images/` | Shared images used by both the app and README |
| `/docs/` | Cody Product Builder project files |

## Key Files
| File | Description |
|------|-------------|
| `server.js` | Single Express server — all API routes, security middleware, rate limiting, CORS, advisor/baseline/evaluation logic |
| `public/app.js` (~61K) | Entire frontend application — UI rendering, state management, API calls, conversation history, trace visualization, evaluation panel |
| `public/index.html` (~21K) | HTML structure including settings modal, welcome slideshow, chat/trace panes |
| `public/styles.css` (~50K) | All styling for the application |
| `package.json` | Dependencies and scripts (only 2 deps: `@anthropic-ai/sdk`, `express`) |
| `CHANGELOG.md` | Full release history from v1.0.0 through v1.3.0 |

## Dependencies
| Package | Purpose |
|---------|---------|
| `@anthropic-ai/sdk` (^0.39.0) | Anthropic API client — used for advisor tool calls, baseline model calls, and Anthropic-based judge evaluations |
| `express` (^4.19.2) | HTTP server framework |

Notably minimal — only 2 production dependencies. OpenAI judge calls use native `fetch` with no SDK.

## Architecture
- **Stateless server:** Conversation history lives entirely in the browser (JavaScript variables). The client sends the full history on each request; the server uses it for the API call and discards it. No database, no session store, no files.
- **Single entry point:** `server.js` handles all routes — `/api/chat` (main conversation), `/api/evaluate` (LLM judge), `/api/version`.
- **Branching model:** The `/api/chat` endpoint can run 1–3 "branches" in parallel depending on mode: advisor (executor + advisor tool), executorSolo (executor alone), advisorSolo (advisor model alone). Each branch maintains independent conversation history client-side.
- **Security layers:** CORS same-origin lock, per-IP rate limiting (60/hr), HTTPS redirect + HSTS behind TLS proxy, security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), XSS-hardened rendering, 2MB payload cap.
- **API keys:** Stored in browser `localStorage`, sent per-request, never persisted or logged server-side.

## Data Model
No persistent data store. All state is ephemeral:
- **Client-side:** Conversation histories (per-branch arrays of messages), settings (model selections, API keys, system prompt) in `localStorage`, evaluation results in memory.
- **Server-side:** In-memory rate-limit map (`ipHits`) cleared on a timer. No other server state.

## Existing Features
1. **Chat with advisor tool tracing** — Send prompts through executor + advisor, see step-by-step breakdown of every API interaction with token counts, costs, and raw content
2. **Compare modes** — Run the same prompt through up to 3 execution paths in parallel (advisor, executor-solo, advisor-model-solo) with delta pills showing cost/latency/token differences
3. **Conversation totals dashboard** — Cumulative per-branch totals (input, output, cost, time) pinned at top of trace pane with leader indicators
4. **LLM-as-judge evaluation** — Opt-in per-turn quality scoring using Claude Opus or GPT as judge, with position-bias mitigation (two-pass swapped ordering), blinding, four-dimension rubric (correctness, completeness, clarity, depth)
5. **Full I/O viewer** — Inspect exact JSON request/response for any branch on any turn
6. **Mode locking** — Mode dropdown locks after first message to ensure fair comparison
7. **Welcome slideshow** — First-launch walkthrough introducing the advisor strategy
8. **Security hardening** — CORS, rate limiting, HTTPS, HSTS, security headers, XSS protection
9. **Model/mode selection** — Dropdowns for executor model, advisor model, and comparison mode
10. **Settings modal** — API key management, system prompt editing, advisor caching toggle, judge configuration

## User Q&A
**AGENT Q1:** Who is the primary target audience for this playground?
**USER A1:** Me (as a builder, not a traditional developer) and anyone that wants to see what's happening behind the scenes of the advisor tool.

**AGENT Q2:** What does success look like for this project?
**USER A2:** No formal success criteria. Built it to learn. Success is learning — both for the builder and for anyone who uses it.

**AGENT Q3:** What are the must-have features you'd still like to add? And nice-to-haves?
**USER A3:** Nothing planned unless Anthropic updates the advisor tool, in which case the app would be updated accordingly.

**AGENT Q4:** Are there any constraints (budget, timeline, dependencies)?
**USER A4:** None.

**AGENT Q5:** What existing alternatives were users relying on before this tool?
**USER A5:** Just reading the Claude documentation. No interactive playground existed.

## Summary
The Claude Advisor Tool Playground is a feature-complete (v1.3.0) learning tool built to make Anthropic's advisor tool beta transparent and explorable. It's a lightweight Node.js/Express app with a vanilla JS frontend, only 2 production dependencies, and a fully stateless architecture. The app covers the full experimentation loop: send prompts, trace every executor/advisor interaction step, compare against baselines, and evaluate quality with an LLM judge. It was built by a builder (not a traditional developer) as a learning exercise, and is live on Railway for anyone to try. No new features are planned unless Anthropic changes the advisor tool API. The main technical risk is dependency on the beta API (`advisor-tool-2026-03-01`) and hardcoded model names/pricing that would need updating as models turn over.
