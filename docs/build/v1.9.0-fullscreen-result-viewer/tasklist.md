# Version Tasklist – v1.9.0 — Fullscreen Result Viewer
This document outlines all the tasks to work on to deliver this particular version, grouped by phases.

As each task is accomplished, this document's status is updated accordingly.

| Status |      |
|--------|------|
| 🔴 | Not Started |
| 🟡 | In Progress |
| 🟢 | Completed |

---

## Phase 1 — Fullscreen Modal Foundation (F62)
The reusable modal everything else opens. Mirrors the Code View modal pattern.

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| T1 | Add `#fullscreen-modal` markup | New dialog in `index.html` mirroring `#code-view-modal`: `fullscreen-backdrop[data-fullscreen-close]`, header (`#fullscreen-title`, `#fullscreen-wrap` toggle, `#fullscreen-copy-slot`, ✕ `[data-fullscreen-close]`), body `<pre><code id="fullscreen-code">`. `role="dialog" aria-modal="true" aria-labelledby="fullscreen-title"`. | None | 🟢 Completed | AGENT |
| T2 | `openFullscreen` / `closeFullscreen` + focus + Esc | In `app.js`: `fullscreenLastFocus` capture/restore; `.open` toggle; `[data-fullscreen-close]` click wiring; Esc closes when topmost (priority over Code View/settings). | T1 | 🟢 Completed | AGENT |
| T3 | `kind` rendering + Copy + Wrap | Render body per `kind`: `text`→`textContent` (no highlight); `json`→`language-json` + `Prism.highlightElement`; `html`→inject app-built markup. Mount `makeCopyButton(() => currentContent)` in the copy slot (pick rebind strategy); `#fullscreen-wrap` toggles a nowrap class, inheriting `wrapTraceCodeEl` state on open. | T2 | 🟢 Completed | AGENT |
| T4 | Modal CSS + z-index | `.fullscreen-modal` styles reusing Code View modal conventions; near-fullscreen window with margin; body scrolls; z-index ~300 (above settings/about/confirm/code-view). | T1 | 🟢 Completed | AGENT |

## Phase 2 — Expand Affordance Wiring (F63)
One shared helper, applied to every scrollable result surface.

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| T5 | `attachExpandButton()` helper | `attachExpandButton(targetEl, { title, kind, getContent })`: creates the `.expand-btn`, positions it top-right, click → `openFullscreen({ title, kind, content: getContent() })`. `getContent` lazy so it reads current content. | T3 | 🟢 Completed | AGENT |
| T6 | Wire Full I/O blocks | In `renderIOSection` (app.js:1361): add expand button to `.io-section-header` beside Copy — `{ title: label, kind: "json", getContent: () => jsonText }`. | T5 | 🟢 Completed | AGENT |
| T7 | Wire PRODUCED / Advisor blocks | In `blockPreview` (app.js:1602): append an expand button (DOM node, after `innerHTML` is set) to each scrollable `.produced-block` — `kind: "text"`, content = the block's text, title per block type ("Produced" / "Advisor output" / "Advisor advice" / "Advisor error"). Per-block granularity. | T5 | 🟢 Completed | AGENT |
| T8 | Wire Evaluation reasoning | In the `.eval-reasoning` render (app.js:2470): add expand button to the reasoning header — `kind: "html"`, content = the built reasoning markup, `title: "Evaluation reasoning"`. | T5 | 🟢 Completed | AGENT |

## Phase 3 — Icon, Styling & Accessibility (F64)

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| T9 | Expand icon + `.expand-btn` CSS | `EXPAND_ICON_SVG` const beside `COPY_ICON_SVG`; `.expand-btn` styled like `.copy-btn` (size/color/hover/focus). | T5 | 🟢 Completed | AGENT |
| T10 | Positioning & no-overlap | Set `position: relative` on the boxes that need it; float the button top-right without overlapping the existing Copy buttons / global Wrap toggle; add right padding so `<pre>` text doesn't run under it; verify the compare-mode CSS grid is unaffected. | T6, T7, T8, T9 | 🟢 Completed | AGENT |
| T11 | Accessibility & narrow widths | `aria-label="Expand to fullscreen"`; native button keyboard activation; focus returns to trigger on close; dialog roles set; modal usable at narrow widths (header controls hold, body scrolls). | T10 | 🟢 Completed | AGENT |

## Phase 4 — Release Mechanics

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| T12 | Release notes | Add a v1.9.0 entry to `release-notes.md` (TOC line + section). | T1–T11 | 🟢 Completed | AGENT |
| T13 | Version bump | Per checklist: `cody.json`, `package.json` (+`lastUpdated`), `package-lock.json`, README version badge, build folder; add a one-line feature mention to the README features list. No reference-doc/API changes this version. | T1–T11 | 🟢 Completed | AGENT |

## Phase 5 — Verification
Manual test pass (design §4). Run before declaring the version done.

| ID  | Task | Description | Dependencies | Status | Assigned To |
|-----|------|-------------|--------------|--------|-------------|
| T14 | Functional tests | Expand icon appears top-right on PRODUCED text, Advisor output/advice, Full I/O REQUEST + RESPONSE, and Evaluation reasoning; each opens the modal with correct title + full content (JSON highlighted, text plain, reasoning structured); Copy / Wrap / Esc / click-outside / ✕ all work; focus returns to the trigger. | T1–T13 | 🟢 Completed | USER |
| T15 | Regression / XSS / modes | Expand button doesn't overlap or break Copy buttons or the global Wrap toggle; compare-mode grid intact; a model response containing HTML/`<script>` renders inert in the modal (textContent path); works in all four modes and for both Anthropic and OpenAI eval reasoning. | T1–T13 | 🟢 Completed | USER |
