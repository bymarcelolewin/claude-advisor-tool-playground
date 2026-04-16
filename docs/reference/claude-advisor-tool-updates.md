# Claude Advisor Tool — API Updates & Changes

This document tracks changes to Anthropic's advisor tool API as discovered from their official documentation. It serves as a reference for what Anthropic has added or changed, independent of what this app has implemented.

**Source URLs:**
- Advisor tool: https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool
- Effort parameter: https://platform.claude.com/docs/en/build-with-claude/effort

Last reviewed: 2026-04-16

---

## Current API Status

- **Beta header:** `advisor-tool-2026-03-01` (unchanged since launch)
- **Tool type:** `advisor_20260301`
- **Supported executor models:** Claude Haiku 4.5, Claude Sonnet 4.6, Claude Opus 4.6
- **Supported advisor models:** Claude Opus 4.6 (only)
- **Platform:** Claude API (Anthropic) only

---

## Tool Parameters (Full Reference)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | required | Must be `"advisor_20260301"` |
| `name` | string | required | Must be `"advisor"` |
| `model` | string | required | Advisor model ID (e.g., `"claude-opus-4-6"`) |
| `max_uses` | integer | unlimited | Max advisor calls per single API request. Excess calls return `advisor_tool_result_error` with `error_code: "max_uses_exceeded"`. Per-request cap only — for conversation-level limits, count client-side. |
| `caching` | object or null | null (off) | Enables prompt caching for the advisor's transcript. Shape: `{"type": "ephemeral", "ttl": "5m" | "1h"}`. Not a breakpoint marker — it's an on/off switch; the server decides cache boundaries. |

---

## Response Variants

The `advisor_tool_result.content` field is a discriminated union:

### `advisor_result` (standard)
Returned when the advisor model provides plaintext advice (e.g., Claude Opus 4.6 today).
```json
{
  "type": "advisor_tool_result",
  "tool_use_id": "srvtoolu_abc123",
  "content": {
    "type": "advisor_result",
    "text": "Use a channel-based coordination pattern..."
  }
}
```

### `advisor_redacted_result` (encrypted)
Returned when the advisor model returns encrypted output. The `encrypted_content` field is an opaque blob — your client cannot read it. On the next turn, the server decrypts it and renders the plaintext into the executor's prompt automatically.

**Important:** This is NOT about redacting sensitive user data. It's a mechanism where certain advisor models encrypt their internal reasoning so it can't be inspected by the client. The executor still receives and uses the advice normally — only the client-facing trace is opaque.

```json
{
  "type": "advisor_tool_result",
  "tool_use_id": "srvtoolu_abc123",
  "content": {
    "type": "advisor_redacted_result",
    "encrypted_content": "<opaque blob>"
  }
}
```

**Client requirement:** Round-trip both variants verbatim on subsequent turns. If switching advisor models mid-conversation, branch on `content.type` to handle both shapes.

---

## Error Codes

When the advisor sub-inference fails, the result carries an error instead of advice. The main request does NOT fail — the executor sees the error and continues without advice.

```json
{
  "type": "advisor_tool_result",
  "tool_use_id": "srvtoolu_abc123",
  "content": {
    "type": "advisor_tool_result_error",
    "error_code": "overloaded"
  }
}
```

| Error Code | Meaning |
|------------|---------|
| `max_uses_exceeded` | Hit the `max_uses` cap set on the tool definition |
| `too_many_requests` | Advisor sub-inference was rate-limited (shares rate-limit bucket with direct calls to the advisor model) |
| `overloaded` | Advisor hit capacity limits |
| `prompt_too_long` | Transcript exceeded the advisor model's context window |
| `execution_time_exceeded` | Advisor sub-inference timed out |
| `unavailable` | Any other advisor failure |

**Rate limit nuance:** Advisor rate limits draw from the same per-model bucket as direct calls to the advisor model. A rate limit on the advisor appears as `too_many_requests` inside the tool result. A rate limit on the executor fails the whole request with HTTP 429.

---

## Effort Settings

The `effort` parameter controls how much thinking effort the model puts in. Pairing with the advisor:

- **Sonnet at medium effort + Opus advisor** = intelligence comparable to Sonnet at default effort, at lower cost
- **Default effort** = maximum intelligence

This is a parameter on the main API request, not on the advisor tool definition.

---

## Caching Details

### Two independent caching layers:

**Executor-side caching** — The `advisor_tool_result` block is cacheable like any other content block. A `cache_control` breakpoint placed after it on a subsequent turn will hit.

**Advisor-side caching** — Set `caching` on the tool definition. The advisor's prompt on the Nth call is the (N-1)th call's prompt plus one more segment, so the prefix is stable. With caching enabled, each call writes a cache entry; the next call reads up to that point and pays only for the delta.

| TTL | When to use |
|-----|-------------|
| `"5m"` | Standard conversations, short-to-medium agent loops |
| `"1h"` | Long-running agent loops where calls are spread over time |

**Break-even:** Cache write costs more than reads save when advisor is called 2 or fewer times per conversation. Breaks even at roughly 3 calls.

**Warning:** `clear_thinking` with `keep` value other than `"all"` shifts the advisor's transcript each turn, causing cache misses. When extended thinking is enabled without explicit `clear_thinking` config, the API defaults to `keep: {type: "thinking_turns", value: 1}`, which triggers this. Set `keep: "all"` to preserve advisor cache stability.

---

## Suggested System Prompts (from Anthropic)

### Timing Guidance (for coding tasks)
Tells the executor when to call the advisor. On internal coding evaluations, this pattern produced the highest intelligence at near-Sonnet cost.

```
You have access to an `advisor` tool backed by a stronger reviewer model. It takes NO parameters — when you call advisor(), your entire conversation history is automatically forwarded. They see the task, every tool call you've made, every result you've seen.

Call advisor BEFORE substantive work — before writing, before committing to an interpretation, before building on an assumption. If the task requires orientation first (finding files, fetching a source, seeing what's there), do that, then call advisor. Orientation is not substantive work. Writing, editing, and declaring an answer are.

Also call advisor:
- When you believe the task is complete. BEFORE this call, make your deliverable durable: write the file, save the result, commit the change. The advisor call takes time; if the session ends during it, a durable result persists and an unwritten one doesn't.
- When stuck — errors recurring, approach not converging, results that don't fit.
- When considering a change of approach.

On tasks longer than a few steps, call advisor at least once before committing to an approach and once before declaring done. On short reactive tasks where the next action is dictated by tool output you just read, you don't need to keep calling — the advisor adds most of its value on the first call, before the approach crystallizes.
```

### How to Treat Advice
Place directly after the timing block:

```
Give the advice serious weight. If you follow a step and it fails empirically, or you have primary-source evidence that contradicts a specific claim (the file says X, the paper states Y), adapt. A passing self-test is not evidence the advice is wrong — it's evidence your test doesn't check what the advice is checking.

If you've already retrieved data pointing one way and the advisor points another: don't silently switch. Surface the conflict in one more advisor call — "I found X, you suggest Y, which constraint breaks the tie?" The advisor saw your evidence but may have underweighted it; a reconcile call is cheaper than committing to the wrong branch.
```

### Conciseness Instruction
Cuts total advisor output tokens by roughly 35-45% without changing call frequency:

```
The advisor should respond in under 100 words and use enumerated steps, not explanations.
```

---

## pause_turn Support

A dangling advisor call ends the response with `stop_reason: "pause_turn"` and the `server_tool_use` block as the last content block. The advisor executes on resumption. Useful for long agentic loops where you want checkpointing — the client can inspect state before letting the advisor run.

Reference: [Server tools documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools#the-server-side-loop-and-pause-turn)

---

## Batch Processing Support

The advisor tool works with Anthropic's [batch API](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing). Submit up to thousands of requests at once, each with advisor tool enabled, and get results later at a 50% discount. `usage.iterations` is reported per item. Designed for bulk/offline workloads (e.g., evaluating hundreds of code snippets), not interactive chat.

---

## clear_thinking

When extended thinking is enabled, the model generates internal "thinking" blocks before its visible response. The `clear_thinking` parameter controls whether those blocks are kept or pruned from conversation history on subsequent turns.

- Default behavior: `keep: {type: "thinking_turns", value: 1}` — only keeps the most recent turn's thinking
- This default **causes advisor cache misses** because it shifts the transcript each turn
- Fix: Set `keep: "all"` to preserve advisor cache stability
- Impact: Cost degradation only — advice quality is unaffected

Reference: [Context editing documentation](https://platform.claude.com/docs/en/build-with-claude/context-editing)

---

## Zero Data Retention (ZDR)

The advisor tool is eligible for ZDR. When your organization has a ZDR arrangement with Anthropic, data sent through the advisor tool is not stored after the API response is returned. This is an enterprise-level agreement — no impact on the app itself, but worth noting for enterprise users.

---

## Combining with Other Tools

The advisor tool composes with other server-side and client-side tools in the same `tools` array. The executor can search the web, call the advisor, and use custom tools in the same turn. The advisor's plan can inform which tools the executor reaches for next.

| Feature | Interaction |
|---------|------------|
| Batch processing | Supported. `usage.iterations` reported per item. |
| Token counting | Returns executor's first-iteration input tokens only. For advisor estimate, call `count_tokens` with `model` set to advisor model. |
| Context editing | `clear_tool_uses` not yet fully compatible with advisor blocks; full support planned. |
| `pause_turn` | Advisor executes on resumption after pause. |

---

## Streaming Behavior

The advisor sub-inference does not stream. The executor's stream pauses while the advisor runs, then the full result arrives in a single event.

- `server_tool_use` block with `name: "advisor"` signals advisor call starting
- Pause begins when that block closes (`content_block_stop`)
- Stream is quiet during pause except for SSE `ping` keepalives (~every 30 seconds)
- `advisor_tool_result` arrives fully formed in a single `content_block_start` event (no deltas)
- Executor output then resumes streaming
- `message_delta` event follows with updated `usage.iterations` array

---

## Usage & Billing Notes

- Top-level `usage` fields reflect **executor tokens only**
- Advisor tokens are in `usage.iterations[]` entries with `type: "advisor_message"` — billed at advisor model rates
- Top-level `output_tokens` = sum of all executor iterations
- Top-level `input_tokens` and `cache_read_input_tokens` = first executor iteration only
- `max_tokens` applies to executor output only — does not bound advisor tokens
- Advisor output is typically 400-700 text tokens, or 1,400-1,800 tokens total including thinking
- Anthropic Priority Tier is per-model — Priority Tier on executor does not extend to advisor
