# Changelog

All notable changes to the **Claude Advisor Tool Playground** are documented here.

This project follows [semantic versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

---

## [1.3.0] — 2026-04-13

Major feature update focused on **making branch comparisons easier to read at a glance across a whole conversation**, not just per turn.

### Added

- **Conversation totals dashboard** pinned at the top of the Trace pane. Five tiles (`in`, `out`, `cost`, `time`, and a shared `turns` count) show cumulative per-branch totals for every turn in the current conversation. Refreshes automatically after every successful turn, hidden until the first turn completes.
- **Color-coded per-branch values inside each tile.** Instead of one row per branch, each metric gets one tile, with each branch's value stacked inside it in the branch's existing color (purple for advisor, blue for executor-model-solo, amber for advisor-model-solo). A legend below the tiles ties color to branch, and now includes the actual model names (e.g. `ADVISOR · sonnet-4-6 → opus-4-6`) so you can see which models produced the numbers without scrolling up.
- **Leader indicator.** In compare modes with 2+ branches, a small green `←` appears next to the lowest (winning) value in each tile, giving an instant read on which branch is ahead on efficiency. Updates per turn. Ties get marked on all tied branches. Branches with unknown pricing are excluded from the leader calculation on the `cost` tile only.
- **Mode locking for honest comparisons.** The `Mode` dropdown now locks the moment you send the first message of a conversation — and stays locked until you start a new conversation. This prevents mid-conversation mode changes that would have two serious side effects: (a) asymmetric turn counts across branches, and (b) cold-start history divergence (a branch activated on turn 3 would have no context from turns 1–2, making the comparison meaningless). If the first send fails before any turn is recorded, the lock is automatically released so you can retry with a different mode. The lock is released whenever you start a new conversation via the `＋` button.

### Changed

- **Per-turn summary grid reduced from 5 tiles to 4.** The `cache_r` and `cache_w` tiles have been removed from the turn-level summary grid and replaced with a single `time` tile. Final layout: `in / out / cost / time` — matching the dashboard's vocabulary exactly. Cost already reflects cache savings at the correct rates, so the cache tiles were redundant at this aggregation level.
- **Per-turn summary tile labels** renamed from `input` / `output` / `est. cost` to `in` / `out` / `cost` for consistency with the dashboard.

### Retained

- **Advisor caching toggle** in Settings → Chat & Advisor is **unchanged**. It remains the on/off switch that enables prompt caching on the advisor tool's internal transcript.
- **Per-step cache diagnostics** (`cache_r` and `cache_w` on individual executor/advisor **step cards** inside each turn) are **unchanged**. They are the right place to verify caching is actually firing — when you expand a turn and want to confirm the cache wrote on turn 1 and read on turn 2+, this is where you look.

### Removed

- The mid-conversation "Mode changed to ..." system note. This is now unreachable because the mode selector is locked after the first turn.

---

## [1.2.1] — 2026-04-11

- Minor UI polish across the chat and trace panes.
- App launched on Railway as a hosted version at [advisor-tool-playground.up.railway.app](https://advisor-tool-playground.up.railway.app/).

---

## [1.2.0] — 2026-04-11

- **Security hardening pass.** Same-origin CORS lock-down on `/api` routes, per-IP rate limiting (60 requests / hour), HTTPS redirect + HSTS headers when deployed behind a TLS proxy, `X-Frame-Options` / `X-Content-Type-Options` / `Referrer-Policy` / `Permissions-Policy` headers, 2 MB request payload cap. Full XSS audit of all `innerHTML` render sites, hardened `escapeHtml()` covering all five OWASP-recommended characters. Keys and conversations are never persisted server-side.

---

## [1.1.x] — 2026-04-11

- Added **welcome slideshow** on first launch — introduces the advisor strategy, explains what the playground does, and walks through initial API key setup.
- Fixed a bug in the Quality Evaluation panel.
- Documentation and image updates.

---

## [1.0.0] — 2026-04-11

- **Initial public release.**
- Chat pane + Trace pane side-by-side.
- Per-turn and per-step breakdown with full token counts, cost estimates, and raw content blocks.
- Compare modes: advisor / executor-model-solo / advisor-model-solo.
- **LLM-as-judge quality evaluation** with two-pass position-bias mitigation, blinded candidates, four-dimension rubric (correctness, completeness, clarity, depth), and judge-disagreement detection.
- Full request/response I/O viewer per branch for debugging.
