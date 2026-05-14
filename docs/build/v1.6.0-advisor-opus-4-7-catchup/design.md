# Version Design Document — v1.6.0
Technical implementation and design guide for v1.6.0: Advisor Tool API Catch-up (Opus 4.7).

## 1. Features Summary

This version brings the playground up to date with Anthropic's April 2026 advisor tool documentation changes and upgrades the Anthropic evaluator judge to Opus 4.7.

| ID  | Feature                              | Description |
|-----|--------------------------------------|-------------|
| F36 | Opus 4.7 advisor + executor upgrade  | Add `claude-opus-4-7` to the executor dropdown. Replace `claude-opus-4-6` with `claude-opus-4-7` as the **only** advisor option (per Anthropic docs). Add `claude-opus-4-7` entry to the `PRICES` table. Update `docs/reference/claude-advisor-tool-updates.md`. |
| F37 | `xhigh` effort level (Opus 4.7 only) | Add `xhigh` as a new effort option. Show/enable it only when executor = `claude-opus-4-7`. Matches the existing Haiku-suppression pattern. Update tooltip and reference doc. |
| F38 | Evaluator judge upgrade to Opus 4.7  | Change `EVAL_MODEL_ANTHROPIC` in `server.js` from `"claude-opus-4-6"` to `"claude-opus-4-7"`. Update Settings modal labels. |
| F39 | Caching-consistency lock             | Lock the Advisor Caching dropdown in the Settings modal after the first successful turn — same pattern as Mode/Executor/Advisor/Effort locking — and document the rationale. |

### Context

Anthropic's advisor tool docs (fetched 2026-04-18) changed three things since our last review on 2026-04-16:

1. **Supported advisor models** — Compatibility table now lists **only `claude-opus-4-7`** as a valid advisor (previously Opus 4.6). Opus 4.6 remains a valid **executor**.
2. **New executor** — `claude-opus-4-7` is now listed as a valid executor (self-pairs with Opus 4.7 as advisor).
3. **New effort level** — The effort docs added **`xhigh`**, available on Opus 4.7 only. Described as *"Extended capability for long-horizon work"* and *"recommended starting point for coding and agentic work"* on Opus 4.7. Sits between `high` and `max`.
4. **Caching-consistency guidance** — Advisor caching section now states: *"Set caching once and leave it for the whole conversation. Toggling it off and on mid-conversation causes cache misses."*

Nothing else changed: beta header, tool type, tool parameters, response variants, error codes, streaming behavior, suggested system prompts, billing/usage fields — all identical to our reference file.

## 2. Technical Architecture Overview

No architectural changes. Same Node.js + Express backend with vanilla JS frontend. Changes are small and localized:

- **Frontend (`public/index.html`):** Add/replace options in the executor, advisor, effort, and evaluator-provider selects. Update the eval-provider setting hint and the `Cost estimates` paragraph (hardcoded model names + prices). Update the effort dropdown's `title` attribute.
- **Frontend (`public/app.js`):** Add `claude-opus-4-7` to the `PRICES` table. Extend `updateEffortAvailability()` to also handle `xhigh` visibility per executor. Add a lock helper for the advisor-caching select modeled after `setEffortLocked` / `setModeLocked`, and wire it into the existing lock-all-on-first-turn flow.
- **Backend (`server.js`):** Change `EVAL_MODEL_ANTHROPIC` string literal only.
- **Docs (`docs/reference/claude-advisor-tool-updates.md`):** Update the model table, effort section, caching section, and "Last reviewed" date. No implementation-tracking checkmarks change semantics.

No new files. No new dependencies. No new endpoints.

## 3. Implementation Notes

### 3.1 F36 — Opus 4.7 advisor + executor upgrade

**Executor dropdown** ([public/index.html:241-245](../../../public/index.html#L241-L245))
Add `claude-opus-4-7` as an option. Keep `claude-opus-4-6` — Anthropic still lists it as a valid executor. Order: Haiku 4.5 → Sonnet 4.6 (selected default) → Opus 4.6 → Opus 4.7.

```html
<option value="claude-haiku-4-5-20251001">claude-haiku-4-5</option>
<option value="claude-sonnet-4-6" selected>claude-sonnet-4-6</option>
<option value="claude-opus-4-6">claude-opus-4-6</option>
<option value="claude-opus-4-7">claude-opus-4-7</option>
```

**Advisor dropdown** ([public/index.html:255-258](../../../public/index.html#L255-L258))
Replace `claude-opus-4-6` with `claude-opus-4-7`. Single option, selected by default.

```html
<option value="claude-opus-4-7" selected>claude-opus-4-7</option>
```

Users who persisted `claude-opus-4-6` in localStorage for the advisor select will, on first render of v1.6.0, find that value is no longer present in the dropdown — the browser falls back to the only remaining option (4.7). No migration code needed; we're collapsing to a single option.

**PRICES table** ([public/app.js:111-118](../../../public/app.js#L111-L118))
Add one entry. Opus 4.7 pricing isn't confirmed in this design doc — the build step must check Anthropic's pricing page and record the actual rates. Placeholder pending confirmation:

```js
"claude-opus-4-7":           { in: TBD, out: TBD },
```

**Cost estimates blurb** ([public/index.html:192](../../../public/index.html#L192))
Update the hardcoded model-name + price list to include Opus 4.7. Same single-line format as existing entries.

**Reference doc** ([docs/reference/claude-advisor-tool-updates.md](../../reference/claude-advisor-tool-updates.md))
Update the "Current API Status" block (executor + advisor model lists), bump "Last reviewed" to today.

### 3.2 F37 — `xhigh` effort level (Opus 4.7 only)

**Dropdown markup** ([public/index.html:247-252](../../../public/index.html#L247-L252))
Add `xhigh` between `high` and `max`, matching Anthropic's documented ordering (`low`, `medium`, `high`, `xhigh`, `max`). Default selection stays `high`.

```html
<option value="low">Low</option>
<option value="medium">Medium</option>
<option value="high" selected>High</option>
<option value="xhigh">xHigh</option>
<option value="max">Max</option>
```

**Tooltip** ([public/index.html:247](../../../public/index.html#L247))
Extend the existing `title`:
> *"Controls thinking depth and overall token spend. Applies to the executor, not the advisor sub-inference. Not supported on Haiku 4.5. xHigh is Opus 4.7 only."*

**Availability logic** ([public/app.js:1027-1048](../../../public/app.js#L1027-L1048))
The current `updateEffortAvailability()` handles two states: normal vs Haiku (inserts/removes a synthetic `"na"` option). Extend it to also manage `xhigh` visibility per executor.

Proposed logic:

```js
const isHaiku = executorEl.value.startsWith("claude-haiku");
const isOpus47 = executorEl.value === "claude-opus-4-7";

// Haiku path is unchanged.

// New: ensure/remove the xhigh option based on executor.
if (isOpus47) {
  ensureXhighOption();
} else {
  // Preserve user's saved value, but if they had xhigh selected on a
  // non-Opus-4.7 executor, demote to "high" (xhigh would be rejected
  // server-side by Anthropic anyway).
  if (effortEl.value === "xhigh") {
    savedEffortValue = "xhigh"; // remember for when they switch back
    effortEl.value = "high";
  }
  removeXhighOption();
}
```

Use the same insert/remove pattern as `ensureNaOption` / `removeNaOption`. Insert xhigh between `high` and `max`.

**State preservation:** a user who selects `xhigh` on Opus 4.7, switches executor to Sonnet 4.6 (xhigh hidden, value demoted to `high`), then switches back to Opus 4.7 should find `xhigh` restored. Mirror the `savedEffortValue` pattern already used for Haiku.

**Why not just hide the option:** some users copy/paste saved settings or use localStorage to persist state. Silently demoting on executor change avoids sending `"xhigh"` to the API against a non-Opus-4.7 executor and getting a 400.

**Cross-concern with effort-lock:** `setEffortLocked` disables the whole dropdown once locked. No special handling needed — if the user locked on Opus 4.7 with xhigh selected, the dropdown stays xhigh and disabled. Fine.

**Reference doc** — Update the Effort section to document `xhigh`, its Opus 4.7-only availability, and the note that Opus 4.7 respects effort levels more strictly than 4.6.

### 3.3 F38 — Evaluator judge upgrade to Opus 4.7

**Server** ([server.js:352](../../../server.js#L352))
```js
const EVAL_MODEL_ANTHROPIC = "claude-opus-4-7";
```

**Settings modal label + hint** ([public/index.html:147](../../../public/index.html#L147), [public/index.html:150](../../../public/index.html#L150))
Replace both mentions of `claude-opus-4-6` with `claude-opus-4-7`.

```html
<span class="setting-hint">Anthropic uses <code>claude-opus-4-7</code>. OpenAI uses <code>gpt-5.4</code>. Model names are hardcoded — update them in <code>server.js</code> when new models ship.</span>
...
<option value="anthropic" selected>Anthropic · claude-opus-4-7</option>
```

No dropdown option for 4.6 — per the product decision, the judge always uses the best available Anthropic model.

### 3.4 F39 — Caching-consistency lock

The Advisor Caching dropdown lives in the **Settings modal** ([public/index.html:95-105](../../../public/index.html#L95-L105)), not in the Config Models panel. So the lock mechanism can't be part of the config-row CSS pattern used for Mode/Executor/Advisor/Effort. Instead, add a dedicated lock helper that disables the `<select>` and surfaces a tooltip on the wrapping element.

**Lock helper** (new in `public/app.js`)
```js
const CACHING_TITLE_DEFAULT = "...existing hint text...";
const CACHING_TITLE_LOCKED =
  "Caching is locked once a conversation starts. Toggling mid-conversation causes advisor-side cache misses. Click ＋ to start a new chat to change it.";

function setCachingLocked(locked) {
  cachingEl.disabled = locked;
  cachingEl.title = locked ? CACHING_TITLE_LOCKED : CACHING_TITLE_DEFAULT;
  // Also style the wrapping label/setting container so it visually matches
  // the other locked rows (greyed out, cursor: not-allowed).
}
```

**Hook into the first-turn lock**
Find the existing call site where `setModeLocked(true)`, `setExecutorLocked(true)`, etc. are invoked on first successful turn. Add `setCachingLocked(true)` alongside. Same for the unlock path triggered by the ＋ new-chat button.

**Settings-hint update** ([public/index.html:98](../../../public/index.html#L98))
Append to the existing hint: *"Set once and leave — changing mid-conversation causes cache misses."*

**Reference doc** — Add the "Keep it consistent" warning to the Caching Details section alongside the existing `clear_thinking` warning.

## 4. Other Technical Considerations

### 4.1 Backward compatibility with persisted settings

Users with prior sessions may have `claude-opus-4-6` persisted in localStorage for the advisor select. Since 4.6 is no longer an option in the advisor dropdown, the browser will fall back to the remaining option (4.7) on first render. Acceptable — users are opted into the upgrade silently. No migration code needed.

For the evaluator-provider select, persisted value `anthropic` maps to whatever `EVAL_MODEL_ANTHROPIC` currently points at, so no change needed.

### 4.2 Compare modes + xhigh compatibility

Effort applies uniformly to all comparison branches in a turn. With the new advisor set (advisor = Opus 4.7 only):

- `advisor` mode: single branch on executor. xhigh OK when executor = Opus 4.7.
- `advisor_exec` mode: two branches, both on executor. xhigh OK when executor = Opus 4.7.
- `advisor_all` mode: three branches (executor, executor, advisor-solo Opus 4.7). xhigh OK only when executor = Opus 4.7 — otherwise two of the three branches would reject xhigh.

Since `xhigh` is gated on executor = Opus 4.7, every branch in every mode runs on a model that accepts xhigh. No per-branch effort overrides needed.

### 4.3 What about the advisor sub-inference?

Effort is a top-level API request parameter. It applies to the **executor's** inference. The advisor sub-inference runs with its own defaults — top-level effort does not propagate. The existing effort-tooltip wording should make this explicit (see F37 tooltip update). No server-side handling changes.

### 4.4 Pricing confirmation

`claude-opus-4-7` pricing must be read from Anthropic's pricing page (https://anthropic.com/pricing) during implementation. Do not assume it matches Opus 4.6's $15/$75 per MTok. Update both the `PRICES` table in `public/app.js` and the cost-estimates blurb in `public/index.html:192`.

## 5. Open Questions

1. **Opus 4.7 pricing** — unconfirmed at design time. Implementation step must resolve via Anthropic's pricing page.
2. **Should the advisor dropdown keep `claude-opus-4-6` as an undocumented option?** — Decided: **no**. Per the conversation, stick to what the API docs say. One advisor option: Opus 4.7.
3. **Should the judge dropdown also offer Opus 4.6?** — Decided: **no**. Judge always uses the best available Anthropic model (Opus 4.7).
4. **Does the caching lock need a visual treatment on the Settings modal row** (greyed-out label, muted text) to match the config-row locked styling? — TBD during implementation. Minimum is `disabled` + tooltip; nice-to-have is visual parity with config-row locks.
