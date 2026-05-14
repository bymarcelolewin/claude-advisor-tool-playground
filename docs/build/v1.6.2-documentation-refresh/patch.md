# Patch – v1.6.2 — Documentation Refresh
This document captures a lightweight fix or small enhancement that does not require a full version build cycle.

## Patch Version
v1.6.2 — Documentation Refresh

## Date
2026-05-14

## Type
Small Enhancement

## Original Prompt
_What the **USER** originally said or requested._

Triggered by `/check-advisor-tool-updates`, which diffed Anthropic's published advisor-tool, effort, and pricing pages against `docs/reference/claude-advisor-tool-updates.md` (last reviewed 2026-04-22). The diff surfaced nine upstream changes. The **USER** then walked through them with the **AGENT** and explicitly narrowed the scope:

> "we need to track those page changes (upstream), but only if they affect the advisor tool playground. Not just by themselves."

Following that scope filter, four content items remained, and the **USER** added a fifth: encode the scope explicitly in both the reference doc and the `/check-advisor-tool-updates` command so future catch-up runs don't re-litigate which upstream changes are in or out.

## Problem
_The **AGENT's** understanding of the issue or change needed._

The reference doc `docs/reference/claude-advisor-tool-updates.md` is the playground's canonical snapshot of the advisor tool API, the `effort` parameter, and pricing. Since the 2026-04-22 review, four upstream-doc changes have appeared that materially affect the snapshot's accuracy for the playground, and one structural problem has emerged: the scope of what belongs in the doc is implicit, so future catch-up runs surface tangential pricing-page changes (Claude Managed Agents, Claude Platform on AWS CCU billing, code-execution-tool pricing, unrelated-model pricing) that the playground has no use for and that the user then has to manually filter out each time.

Specifically, the following five items need to be addressed:

1. **Platform availability extended.** Upstream advisor tool docs now list the advisor tool as available on the **Claude API** AND on **Claude Platform on AWS**. Our reference says `Platform: Claude API (Anthropic) only`.

2. **Fast mode extended to Opus 4.7.** Upstream pricing page now lists fast mode (6× standard pricing, beta research preview) as available on **both Opus 4.6 AND Opus 4.7**. Our reference's "Fast mode" subsection still says "Opus 4.6 only." Opus 4.7 is a playground executor and the playground's advisor model, so this is factually stale for a model the app actually uses. The playground itself does not expose fast mode — informational only.

3. **`clear_thinking` per-model default nuance.** Upstream advisor tool docs now clarify that the `keep: {type: "thinking_turns", value: 1}` default — the one that causes advisor cache misses — applies only to **earlier Opus/Sonnet models and all Haiku models**. On **Opus 4.5+ and Sonnet 4.6+**, the default is `keep: "all"`. Among the playground's four executors (Haiku 4.5, Sonnet 4.6, Opus 4.6, Opus 4.7), the lossy default is moot for Sonnet 4.6 / Opus 4.6 / Opus 4.7 (they default to `keep: "all"`) and also moot for Haiku 4.5 (which doesn't support effort or extended thinking, so there are no thinking blocks to shift). Our current warning treats the lossy default as universal — it over-warns for every playground executor.

4. **Advisor prompting framing.** Upstream advisor tool docs now frame the optimal prompting pattern with two new concepts: (a) the "two timings" that drive the intelligence gain on coding tasks — an early first call after exploratory reads in the transcript, and a final call after file writes / test outputs in the transcript — and (b) a recommendation to funnel the advisor into planner-like tools (e.g., a todo list tool) when the agent exposes them. Our reference has the three suggested prompt blocks verbatim but doesn't capture this framing. Could inform future "Recommended" system prompt presets in the playground.

5. **Implicit scope.** The reference doc and the `/check-advisor-tool-updates` command don't state what's in scope vs. out of scope. The doc has historically been a focused playground catch-up tracker, not a mirror of the full upstream pricing page, but that intent lives only in the user's head. As a result, every catch-up run surfaces noise the user has to manually filter: Claude Managed Agents pricing, Claude Platform on AWS CCU billing, unrelated tool pricing (code execution, web search, text editor, computer use), and models outside the advisor tool's executor/advisor compatibility table (e.g., Opus 4.5, Opus 4.1, Sonnet 4.5).

**Out of scope (acknowledged but not tracked):** Upstream has also added a number of changes that do NOT affect the advisor tool or the playground and that should NOT be added to the reference doc going forward:
- Claude Platform on AWS billing (CCUs) — separate Anthropic offering
- Claude Managed Agents pricing — separate product
- Code execution / web search / text editor / computer use tool pricing — different tools, playground doesn't use them
- Opus 4.5 inclusion in the pricing table, effort coverage, and regional-endpoint scope — not in the advisor tool compatibility table

No app code changes are required for this patch. Verified against the current playground:
- The `PRICES` table at [public/app.js:111-116](../../../public/app.js#L111-L116) covers every model the playground actually uses (Opus 4.7, Opus 4.6, Sonnet 4.6, Haiku 4.5) at current upstream rates.
- The beta header, tool type, response variants, error codes, parameters, and executor/advisor dropdowns in [server.js](../../../server.js) and [public/app.js](../../../public/app.js) all match upstream.
- The playground doesn't pass `clear_thinking` or opt into fast mode, so neither item-2 nor item-3 has any code surface to update.

## Plan
_How the **AGENT** intends to fix or implement the change._

Two-file edit. No app code touched.

### File 1: [docs/reference/claude-advisor-tool-updates.md](../../reference/claude-advisor-tool-updates.md)

**Section-by-section changes:**

1. **Add a "Scope" block** immediately after the "Source URLs" list (currently line 8) and before the "Last reviewed" line. Explicitly states what is in scope (advisor tool API + effort behavior + pricing of models/features the playground uses) and what is out of scope (Claude Platform on AWS billing, Claude Managed Agents, unrelated tool pricing, models outside the advisor compatibility table). Notes that overlap items (e.g., fast mode on Opus 4.7 since Opus 4.7 is an advisor-tool executor) stay in scope.

2. **"Last reviewed" date** → `2026-05-14`.

3. **"Current API Status" → Platform line** (currently line 20): change from `**Platform:** Claude API (Anthropic) only` to `**Platform:** Claude API (Anthropic) and Claude Platform on AWS. Not available on Amazon Bedrock, Google Vertex AI, or Microsoft Foundry.`

4. **"Caching Details" → `clear_thinking` warning** (currently lines 197-198): refine the warning to distinguish per-model defaults. Specifically: the lossy `keep: {type: "thinking_turns", value: 1}` default applies only to earlier Opus/Sonnet models and all Haiku models; on Opus 4.5+ and Sonnet 4.6+ the default is `keep: "all"`. Add a one-line note that among current playground executors, the warning is moot for Sonnet 4.6 / Opus 4.6 / Opus 4.7 (default keeps all) and also moot for Haiku 4.5 (no extended thinking to begin with).

5. **Standalone "clear_thinking" section** (currently lines 252-261): apply the same per-model nuance — replace the unconditional "Default behavior: `keep: {type: "thinking_turns", value: 1}`" bullet with the per-model breakdown, and tighten the "causes advisor cache misses" claim to be conditional on the lossy default actually being in effect.

6. **"Suggested System Prompts" section** (currently lines 202-235): add a new "When to call (Anthropic's framing)" sub-section above the three quoted prompt blocks. Captures the two timings (early first call after exploratory reads; final call after file writes / test outputs) and the planner-tool funnel recommendation. Verbatim source: upstream advisor tool docs "Best practices → Prompting for coding and agent tasks".

7. **"Pricing Snapshot → Fast mode" subsection** (currently lines 343-345): change heading from `Fast mode (Opus 4.6 only, beta research preview)` to `Fast mode (Opus 4.6 and Opus 4.7, beta research preview)` and update the body sentence to reflect both models at 6× standard pricing ($30 input / $150 output per MTok). Keep the "The playground does not currently expose fast mode" closing note.

### File 2: [.claude/commands/check-advisor-tool-updates.md](../../../.claude/commands/check-advisor-tool-updates.md)

**Add a "Scope" note at the top of Step 3** (immediately after the "## Step 3: Diff the Advisor Tool docs against our playground" heading). Mirrors the reference-doc scope statement but framed for the AGENT performing the diff: when scanning the three upstream pages, only flag changes that affect the advisor tool API surface, advisor effort behavior, or the pricing of models / features the playground actually uses or exposes. Real upstream changes that are tangential — Claude Platform on AWS CCU billing, Claude Managed Agents pricing, unrelated server-side tool pricing, and models outside the advisor tool's executor/advisor compatibility table — should be acknowledged in the scan but excluded from the findings list and the reference doc.

### Feature-backlog catch-up (USER caught this)

[docs/build/feature-backlog.md](../feature-backlog.md) is missing the v1.6.1 entry — the prior patch (v1.6.1 — Documentation Update, 2026-04-20) was never added. Last entry is v1.6.0 / F40. As part of closing this patch we will:

- **Backfill v1.6.1.** Add a new "## v1.6.1 — Documentation Update (Patch) - 🟢 Completed" section after v1.6.0, with a single F41 feature entry summarizing what was done in that patch (reference-doc refresh: effort recommendation tables, `budget_tokens` deprecation note, "Effort with tool use" guidance, tool-use system-prompt overhead numbers, long-context standard pricing, Opus 4.6 fast-mode pricing, Bedrock/Vertex regional 10% premium, multi-turn 400 rule, wording-drift fixes, "Last reviewed" bump). No API or app changes; reference doc only.
- **Add v1.6.2.** Add a new "## v1.6.2 — Documentation Refresh (Patch) - 🟢 Completed" section with two features:
  - F42: Reference-doc scope statement (this patch's structural addition — reference doc + command file)
  - F43: Reference doc accuracy refresh (platform availability + fast mode on Opus 4.7 + `clear_thinking` per-model nuance + new "When to call" framing block + "Last reviewed" bump)

### Version bump checklist (per memory `feedback_version_bump_checklist.md`)

User-flagged risk area — every prior release missed one or more of these. Will hit all of them in this patch:

- [cody.json](../../../cody.json) — `version` → `1.6.2`, `updatedAt` → `2026-05-14`
- [package.json](../../../package.json) — `version` → `1.6.2`, `lastUpdated` → `2026-05-14`
- [package-lock.json](../../../package-lock.json) — top-level `version` → `1.6.2`, and the root-package `"": { "version": "...", ... }` entry → `1.6.2`
- [README.md](../../../README.md) — version badge → `1.6.2` and the "Most recent" blurb → `v1.6.2`
- [release-notes.md](../../../release-notes.md) — add `v1.6.2 — Documentation Refresh (Patch) (2026-05-14)` entry at the top (anchor link in TOC + entry body)
- [docs/build/feature-backlog.md](../feature-backlog.md) — backfill v1.6.1 (F41) AND add v1.6.2 (F42, F43)
- The build folder: this patch.md itself (`docs/build/v1.6.2-documentation-refresh/patch.md`)

### Order of operations

1. Edit reference doc — all seven section changes (items 1 = scope block, items 2–7 = content edits).
2. Edit command file — add the Step 3 scope note.
3. Backfill v1.6.1 + add v1.6.2 entries to feature-backlog.md.
4. Bump version in the other version-bump-checklist files (cody.json, package.json, package-lock.json, README.md).
5. Add release-notes.md entry.
6. Update cody.json (version + updatedAt + phase already "build").
7. Fill in this patch.md's Solution / Files Changed / Testing Notes sections.
8. Present Testing Notes to user for verification.

## Solution
_What was actually done to resolve the issue._

Executed the plan end-to-end. No app code touched.

**Reference doc edits ([docs/reference/claude-advisor-tool-updates.md](../../reference/claude-advisor-tool-updates.md)) — 7 changes:**

1. **Added a "Scope" block** after Source URLs, before "Last reviewed". States the in-scope test ("does it affect the advisor tool API, advisor effort behavior, or pricing of a model/feature the playground actually uses?") and lists out-of-scope categories: Claude Platform on AWS billing, Claude Managed Agents, Bedrock/Vertex/Foundry, unrelated server-side tool pricing, and models outside the advisor compatibility table. Notes that overlap items (e.g., fast mode on Opus 4.7) stay tracked.
2. **Bumped "Last reviewed"** from `2026-04-22` → `2026-05-14`.
3. **Platform line** in Current API Status: `Claude API (Anthropic) only` → `Claude API (Anthropic) and Claude Platform on AWS. Not available on Amazon Bedrock, Google Vertex AI, or Microsoft Foundry.`
4. **Refined the `clear_thinking` warning** in the Caching Details section: split the default-behavior claim into per-model cases (Opus 4.5+ and Sonnet 4.6+ → `keep: "all"`; earlier Opus/Sonnet and all Haiku → `keep: {type: "thinking_turns", value: 1}`), and added a playground-specific note that the warning is moot for all four current executors.
5. **Updated the standalone `clear_thinking` section** with the same per-model nuance and the playground-specific moot note.
6. **Added a new "When to call (Anthropic's framing)" sub-section** at the top of "Suggested System Prompts" — captures the two-timings pattern (early first call after exploratory reads; final call after writes/test outputs) and the planner-tool funnel recommendation (call advisor before planner-shaped tools so the plan flows into them).
7. **Updated the fast-mode subsection** in Pricing Snapshot: heading and body changed from "Opus 4.6 only" to "Opus 4.6 and Opus 4.7"; added "or on Claude Platform on AWS" to the Batch API exclusion line; reframed the playground note to explain that fast mode is tracked here because Opus 4.7 is the playground's advisor model and a valid executor.

**Command file edit ([.claude/commands/check-advisor-tool-updates.md](../../../.claude/commands/check-advisor-tool-updates.md)):**

- **Added a Scope note** at the top of Step 3, before the WebFetch/diff instructions. Mirrors the reference-doc scope statement but framed for the AGENT performing the diff. Concludes with a pointer to the reference doc's Scope block as the authoritative source.

**Feature backlog ([docs/build/feature-backlog.md](../feature-backlog.md)):**

- **Backfilled v1.6.1** with a new "## v1.6.1 — Documentation Update (Patch) - 🟢 Completed" section and a single feature entry **F41 — Reference doc refresh** summarizing all 10 sub-changes from that prior patch (effort guidance tables, `budget_tokens` deprecation, "Effort with tool use", tool-use system-prompt overhead, long-context standard pricing, Opus 4.6 fast-mode beta, Bedrock/Vertex regional 10% premium, multi-turn 400 rule, wording-drift fixes, last-reviewed bump).
- **Added v1.6.2** with a new "## v1.6.2 — Documentation Refresh (Patch) - 🟢 Completed" section and two feature entries: **F42 — Reference-doc scope statement** (the structural addition) and **F43 — Reference doc accuracy refresh** (platform availability, fast mode on Opus 4.7, `clear_thinking` per-model nuance, "When to call" framing block, last-reviewed bump).

**Version bump (per saved memory `feedback_version_bump_checklist`):**

- [cody.json](../../../cody.json): `version` `1.6.1` → `1.6.2`, `updatedAt` `2026-04-20` → `2026-05-14`.
- [package.json](../../../package.json): `version` `1.6.1` → `1.6.2`, `lastUpdated` `2026-04-20` → `2026-05-14`.
- [package-lock.json](../../../package-lock.json): top-level `version` and root-package `"": { "version": ... }` both `1.6.1` → `1.6.2`.
- [README.md](../../../README.md): version badge `1.6.1` → `1.6.2`.
- [release-notes.md](../../../release-notes.md): added v1.6.2 entry at the top of the TOC and as the latest release entry body.
- Build folder: this patch document at [docs/build/v1.6.2-documentation-refresh/patch.md](patch.md).

**Additional README restructuring (F44):**

- Added a new **Release Notes** pill to the README top badge row: `[![Release Notes](https://img.shields.io/badge/release%20notes-read-orange)](release-notes.md)`. Placed immediately after the Version badge so the two version-related links sit together.
- Removed the prose "Most recent: **vX.Y.Z** (Patch) — ..." blurb from the README's `## Release Notes` section. That body is now a single sentence pointing at `release-notes.md` and noting that the link is also pinned at the top.
- Updated the saved memory `feedback_version_bump_checklist.md` to (a) remove the "Most recent" blurb item from the README sub-checklist — it no longer exists, (b) add `docs/build/feature-backlog.md` as an explicit checklist item (caught in this patch when the v1.6.1 entry was found missing), and (c) update the description and "Why" section to reflect three documented historical misses (README, package.json, feature-backlog) instead of two.

**Verified no stale `1.6.1` references remain** in any of the version-bump files (only the historical v1.6.1 release-notes / feature-backlog entries are intentionally retained).

**Build-folder rename for consistency (USER request):**

Renamed all v1.0.0–v1.6.0 folders to follow the `vX.Y.Z-short-description` pattern that v1.6.1 and v1.6.2 already use. Used `git mv` to preserve history. New names (short, 2-5 words, all lowercase, dashes):

| Old | New |
|-----|-----|
| `v1.0.0` | `v1.0.0-initial-public-release` |
| `v1.1.0` | `v1.1.0-welcome-screen-and-bug-fixes` |
| `v1.2.0` | `v1.2.0-security-hardening` |
| `v1.2.1` | `v1.2.1-ui-polish-and-railway-deploy` |
| `v1.3.0` | `v1.3.0-conversation-totals-dashboard` |
| `v1.4.0` | `v1.4.0-advisor-tool-api-catchup` |
| `v1.5.0` | `v1.5.0-code-view-and-syntax-highlighting` |
| `v1.6.0` | `v1.6.0-advisor-opus-4-7-catchup` |

Also updated four stale path references (one comment in `public/styles.css`, three retrospective-path references in tasklist.md files) so post-rename links still resolve.

**Welcome-modal staleness audit (USER request):**

Audited `public/index.html` and `public/app.js` for any welcome-slideshow or About-modal content that might be out of date relative to current app state. **No changes needed.** Findings:

- Welcome version pill (`<span class="welcome-version">`) is populated dynamically via `/api/version` → `package.json`. Will automatically reflect v1.6.2 after this patch.
- Slide 1 / 2 / 3 / 4 content uses generic model names ("Opus", "Sonnet", "Haiku") rather than specific version numbers (e.g., "Opus 4.7"). Intentional design — survives model turnovers without edits.
- Slide 3 references "*Config Models* panel above the chat" — accurate as of v1.4.0.
- Slide 4 test prompts match the README's test prompts.
- About modal: version + last-updated both dynamic via `/api/version`. All other content (tagline, links, contact) is generic and current.
- Welcome-seen localStorage key (`advisor-playground-welcome-seen-v1`) has a `v1` suffix intended to be bumped only when welcome content changes substantively. Not bumping for this patch since welcome content is unchanged.

No app code or markup changes resulted from this audit.

## Files Changed
_List of files that were created, modified, or deleted._

| File | Action |
|------|--------|
| [docs/reference/claude-advisor-tool-updates.md](../../reference/claude-advisor-tool-updates.md) | Modified |
| [.claude/commands/check-advisor-tool-updates.md](../../../.claude/commands/check-advisor-tool-updates.md) | Modified |
| [docs/build/feature-backlog.md](../feature-backlog.md) | Modified |
| [cody.json](../../../cody.json) | Modified |
| [package.json](../../../package.json) | Modified |
| [package-lock.json](../../../package-lock.json) | Modified |
| [README.md](../../../README.md) | Modified |
| [release-notes.md](../../../release-notes.md) | Modified |
| `~/.claude/projects/.../memory/feedback_version_bump_checklist.md` | Modified |
| `docs/build/v1.0.0/` → `docs/build/v1.0.0-initial-public-release/` | Renamed (`git mv`) |
| `docs/build/v1.1.0/` → `docs/build/v1.1.0-welcome-screen-and-bug-fixes/` | Renamed (`git mv`) |
| `docs/build/v1.2.0/` → `docs/build/v1.2.0-security-hardening/` | Renamed (`git mv`) |
| `docs/build/v1.2.1/` → `docs/build/v1.2.1-ui-polish-and-railway-deploy/` | Renamed (`git mv`) |
| `docs/build/v1.3.0/` → `docs/build/v1.3.0-conversation-totals-dashboard/` | Renamed (`git mv`) |
| `docs/build/v1.4.0/` → `docs/build/v1.4.0-advisor-tool-api-catchup/` | Renamed (`git mv`) |
| `docs/build/v1.5.0/` → `docs/build/v1.5.0-code-view-and-syntax-highlighting/` | Renamed (`git mv`) |
| `docs/build/v1.6.0/` → `docs/build/v1.6.0-advisor-opus-4-7-catchup/` | Renamed (`git mv`) |
| `docs/build/v1.4.0-advisor-tool-api-catchup/tasklist.md` | Modified (path reference) |
| `docs/build/v1.5.0-code-view-and-syntax-highlighting/tasklist.md` | Modified (path reference) |
| `docs/build/v1.6.0-advisor-opus-4-7-catchup/tasklist.md` | Modified (path reference) |
| [public/styles.css](../../../public/styles.css) | Modified (comment-only path reference, no CSS rule changes) |
| [docs/build/v1.6.2-documentation-refresh/patch.md](patch.md) | Created |

No functional app code changed ([server.js](../../../server.js), [public/app.js](../../../public/app.js), [public/index.html](../../../public/index.html), [public/vendor/prism/](../../../public/vendor/prism/) all untouched). The single edit to `public/styles.css` is a one-line comment update to keep a path reference accurate after the v1.5.0 folder rename — no CSS rules, selectors, or values were changed.

## Testing Notes
_How to verify the fix or change._

This is a doc-only patch — the app behavior is unchanged. Verification is focused on doc correctness and the version-bump checklist.

**1. Reference doc — open [docs/reference/claude-advisor-tool-updates.md](../../reference/claude-advisor-tool-updates.md) and confirm:**
- A "Scope" block appears after the "Source URLs" list and before "Last reviewed".
- "Last reviewed" shows `2026-05-14`.
- The Platform line reads `Claude API (Anthropic) and Claude Platform on AWS. Not available on Amazon Bedrock, Google Vertex AI, or Microsoft Foundry.`
- The Caching Details `clear_thinking` warning now lists per-model defaults and ends with a "Note for this playground: the warning is effectively moot for every current executor" block.
- The standalone `clear_thinking` section near the bottom shows the same per-model nuance.
- "Suggested System Prompts" now opens with a "When to call (Anthropic's framing)" sub-section before "Timing Guidance".
- The Pricing Snapshot's "Fast mode" subsection title now reads "Opus 4.6 and Opus 4.7" (not "Opus 4.6 only").

**2. Command file — open [.claude/commands/check-advisor-tool-updates.md](../../../.claude/commands/check-advisor-tool-updates.md) and confirm:**
- Step 3 opens with a **Scope.** paragraph before "1. Read `docs/reference/...`".
- The Scope paragraph ends with a pointer to the reference doc's Scope block.

**3. Feature backlog — open [docs/build/feature-backlog.md](../feature-backlog.md) and confirm:**
- A new "## v1.6.1 — Documentation Update (Patch) - 🟢 Completed" section appears after v1.6.0, with a single F41 entry.
- A new "## v1.6.2 — Documentation Refresh (Patch) - 🟢 Completed" section appears after v1.6.1, with F42 and F43 entries.

**4. Version bump — confirm `1.6.2` appears in each of these spots:**
- [cody.json](../../../cody.json) — `version` and `updatedAt: 2026-05-14`.
- [package.json](../../../package.json) — `version` and `lastUpdated: 2026-05-14`.
- [package-lock.json](../../../package-lock.json) — both the top-level `version` and the root-package `"": { "version": ... }` entry.
- [README.md](../../../README.md) — the shields.io version badge `version-1.6.2-blue` and the "Most recent: **v1.6.2**" blurb.
- [release-notes.md](../../../release-notes.md) — a `v1.6.2 — Documentation Refresh (Patch) (2026-05-14)` line at the top of the TOC and a `# v1.6.2 — Documentation Refresh (Patch) - 2026-05-14` entry body below the horizontal rule.

**5. README structural changes — open [README.md](../../../README.md) and confirm:**
- A new **Release Notes** pill appears in the top badge row, immediately after the Version badge, linking to `release-notes.md`. Color is orange to distinguish from the blue version badge.
- The `## Release Notes` section near the bottom is now a single short sentence pointing at `release-notes.md` — no "Most recent: **vX.Y.Z**" prose block.
- Clicking the pill should open `release-notes.md` and the linked file should show the v1.6.2 entry at the top.

**6. Quick app smoke check (optional, but recommended since the About box surfaces the version):**
- Run `npm start` and open `http://localhost:3000`.
- Open the **About** modal (top-nav `?` icon) and confirm the version shown there reflects v1.6.2 (sourced from `package.json` via `/api/version`).
- No need to test chat flow — no app code was touched in this patch.

**7. Sanity-grep:**

```
grep -rn "1\.6\.1" cody.json package.json package-lock.json README.md release-notes.md
```

Expected result: only the historical v1.6.1 entries in `release-notes.md` and unrelated `type-is` library refs in `package-lock.json`. Nothing else.
