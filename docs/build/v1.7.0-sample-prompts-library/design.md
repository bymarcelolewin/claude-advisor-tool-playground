# Version Design Document : v1.7.0 — Sample Prompts Library
Technical implementation and design guide for the upcoming version.

## 1. Features Summary
_Overview of features included in this version._

v1.7.0 adds a curated, in-app library of sample prompts so users don't have to guess what kinds of prompts demonstrate the advisor tool well. The library surfaces two categories side-by-side — prompts that **should** trigger the advisor (substantive coding/architecture work) and prompts that **shouldn't** (single-step factual or recipe-style requests) — so the asymmetry between "advisor fires" and "advisor doesn't fire" is visible at a glance.

Design is locked via the interactive mockup at [mockups/option-c-inline-with-see-all.html](mockups/option-c-inline-with-see-all.html). All visual decisions (colors, spacing, complexity meter, modal sizing) are validated there.

| ID  | Feature | Description |
|-----|---------|-------------|
| F45 | Sample prompts JSON + loader | New `public/sample-prompts.json` (8 seed prompts) fetched once on client load. Schema: `{ title, prompt, shouldTriggerAdvisor: bool, complexity: "quick" \| "standard" \| "heavy" }`. Defensive — if fetch fails or JSON is malformed, the feature degrades silently. |
| F46 | Empty-state pill row | Inline container above the chat input showing 5 featured prompt pills + a `+ See all (N)` pill. Each pill has a 🟢/🟡 dot, title, and a hover tooltip (~250ms delay) showing the full prompt body + a triggers/skips badge. Click a pill = insert into textarea (or fire confirm-replace if textarea already has content). Header has a `▾` collapse button. |
| F47 | Collapsed-state single pill | After the first user message is sent (or after manual `▾` collapse), the full row is replaced by a single small `💡 Sample prompts ▾` pill. Click it = re-expands the row. Persists for the rest of the conversation; resets to expanded state on **New Chat**. |
| F48 | "See all" modal | Centered modal opened from the `+ See all (N)` pill. Fixed height `min(640px, 85vh)` — content scrolls inside; modal does not jump when filters are applied. Three filter chips: `All` / `🟢 Triggers advisor` / `🟡 Skips advisor`. Body is a list of prompt cards. Each card shows: 3-bar complexity meter (left of title), title, badge (🟢/🟡), `+` insert button (22px square in the actions area), and a 2-line-clamped body. **Click anywhere on the card** = expand the body in-place. **Click `+`** = insert into textarea + close modal. Esc closes, click-outside closes, `×` closes. Footer shows `N of M prompts` count and the click-hint. |
| F49 | Confirm-replace mini-modal | When inserting a prompt would overwrite existing textarea content, show a small centered confirm: "Replace current message?" with **Keep my text** (ghost) and **Replace** (primary) buttons. Esc cancels. Same dark-theme styling as the existing New-Chat confirm modal — reuse if possible. |
| F50 | Complexity meter | 3-bar indicator rendered to the left of each prompt's title in the modal. `quick` = 1 muted-gray bar, `standard` = 2 accent-blue bars, `heavy` = 3 orange bars. Hover tooltip explains the tier and gives a directional token range (e.g., "Heavy — multi-part task, high token spend (~10–25k tokens total). 3× this in compare-all-three mode."). Documented **as not a real cost estimate**. |
| F51 | Welcome slide update | Update Slide 4 of the welcome slideshow ("Try one of these prompts") to point users at the new sample-prompts pill row instead of listing 2 prompts inline. Reduces duplication and surfaces the new feature on first launch. |

## 2. Technical Architecture Overview
_High-level technical structure that supports all features in this version._

**No new architectural concepts.** Everything stays on the existing stack: Node + Express server (untouched) and vanilla-JS frontend served from `/public`.

- **Data layer:** `public/sample-prompts.json` is served as a static asset by Express's existing static-file middleware. The frontend fetches it once on page load with a plain `fetch("/sample-prompts.json")`. No new API endpoint, no server-side parsing, no caching layer. This mirrors the existing pattern used by `/api/version` (read from `package.json`) and by Prism vendor assets in `public/vendor/prism/`.
- **State:** Two new pieces of client-side state — `samplePrompts` (the loaded prompt array) and `samplePromptsCollapsed` (boolean — true if the row is in collapsed state). Both live in JS memory only; `samplePromptsCollapsed` is reset when a new conversation starts.
- **Persistence:** None. Sample prompts are static data baked into the repo. No localStorage involvement.
- **Rendering:** New DOM section inserted into the existing chat-pane markup (`public/index.html`), styled in `public/styles.css`, wired in `public/app.js`. Reuses the existing modal scaffolding pattern (the Code View, Settings, About, Welcome, and Confirm modals all share the same overlay/card/close structure).
- **Build step:** None. Consistent with the rest of the app — direct edits to `index.html`, `app.js`, `styles.css`.

```
┌─────────────────────────────────────────────────────────┐
│ Browser                                                  │
│                                                          │
│  on page load:                                           │
│    fetch("/sample-prompts.json") ─┐                      │
│                                    ▼                      │
│                            samplePrompts (JS memory)     │
│                                    ▼                      │
│   renders ───→ pill row (above chat input)               │
│   renders ───→ "See all" modal (hidden until invoked)    │
│                                    ▼                      │
│   user click on pill or card "+"                          │
│     ─→ insertPromptIntoTextarea() with confirm-replace   │
└─────────────────────────────────────────────────────────┘
```

## 3. Implementation Notes
_Shared technical considerations across all features in this version._

### Where new code lives

- **`public/sample-prompts.json`** — new file. Sole source of seed prompts.
- **`public/index.html`** — three additions:
  1. `<div class="sample-prompts-area">` container inserted just above the existing `.chat-input-row` in the chat pane
  2. `<div id="sample-prompts-modal" class="sample-prompts-modal">` modal markup, sibling of the existing Code View / About / Settings modals
  3. Reuse the existing `#confirm-modal` for the confirm-replace flow — do not create a new one
- **`public/styles.css`** — new section appended to the bottom (matching the v1.5.0 Code View section's organization): `/* === Sample Prompts (v1.7.0) === */`. Uses existing CSS variables (`--accent`, `--triggers` is new but matches the v1.6.0 `#20c05b`, `--skips` is new = `#e0b25c` matching `--eval-accent`). No new dependencies, no Prism integration.
- **`public/app.js`** — new section near the end (or near the existing modal handlers): seed prompts loader, pill-row renderer, modal renderer with filter state, insert logic with confirm-replace integration, collapse/expand state machine, and a hook into the existing first-send / New-Chat events to flip the collapsed state.

### State integration with existing app logic

- **First-send hook:** The frontend already has a clear "first message just got sent" inflection point — wherever the Mode dropdown gets locked. Wire the row-collapse into that same path so the two pieces of UI state stay in sync.
- **New Chat hook:** The existing `+ New Chat` button already resets a number of state pieces (conversation history, mode lock, caching lock, etc.). Add `samplePromptsCollapsed = false` to that reset path so the row re-expands on a fresh conversation.
- **Manual `▾` collapse:** Independent of first-send — even before sending a message, the user can manually collapse the row if it's in the way. Re-clicking the collapsed pill expands it back. This is purely UI state; no other app behavior changes.

### Insert logic + confirm-replace

The confirm-replace flow is the trickiest part. Pseudocode:

```js
function insertSamplePrompt(text, { fromModal = false } = {}) {
  const current = chatInputEl.value.trim();
  if (current.length === 0) {
    return doInsert(text, fromModal);
  }
  // Reuse the existing confirm modal pattern
  showConfirmModal({
    title: "Replace current message?",
    body: "You have text in the chat input. Inserting this prompt will replace it. Continue?",
    okLabel: "Replace",
    cancelLabel: "Keep my text",
    onOk: () => doInsert(text, fromModal)
  });
}
```

The existing confirm modal in `public/index.html` (`#confirm-modal`) is reusable — it's already used for the New Chat confirmation. Confirm whether its current API supports configurable labels and a generic `onOk` callback; if not, extend it minimally rather than building a parallel modal.

### Defensive loading

The `fetch("/sample-prompts.json")` can fail for several reasons:
1. File missing or 404 (deployment artifact)
2. JSON parse error (file corrupted or hand-edited badly)
3. Schema mismatch (e.g., `shouldTriggerAdvisor` missing, `complexity` value isn't one of the three tiers)

In all cases the feature should degrade silently:
- No pill row rendered (no error toast, no console error visible to user)
- `console.warn()` is acceptable for diagnostics, but no thrown exception
- The chat input remains fully functional — sample prompts are an *enhancement*, not a dependency

Treat any prompt entry missing `complexity` as `"standard"`. Treat any unknown value the same way. This prevents a single malformed entry from blowing up the whole list.

### Reuse vs. new code

| Concern | Reuse | New |
|---------|-------|-----|
| Modal overlay structure | ✅ (matches Code View / Settings) | — |
| Confirm modal | ✅ (existing `#confirm-modal`) | — |
| CSS variables / palette | ✅ (`--accent`, `--panel`, `--border`, `--muted`) | `--triggers`, `--skips` (new vars) |
| Dark-theme button styles (`.btn-primary`, `.btn-ghost`) | ✅ | — |
| Tooltip pattern | — | New (no existing hover-tooltip pattern in the app) |
| 3-bar complexity meter | — | New (small CSS-only component) |
| Pill / chip styling | Mostly new, but borrows visual idiom from existing settings-tab pills | — |

### Welcome slide update (F51)

Slide 4 currently has a hard-coded `<ul>` of 2 prompts. Replace that with a sentence pointing users at the new pill row: e.g., "Click any of the suggested prompts above the chat input to try one — they're tagged 🟢 (triggers advisor) or 🟡 (skips). The `+ See all` pill opens the full library." Keep slide 4's other steps unchanged.

Since this changes welcome content, **bump the welcome-seen storage key** from `advisor-playground-welcome-seen-v1` to `advisor-playground-welcome-seen-v2`. Existing users will see the updated slideshow once. (See [public/app.js:2511](../../../public/app.js#L2511).)

## 4. Other Technical Considerations
_Shared any other technical information that might be relevant to building this version._

### Code View interaction

The Code View modal (v1.5.0) generates a snippet that includes whatever's in the chat-input textarea at the moment Code View is opened (via the "Original prompt" toggle). Inserting a sample prompt populates the textarea like any other typed content, so Code View picks it up automatically. **No changes needed in Code View** — verify behavior end-to-end during test.

### Compare-mode token cost

The complexity meter's "Heavy — ~3× in compare-all-three mode" tooltip is the closest thing to a cost warning in this version. We considered a dedicated banner when compare-all-three mode is selected, but decided to leave that as a possible follow-up after seeing user feedback on the complexity meter alone. **Not in scope for v1.7.0.**

### Mobile / narrow viewports

The pill row uses `flex-wrap: wrap`, so it gracefully degrades on narrow screens (pills wrap to multiple rows). The modal uses `width: min(720px, 92vw)` so it fits on any viewport. Test at ~375px width before declaring done.

### Accessibility

- All buttons (pills, `+` insert, filter chips, modal close, collapse arrow) must be real `<button>` elements with `aria-label` where the visible text is just an icon (e.g., `▾`, `+`, `×`).
- The modal needs `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing to the modal title (mirroring the existing Code View modal markup).
- Hover tooltips should also work for keyboard users — add `:focus` selectors alongside `:hover` so tab-navigating to a pill also shows the tooltip.
- Esc to close the modal and the confirm-replace modal.

### Security

No new attack surface. The prompt content is rendered into the textarea via `.value =` (not `.innerHTML`), so even if a malicious actor managed to land arbitrary JSON in `sample-prompts.json`, it can't XSS via prompt text. The tooltip / card body **does** render prompt text via `.textContent` — confirm this in implementation; do **not** use `.innerHTML` for prompt body content.

### Schema versioning

Not adding a `schemaVersion` field to `sample-prompts.json` for v1.7.0 — the schema is small and a future breaking change can simply ship as a new version of the loader. If we later add more fields (e.g., per-prompt `tags`, `executor` recommendations, `relatedPrompts`), reconsider then.

## 5. Resolved Decisions
_Questions raised during design and how they were resolved (USER confirmed 2026-05-14)._

1. **Featured pills count → 5 + See all (even at 8 prompts).** Keep the see-all flow in scope now rather than redesigning when the library grows. Validates the modal pattern from day one.

2. **Order of pills → JSON order (no auto-sort, no shuffling).** Authors curate the order intentionally; the renderer respects it.

3. **Featured-pill diversity → reorder JSON so first 5 are 3 triggers + 2 skips.** Demonstrates the trigger/skip asymmetry on first launch without burying the skip examples behind the See-all pill. Implementation note: reorder the seed JSON before shipping (see the mockup's order for reference).

4. **Localization / i18n → out of scope.** The app is English-only; `sample-prompts.json` will also be English-only. No `lang` field, no fallback structure.

5. **Complexity meter in the inline pill row → conditional during implementation.** If the meter (or a compact 3-dot version of it) fits comfortably alongside the title + colored dot in a pill without making pills feel cramped, include it. If it crowds the pill on typical viewports, leave it modal-only. **Implementer's call after prototyping the pill at full width and at ~375px.**
