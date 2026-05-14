# Version Retrospective – v1.4.0
This document reflects on what worked, what didn't, and how future versions can be improved.

## Version Summary
v1.4.0 brought the playground up to date with Anthropic's latest advisor tool API additions. Added `max_uses`, 1h caching TTL, `output_config.effort`, expanded error code handling, `advisor_redacted_result` handling, and system prompt presets (Recommended / Precise / Custom). Also restructured the UI: model selectors moved from the header into a dedicated config panel on the chat side, and mode locking was extended to also lock executor, advisor, and effort together.

Shipped 2026-04-16. All 9 planned features delivered, plus a handful of small UX improvements discovered during the build (New Chat button styling, effort display in the dashboard legend, cache_r/cache_w hidden on executor steps, `advisor_redacted_result` rendering improvements, and a grammar nit fix on the turn summary pill).

## What Went Well

- **Phases were appropriately sized.** Each phase landed in one working session with a USER test + commit at the end. The user could interrupt and redirect between phases without losing work.
- **Design doc held up.** The open questions at the end of Section 5 (effort param name, dropdown location, system prompt preset naming) all got resolved before coding started. No mid-build design churn.
- **Advisor tool reference file paid off.** Having [`claude-advisor-tool-updates.md`](../reference/claude-advisor-tool-updates.md) separate from the design doc meant we could capture *all* Anthropic API additions (including ones we explicitly skipped like `pause_turn`, batch processing, `clear_thinking`) without muddying the v1.4.0 scope. Future versions have a ready reference to re-check.
- **Locking extension was natural.** Once `setModeLocked()` existed, adding `setEffortLocked()`, `setExecutorLocked()`, and `setAdvisorLocked()` was mechanical — each followed the same pattern. The `.locked` CSS class styling worked unchanged.
- **Server restart discipline.** The user learned quickly to restart Node after server.js changes. Once or twice we had to remind them (e.g., `max_uses` not showing up), but the pattern was consistent.
- **Explicit "include at `high`" decision** for effort. Initially I had the server omit `output_config` when effort was "high" since that's the API default. The user pointed out that the UI advertises the choice, so the JSON should reflect it. Switching to always-send made the trace transparent about what was selected.

## What Could Have Gone Better

- **Phase 6 Custom preset UX missed a requirement on first pass.** Initial implementation cleared the textarea on Custom and didn't remember user-typed content across preset swaps. User caught this: "If I switch back to detailed and then back to custom, it's blank." Fix required a second state variable (`customSystemPromptText`) and a separate localStorage field. Should have anticipated the round-trip case in the design.
- **Effort locking coordination with Haiku-disable had a hidden bug.** The client was sending `effort: null` when the dropdown was disabled — which was correct for Haiku but wrong for "locked" (we still want to send the real value when the dropdown locks post-first-turn). User spotted it as "output_config is null in JSON." Fix was small but the coupling between "disabled for Haiku" and "disabled because locked" wasn't obvious until the bug surfaced.
- **System prompt corruption episode.** The user's saved system prompt lost its `<!-- advisor:only -->` sentinels somehow (unclear how — possibly manual editing in a prior session). The stripAdvisorOnly logic worked correctly; there was just no sentinel content to strip. Took a few back-and-forths to diagnose. Resolution was a manual reset. No code change needed, but good reminder that user data drift is a real debugging vector.
- **Evaluation tasklist numbering drifted mid-phase.** Tasks got renumbered a few times as new sub-tasks emerged (e.g., Phase 2 grew from 2.8 to 2.10, Phase 4 grew from 4.6 to 4.7 after the cache_r/cache_w cleanup). Not a big deal but made "close out 4.5 and 4.6" momentarily ambiguous.
- **Multi-call advisor prompt didn't reliably trigger multiple calls in a single turn.** My suggested Option A prompt for the welcome slideshow produced only 1 advisor call in the user's test. Honest acknowledgment that single-turn multi-call triggering is genuinely hard with modern executor models prevented oversell.

## Lessons Learned

- **Locking a control needs to separate "display state" from "transport state".** When we lock a dropdown by setting `.disabled`, the *value* is still valid and should still be sent to the server. Checking `.disabled` in the request payload building was the wrong proxy — checking the actual model (Haiku) was the right one.
- **For preset/custom-content UIs, custom content needs its own persistence slot.** Conflating "the current textarea content" with "the user's custom work" broke when switching between preset and custom. Separate `customSystemPromptText` solved it cleanly.
- **Trace transparency trumps API minimalism.** Sending `output_config: { effort: "high" }` when "high" is the API default costs nothing (same behavior, a few extra bytes) and teaches the user what was actually sent. For a learning playground, defaults-get-omitted is the wrong philosophy.
- **Always label fields that can legitimately be `null`.** The Full I/O viewer shows `output_config: null` for Haiku and for pre-fix bug cases. Both look identical. A user-visible "why" (e.g., showing "effort: n/a (Haiku)" in the dashboard instead of a raw value) disambiguates.
- **Don't under-scope placeholder skeletons.** The Custom preset starts blank by design, but even a blank Custom benefits from pre-populated sentinel tags so users don't accidentally leak advisor instructions to baselines. Small UX wins matter.
- **Multi-turn conversations are where the advisor really shines.** Single-turn attempts to force multiple advisor calls tend to collapse into one upfront planning call. Welcome-slideshow prompts should teach this honestly rather than promise unrealistic behavior.

## Action Items

- **When Anthropic ships a new advisor-supporting model family** (Haiku with effort, or an advisor model that returns `advisor_redacted_result` in the wild), verify the display path end-to-end. The encrypted-result rendering was built blind — no real test data exists yet.
- **Consider locking `max_uses` too** for consistency with other config selectors. It's currently not locked, but changing it mid-conversation has the same unfairness concern as mode/effort/executor/advisor. Not urgent (single-user playground) but logically inconsistent.
- **Explore multi-turn welcome slideshow prompts** for demonstrating multi-call advisor behavior. A single prompt "just didn't work" reliably; a 3-turn conversation (each turn triggering an advisor call naturally) might be a better demo pattern.
- **Potential future version candidates already logged in backlog:**
  - F33 — Code View popup showing the exact API call in Python and TypeScript (good next step for teaching API adoption)
  - F34 — Prism syntax highlighting for the Full I/O viewer JSON (small, high-visibility polish)
