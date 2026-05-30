# Version Design Document : v1.8.0 — Advisor Tool API Catch-up (Opus 4.8)
Technical implementation and design guide for the upcoming version.

## 1. Features Summary
_Overview of features included in this version._

This version brings the playground current with Anthropic's advisor tool docs as of the 2026-05-29 review. The driver is **Claude Opus 4.8 (`claude-opus-4-8`)**, now Anthropic's default advisor model and a new executor option.

The structural decision: introduce a single **`public/models.json`** registry as the source of truth for every model fact, read by **both** the client (`public/app.js`, via `fetch`) and the server (`server.js`, via file read at startup). Roles, label, provider, price, effort support, and advisor pairings all live there. The executor / advisor / evaluator dropdowns, the price lookup, the executor→advisor gray-out, the effort options, and the server's judge selection all become *derived* from that one file. After this version, adding/retiring a model or changing any of its facts is a one-file data edit with no code change in either runtime.

| ID  | Feature | Priority |
|-----|---------|----------|
| F54 | `public/models.json` + client bootstrap; derive executor/advisor dropdowns, `PRICES`, labels; add Opus 4.8, preselect 4.8 as advisor | High |
| F55 | Executor→advisor pairing guard, driven by `MODELS[exec].advisors` (gray out invalid advisors + dynamic unavailability hint) | High |
| F56 | Effort options derived from `MODELS[exec].effort`; collapse hardcoded helpers into a generic, model-agnostic state machine | High |
| F57 | `eval` role + `provider`: server reads `models.json` and derives the judge model; client derives the eval-provider dropdown; bump Anthropic judge to Opus 4.8; retire `EVAL_MODEL_*` constants | Medium |
| F58 | Pricing + fast-mode refresh (reference doc) | Medium |
| F59 | Advisor conciseness guidance update (reference doc) | Medium |
| F60 | Tool-use overhead per-model correction (reference doc) | Low |
| F61 | "Last reviewed" date + README/version-bump consistency | Medium |

**Governing API rule (from Anthropic's docs):** _"The advisor must be at least as capable as the executor."_ Rather than encode that as a capability-rank assumption (which Anthropic isn't bound to keep monotonic), `models.json` stores the **explicit** valid-advisor list per executor — a direct 1:1 mirror of Anthropic's published compatibility table:

| Executor | Valid advisors |
|----------|----------------|
| Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) | Opus 4.8, Opus 4.7 |
| Claude Sonnet 4.6 (`claude-sonnet-4-6`) | Opus 4.8, Opus 4.7 |
| Claude Opus 4.6 (`claude-opus-4-6`) | Opus 4.8, Opus 4.7 |
| Claude Opus 4.7 (`claude-opus-4-7`) | Opus 4.8, Opus 4.7 |
| Claude Opus 4.8 (`claude-opus-4-8`) | Opus 4.8 only |

Invalid pairs are rejected server-side with `400 invalid_request_error`; the guard (F55) makes the bad pairing un-selectable so that error never fires.

**Scope notes:** OpenAI evaluator (`gpt-5.5`) pricing/model is unchanged — it just moves into `models.json` as an `eval`-only entry. Opus 4.6 is **kept** as an executor (still documented/supported); only its obsolete "grace period as advisor" language is removed from the reference doc. The eval judge is conceptually the playground's own concern (not part of the advisor tool API) — it shares the file as a storage convenience but is tagged distinctly via the `eval` role + `provider`, preserving the separation.

## 2. Technical Architecture Overview
_High-level technical structure that supports all features in this version._

No change to the client-server monolith (vanilla-JS SPA in `public/`, stateless Express `server.js`). The structural change: model facts move out of static HTML `<option>`s, the inline `PRICES` table, the per-model `if/else` branches, and the `EVAL_MODEL_*` server constants into **one JSON file both runtimes read**.

### `public/models.json` (new — single source of truth)

Stored under `/public` so the client can `fetch('/models.json')` (same convention as the existing `public/sample-prompts.json`) and the server can read the same physical file from disk. JSON has no comments, so provenance/maintenance notes live in this design doc and the reference doc. Shape:

```json
{
  "claude-haiku-4-5-20251001": {
    "provider": "anthropic", "label": "claude-haiku-4-5-20251001",
    "aliases": ["claude-haiku-4-5"],
    "price": { "in": 1.0, "out": 5.0 },
    "executor": true, "advisor": false, "eval": false,
    "effort": [],
    "advisors": ["claude-opus-4-7", "claude-opus-4-8"]
  },
  "claude-sonnet-4-6": {
    "provider": "anthropic", "label": "claude-sonnet-4-6",
    "price": { "in": 3.0, "out": 15.0 },
    "executor": true, "advisor": false, "eval": false,
    "effort": ["low","medium","high","max"],
    "advisors": ["claude-opus-4-7", "claude-opus-4-8"]
  },
  "claude-opus-4-6": {
    "provider": "anthropic", "label": "claude-opus-4-6",
    "price": { "in": 5.0, "out": 25.0 },
    "executor": true, "advisor": false, "eval": false,
    "effort": ["low","medium","high","max"],
    "advisors": ["claude-opus-4-7", "claude-opus-4-8"]
  },
  "claude-opus-4-7": {
    "provider": "anthropic", "label": "claude-opus-4-7",
    "price": { "in": 5.0, "out": 25.0 },
    "executor": true, "advisor": true, "eval": false,
    "effort": ["low","medium","high","xhigh","max"],
    "advisors": ["claude-opus-4-7", "claude-opus-4-8"]
  },
  "claude-opus-4-8": {
    "provider": "anthropic", "label": "claude-opus-4-8",
    "price": { "in": 5.0, "out": 25.0 },
    "executor": true, "advisor": true, "eval": true,
    "effort": ["low","medium","high","xhigh","max"],
    "advisors": ["claude-opus-4-8"]
  },
  "gpt-5.5": {
    "provider": "openai", "label": "gpt-5.5",
    "price": { "in": 5.0, "cachedIn": 0.5, "out": 30.0 },
    "executor": false, "advisor": false, "eval": true
  }
}
```

Derivations:
- **Executor dropdown** = entries with `executor: true` (object key order = dropdown order).
- **Advisor dropdown** = entries with `advisor: true`.
- **Eval-provider dropdown** = entries with `eval: true`, labelled `"{Provider} · {label}"` (e.g. `Anthropic · claude-opus-4-8`, `OpenAI · gpt-5.5`).
- **`PRICES`** = built from `price` (+ `aliases`), replacing the hand-written table.
- **Advisor gray-out** = `MODELS[executor].advisors`.
- **Effort options** = `MODELS[executor].effort` (empty ⇒ n/a state).
- **Server judge model** = the `eval: true` entry whose `provider` matches the request's `evalProvider`.

`label` equals the model ID for every entry in this version (no visible UI change); the field exists so friendly names become a data-only edit later. `value` (the object key) is always the raw API model ID — what we send and what Code View echoes.

## 3. Implementation Notes
_Shared technical considerations across all features in this version._

### F54 — `models.json` + client bootstrap + derived dropdowns / prices / labels
- Create `public/models.json` with the content above (includes the new `claude-opus-4-8` and the migrated `gpt-5.5`).
- **Client bootstrap (core, not optional).** `app.js` must `await fetch('/models.json')` and parse it **before** generating dropdowns and before `applySettings(loadSettings())` (currently line 906). Sequence: fetch+parse `MODELS` → generate executor/advisor/eval options → `applySettings` (restores persisted selections via `setSelectIfValid`) → `updateEffortAvailability()` + `updateAdvisorAvailability()`. Today most of `app.js` runs synchronously at module load; this likely means wrapping init in an `async` bootstrap function.
- **Failure handling:** `models.json` is load-bearing, so it cannot degrade silently like `sample-prompts.json`. On fetch/parse failure, show a clear error state (e.g. a banner / disabled config panel reading "Couldn't load model configuration"). Do **not** fall back to a hardcoded registry — that reintroduces the second source of truth this feature eliminates.
- **Generate the executor + advisor `<select>` options from `MODELS`**, replacing the static `<option>` lists in `index.html` (executor lines 242–245, advisor lines 256–259). Leave the empty `<select>` shells as mount points. Defaults: executor = `claude-sonnet-4-6`, advisor = `claude-opus-4-8`.
- **Derive `PRICES`** from `MODELS` (lines 111–118 go away): walk entries, register `price` under the key and each `aliases` entry. `priceFor()` (line 124) keeps reading the derived map so cost math is untouched.

### F55 — Executor→advisor pairing guard (mandatory new logic)
Add `updateAdvisorAvailability()`, modeled on `updateEffortAvailability()`:

```js
let savedAdvisorValue = advisorEl.value;
advisorEl.addEventListener("change", () => { savedAdvisorValue = advisorEl.value; });

function updateAdvisorAvailability() {
  if (advisorLocked) return;                       // don't fight the first-turn lock
  const valid = MODELS[executorEl.value]?.advisors ?? allAdvisorValues;   // fail-open if unknown
  for (const opt of advisorEl.options) opt.disabled = !valid.includes(opt.value);
  if (!valid.includes(advisorEl.value)) {
    advisorEl.value = valid.includes(savedAdvisorValue) ? savedAdvisorValue : valid[valid.length - 1];
    saveSettings();
  }
  // dynamic unavailability hint (see below)
}
```

- Gray out (`option.disabled`, not removal) any advisor invalid for the current executor; restore the last explicit valid choice or fall back to the highest valid advisor.
- Wire into the executor `change` listener (line 1127 calls only `updateEffortAvailability` today; call both), call once on init after settings restore, and bail while `advisorLocked`.
- **Unavailability hint (resolved open question).** Mirror the effort/Haiku pattern (`EFFORT_TITLE_HAIKU` set as a `title` in `updateEffortAvailability`). When the executor restricts the advisor set, set `advisorRowEl.title` (alongside the `ADVISOR_TITLE_LOCKED` mechanism, lines 1177–1186) to a hint **built from `MODELS`** — name the executor's `label` and the advisor(s) it supports, e.g. `"claude-opus-4-8 can only use claude-opus-4-8 as its advisor."` Registry-derived so it stays correct as models change. Clear it when unrestricted; don't clobber the locked title.

### F56 — Effort options from the registry + generalized state machine
- **Remove** `ensureXhighOption`/`removeXhighOption`/`ensureNaOption`/`removeNaOption` (lines 1040–1069) and the `isHaiku`/`isOpus47` branches in `updateEffortAvailability` (lines 1083–1103). Replace with a generic `rebuildEffortOptions(allowed)` that renders exactly `MODELS[exec].effort` in canonical order (low→medium→high→xhigh→max), or a disabled "n/a" placeholder when empty.
- **Keep** the stateful behavior, made model-agnostic: demotion/restore test becomes `allowed.includes(savedEffortValue)` (not `=== "xhigh" && !isOpus47`); fallback prefers `high`, else the first allowed level. `effortEl.disabled = !allowed.length || effortLocked`. Preserve the patch-save (lines 1117–1119).
- `index.html` line 248: update the effort `<select>` `title` to a model-agnostic phrasing (the registry now governs availability).
- Reference doc: effort-availability table (`xhigh`: Opus 4.7 + Opus 4.8; `max`: add Opus 4.8) + Opus 4.8 per-level note (adaptive thinking only, `budget_tokens` returns 400, default `high`, start at `xhigh` for coding/agentic).

### F57 — `eval` role + `provider`: server + client derive the judge from `models.json`
- **Server:** at startup, read + parse `public/models.json` (`fs.readFileSync` + `JSON.parse`, fail-fast if missing/malformed). Replace `EVAL_MODEL_ANTHROPIC` / `EVAL_MODEL_OPENAI` (lines 384–385) with a lookup: given the request's `evalProvider`, select the `eval: true` entry whose `provider` matches. Validate the provider resolves to exactly one eval model (guard against ambiguity). The Anthropic judge thereby becomes Opus 4.8 via data (`eval: true` on the 4.8 entry, `false` on 4.7).
- **Client:** generate the eval-provider dropdown options (`index.html` lines 150–151) from `eval: true` entries, labelled `"{Provider} · {label}"`. Keep the dropdown **value = provider** so `updateOpenAIKeyVisibility` (which keys on provider) and the existing eval request payload are unaffected. Update the Settings hint (line 147) — or better, derive its model names from `MODELS` too.
- Net: `EVAL_MODEL_*` constants and the hardcoded judge `<option>`s are gone; changing the judge later is a `models.json` edit.

### F58 / F59 / F60 / F61 — reference-doc + release mechanics
- **F58:** Pricing Snapshot — add Opus 4.8 row ($5 / $25, same cache + batch as the Opus tier). Fast mode — Opus 4.8 = **$10 in / $50 out** (~2×); Opus 4.6/4.7 stay **$30 / $150** (~6×); make the distinct multipliers explicit.
- **F59:** "Suggested System Prompts" — replace the third-person "Conciseness Instruction" with Anthropic's current user-message, second-person technique: `(Advisor: please keep your guidance under 80 words …)`; note it raised consult frequency but netted lower total cost.
- **F60:** "Tool-use system-prompt overhead" — replace the flat 346/313 with per-model values (auto·none / any·tool): Opus 4.8 290/410, Opus 4.7 675/804, Opus 4.6 497/589, Sonnet 4.6 497/589, Haiku 4.5 496/588. Keep "informational only."
- **F61:** Reference-doc "Last reviewed" → 2026-05-29; current-API-status + compat table → 5-row matrix; remove obsolete Opus 4.6 "grace period as advisor" language; sweep README for `claude-opus-4-7` advisor/judge mentions to update; standard version bump across `cody.json`, `package.json` (+`lastUpdated`), `package-lock.json`, README version badge, `release-notes.md`, build folder.

## 4. Other Technical Considerations
_Shared any other technical information that might be relevant to building this version._

- **This is a refactor riding with a feature, now spanning both runtimes.** Dropdowns, prices, effort options, *and* the server judge selection stop being hand-written and become derived from `models.json`. The behavior is mostly unchanged (pairing guard aside); the test surface is wide because the data plumbing changed on both sides. Accepted deliberately — no live users, ideal time.
- **Manual verification checklist:**
  - _New behavior:_ (1) Opus 4.8 executor grays out 4.7 advisor + flips selection to 4.8, with the dynamic hint; (2) switching 4.8 → Sonnet re-enables 4.7 and restores prior choice; (3) non-4.8 executors allow both advisors; (4) `xhigh` shows for Opus 4.7 **and** 4.8, hidden for Sonnet/Opus 4.6, "n/a"+disabled for Haiku; (5) Anthropic judge runs on Opus 4.8 and OpenAI judge on gpt-5.5, both derived from `models.json`; labels/hint read correctly; cost shows.
  - _Bootstrap / shared file:_ (6) client renders correct dropdowns / order / defaults after the async fetch; (7) `models.json` fetch failure shows the error state (no silent degrade, no hardcoded fallback); (8) **init ordering** — persisted localStorage restores correctly because options generate after fetch but before `applySettings`; (9) server fails fast on missing/malformed `models.json`; (10) server resolves the right judge model per provider.
  - _Regression on derived plumbing:_ (11) cost renders for every model incl. the Haiku undated alias and gpt-5.5; (12) stale persisted value degrades gracefully via `setSelectIfValid`; (13) effort demotion/restore still works (xhigh on 4.7 → Sonnet demotes to high → back restores xhigh); (14) locking after first turn disables all four selectors and the guards don't fight it; ＋ resets; (15) a full turn in each mode still traces/totals/deltas; (16) Code View snippets reflect selected models incl. 4.8.
- **No `server.js` chat-path changes.** The server still forwards the client's executor, advisor model, and effort verbatim; the only new server responsibility is loading `models.json` and resolving the judge model from it.

## 5. Open Questions
_Unresolved technical or product questions affecting this version._

- **All resolved.** advisor default = Opus 4.8; 4.7 grayed (not removed) when executor = 4.8 with a dynamic registry-built hint; pairing stored as explicit per-executor lists (no rank assumption); single `public/models.json` read by both runtimes; client async bootstrap with a hard error state on failure; `label` field added but equal to `value`; `eval` role + `provider` make the judge data-driven (Anthropic judge → Opus 4.8); Opus 4.6 kept as executor.
