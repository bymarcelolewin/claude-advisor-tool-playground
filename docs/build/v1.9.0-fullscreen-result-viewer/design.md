# Version Design Document : v1.9.0 — Fullscreen Result Viewer
Technical implementation and design guide for the upcoming version.

## 1. Features Summary
_Overview of features included in this version._

Every scrollable result box in the trace pane is cramped — you read dense JSON or long model output through a ~120–400px window with a scrollbar. This version adds an **expand-to-fullscreen** affordance: a small expand icon in each box's top-right corner opens a full-screen modal showing the same content with room to read. The inline boxes stay as compact previews.

| ID  | Feature | Priority |
|-----|---------|----------|
| F62 | Reusable fullscreen result modal (`#fullscreen-modal`) — title + content + kind; Prism for json/code, Copy, Wrap toggle; Esc / click-outside / ✕ close | High |
| F63 | Expand affordance wired into all scrollable result boxes via one shared helper (`attachExpandButton`) | High |
| F64 | Expand-icon SVG, hover/focus styling, accessibility | Medium |

**Scope decision (locked):** apply to **all** scrollable result surfaces, not just the Full I/O blocks — the PRODUCED / Advisor-output blocks, the Full I/O REQUEST + RESPONSE JSON, and the evaluation reasoning. Reuses existing machinery: the modal pattern from the Code View modal (`.open` class, `data-close` backdrop, `lastFocus` restore), Prism (`Prism.highlightElement`), `makeCopyButton()`, and the global wrap convention (`io-nowrap`).

## 2. Technical Architecture Overview
_High-level technical structure that supports all features in this version._

No new dependencies, no build step, no server changes — this is entirely `public/` (index.html + app.js + styles.css). The architecture mirrors the existing **Code View modal** (`#code-view-modal`), which is the closest analog: a fixed-position overlay toggled by an `.open` class, a `data-*-close` backdrop/✕, focus captured on open and restored on close, and Esc-to-close.

New pieces:
- **`#fullscreen-modal`** (index.html) — a generic dialog: header (title + Wrap toggle + Copy slot + ✕) and a body containing one `<pre><code>` (for text/json/code) or a content container (for pre-rendered HTML like eval reasoning).
- **`openFullscreen({ title, kind, content }) / closeFullscreen()`** (app.js) — populate, highlight, show/hide, manage focus.
- **`attachExpandButton(targetEl, { title, kind, getContent })`** (app.js) — the shared helper that drops an expand button into a box and wires its click to `openFullscreen`. Every current and future scrollable box opts in with one call.
- **`.expand-btn` + `#fullscreen-modal` styles** (styles.css) — styled consistently with `.copy-btn`.

`kind` is one of:
- `"text"` — plain preformatted text (PRODUCED text, advisor advice, error blocks). No Prism; rendered via `textContent` (XSS-safe).
- `"json"` — Full I/O request/response. `language-json` + `Prism.highlightElement`.
- `"html"` — pre-rendered, app-built markup (evaluation reasoning). Injected as innerHTML from content the app already escaped when it built it; **no untrusted/model text is ever passed as `html`.**

## 3. Implementation Notes
_Shared technical considerations across all features in this version._

### F62 — Reusable fullscreen modal
- **Markup (`index.html`)**, mirroring `#code-view-modal`:
  ```html
  <div id="fullscreen-modal" class="fullscreen-modal" role="dialog" aria-modal="true" aria-labelledby="fullscreen-title">
    <div class="fullscreen-backdrop" data-fullscreen-close></div>
    <div class="fullscreen-window">
      <div class="fullscreen-header">
        <div id="fullscreen-title" class="fullscreen-title"></div>
        <label class="wrap-toggle"><input type="checkbox" id="fullscreen-wrap" checked> Wrap</label>
        <span id="fullscreen-copy-slot"></span>
        <button type="button" class="btn-close" data-fullscreen-close aria-label="Close fullscreen">×</button>
      </div>
      <div class="fullscreen-body"><pre><code id="fullscreen-code"></code></pre></div>
    </div>
  </div>
  ```
- **JS (`app.js`):**
  - `let fullscreenLastFocus = null;`
  - `openFullscreen({ title, kind, content })`: set `fullscreenLastFocus = document.activeElement`; set title; render body per `kind` (text → `code.textContent`, no highlight; json → `code.className="language-json"` + `code.textContent` + `Prism.highlightElement`; html → swap the `<pre><code>` for a `.fullscreen-html` div and set `innerHTML`); (re)mount the Copy button via a lazy `makeCopyButton(() => content)` in `#fullscreen-copy-slot` (rebind each open since content changes — clear the slot and re-append, or keep one button reading a module-level `currentFullscreenText`); apply wrap state; add `.open`; focus the ✕.
  - `closeFullscreen()`: remove `.open`; restore `fullscreenLastFocus`.
  - Wire `[data-fullscreen-close]` clicks → `closeFullscreen`; extend the existing global Esc handler (or add one) to close when `#fullscreen-modal.open`. **Esc ordering:** the fullscreen modal must take Esc priority over the Code View / settings modals when it's the topmost open layer.
  - Wrap toggle: `#fullscreen-wrap` toggles an `io-nowrap`-style class on the modal `<pre>`; default `checked` (wrapped) but consider inheriting the global `wrapTraceCodeEl` state on open so it matches what the user already sees.
- **z-index:** above the other modals. Current tiers — settings 100, about 150, confirm 200 (Code View similar). Set `#fullscreen-modal` to ~**300** so it can stack over anything (even though today every trigger lives in the trace, not in another modal).

### F63 — Expand affordance on all scrollable boxes (shared helper)
- **Helper:** `attachExpandButton(targetEl, { title, kind, getContent })` — creates an `.expand-btn` (F64), positions it top-right (the box or its header must be `position: relative`), and on click calls `openFullscreen({ title, kind, content: getContent() })`. `getContent` is lazy so it always reads current content.
- **Wire-up sites:**
  - **Full I/O (`renderIOSection`, app.js:1361):** add the expand button into the existing `.io-section-header`, next to the Copy button — `attachExpandButton(header, { title: label, kind: "json", getContent: () => jsonText })`. (`label` is "Request sent to the API" / "Response from the API".)
  - **Produced / Advisor output (`blockPreview`, app.js:1602):** each `.produced-block` holds a `<span class="bt">` label + a `<pre>`. Add an expand button to each `.produced-block` whose `<pre>` is scrollable; `getContent` returns that block's text (`block.text`, `c.text`, or the error text), `kind: "text"`, `title` from the block type ("Produced" / "Advisor output" / "Advisor advice" / "Advisor error"). Since `blockPreview` currently sets `innerHTML`, append the button as a DOM node after setting innerHTML (don't bake it into the template string).
  - **Evaluation reasoning (app.js:2470, `.eval-reasoning`):** add an expand button to the reasoning header/summary area; `kind: "html"`, `getContent` returns the built reasoning markup (the same `reasoningInner.join("")` already assembled), `title: "Evaluation reasoning"`.
- **One helper, consistent behavior** — and any future scrollable box gets the affordance with a single `attachExpandButton(...)` call.

### F64 — Icon, styling & accessibility
- **Icon:** a fullscreen/expand SVG (diagonal out-arrows, ⤢-style), defined once as a `const EXPAND_ICON_SVG` next to `COPY_ICON_SVG` (app.js:~1284).
- **`.expand-btn` CSS:** same visual language as `.copy-btn` (size, color, hover, focus ring). Positioned `absolute; top; right` within the box; ensure the containing box is `position: relative` and that the button doesn't overlap existing Copy buttons (in `.io-section-header` they sit side-by-side in the header row, so no overlap; in `.produced-block` the button floats top-right over the `<pre>` — add right padding so text doesn't run under it).
- **a11y:** it's a real `<button>` (native Enter/Space); `aria-label="Expand to fullscreen"`; visible focus state; on modal close, focus returns to the triggering button (`fullscreenLastFocus`). Modal is `role="dialog" aria-modal="true"` with `aria-labelledby` the title.
- **Narrow widths:** the modal window is near-fullscreen with margin; the body scrolls; the header controls wrap or stay pinned.

## 4. Other Technical Considerations
_Shared any other technical information that might be relevant to building this version._

- **XSS discipline (carry the v1.x posture forward):** `text` and `json` content goes through `code.textContent` — never `innerHTML`. The only `innerHTML` path is `kind: "html"` for evaluation reasoning, and that markup is built by the app with `escapeHtml()` on every interpolated value (see app.js:2485–2494). No model-produced or user-produced string is ever passed with `kind: "html"`.
- **Wrap-state coherence:** the modal owns its own wrap toggle. Decide (and document in code) whether it defaults to `checked` always, or inherits `wrapTraceCodeEl.checked` on open. Recommendation: inherit on open so the expanded view matches the inline view, then let the user toggle independently.
- **Copy button reuse:** reuse `makeCopyButton(() => currentContent)`. Because the modal is reused for many boxes, either rebuild the Copy button on each open (clear `#fullscreen-copy-slot`, re-append) or keep one button that reads a module-level `currentFullscreenContent`. The latter avoids churn; pick one and be consistent.
- **Positioning gotcha:** several result boxes aren't currently `position: relative`. Adding an absolutely-positioned expand button requires setting that on the box (or its header). Verify no layout regressions in the existing trace grid (the CSS Grid columns in compare modes).
- **Manual verification:**
  1. Expand icon appears top-right on: PRODUCED text, Advisor output/advice, Full I/O REQUEST, Full I/O RESPONSE, and Evaluation reasoning.
  2. Clicking each opens the modal with the correct title + full content; JSON is Prism-highlighted, text is plain, reasoning renders its structured layout.
  3. Copy in the modal copies the full content; Wrap toggles; Esc / click-outside / ✕ all close; focus returns to the expand button that opened it.
  4. Expand button doesn't overlap or break the existing Copy buttons or the global "Wrap code" toggle, and doesn't disturb the compare-mode grid.
  5. Works in all modes (advisor-only, vs-exec, vs-adv, all-three) and for both Anthropic and OpenAI eval reasoning.
  6. XSS spot-check: a model response containing `<script>` / backticks / HTML renders as inert text in the modal (textContent path).

## 5. Open Questions
_Unresolved technical or product questions affecting this version._

- **Expand granularity on the PRODUCED box:** one expand button per content *block* (each `.produced-block`), or one per step's whole PRODUCED area? Per-block is simpler given each block has its own `<pre>`, but a step with multiple blocks (text → advisor call → text) would show multiple expand icons. Lean: **per-block**, since that matches where the scroll actually is — confirm once rendered.
- **Wrap default:** inherit the global trace wrap state on open (recommended), or always default to wrapped? Low stakes; decide during build.
- **Icon glyph:** diagonal out-arrows (⤢) vs a "maximize" square. Pick during F64 against the existing icon set.
