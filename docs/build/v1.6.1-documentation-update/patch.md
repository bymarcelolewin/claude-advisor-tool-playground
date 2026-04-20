# Patch – v1.6.1 — Documentation Update
This document captures a lightweight fix or small enhancement that does not require a full version build cycle.

## Patch Version
v1.6.1 — Documentation Update

## Date
2026-04-20

## Type
Small Enhancement

## Original Prompt
_What the **USER** originally said or requested._

"Oh, so it's all just updating the reference file. Sure. Let's do it. This is just a patch. v1.6.1 Documentation Update seems ok to me. Let's do this?"

Triggered by `/check-advisor-tool-updates`, which diffed Anthropic's published advisor-tool, effort, and pricing pages against `docs/reference/claude-advisor-tool-updates.md` (last reviewed 2026-04-18). No API-surface or pricing changes since that review, but several new guidance sections have appeared in the upstream docs that our reference file does not yet mirror.

## Problem
_The **AGENT's** understanding of the issue or change needed._

`docs/reference/claude-advisor-tool-updates.md` is the playground's canonical snapshot of the advisor tool API, effort parameter, and pricing. It drives every future catch-up run — the richer it is, the easier each diff becomes. Upstream docs at platform.claude.com have added several guidance sections and pricing clarifications since 2026-04-18 that are not yet reflected in our reference file.

Specifically, the following upstream additions are missing from our reference:

1. **Effort guidance tables** — Opus 4.7 and Sonnet 4.6 now each have per-level recommendation tables (e.g. "xhigh is the recommended starting point for coding and agentic work on Opus 4.7"; "medium is the recommended default on Sonnet 4.6"). Our reference has the level list but not the per-model recommendation guidance.
2. **`budget_tokens` deprecation on Opus 4.6 / Sonnet 4.6** — Upstream now explicitly flags `budget_tokens` as deprecated on these two models (still functional for now). Our reference only notes that Opus 4.7 dropped manual extended thinking.
3. **"Effort with tool use" guidance** — Upstream added a section describing how effort shifts tool-call behavior (lower = combined operations / terse; higher = more calls / detailed summaries). Not in our reference.
4. **Tool use system prompt overhead numbers** — Upstream publishes exact overhead: `auto`/`none` = 346 tokens, `any`/`tool` = 313 tokens (Opus 4.7, Opus 4.6, Sonnet 4.6, Haiku 4.5). Not in our reference.
5. **Fast mode pricing** — Opus 4.6 beta research preview: $30/$150 per MTok (6× standard), unavailable with Batch API. Not in our reference. Not applicable to the playground but worth tracking.
6. **Long-context pricing clarification** — Upstream confirms Mythos Preview, Opus 4.7/4.6, Sonnet 4.6 include the full 1M-token context window at standard pricing (no premium tier). Not in our reference.
7. **Regional endpoint 10% premium** — Upstream notes AWS Bedrock and Google Vertex regional endpoints carry a 10% premium over global for Sonnet 4.5, Haiku 4.5, and future models. Not in our reference (playground is API-only, but worth capturing).
8. **Combining-with-tools 400 rule** — Upstream explicitly documents that omitting the advisor tool on a follow-up turn while `advisor_tool_result` blocks remain in history returns `400 invalid_request_error`. Our reference only touches this obliquely.
9. **Minor wording drift** — Our reference's `advisor_result` example says "e.g., Claude Opus 4.6 today"; upstream now uses Opus 4.7 as the example. Same drift in the `model` parameter row of the tool parameters table.
10. **"Last reviewed" date** — Currently 2026-04-18; needs to move to 2026-04-20.

No API-surface or pricing changes. No code changes required — `PRICES` in [public/app.js:111-116](../../../public/app.js#L111-L116), the beta header and tool type in [server.js](../../../server.js), and the effort level list all match upstream today.

## Plan
_How the **AGENT** intends to fix or implement the change._

Single-file edit: [docs/reference/claude-advisor-tool-updates.md](../../reference/claude-advisor-tool-updates.md).

**Section-by-section changes:**

1. **"Last reviewed" date** (top of file) → `2026-04-20`.

2. **Tool Parameters table** — change `model` example from `"claude-opus-4-6"` to `"claude-opus-4-7"` to match upstream docs.

3. **Response Variants → `advisor_result`** — change "(e.g., Claude Opus 4.6 today)" to "(e.g., Claude Opus 4.7 today)" to match upstream example.

4. **Effort Settings section** — add two new sub-subsections:
   - **Opus 4.7 per-level guidance table** (verbatim from upstream): low / medium / high / xhigh / max rows with Opus 4.7-specific use-case descriptions. Keep it right after the current "Effort levels" table.
   - **Sonnet 4.6 recommendations** (new block): defaults to `high`; medium is the recommended default for agentic coding / tool-heavy workflows; low for high-volume/latency-sensitive; high for maximum Sonnet intelligence; max for absolute highest capability.
   - **"Effort with tool use"** (new block): short paragraph — lower effort combines operations, fewer tool calls, terse output; higher effort → more tool calls, plan-before-action, detailed summaries, more code comments.

5. **Effort Settings → Opus 4.7-specific notes** — expand to cover Opus 4.6 / Sonnet 4.6: add a bullet that `budget_tokens` is deprecated on Opus 4.6 and Sonnet 4.6 (still accepted, will be removed in a future model release), and that Sonnet 4.6 interleaved thinking (`thinking: {type: "enabled", budget_tokens: N}`) is also functional-but-deprecated.

6. **Combining with Other Tools** — add a note: omitting the advisor tool on a follow-up turn while the conversation history still contains `advisor_tool_result` blocks returns `400 invalid_request_error`. To cap conversation-level, strip both the tool and the `advisor_tool_result` blocks.

7. **Pricing Snapshot** — add three sub-notes after the existing table:
   - **Tool-use system prompt overhead** (Opus 4.7, Opus 4.6, Sonnet 4.6, Haiku 4.5): `auto`/`none` = 346 tokens, `any`/`tool` = 313 tokens.
   - **Long-context pricing**: 1M-token window at standard pricing on Mythos Preview, Opus 4.7/4.6, Sonnet 4.6 (no premium tier).
   - **Fast mode (Opus 4.6 only, beta research preview)**: $30/$150 per MTok (6× standard); unavailable with Batch API.
   - **Regional endpoint premium**: AWS Bedrock / Google Vertex regional endpoints carry 10% premium over global for Sonnet 4.5, Haiku 4.5, and future models.

**What this patch does NOT touch:**

- No changes to [server.js](../../../server.js) — beta header, tool type, effort handling all current.
- No changes to [public/app.js](../../../public/app.js) — `PRICES` table matches upstream exactly for all four playground-exposed models.
- No version bump or metadata changes beyond `cody.json` (version → 1.6.1, updatedAt → 2026-04-20).
- No release notes entry style change — append one patch entry at the top of `release-notes.md` using the existing patch format.
- No `package.json` version bump (separate from this flow — user handles that on release).

## Solution
_What was actually done to resolve the issue._

All changes landed in `docs/reference/claude-advisor-tool-updates.md`. No app code, no `package.json`, no other files touched.

1. **"Last reviewed" date** (line 10) → `2026-04-20`.
2. **Tool Parameters table** — `model` example updated from `"claude-opus-4-6"` to `"claude-opus-4-7"`.
3. **Response Variants → `advisor_result`** — example updated from "Claude Opus 4.6 today" to "Claude Opus 4.7 today".
4. **Effort Settings** — added three new sub-sections between the existing "Effort levels" table and the "Opus 4.7-specific notes" block:
   - `### Opus 4.7 per-level guidance` — five-row table (low/medium/high/xhigh/max) with Anthropic's Opus 4.7-specific recommendations verbatim.
   - `### Sonnet 4.6 per-level guidance` — four-row table with Sonnet 4.6-specific recommendations; flags `medium` as the recommended everyday default.
   - `### Effort with tool use` — two-bullet block describing how lower/higher effort reshapes tool-call behavior.
5. **Effort Settings** — added new sub-section `### budget_tokens deprecation on Opus 4.6 / Sonnet 4.6` between the Opus 4.7-specific notes and the Haiku 4.5 block. Captures that `budget_tokens` is deprecated on Opus 4.6 / Sonnet 4.6, already dropped on Opus 4.7, and still the active mechanism on Opus 4.5 and earlier.
6. **Combining with Other Tools** — added a "Multi-turn constraint" paragraph before the interaction table documenting the `400 invalid_request_error` rule when omitting the advisor tool while `advisor_tool_result` blocks remain in history, plus the two-step conversation-level cap workaround.
7. **Pricing Snapshot** — appended four new sub-sections after the existing multipliers / batch / data-residency block:
   - `### Long-context pricing` — 1M window at standard pricing on Mythos Preview, Opus 4.7/4.6, Sonnet 4.6.
   - `### Tool-use system-prompt overhead` — `auto`/`none` = 346 tokens, `any`/`tool` = 313 tokens.
   - `### Fast mode (Opus 4.6 only, beta research preview)` — $30/$150 per MTok, unavailable with Batch API.
   - `### Regional endpoint premium (non-Anthropic platforms)` — 10% premium on AWS Bedrock / Google Vertex regional endpoints for Sonnet 4.5, Haiku 4.5, and future models.

Also extended the existing data-residency line with the "Claude API (1P) only" clarification pulled from upstream.

Closeout:
- `cody.json` bumped: `version` 1.6.0 → 1.6.1; `updatedAt` 2026-04-18 → 2026-04-20.
- `release-notes.md` TOC updated and patch entry prepended at the top with the patch-format template (Type + Summary).
- `README.md` version badge bumped 1.6.0 → 1.6.1 (line 3) and the "Most recent" blurb in the Release Notes section (line 312) updated to describe the v1.6.1 patch scope.

## Files Changed
_List of files that were created, modified, or deleted._

| File | Action |
|------|--------|
| [docs/reference/claude-advisor-tool-updates.md](../../reference/claude-advisor-tool-updates.md) | Modified |
| [release-notes.md](../../../release-notes.md) | Modified |
| [README.md](../../../README.md) | Modified |
| [cody.json](../../../cody.json) | Modified |
| [docs/build/v1.6.1-documentation-update/patch.md](./patch.md) | Created |

## Testing Notes
_How to verify the fix or change._

This is a documentation patch — no runtime behavior changed. Verification is purely a doc review:

1. **Reference doc reads cleanly** — open [docs/reference/claude-advisor-tool-updates.md](../../reference/claude-advisor-tool-updates.md) and confirm:
   - Top of file says `Last reviewed: 2026-04-20`.
   - Tool Parameters table `model` row says `"claude-opus-4-7"`.
   - Response Variants `advisor_result` section says "(e.g., Claude Opus 4.7 today)".
   - Effort Settings section flows: existing "Effort levels" → new "Opus 4.7 per-level guidance" → new "Sonnet 4.6 per-level guidance" → new "Effort with tool use" → existing "Opus 4.7-specific notes" → new "`budget_tokens` deprecation on Opus 4.6 / Sonnet 4.6" → existing "Effort on Haiku 4.5".
   - Combining with Other Tools has the "Multi-turn constraint" paragraph before the feature-interaction table.
   - Pricing Snapshot has four new sub-sections at the end.

2. **Release notes entry present** — open [release-notes.md](../../../release-notes.md) and confirm:
   - TOC first row is `v1.6.1 — Documentation Update (Patch) (2026-04-20)`.
   - Patch entry at the top of the body shows Type = Small Enhancement and a Summary describing the reference-doc refresh.

3. **Project metadata bumped** — open [cody.json](../../../cody.json) and confirm `version: "1.6.1"` and `updatedAt: "2026-04-20"`.

4. **README up to date** — open [README.md](../../../README.md) and confirm the version badge at the top says `version-1.6.1` and the Release Notes paragraph near the bottom describes v1.6.1 (not v1.6.0).

5. **No app regressions** — since nothing in `server.js` or `public/app.js` was touched, no runtime smoke test is required. `npm start` behavior is unchanged.
