# Version Retrospective – v1.9.0 — Fullscreen Result Viewer
This document reflects on what worked, what didn't, and how future versions can be improved.

## Version Summary
Added an expand-to-fullscreen affordance to every scrollable result box in the trace pane — the PRODUCED model output, advisor advice, the Full I/O request/response JSON, and the evaluation reasoning. A small expand button opens the content in a full-screen modal with its own Copy + Wrap, Esc/click-outside/✕ to close. Built entirely by composing existing machinery (the Code View modal pattern, Prism, `makeCopyButton()`, the global wrap convention) via one reusable modal (`openFullscreen`) and one shared helper (`attachExpandButton`). No new dependencies, no server changes. Delivered F62 (modal), F63 (wiring), F64 (icon/styling/a11y); version bumped to 1.9.0.

## What Went Well
- **Composition over new infrastructure.** The whole feature reused what already existed — the modal `.open`/backdrop/focus-restore pattern from Code View, Prism highlighting, `makeCopyButton()`, the trace wrap convention. The only genuinely new code was glue: one modal opener and one `attachExpandButton` helper.
- **One helper, four wire-ups.** `attachExpandButton(targetEl, { title, kind, getContent })` meant the Full I/O, produced blocks, advisor advice, and eval reasoning each opted in with a single call. Adding the affordance to a future box is now trivial.
- **XSS posture held.** The `kind` system (`text` via `textContent`, `json` via Prism, `html` only for app-built/escaped reasoning markup) kept the v1.x "never `innerHTML` untrusted text" rule intact by construction.
- **Tight scope decision up front.** The new-version vs patch and "which boxes" calls were settled cleanly before any code, so the build didn't wander.

## What Could Have Gone Better
- **Three issues slipped past automated checks and only surfaced in manual testing (T14):**
  1. **Button placement, take 1** — the floated expand button anchored to the whole `.produced-block`, so it floated up into the type-label row, detached from the content box.
  2. **Button placement, take 2** — anchoring it to the `<pre>` corner instead still looked wrong (overlapping the scrollbar). The real fix was a **header row** (type label left, button right) mirroring the Full I/O section — which is what the user wanted from the start.
  3. **Wrap didn't work on JSON** — Prism's theme sets `white-space: pre` on the inner `<code>`, so toggling wrap only on the `<pre>` had no effect for highlighted JSON (text content wrapped fine, masking it).
- **All three were "I built a parallel thing slightly differently" bugs.** The codebase already had the correct patterns — the Full I/O header layout, and the trace's `.raw-toggle` wrap handling that sets `white-space` on *both* `pre` and `code`. I reinvented both slightly and got them subtly wrong.
- **The design doc literally flagged both traps** ("several boxes aren't position:relative", "Prism sets white-space on the inner code") — the warnings were there; I under-applied them in the first cut.

## Lessons Learned
- **When a working analog exists, copy its exact pattern — don't approximate it.** The Full I/O header and the `.raw-toggle` wrap CSS were right there. Matching them verbatim from the start would have avoided all three rework cycles. "Mirror the existing component" beats "build a similar one."
- **CSS behavior that interacts with third-party styles (Prism) must be verified the same way the existing code solved it.** The wrap bug was a known, already-solved problem in this very codebase; the fix was to replicate the dual `pre` + `code` selector, not to rediscover it.
- **Automated checks (syntax, JSON, brace-balance, serves-200) prove the code loads, not that it looks or behaves right.** Visual/interaction features lean heavily on the human test pass — the value of T14/T15 was real here.

## Action Items
- **For any UI work on Prism-highlighted content:** replicate the `.raw-toggle` `white-space`-on-both-`pre`-and-`code` pattern from the start; don't toggle wrap on the `<pre>` alone.
- **Prefer matching an existing affordance's layout** (header row with inline action buttons) over floating overlays on scrollable content — fewer overlap/positioning surprises.
- **Add a "closest existing component" note to design docs:** for each new UI element, name the existing component it should mirror, so the implementation copies rather than reinvents.
- **Eval-reasoning expand still uses the floated variant** (its content sits below a `<summary>`, no scrollbar to collide with). Left intentionally; revisit only if consistency with the header-row treatment is wanted later.
