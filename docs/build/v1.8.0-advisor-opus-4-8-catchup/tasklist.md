# Version Tasklist – v1.8.0 — Advisor Tool API Catch-up (Opus 4.8)
This document outlines all the tasks to work on to deliver this particular version, grouped by phases.

As each task is accomplished, this document's status is updated accordingly.

| Status |      |
|--------|------|
| 🔴 | Not Started |
| 🟡 | In Progress |
| 🟢 | Completed |

---

## Phase 1 — `models.json` Foundation & Client Bootstrap (F54)
Establish the single source of truth and make the client derive its config from it. Everything else depends on this.

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| T1 | Create `public/models.json` | Author the registry per design §2: all 5 Claude executors/advisors + `gpt-5.5`, with `provider`, role flags (`executor`/`advisor`/`eval`), `label` (= key), `price`, `aliases` (Haiku undated), `effort`, `advisors`. Include new `claude-opus-4-8` (executor+advisor+eval) and migrate `gpt-5.5` (eval-only, OpenAI). | None | 🟢 Completed | AGENT |
| T2 | Async bootstrap in `app.js` | Wrap init so the app `await`s `fetch('/models.json')` + parse into `MODELS` before any UI generation. Sequence: fetch → generate options → `applySettings(loadSettings())` → `updateEffortAvailability()` + `updateAdvisorAvailability()`. | T1 | 🟢 Completed | AGENT |
| T3 | Hard error state on load failure | If `models.json` fetch/parse fails, show a clear error (banner / disabled config panel: "Couldn't load model configuration"). No silent degrade, no hardcoded fallback registry. | T2 | 🟢 Completed | AGENT |
| T4 | Generate executor + advisor dropdowns from `MODELS` | Replace static `<option>` lists in `index.html` (executor 242–245, advisor 256–259) with empty `<select>` mount points; populate from entries where `executor`/`advisor` is true, in key order. Defaults: executor `claude-sonnet-4-6`, advisor `claude-opus-4-8`. | T2 | 🟢 Completed | AGENT |
| T5 | Derive `PRICES` from `MODELS` | Remove the hand-written `PRICES` table (app.js 111–118); build it from `price` + `aliases`. Keep `priceFor()` (124) reading the derived map. | T2 | 🟢 Completed | AGENT |

## Phase 2 — Executor→Advisor Pairing Guard (F55)
Enforce Anthropic's compatibility matrix client-side so invalid pairs are never sent.

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| T6 | `updateAdvisorAvailability()` | New function: gray out (`option.disabled`) advisors not in `MODELS[exec].advisors`; track `savedAdvisorValue`; on invalid current selection restore last valid choice else fall back to highest valid; `saveSettings()` on side-effect. Respect `advisorLocked`. | T4 | 🟢 Completed | AGENT |
| T7 | Wire guard into executor change + init | Executor `change` listener (line 1127) calls both `updateEffortAvailability` and `updateAdvisorAvailability`; call once on init after settings restore. | T6 | 🟢 Completed | AGENT |
| T8 | Dynamic unavailability hint | Set `advisorRowEl.title` from `MODELS` when the executor restricts advisors (name executor `label` + supported advisor(s)); mirror the effort/Haiku title pattern; clear when unrestricted; don't clobber the locked title. | T6 | 🟢 Completed | AGENT |

## Phase 3 — Effort Options from Registry (F56)
Make the effort dropdown data-driven and model-agnostic.

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| T9 | `rebuildEffortOptions(allowed)` | Remove `ensureXhighOption`/`removeXhighOption`/`ensureNaOption`/`removeNaOption` (1040–1069) and the `isHaiku`/`isOpus47` branches; render exactly `MODELS[exec].effort` in canonical order (low→medium→high→xhigh→max), or disabled "n/a" when empty. | T2 | 🟢 Completed | AGENT |
| T10 | Generalize the effort state machine | Demotion/restore test → `allowed.includes(savedEffortValue)`; fallback prefer `high` else first allowed; `effortEl.disabled = !allowed.length || effortLocked`; preserve patch-save (1117–1119). | T9 | 🟢 Completed | AGENT |
| T11 | Model-agnostic effort `title` | Update the effort `<select>` `title` (index.html 248) to phrasing that doesn't name specific models. | T9 | 🟢 Completed | AGENT |

## Phase 4 — Data-Driven Evaluator Judge (F57)
Retire the hardcoded judge constants; resolve from `models.json` on both sides.

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| T12 | Server reads `models.json` at startup | `fs.readFileSync` + `JSON.parse` (fail-fast if missing/malformed) in `server.js`. | T1 | 🟢 Completed | AGENT |
| T13 | Resolve judge from `eval`+`provider` | Replace `EVAL_MODEL_ANTHROPIC`/`EVAL_MODEL_OPENAI` (384–385) with a lookup: the `eval: true` entry whose `provider` matches `evalProvider`; validate it resolves to exactly one. Anthropic judge → Opus 4.8 via data. | T12 | 🟢 Completed | AGENT |
| T14 | Derive eval-provider dropdown + hint | Generate eval `<option>`s (index.html 150–151) from `eval: true` entries, labelled `"{Provider} · {label}"`, value = provider (so `updateOpenAIKeyVisibility` is unaffected); update/derive the Settings hint (147). | T2 | 🟢 Completed | AGENT |

## Phase 5 — Reference Doc & Release Mechanics (F58–F61)
Documentation truth-up and version bump.

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| T15 | Reference doc — API surface | `claude-advisor-tool-updates.md`: current-API-status + 5-row compat table; remove obsolete Opus 4.6 "grace period as advisor" language; effort-availability table (`xhigh`: 4.7+4.8; `max`: add 4.8) + Opus 4.8 per-level note. | None | 🟢 Completed | AGENT |
| T16 | Reference doc — pricing & fast mode (F58) | Add Opus 4.8 Pricing Snapshot row ($5/$25); fast mode Opus 4.8 = $10/$50 (~2×) vs Opus 4.6/4.7 $30/$150 (~6×), multipliers explicit. | None | 🟢 Completed | AGENT |
| T17 | Reference doc — conciseness (F59) | Replace third-person "Conciseness Instruction" with the user-message, second-person technique (`(Advisor: please keep your guidance under 80 words …)`); note consult-frequency/cost effect. | None | 🟢 Completed | AGENT |
| T18 | Reference doc — tool-use overhead (F60) | Replace flat 346/313 with per-model values (Opus 4.8 290/410, 4.7 675/804, 4.6 497/589, Sonnet 4.6 497/589, Haiku 4.5 496/588); keep "informational only." | None | 🟢 Completed | AGENT |
| T19 | "Last reviewed" + README (F61) | Reference doc "Last reviewed" → 2026-05-29; sweep README for `claude-opus-4-7` advisor/judge mentions to update. | T15, T16, T17, T18 | 🟢 Completed | AGENT |
| T20 | Version bump | Per checklist: `cody.json`, `package.json` (+`lastUpdated`), `package-lock.json`, README version badge, `release-notes.md`, build folder. | All code + doc tasks | 🟢 Completed | AGENT |

## Phase 6 — Verification
Manual test pass (design §4). Run before declaring the version done.

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| T21 | New-behavior tests | §4 items 1–5: pairing gray-out + hint + flip; switch-back restore; non-4.8 allows both; `xhigh` per model; judges run on Opus 4.8 / gpt-5.5 with correct labels + cost. | T1–T14 | 🔴 Not Started | USER |
| T22 | Bootstrap / shared-file tests | §4 items 6–10: dropdowns render after fetch; load-failure error state; init ordering / persisted restore; server fail-fast on bad file; correct judge per provider. | T1–T14 | 🔴 Not Started | USER |
| T23 | Regression tests | §4 items 11–16: cost for every model incl. Haiku alias + gpt-5.5; stale persisted value degrades gracefully; effort demotion/restore; locking + ＋ reset; full turn each mode; Code View reflects 4.8. | T1–T14 | 🔴 Not Started | USER |
