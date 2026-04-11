# Claude Advisor Tool Playground

A chat-loop web UI for testing and visualizing the [advisor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool) (beta `advisor-tool-2026-03-01`) from Claude.

- **Left pane (chat):** conversation thread with a floating input at the bottom. User prompts and color-coded assistant replies, grouped into collapsible per-turn containers that match the trace pane. Individual branch bubbles are also independently collapsible.
- **Right pane (trace):** per-turn, step-by-step timeline of every API call — content blocks, `usage.iterations[]`, model per step, tokens, cache hits, estimated cost, wall-clock duration, and the full request + response payload.
- **Compare mode:** run the same prompt through multiple execution paths in parallel (advisor tool vs. executor-model-solo vs. advisor-model-solo) with side-by-side cards and delta pills showing the cost, latency, and token differences.
- **Quality evaluation (LLM-as-judge):** per-turn "Evaluate" button that scores each branch's output on a four-dimension rubric using a configurable judge model (Claude Opus or OpenAI GPT-5.4).
- **Settings modal:** organized into four collapsible sections — **Anthropic API**, **Chat & Advisor**, **Quality Evaluation**, **Notices & Disclaimers**. All settings auto-persist to `localStorage`.

## Setup

```bash
npm install
npm start
```

Open http://localhost:3000.

### API keys

All API keys are entered in the **Settings modal** (click `⚙` in the header). There is no env-var fallback — keys are stored in your browser's `localStorage` on your own machine and sent per-request to the local backend.

- **Anthropic API key** (required) — used for both the chat loop and the Anthropic evaluator
- **OpenAI API key** (optional) — only required if you switch the evaluator provider to OpenAI

On first launch with no stored key, the Settings modal auto-opens to prompt you. Keys auto-save to localStorage as you type; click **Done** to close the modal.

## Security

- The server binds to `127.0.0.1` only. It is **not** reachable from your network.
- API keys live in your browser's `localStorage` on your own machine and are sent per-request from the page to the local backend. The backend forwards them to `api.anthropic.com` or `api.openai.com` and never logs them. The full-I/O request viewer explicitly whitelists fields returned to the client so no key can leak into the trace.
- Don't expose this server on a public interface. If you want to share it, teammates should clone the repo and run their own copy.

## Test prompts

Two prompts that should trigger the advisor tool (substantive work with planning, where the default system prompt instructs the executor to call `advisor()` before committing to an approach), and two that should not (single-step factual answers the executor can satisfy directly).

**Will trigger the advisor:**

1. > Write a Python function `parse_iso_duration(s)` that parses an ISO 8601 duration string like `PT2H30M15S`, `P1DT12H`, or `-PT0.5S` and returns the total duration in seconds as a float. Support years, months, weeks, days, hours, minutes, seconds, fractional seconds, and negative durations. Assume 1 year = 365.25 days and 1 month = 30 days for conversion. Include at least 6 test cases covering edge cases, and explain your approach before writing the code.

2. > Design a URL shortener service with custom aliases, per-link expiration, and click analytics. Describe: (a) the database schema with indexes, (b) the HTTP API endpoints with request/response shapes, (c) the short-code generation strategy and how you'd handle collisions, (d) how analytics events are written without slowing down redirects, and (e) one trade-off decision you made and why. Target: two-person team, ~10k redirects/day, self-hosted.

**Should not trigger the advisor:**

3. > What year was the Rust programming language first publicly released, and who originally created it?

4. > Convert 72 degrees Fahrenheit to Celsius. Show the formula and the numeric answer rounded to one decimal place.

If the advisor still doesn't fire on #1 or #2, confirm the system prompt in the settings modal is non-empty (the prefilled advisor timing/treatment blocks are required to steer the executor). Executor = `claude-sonnet-4-6`, advisor = `claude-opus-4-6` is the canonical pair.

**Debugging tip:** if the Advisor branch shows `0 advisor calls · 1 step` in the turn summary, the advisor was **not** actually invoked on that turn — the executor decided the task was trivial enough to answer directly. In that case the "advisor branch" is effectively just the executor model running with the advisor system prompt and tool definition loaded, which means you're not really testing the advisor's strategic contribution. Expand the turn card, look at the model badge (e.g. `sonnet-4-6 → opus-4-6`) and the step timeline to confirm whether an `Advisor` step actually ran.

## Layout

- **Header (top, dark navy gradient chrome):** title with a compass icon on the left, centered `Executor` / `Advisor` / `Mode` dropdown trio, and a `⚙` settings icon on the right.
- **Chat pane (left, ~30% width):** per-turn wrapper (collapsible, teal-tinted) containing the user message and 1–3 color-coded branch bubbles, with a floating message input pill at the bottom.
- **Trace pane (right, ~70% width, slightly deeper background):** per-turn wrapper (collapsible, teal-tinted) containing the detailed per-branch trace cards side by side.

Both the chat-side and trace-side turn wrappers use the same teal tint so you can visually connect Turn 1 in chat with Turn 1 in the trace.

## Chat pane

Each turn is wrapped in a collapsible `.chat-turn` card:

- **Header** (always visible, clickable): `TURN N` label, a single-line italic preview of the user prompt (first ~100 chars), and a `▾` toggle
- **Body** (collapses on click): the user message bubble (full width) and one assistant bubble per active branch, each with:
  - A color-coded branch chip in the top-left (`Advisor` = purple, `Executor-model-solo` = blue, `Advisor-model-solo` = amber)
  - A live elapsed-time counter chip next to the branch chip while the API call is in flight (`0.3s`, `1.7s`, `14s`, …)
  - A bouncing-dots "thinking" animation in the body while in flight, plus a pulsing teal glow on the bubble border so it's obviously in flight
  - When the call finishes, the dots and timer are replaced with the final text

If a branch errors, its bubble turns red and shows the error message. If the whole request fails (network error, HTTP error), all pending bubbles are removed and a single error message is appended to the turn wrapper.

## Trace pane

Each turn renders as a collapsible `.turn-group` card:

### Group header (always visible)

- `TURN N` label (teal accent)
- A strip of compact **summary chips** — one per branch — showing `in · out · cost · time` inline, color-coded by branch
- `▾` toggle arrow

Click anywhere on the header to collapse/expand the group body. When collapsed, the summary chips give you a one-line bird's-eye view of what each branch spent.

### Group body (collapsible)

1. **Delta pills** (only when ≥ 2 branches are active): one pill per baseline, grid-aligned with the columns below, showing how each baseline compared to the advisor branch on `in`, `out`, `cost`, `time`. See [Reading the delta pills](#reading-the-delta-pills) below.

2. **Turn row** — a grid with one full `.turn` card per active branch. Each card contains:
   - **Card header:** branch name (e.g. `Advisor`), compact model badge (e.g. `sonnet-4-6 → opus-4-6` for the advisor branch, `sonnet-4-6` for executor-solo), `stop_reason` pill (just the value, hover for "stop_reason" tooltip), wall-clock `⏱ duration`, inner `▾` toggle
   - **Summary tiles:** `INPUT` · `OUTPUT` · `CACHE_R` · `CACHE_W` · `EST. COST`, plus `advisor calls` and `steps` count pills
   - **Prompt:** the user message that drove this turn
   - **Step timeline:** one card per entry in `usage.iterations[]`, linked by `↓`:
     - 🟦 **Executor** steps (`type: "message"`)
     - 🟪 **Advisor** steps (`type: "advisor_message"`)
     - 🟥 **Error** styling when `advisor_tool_result_error` is returned
     - Each step card: step #, role, model, est. cost, `in` / `out` / `cache_r` / `cache_w` tokens, plus a preview of the content blocks produced (text, `server_tool_use → advisor`, advice text, or error code)
   - **View full I/O (request + response)** — see [Full I/O viewer](#full-io-viewer) below

### Reading the delta pills

Each value is computed as **(baseline − advisor)**. The pill title reads `Executor-model-solo vs Advisor`; hover for the full math explanation.

| Sign | Meaning |
|---|---|
| **Negative** (e.g. `-1,330`) | The baseline used **less** than the advisor — baseline won on this metric |
| **Positive** (e.g. `+308 ms`) | The baseline used **more** than the advisor — baseline lost on this metric |
| `0` | Tied |

Color coding:

- 🟢 **Green** = baseline beat the advisor (fewer tokens / cheaper / faster)
- 🔴 **Red** = baseline lost (more tokens / more expensive / slower)
- ⚪ **Gray** = tied

**Example** — `"hello"` in `All three` mode, Sonnet executor + Opus advisor:

```
EXECUTOR-MODEL-SOLO VS ADVISOR
in: -1,330   out: +8   cost: -$0.00387   time: +308 ms
```

Interpretation:
- Baseline used 1,330 fewer input tokens (no system prompt, no tool definitions, just the user message)
- Produced 8 more output tokens (trivial)
- Cost $0.00387 less overall
- Took 308 ms longer on the wire (network jitter — `"hello"` was so trivial that neither branch triggered an actual advisor sub-inference, so both were single-pass executor calls)

For prompts that genuinely trigger the advisor, the time delta will usually be strongly **positive** for baselines (advisor branch spends additional seconds running its sub-inference), and the cost delta depends on whether the advisor's extra thinking justifies the extra Opus output tokens on your prompt.

### Full I/O viewer

Inside each turn card, `▸ View full I/O (request + response)` expands two labeled JSON sections:

**REQUEST SENT TO THE API** — exactly what the server passed into `client.messages.create()` for this branch:

- `model`, `max_tokens`
- `system` — the **actual** system prompt that went out on this branch. The advisor branch will carry the full prompt; baselines typically show `null` because the default prompt is entirely wrapped in `<!-- advisor:only -->` sentinels that the server strips for baselines.
- `tools` — the advisor tool definition for the advisor branch, `null` for baselines
- `messages` — the full conversation history as sent on this call (grows turn by turn)
- `beta` — `"advisor-tool-2026-03-01"` for the advisor branch, `null` otherwise

**RESPONSE FROM THE API**:

- `model`, `stop_reason`, `duration_ms`
- `usage` (with the full `iterations[]` array for the advisor branch, top-level tokens only for baselines)
- `content` (full content blocks including any `server_tool_use` and `advisor_tool_result`)

This is the primary diagnostic tool. If you want to understand exactly why one branch's token count differs from another, open the Request section on each and compare — you'll literally see the system prompt difference, the tools array difference, and the full message history.

**Safety:** the API key is never included in the echoed request — it lives on the SDK client instance, not in the params object. The server only returns a whitelisted set of fields (`model`, `max_tokens`, `system`, `tools`, `messages`, `beta`).

## Compare mode

A dropdown in the header (`Mode`) lets you run the same prompt through multiple execution paths in parallel:

| Mode | What runs | Cost |
|---|---|---|
| **Advisor only** | Just the executor + advisor tool path. Default. | 1× |
| **Advisor vs executor-model-solo** | Advisor path + same executor without the advisor tool | 2× |
| **Advisor vs advisor-model-solo** | Advisor path + advisor model used alone with no tools | 2× |
| **All three (3× cost)** | All of the above | 3× |

### Per-branch conversation histories

Each active branch maintains its own independent message history on the server keyed by a per-tab `sessionId`. If turn 1 outputs diverge, turn 2 context differs on each branch — that's the point. Over several turns you can see how the trajectories diverge.

Switching modes mid-conversation is allowed and shows a system note in the chat pane. Previous branch histories are retained (so reactivating a branch later continues from where it left off, potentially stale).

**Reset** (the `+` icon in the Chat header) clears all branches, the trace, and any evaluation results. It shows a confirmation modal first since the action is destructive and cannot be undone.

### System prompt and baselines — the sentinel convention

The default system prompt contains advisor-specific instructions the executor needs (timing rules, how to treat advice). These are wrapped in `<!-- advisor:only -->...<!-- /advisor:only -->` sentinels. The server strips these sections from baseline branches so the comparison is fair:

- **Advisor branch:** sees the full prompt.
- **Baseline branches:** see only what's **outside** the sentinels (empty by default — because the default prompt is 100% advisor instructions).

If you add your own content (e.g., `"You are a Go concurrency expert"`), put it **outside** the sentinels and all branches will receive it equally.

### Note on the advisor sub-inference and the system prompt

Per the docs, when the executor calls `advisor()`, the server forwards the **full executor transcript**, including the system prompt, to the advisor sub-inference. So the advisor reads your system prompt too. That's why the default prompt mixes instructions for both audiences:

- *"The advisor should respond in under 100 words..."* — **advisor** reads this and constrains its advice format
- *"Call advisor BEFORE substantive work..."* — **executor** reads this and decides when to invoke
- *"Give the advice serious weight..."* — **executor** reads this when processing the advisor's response

A large system prompt also gets re-read on every advisor call, which adds input tokens. Turn on **Advisor caching** in settings to absorb that cost after the first call (breaks even at ~3 advisor calls per conversation).

## Quality evaluation (LLM-as-judge)

Cost and latency comparisons are easy. The harder question is **"which branch actually produced a better answer?"** — and for open-ended prompts there's no objective ground truth. This tool answers that with an **LLM-as-judge** approach: a strong model reads the outputs for a single trace turn and scores them on a fixed rubric.

### How it works

Every trace turn's group header has an **Evaluate** button (shown only when compare mode is active with ≥ 2 successful branches). Clicking it:

1. Collects **only that trace turn's** user prompt and each branch's final text output. Nothing from other turns is touched.
2. Fires **two judge calls in parallel** with the candidate responses presented in **opposite orderings** (position-bias mitigation). You never see these two calls individually — they're averaged into a single visible result.
3. Un-blinds and averages the per-dimension scores from both passes.
4. Renders a single eval panel inside that turn group's body, above the delta pills and turn cards.

Evaluation is **opt-in per turn**. Nothing runs automatically. If you don't click Evaluate, no evaluation happens and you pay nothing extra.

### The rubric

Every evaluation scores each active branch 1–10 on four dimensions:

| Dimension | Question the judge answers |
|---|---|
| **Correctness** | Is the content factually/technically accurate? Any errors or hallucinations? |
| **Completeness** | Does it fully address what the user asked for? Are parts missed or hand-waved? |
| **Clarity** | Is the response well-structured and easy to follow? |
| **Depth** | Does it go beyond surface-level with useful specifics and trade-off reasoning? |

Plus an overall **winner** (or "tie"), a **confidence** level (low / medium / high), and a one-sentence summary. The full per-dimension reasoning for both judge passes is available under the "View reasoning" twirl.

### Bias mitigations

LLM-as-judge has well-documented failure modes. We push back on several:

- **Position bias** — judges often prefer the response shown first. We run the judge twice with swapped candidate orderings and average the scores. If the two runs disagree on the winner, we flag it as `low confidence`.
- **Blinding** — candidates are labeled `Response A`, `Response B`, `Response C` in the judge prompt. The judge never sees branch names or model names.
- **Length bias** — the prompt explicitly instructs the judge not to favor longer responses.
- **Reason-then-score** — the judge must write per-dimension reasoning *before* committing to numeric scores. This reduces snap judgments.

### Warnings

Every eval panel carries a warning block with conditional text:

- **On trace turn 1**: *"LLM-generated evaluation. Subjective — treat scores as a directional signal, not a measurement."* This is the base disclaimer.
- **On trace turn 2+**: the base disclaimer plus: *"After turn 1, branches have diverged conversation histories, so this reflects cumulative trajectory quality rather than a same-input comparison."*

The turn-2+ warning exists because each branch maintains its own independent message history. On turn 1 every branch answers the same prompt from scratch. On turn 2+, each branch's follow-up is being applied to *its own* turn-1 response — so a word like *"it"* in the user's follow-up resolves to different things on different branches. You're still learning something from the comparison, but you're comparing *trajectories*, not *models on the same input*.

If the two judge passes disagree on the winner, an additional soft note appears saying so — treat that as a signal the quality difference is below the noise floor.

### Configuration (Settings modal → Evaluation section)

- **Evaluator provider** — `Anthropic` (uses `claude-opus-4-6`) or `OpenAI` (uses `gpt-5.4`). Model names are hardcoded in `server.js` (`EVAL_MODEL_ANTHROPIC`, `EVAL_MODEL_OPENAI`); update them there when new models ship.
- **OpenAI API key** — only shown when OpenAI is selected. Password field, auto-saves to localStorage, never logged, used only for the evaluation call (the chat-loop itself always uses the Anthropic key).
- **Judge prompt / rubric** — editable textarea, prefilled with a strong default that produces structured JSON output. You can edit the rubric, dimensions, and anti-bias rules; the server appends the actual user prompt + blinded candidate responses at the end of whatever you write.

### Cost

Each evaluation = **2 judge API calls** (swapped orderings). Approximate per-evaluation cost at current list prices, for a typical turn with ~500 tokens of context per response:

- **claude-opus-4-6** (Anthropic): ~$0.05–$0.15 per eval (two Opus calls averaged)
- **gpt-5.4** (OpenAI): ~$0.02–$0.06 per eval (two GPT-5.4 calls averaged; OpenAI prices in `public/app.js` are approximate — update as needed)

The eval panel footer shows the exact token counts and estimated cost for every evaluation you run.

## Controls

### In the header

- **Executor model** — `claude-haiku-4-5`, `claude-sonnet-4-6`, or `claude-opus-4-6`
- **Advisor model** — `claude-opus-4-6` (only valid advisor per the docs)
- **Mode** — single-branch vs. compare (see above)
- **⚙** — open settings modal
- **`+`** (above the chat pane) — reset the conversation

### In the settings modal

The settings modal is organized into four collapsible sections. All sections default to **open** except the last one, which is reference info.

**1. Anthropic API** (open by default)
- **Anthropic API key** — required for the chat loop and the Anthropic evaluator. Password field, stored in `localStorage`.

**2. Chat & Advisor** (open by default)
- **max_tokens** — executor output cap. Default 8192. Does **not** bound advisor sub-inference tokens.
- **Advisor caching** — toggles ephemeral prompt caching on the advisor tool definition. Breaks even at ~3 advisor calls per conversation.
- **System prompt** — prefilled with the suggested timing + treatment + conciseness blocks from the docs, wrapped in `<!-- advisor:only -->` sentinels.

**3. Quality Evaluation** (open by default)
- **Evaluator provider** — `Anthropic · claude-opus-4-6` or `OpenAI · gpt-5.4`. Model names hardcoded in `server.js`.
- **OpenAI API key** — only shown when OpenAI is selected as the provider. Stored in `localStorage`.
- **Judge prompt / rubric** — editable textarea with a strong default.

**4. Notices & Disclaimers** (collapsed by default)
- Security notice (server binds to 127.0.0.1, keys are never logged).
- Cost estimates disclaimer (list prices used, approximate, hardcoded in `public/app.js`).

Every setting auto-saves to `localStorage` on change; a subtle "Saved automatically" indicator flashes green in the modal footer. The `Done` button just closes the modal.

## Notes on the numbers

- **cache_r** (`cache_read_input_tokens`) — served from Anthropic's prompt cache at ~10% of normal input rate.
- **cache_w** (`cache_creation_input_tokens`) — written to the cache on this call at ~125% of input rate (one-time).
- **Est. cost** — based on public list prices (Haiku 4.5 $1/$5, Sonnet 4.6 $3/$15, Opus 4.6 $15/$75, gpt-5.4 ~$5/$15 per MTok in/out). Approximate; verify against current pricing.
- **Duration** — measured on the Node backend around each `messages.create()` call. Includes executor + advisor + network round-trip. In compare mode, each branch has its own duration.

## How the step mapping works

The Messages API returns `content[]` (a flat list of blocks) and `usage.iterations[]` (a flat list of sub-inferences) separately — the mapping between them is implicit. This UI uses the rule from the docs: each executor iteration produces blocks up to and including the next `server_tool_use`, and each `advisor_message` iteration produces the following `advisor_tool_result`.

Baseline branches (executor-model-solo, advisor-model-solo) call the non-beta `client.messages.create()` endpoint, which does **not** return `usage.iterations[]`. For those branches, the UI falls back to the top-level `usage.input_tokens` / `usage.output_tokens` and synthesizes a single executor step from them. If the mapping ever looks off on the advisor branch, use **View full I/O** to inspect the raw response JSON directly.

## Limitations

- Conversation state is held in server memory keyed by a per-tab UUID. Restarting `npm start` wipes it. This is intentional — it's a test tool, not a product.
- The advisor sub-inference does not stream, so there's a visible pause on the client while advisor runs. The chat bubble shows bouncing dots, a pulsing teal glow, and a live elapsed-time counter so you can tell it's in flight, not stuck.
- Prices are hardcoded in `public/app.js` under `PRICES`. Update if they change.
- Compare mode fires all active branches in parallel. A very slow model will extend the turn's total wall-clock to match the slowest branch.
- Each additional compare branch multiplies token cost. "All three" mode will use roughly 3× the tokens (and money) of a single-branch run.
