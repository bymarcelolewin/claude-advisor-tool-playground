# Product Requirements Document (PRD)
This document formalizes the idea and defines the what and the why of the product the USER is building.

## Section Explanations
| Section           | Overview |
|-------------------|--------------------------|
| Summary           | Sets the high-level context for the product. |
| Goals             | Articulates the product's purpose — core to the "why". |
| Target Users      | Clarifies the audience, essential for shaping features and priorities. |
| Key Features      | Describes what needs to be built to meet the goals — part of the "what". |
| Success Criteria  | Defines what outcomes validate the goals. |
| Out of Scope      | Prevents scope creep and sets boundaries. |
| User Stories      | High-level stories keep focus on user needs (why) and guide what to build. |
| Assumptions       | Makes the context and unknowns explicit — essential for product clarity. |
| Dependencies      | Identifies blockers and critical integrations — valuable for planning dependencies and realism. |

## Summary
The Claude Advisor Tool Playground is a web application that makes Anthropic's advisor tool beta transparent and explorable. It lets users send prompts through an executor/advisor model pair, see every step of the interaction traced in real time, compare against baseline execution paths, and evaluate response quality with an LLM judge — all to build real intuition about how the advisor tool works and whether it's worth the cost.

## Goals
- **Make the invisible visible** — Surface every step of the advisor tool's behavior (when the advisor fires, what it says, token counts, costs) that is otherwise hidden behind a single API call.
- **Enable cost/quality tradeoff analysis** — Let users compare the advisor path against baselines running the same prompt, with concrete numbers on tokens, cost, latency, and quality.
- **Learning through building and using** — Serve as a hands-on learning tool for the builder and anyone else curious about the advisor tool's internals.

## Target Users
The primary user is the builder themselves — a builder (not a traditional developer) learning by building. Secondary users are anyone who wants to see what's happening behind the scenes of the advisor tool: developers evaluating whether to adopt it, AI practitioners benchmarking cost/quality, or curious users who want more than what the documentation provides.

## Key Features
All features below are implemented and shipped as of v1.5.0:

- **Chat with advisor tool tracing** — Send prompts through executor + advisor, see a step-by-step timeline of every API interaction with model names, token counts (input, output, cache read, cache write on advisor steps), cost estimates, and raw content per step.
- **Compare modes** — Run the same prompt through up to 3 execution paths in parallel (advisor, executor-model-solo, advisor-model-solo) with delta pills showing cost/latency/token differences per turn.
- **Model Config panel** — Dedicated configuration panel above the chat with four controls: Executor model, Effort level, Advisor model, and Mode. All four selectors lock together once the first message is sent to keep turn-to-turn comparisons fair.
- **Effort settings** — Dropdown (Low / Medium / High / Max) that maps to `output_config.effort` on the API request. Applied equally to all branches in compare mode. Disabled for Haiku 4.5 (shows "n/a") since Haiku doesn't support effort.
- **`max_uses` cap** — Settings input that caps advisor calls per API request via `max_uses` on the tool definition. Advisor call counter in the trace shows "Call N of M" when a cap is set.
- **Advisor caching** — Dropdown (Off / 5m / 1h) that enables prompt caching on the advisor's own transcript across calls within a single request.
- **Conversation totals dashboard** — Cumulative per-branch totals (input, output, cost, time) pinned at the top of the trace pane with color-coded values, leader indicators, and a yellow-accented Effort indicator.
- **LLM-as-judge quality evaluation** — Opt-in per-turn scoring using Claude Opus or GPT as judge, with 2-pass position-bias mitigation, blinded candidates, 4-dimension rubric (correctness, completeness, clarity, depth), and judge-disagreement detection.
- **Full I/O viewer** — Inspect the exact JSON request and response for any branch on any turn (system prompt, tools array, message history, content blocks, usage, `output_config`). Prism-highlighted JSON with per-block copy buttons and a global "Wrap code" toggle in the Trace pane header that affects all branches simultaneously.
- **Code View popup** — Top-nav `</>` icon opens a modal showing the exact Anthropic API call for the current configuration in TypeScript, Python, and curl. Snippet is dynamic (reflects executor/advisor/effort/max_uses/caching/max_tokens/system-prompt with omission rules applied), starts with a self-documenting settings comment block, and hoists the user prompt to a top-level variable for easy editing. Includes a Copy button per language, a local Wrap toggle, and an "Original prompt" toggle that substitutes the user's most recent chat prompt for the placeholder. Sentinels are stripped so playground-only markers don't leak into copied code.
- **Error code and redacted result handling** — Six documented advisor error codes (`max_uses_exceeded`, `too_many_requests`, `overloaded`, `prompt_too_long`, `execution_time_exceeded`, `unavailable`) render with red styling and human-readable messages. `advisor_redacted_result` content renders a clear "encrypted — not visible to client" notice.
- **System prompt presets** — Dropdown with Recommended (Anthropic's timing + advice-treatment blocks), Precise (Recommended + conciseness instruction, ~35-45% fewer advisor output tokens), and Custom (user-written, pre-populated with sentinel tags). Custom content is preserved separately so switching presets doesn't clobber user work.
- **Adaptive welcome slideshow** — First-launch walkthrough introducing the advisor strategy. The "Next steps" slide hides steps that are already configured (API key, evaluator) and renumbers the remaining ones.
- **Settings modal** — Four collapsible sections: Anthropic API, Chat & Advisor (max tokens, caching, max_uses, system prompt + preset), Quality Evaluation (provider, judge prompt), Notices & Disclaimers.
- **Syntax-highlighted code everywhere** — Self-hosted Prism 1.30.0 with a custom dark theme tuned to the app palette. Applied to the Full I/O viewer JSON and the Code View snippets. No CDN — keeps the same-origin security posture intact.
- **Unified top-nav pill cluster** — `</>`, ⓘ, and ⚙ live inside a single rounded container with hairline dividers and consistent SVG outline icons.
- **Security hardening** — Same-origin CORS, per-IP rate limiting, HTTPS/HSTS behind proxy, security headers, XSS protection, 2MB payload cap.
- **Stateless architecture** — Server stores nothing. Conversation history and API keys live in the browser only.

## Success Criteria
- The builder learns how the advisor tool works by building and iterating on this app.
- Anyone who uses the playground walks away with a clearer understanding of advisor tool behavior, cost tradeoffs, and quality impact than they'd get from documentation alone.
- No formal quantitative metrics — success is measured by learning.

## Out of Scope
- Persistent storage / database (conversations are ephemeral by design)
- User accounts or authentication
- Streaming responses (advisor sub-inference doesn't support streaming)
- Additional tool types beyond the advisor tool
- Mobile-optimized layout
- Executor-side prompt caching (`cache_control` breakpoints on message content) — generic Anthropic caching that's unrelated to teaching the advisor tool specifically
- `pause_turn` support, batch processing integration, `clear_thinking` configuration — all valid advisor tool capabilities, but tangential to the playground's learning purpose

## Nice-to-Have Features (backlog)
_No items currently in the top-level backlog — see `docs/build/feature-backlog.md` for the historical record and any items added in the future._

## User Stories
- As a **builder**, I want to send a prompt and see exactly what happens at each step (executor → advisor → executor continues) so I can understand the advisor tool's mechanics.
- As a **builder**, I want to compare the advisor path against the same model running solo so I can see whether the advisor actually improves the output or just adds cost.
- As a **builder**, I want to evaluate which branch produced a better response using an independent judge so I can make cost/quality tradeoff decisions.
- As a **curious user**, I want to try the advisor tool without writing any code so I can decide whether to adopt it in my own projects.
- As a **user**, I want to see the full API request and response for each branch so I can debug unexpected behavior or understand why one branch costs more than another.
- As a **developer evaluating the advisor tool**, I want to copy a working code snippet that matches the exact configuration I just tested in the playground, so I can drop it into my own project without having to re-derive every parameter.

## Assumptions
- Anthropic's advisor tool beta (`advisor-tool-2026-03-01`) will remain available and stable. If the beta API changes or is deprecated, the app will need updates.
- Users will provide their own Anthropic API key (and optionally an OpenAI key for evaluation).
- Hardcoded model names (`claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5`, `gpt-5.4`) and pricing will need manual updates as models turn over.
- The app is a learning/exploration tool, not a production service — ephemeral state and no SLA are acceptable.

## Dependencies
- **Anthropic SDK** (`@anthropic-ai/sdk`) — for all advisor and baseline API calls.
- **Anthropic advisor tool beta** (`advisor-tool-2026-03-01`) — the core feature the app is built around.
- **OpenAI API** (optional) — for GPT-based quality evaluations via direct `fetch` calls.
- **Prism 1.30.0** (self-hosted, bundled in `/public/vendor/prism/`) — syntax highlighting for the Full I/O viewer and Code View snippets.
- **Railway** — hosting platform for the live deployment.
- **Node.js 18+** — runtime requirement.
