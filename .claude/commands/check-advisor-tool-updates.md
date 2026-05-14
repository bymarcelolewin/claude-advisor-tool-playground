---
description: "Activate Cody, refresh memory, then diff Anthropic's Advisor Tool docs against our playground"
allowed-tools: ["Read", "WebFetch", "Glob", "Grep"]
---

# Check Advisor Tool API Updates

Execute these steps in order. Do NOT stop for user input between steps 1, 2, and 3 — only stop at step 5.

## Step 1: Activate Cody Product Builder

Read and execute `.claude/commands/cody-product-builder.md` (which in turn reads `.cody/activate.md`). Show the activation banner and the version banner as specified. **Skip the contextual prompt at the end of the activation file (step 5) — do not ask "What would you like to work on?" or wait for user input. Continue to Step 2.**

## Step 2: Run :cody refresh

Read and execute `.cody/commands/refresh.md`. Follow the instructions through the "DONE REVIEWING THE ENTIRE PROJECT" section. **Skip the final "OFFER TO UPDATE DOCUMENTS" section — do not ask about updating the PRD, plan, and release notes. Continue to Step 3.**

## Step 3: Diff the Advisor Tool docs against our playground

**Scope.** When diffing the three upstream pages, only flag changes that affect **the advisor tool API surface, advisor effort behavior, or the pricing of models / features the playground actually uses or exposes**. Real upstream changes that are tangential — Claude Platform on AWS billing (CCUs), Claude Managed Agents pricing, pricing for unrelated server-side tools (code execution, web search, web fetch, text editor, computer use, bash), and models outside the advisor tool's executor/advisor compatibility table (e.g., Opus 4.5, Opus 4.1, Sonnet 4.5) — should be acknowledged in your scan but **excluded from the findings list and not added to the reference doc**. Overlap items stay in scope: e.g., fast-mode pricing on Opus 4.7 belongs in the findings because Opus 4.7 is a valid advisor-tool executor and the playground's advisor model. The test is "does it affect the advisor tool API, advisor effort behavior, or pricing of a model/feature the playground actually uses?" — not "did the source page change?" See the "Scope" block at the top of `docs/reference/claude-advisor-tool-updates.md` for the authoritative scope statement.

1. Read `docs/reference/claude-advisor-tool-updates.md` — this is our canonical record of what Anthropic has published and what we've implemented. Note the "Last reviewed" date and any "Implemented: ✅ / ❌" markers.
2. WebFetch `https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool`.
3. WebFetch `https://platform.claude.com/docs/en/build-with-claude/effort`.
4. WebFetch `https://platform.claude.com/docs/en/about-claude/pricing`.
5. Compare the fetched content against the reference doc and (when relevant) against `server.js` and `public/app.js`. Look specifically for changes in:
   - Beta header version
   - Tool `type` identifier
   - Supported executor / advisor models
   - Tool parameters (new fields, default changes, constraint changes)
   - Response variants (`advisor_result`, `advisor_redacted_result`, new types)
   - Error codes
   - Streaming / caching / effort behavior
   - New or updated effort levels for the models
   - Model pricing (input/output rates per MTok, cache multipliers, tokenizer changes). Compare against the `PRICES` table in `public/app.js` and the "Pricing Snapshot" section of the reference doc.
   - Anything else documented that our reference file or code does not reflect

## Step 4: Present findings

Show the **USER** two sections:

### What's new in the Advisor Tool docs
List each change found, one bullet per item, citing the specific field/behavior. If nothing has changed, say exactly: `No updates since last review on {date from reference doc}.`

### Suggested updates for the Playground
For each new item, propose a concrete change as a feature entry:
- **Title** — one-line summary
- **Why** — what the Anthropic change is and why it matters
- **Scope** — which files likely need to change (e.g., `server.js`, `public/app.js`, `docs/reference/claude-advisor-tool-updates.md`)
- **Priority guess** — High / Medium / Low

If there are no new items, skip this section and note that the playground is current.

## Step 5: Offer to initiate a build

Ask the **USER** exactly:

`Would you like to initiate a build with Cody via :cody build to work through these updates?`

**STOP** and wait for the **USER**.

- If YES → read and execute `.cody/commands/build.md`.
- If NO → end here.
