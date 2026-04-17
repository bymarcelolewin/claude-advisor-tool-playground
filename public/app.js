// ============================================================================
// Default system prompt — wrapped in <!-- advisor:only --> sentinels so the
// server can strip it from baseline branches (which have no advisor tool).
// Anything outside the sentinels is sent to all branches.
// ============================================================================
// ============================================================================
// Default judge prompt — editable in the settings modal. The server appends
// the actual user prompt + blinded candidate responses after this text.
// ============================================================================
const DEFAULT_JUDGE_PROMPT = `You are an expert evaluator assessing candidate responses to the same user prompt. You will be given the original USER PROMPT and multiple CANDIDATE RESPONSES labeled A, B, (and sometimes C). The candidates are blinded — you do not know which model or configuration produced which letter, and you must not try to guess.

SCORE EACH CANDIDATE on these four dimensions from 1 to 10:

- CORRECTNESS: factual and technical accuracy; absence of errors, hallucinations, or misleading claims
- COMPLETENESS: does it fully address what the user asked for, or are parts missed, hand-waved, or glossed over
- CLARITY: structure, readability, ease of following the reasoning
- DEPTH: useful specifics, concrete examples, and trade-off reasoning vs. surface-level generalities

RULES:
1. Write your REASONING per dimension per candidate BEFORE committing to numeric scores. The reasoning must come first in the JSON.
2. Do NOT favor longer responses just because they are longer.
3. Do NOT favor the response shown first.
4. Be willing to declare a tie if the quality difference is below the noise floor.
5. If you are uncertain, pick "low" confidence. Reserve "high" for clear, decisive differences.

OUTPUT FORMAT: return ONLY a JSON object, no markdown fences, no prose outside the JSON. Exact shape:

{
  "reasoning": {
    "A": { "correctness": "...", "completeness": "...", "clarity": "...", "depth": "..." },
    "B": { "correctness": "...", "completeness": "...", "clarity": "...", "depth": "..." }
  },
  "scores": {
    "A": { "correctness": 8, "completeness": 7, "clarity": 9, "depth": 6 },
    "B": { "correctness": 7, "completeness": 8, "clarity": 8, "depth": 7 }
  },
  "winner": "A",
  "confidence": "medium",
  "summary": "one short sentence explaining the verdict"
}

Allowed values for "winner": "A", "B", "C", or "tie".
Allowed values for "confidence": "low", "medium", or "high".`;

// System prompt presets — sourced from Anthropic's official advisor tool
// docs. "Recommended" is the timing + advice-treatment blocks. "Precise" adds
// the conciseness instruction at the top (Anthropic reports this cuts total
// advisor output tokens 35-45% without changing call frequency). "Custom"
// leaves it blank for the user to write their own.
const SYSTEM_PROMPT_RECOMMENDED = `<!-- advisor:only -->
You have access to an \`advisor\` tool backed by a stronger reviewer model. It takes NO parameters — when you call advisor(), your entire conversation history is automatically forwarded. They see the task, every tool call you've made, every result you've seen.

Call advisor BEFORE substantive work — before writing, before committing to an interpretation, before building on an assumption. If the task requires orientation first (finding files, fetching a source, seeing what's there), do that, then call advisor. Orientation is not substantive work. Writing, editing, and declaring an answer are.

Also call advisor:
- When you believe the task is complete. BEFORE this call, make your deliverable durable.
- When stuck — errors recurring, approach not converging, results that don't fit.
- When considering a change of approach.

On tasks longer than a few steps, call advisor at least once before committing to an approach and once before declaring done. On short reactive tasks where the next action is dictated by tool output you just read, you don't need to keep calling.

Give the advice serious weight. If you follow a step and it fails empirically, or you have primary-source evidence that contradicts a specific claim, adapt. A passing self-test is not evidence the advice is wrong — it's evidence your test doesn't check what the advice is checking.

If you've already retrieved data pointing one way and the advisor points another: don't silently switch. Surface the conflict in one more advisor call.
<!-- /advisor:only -->`;

const SYSTEM_PROMPT_PRECISE = `<!-- advisor:only -->
The advisor should respond in under 100 words and use enumerated steps, not explanations.

You have access to an \`advisor\` tool backed by a stronger reviewer model. It takes NO parameters — when you call advisor(), your entire conversation history is automatically forwarded. They see the task, every tool call you've made, every result you've seen.

Call advisor BEFORE substantive work — before writing, before committing to an interpretation, before building on an assumption. If the task requires orientation first (finding files, fetching a source, seeing what's there), do that, then call advisor. Orientation is not substantive work. Writing, editing, and declaring an answer are.

Also call advisor:
- When you believe the task is complete. BEFORE this call, make your deliverable durable.
- When stuck — errors recurring, approach not converging, results that don't fit.
- When considering a change of approach.

On tasks longer than a few steps, call advisor at least once before committing to an approach and once before declaring done. On short reactive tasks where the next action is dictated by tool output you just read, you don't need to keep calling.

Give the advice serious weight. If you follow a step and it fails empirically, or you have primary-source evidence that contradicts a specific claim, adapt. A passing self-test is not evidence the advice is wrong — it's evidence your test doesn't check what the advice is checking.

If you've already retrieved data pointing one way and the advisor points another: don't silently switch. Surface the conflict in one more advisor call.
<!-- /advisor:only -->`;

// Custom preset starts with just the sentinel tags so the user has a clear
// place to write their own advisor-only instructions. Anything outside the
// tags will be sent to all branches (including baselines).
const SYSTEM_PROMPT_CUSTOM_SKELETON = `<!-- advisor:only -->

<!-- /advisor:only -->`;

const SYSTEM_PROMPT_PRESETS = {
  recommended: SYSTEM_PROMPT_RECOMMENDED,
  precise: SYSTEM_PROMPT_PRECISE,
  custom: SYSTEM_PROMPT_CUSTOM_SKELETON,
};

// Derive the active preset from the current prompt text. If the text matches
// Recommended or Precise verbatim, we show that preset. Any divergence —
// including whitespace edits — falls back to "custom".
function detectSystemPromptPreset(text) {
  if (text === SYSTEM_PROMPT_RECOMMENDED) return "recommended";
  if (text === SYSTEM_PROMPT_PRECISE) return "precise";
  return "custom";
}

// ============================================================================
// Pricing (rough public list prices, per 1M tokens)
// ============================================================================
const PRICES = {
  "claude-haiku-4-5-20251001": { in: 1.0, out: 5.0 },
  "claude-haiku-4-5":          { in: 1.0, out: 5.0 },
  "claude-sonnet-4-6":         { in: 3.0, out: 15.0 },
  "claude-opus-4-6":           { in: 15.0, out: 75.0 },
  // OpenAI prices below are rough estimates — update as needed.
  "gpt-5.4":                   { in: 5.0, out: 15.0 },
};
const CACHE_READ_MULT = 0.1;
const CACHE_WRITE_MULT = 1.25;

function estCost(model, iter) {
  const p = PRICES[model];
  if (!p) return null;
  const input = (iter.input_tokens || 0) * p.in;
  const output = (iter.output_tokens || 0) * p.out;
  const cacheRead = (iter.cache_read_input_tokens || 0) * p.in * CACHE_READ_MULT;
  const cacheWrite = (iter.cache_creation_input_tokens || 0) * p.in * CACHE_WRITE_MULT;
  return (input + output + cacheRead + cacheWrite) / 1_000_000;
}

function fmtCost(c) {
  if (c == null) return "—";
  if (c < 0.0001) return `~$${c.toFixed(6)}`;
  if (c < 0.01) return `~$${c.toFixed(5)}`;
  return `~$${c.toFixed(4)}`;
}

function fmtNum(n) {
  return (n ?? 0).toLocaleString();
}

function fmtDuration(ms) {
  if (ms == null) return "—";
  if (Math.abs(ms) < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function fmtCostSigned(v) {
  if (v == null || isNaN(v)) return "—";
  const abs = Math.abs(v);
  const body =
    abs < 0.0001 ? abs.toFixed(6) :
    abs < 0.01 ? abs.toFixed(5) :
    abs.toFixed(4);
  return `${v < 0 ? "-" : ""}$${body}`;
}

function shortModel(m) {
  if (!m) return "?";
  // claude-sonnet-4-6 -> sonnet-4-6
  // claude-haiku-4-5-20251001 -> haiku-4-5
  return String(m)
    .replace(/^claude-/, "")
    .replace(/-\d{8}$/, "");
}

function branchModelBadge(branch) {
  const exec = shortModel(executorEl.value);
  const adv = shortModel(advisorEl.value);
  if (branch === "advisor") return `${exec} → ${adv}`;
  if (branch === "executorSolo") return exec;
  if (branch === "advisorSolo") return adv;
  return "";
}

function fmtDelta(val, fmt, invert = false) {
  if (val == null || isNaN(val)) return "—";
  const sign = val > 0 ? "+" : "";
  const cls = val === 0 ? "neutral" : (invert ? (val < 0 ? "good" : "bad") : (val > 0 ? "bad" : "good"));
  return `<span class="delta ${cls}">${sign}${fmt(val)}</span>`;
}

// ============================================================================
// Branch metadata
// ============================================================================
const BRANCHES = {
  advisor:      { label: "Advisor",                short: "adv",             colorVar: "advisor",  cls: "branch-advisor" },
  executorSolo: { label: "Executor-model-solo",    short: "exec-model-solo", colorVar: "executor", cls: "branch-exec-solo" },
  advisorSolo:  { label: "Advisor-model-solo",     short: "adv-model-solo",  colorVar: "amber",    cls: "branch-adv-solo" },
};

function branchesForMode(mode) {
  switch (mode) {
    case "advisor_exec": return ["advisor", "executorSolo"];
    case "advisor_adv":  return ["advisor", "advisorSolo"];
    case "all":          return ["advisor", "executorSolo", "advisorSolo"];
    case "advisor":
    default:             return ["advisor"];
  }
}

// ============================================================================
// DOM handles
// ============================================================================
const $ = (sel) => document.querySelector(sel);

// Per-branch conversation histories, maintained client-side. The server is
// stateless — these are sent on every /api/chat request.
const branchHistories = { advisor: [], executorSolo: [], advisorSolo: [] };

function resetBranchHistories() {
  branchHistories.advisor = [];
  branchHistories.executorSolo = [];
  branchHistories.advisorSolo = [];
}

// Cumulative per-branch totals across all turns in the current conversation.
// Feeds the totals dashboard pinned at the top of the Trace pane. Cleared
// whenever the user starts a new conversation.
function freshTotals() {
  return { input: 0, output: 0, cost: 0, durationMs: 0, costUnknown: false };
}
const conversationTotals = {
  advisor: freshTotals(),
  executorSolo: freshTotals(),
  advisorSolo: freshTotals(),
};
let conversationTurnCount = 0;

function resetConversationTotals() {
  conversationTotals.advisor = freshTotals();
  conversationTotals.executorSolo = freshTotals();
  conversationTotals.advisorSolo = freshTotals();
  conversationTurnCount = 0;
}

function accumulateTurnTotals(branch, totals) {
  const acc = conversationTotals[branch];
  if (!acc || !totals) return;
  acc.input += totals.input || 0;
  acc.output += totals.output || 0;
  acc.durationMs += totals.duration_ms || 0;
  if (totals.cost == null) acc.costUnknown = true;
  else acc.cost += totals.cost;
}

const messagesEl = $("#messages");
const traceEl = $("#trace");
const traceTotalsEl = $("#trace-totals");
const formEl = $("#chat-form");
const inputEl = $("#user-input");
const sendBtn = $("#send");
const resetBtn = $("#reset");
const systemEl = $("#system-prompt");
const systemPromptPresetEl = $("#system-prompt-preset");
const executorEl = $("#executor");
const advisorEl = $("#advisor");
const modeEl = $("#mode");
const maxTokensEl = $("#max-tokens");
const advisorCachingEl = $("#advisor-caching");
const maxUsesEl = $("#max-uses");
const effortEl = $("#effort");
const apiKeyEl = $("#api-key");
const settingsPanelEl = $("#settings-panel");
const toggleSettingsBtn = $("#toggle-settings");
const savedIndicatorEl = $("#settings-saved-indicator");
const evalProviderEl = $("#eval-provider");
const openaiKeyEl = $("#openai-key");
const openaiKeyWrapperEl = $("#openai-key-wrapper");
const judgePromptEl = $("#judge-prompt");
const syncPanesEl = $("#sync-panes");
const wrapTraceCodeEl = $("#wrap-trace-code");

// Apply / remove the no-wrap class to all rendered I/O code blocks. Called
// when the global "Wrap code" toggle changes so all branches stay in sync.
function applyTraceWrapState() {
  const noWrap = !(wrapTraceCodeEl && wrapTraceCodeEl.checked);
  document.querySelectorAll('.raw-toggle pre[class*="language-"]').forEach((pre) => {
    pre.classList.toggle("io-nowrap", noWrap);
  });
}

if (wrapTraceCodeEl) {
  wrapTraceCodeEl.addEventListener("change", applyTraceWrapState);
}
const welcomeVersionEl = $("#welcome-version");
const headerVersionEl = $("#header-version");
const settingsVersionEl = $("#settings-version");
const aboutVersionEl = $("#about-version");
const aboutLastUpdatedEl = $("#about-last-updated");
const aboutModalEl = $("#about-modal");
const toggleAboutBtn = $("#toggle-about");

fetch("/api/version")
  .then((r) => r.json())
  .then((d) => {
    if (!d.version) return;
    const v = `v${d.version}`;
    if (welcomeVersionEl) welcomeVersionEl.textContent = v;
    if (headerVersionEl) headerVersionEl.textContent = v;
    if (settingsVersionEl) settingsVersionEl.textContent = v;
    if (aboutVersionEl) aboutVersionEl.textContent = v;
    if (aboutLastUpdatedEl && d.lastUpdated) {
      aboutLastUpdatedEl.textContent = d.lastUpdated;
    }
  })
  .catch(() => {});

function openAbout() { aboutModalEl.classList.add("open"); }
function closeAbout() { aboutModalEl.classList.remove("open"); }

toggleAboutBtn.addEventListener("click", openAbout);
aboutModalEl.querySelectorAll("[data-about-close]").forEach((el) => {
  el.addEventListener("click", closeAbout);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && aboutModalEl.classList.contains("open")) {
    closeAbout();
  }
});

// ============================================================================
// Settings persistence
// ============================================================================
const STORAGE_KEY = "advisor-playground-settings-v1";

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// Track the user's custom system prompt separately so switching between
// presets doesn't clobber it. Updated only when the user edits the textarea
// while on the "custom" preset.
let customSystemPromptText = "";

function saveSettings() {
  // "na" is a display state (shown when Haiku is selected). Persist the user's
  // real selection instead so switching to Sonnet/Opus restores the right value.
  const effortToSave = effortEl.value === "na" ? savedEffortValue : effortEl.value;
  const data = {
    apiKey: apiKeyEl.value,
    executor: executorEl.value,
    advisor: advisorEl.value,
    mode: modeEl.value,
    maxTokens: parseInt(maxTokensEl.value, 10) || 8192,
    advisorCaching: advisorCachingEl.value,
    maxUses: parseMaxUses(maxUsesEl.value),
    effort: effortToSave,
    systemPrompt: systemEl.value,
    customSystemPrompt: customSystemPromptText,
    evalProvider: evalProviderEl.value,
    openaiKey: openaiKeyEl.value,
    judgePrompt: judgePromptEl.value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Parse and validate the max_uses input. Accepts positive integers only.
// Returns null for empty, invalid, or non-integer values (null = unlimited).
function parseMaxUses(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

function applySettings(s) {
  if (s.apiKey != null) apiKeyEl.value = s.apiKey;
  if (s.executor) executorEl.value = s.executor;
  if (s.advisor) advisorEl.value = s.advisor;
  if (s.mode) modeEl.value = s.mode;
  if (s.maxTokens) maxTokensEl.value = s.maxTokens;
  if (s.advisorCaching) advisorCachingEl.value = s.advisorCaching;
  if (s.maxUses != null && s.maxUses !== "") maxUsesEl.value = s.maxUses;
  if (s.effort) effortEl.value = s.effort;
  systemEl.value = s.systemPrompt || SYSTEM_PROMPT_RECOMMENDED;
  if (s.customSystemPrompt) customSystemPromptText = s.customSystemPrompt;
  if (s.evalProvider) evalProviderEl.value = s.evalProvider;
  if (s.openaiKey != null) openaiKeyEl.value = s.openaiKey;
  judgePromptEl.value = s.judgePrompt || DEFAULT_JUDGE_PROMPT;
}

applySettings(loadSettings());
if (!systemEl.value) systemEl.value = SYSTEM_PROMPT_RECOMMENDED;
if (!judgePromptEl.value) judgePromptEl.value = DEFAULT_JUDGE_PROMPT;
// Derive the preset dropdown from whatever text is currently in the textarea.
// Handles both first-load (defaults to Recommended) and returning users (if
// their saved text matches a preset, the dropdown reflects it).
systemPromptPresetEl.value = detectSystemPromptPreset(systemEl.value);
// If the user's current prompt is "custom" and we don't have a separate saved
// custom copy yet (e.g., first run of this version), seed it from the textarea.
if (systemPromptPresetEl.value === "custom" && !customSystemPromptText) {
  customSystemPromptText = systemEl.value;
}
updateOpenAIKeyVisibility();
updateTraceColumnCount();

// When the user picks a preset, populate the textarea with that preset's text.
// For "custom", restore their previously saved custom content (or the skeleton
// if they've never customized). Recommended/Precise always load their canonical
// text since they're meant to be Anthropic's exact recommendations.
systemPromptPresetEl.addEventListener("change", () => {
  const preset = systemPromptPresetEl.value;
  if (preset === "custom") {
    systemEl.value = customSystemPromptText || SYSTEM_PROMPT_CUSTOM_SKELETON;
  } else {
    systemEl.value = SYSTEM_PROMPT_PRESETS[preset] ?? "";
  }
  saveSettings();
  flashSavedIndicator();
});

// When the user edits the textarea, re-derive the preset. Editing a preset's
// text flips the dropdown to "custom" automatically — signals that they've
// diverged from the canonical preset content. When on custom, we also mirror
// the text into customSystemPromptText so switching to a preset and back
// restores the user's work.
systemEl.addEventListener("input", () => {
  systemPromptPresetEl.value = detectSystemPromptPreset(systemEl.value);
  if (systemPromptPresetEl.value === "custom") {
    customSystemPromptText = systemEl.value;
  }
});

function updateOpenAIKeyVisibility() {
  if (evalProviderEl.value === "openai") {
    openaiKeyWrapperEl.style.display = "";
  } else {
    openaiKeyWrapperEl.style.display = "none";
  }
}

// If there's no Anthropic API key stored, auto-open the Anthropic API section
// so it's immediately visible when the user opens settings.
const sectionAnthropicApi = $("#section-anthropic-api");
if (!apiKeyEl.value.trim() && sectionAnthropicApi) {
  sectionAnthropicApi.open = true;
}

// First-launch onboarding handled by the welcome slideshow below.
// If the user has already dismissed the welcome but still has no key,
// the welcome-init code falls back to opening the settings modal directly.

// ============================================================================
// Settings modal open/close
// ============================================================================
function openSettings() { settingsPanelEl.classList.add("open"); }
function closeSettings() { settingsPanelEl.classList.remove("open"); }

toggleSettingsBtn.addEventListener("click", openSettings);
settingsPanelEl.querySelectorAll("[data-close]").forEach((el) => {
  el.addEventListener("click", closeSettings);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && settingsPanelEl.classList.contains("open")) {
    closeSettings();
  }
});

// ============================================================================
// Auto-save on any settings change
// ============================================================================
let savedFlashTimer = null;
function flashSavedIndicator() {
  if (!savedIndicatorEl) return;
  savedIndicatorEl.classList.add("flash");
  clearTimeout(savedFlashTimer);
  savedFlashTimer = setTimeout(() => savedIndicatorEl.classList.remove("flash"), 800);
}

[
  apiKeyEl,
  executorEl,
  advisorEl,
  modeEl,
  maxTokensEl,
  advisorCachingEl,
  maxUsesEl,
  effortEl,
  systemEl,
  evalProviderEl,
  openaiKeyEl,
  judgePromptEl,
].forEach((el) => {
  if (!el) return;
  const evt = el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input";
  el.addEventListener(evt, () => {
    saveSettings();
    flashSavedIndicator();
  });
});

// Strip invalid characters from max_uses on blur so the field reflects what
// will actually be sent. Empty = unlimited; anything else must parse as a
// positive integer.
maxUsesEl.addEventListener("blur", () => {
  const parsed = parseMaxUses(maxUsesEl.value);
  maxUsesEl.value = parsed == null ? "" : String(parsed);
});

// Effort availability coordinates two independent conditions:
// 1. Haiku 4.5 doesn't support effort — dropdown disabled + shows "n/a" when
//    Haiku is executor. The user's real effort selection is preserved and
//    restored when they switch back to Sonnet/Opus.
// 2. Effort is locked after the first successful turn — same reasoning as mode
//    locking (switching mid-conversation would make turn comparisons unfair).
const EFFORT_TITLE_DEFAULT = effortEl.title;
const EFFORT_TITLE_HAIKU = "Effort not supported for Haiku 4.5";
const EFFORT_TITLE_LOCKED =
  "Effort is locked once a conversation starts. Click ＋ to start a new chat and change effort.";
const effortRowEl = effortEl.closest(".config-row");
let effortLocked = false;
// Track the user's real effort selection separately from what the dropdown
// displays, so the "n/a" state doesn't clobber their preference.
let savedEffortValue = effortEl.value;

function ensureNaOption() {
  if (!effortEl.querySelector('option[value="na"]')) {
    const naOption = document.createElement("option");
    naOption.value = "na";
    naOption.textContent = "n/a";
    effortEl.insertBefore(naOption, effortEl.firstChild);
  }
}

function removeNaOption() {
  const naOption = effortEl.querySelector('option[value="na"]');
  if (naOption) naOption.remove();
}

function updateEffortAvailability() {
  const isHaiku = executorEl.value.startsWith("claude-haiku");

  if (isHaiku) {
    // Capture the real selection before swapping to "n/a", but only if the
    // dropdown isn't already showing "n/a" (avoid overwriting on repeat calls).
    if (effortEl.value !== "na") savedEffortValue = effortEl.value;
    ensureNaOption();
    effortEl.value = "na";
  } else {
    removeNaOption();
    if (effortEl.value === "na" || !effortEl.value) {
      effortEl.value = savedEffortValue || "high";
    }
  }

  effortEl.disabled = isHaiku || effortLocked;
  let title = EFFORT_TITLE_DEFAULT;
  if (effortLocked) title = EFFORT_TITLE_LOCKED;
  else if (isHaiku) title = EFFORT_TITLE_HAIKU;
  effortEl.title = title;
}

function setEffortLocked(locked) {
  effortLocked = locked;
  updateEffortAvailability();
}

executorEl.addEventListener("change", updateEffortAvailability);
updateEffortAvailability();

// When the provider changes, toggle the OpenAI key field visibility
evalProviderEl.addEventListener("change", updateOpenAIKeyVisibility);

// Mode change updates the trace column grid. The selector is locked after
// the first successful turn (see setModeLocked) so users can't change modes
// mid-conversation — that would make the totals dashboard apples-to-oranges
// and leave newly-activated branches without prior history context.
modeEl.addEventListener("change", () => {
  updateTraceColumnCount();
});

function updateTraceColumnCount() {
  const n = branchesForMode(modeEl.value).length;
  traceEl.style.setProperty("--cols", String(n));
  traceEl.dataset.cols = String(n);
}

const modeRowEl = modeEl.closest(".config-row");
const MODE_TITLE_DEFAULT =
  "Run the same prompt in parallel against additional baselines. Costs 2× or 3× per message.";
const MODE_TITLE_LOCKED =
  "Mode is locked once a conversation starts. Click ＋ to start a new chat and change modes.";

function setModeLocked(locked) {
  modeEl.disabled = locked;
  if (modeRowEl) {
    modeRowEl.title = locked ? MODE_TITLE_LOCKED : MODE_TITLE_DEFAULT;
    modeRowEl.classList.toggle("locked", locked);
  }
}

// Executor model is locked after the first successful turn — switching mid-
// conversation would make the branches mismatch what produced their history.
const executorRowEl = executorEl.closest(".config-row");
const EXECUTOR_TITLE_LOCKED =
  "Executor is locked once a conversation starts. Click ＋ to start a new chat and change executors.";
function setExecutorLocked(locked) {
  executorEl.disabled = locked;
  if (executorRowEl) {
    executorRowEl.title = locked ? EXECUTOR_TITLE_LOCKED : "";
    executorRowEl.classList.toggle("locked", locked);
  }
}

// Advisor model is locked after the first successful turn — same reasoning as
// the executor. Currently only one advisor option exists, but locking keeps
// the UI consistent and future-proofs for when additional advisor models ship.
const advisorRowEl = advisorEl.closest(".config-row");
const ADVISOR_TITLE_LOCKED =
  "Advisor is locked once a conversation starts. Click ＋ to start a new chat and change advisors.";
function setAdvisorLocked(locked) {
  advisorEl.disabled = locked;
  if (advisorRowEl) {
    advisorRowEl.title = locked ? ADVISOR_TITLE_LOCKED : "";
    advisorRowEl.classList.toggle("locked", locked);
  }
}

// ============================================================================
// Utilities
// ============================================================================
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const COPY_ICON_SVG =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
  '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
  '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
  '</svg>';

// Reusable copy-to-clipboard button. `getText` is called lazily on each click
// so the button always copies the currently displayed content (important when
// the underlying text can change while the button is mounted).
function makeCopyButton(getText, opts = {}) {
  const label = opts.label || "Copy";
  const ariaLabel = opts.ariaLabel || "Copy to clipboard";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-btn";
  btn.setAttribute("aria-label", ariaLabel);
  btn.innerHTML = COPY_ICON_SVG + '<span class="copy-btn-label">' + escapeHtml(label) + "</span>";

  let resetTimer = null;
  const flash = (text, cls) => {
    if (resetTimer) clearTimeout(resetTimer);
    btn.classList.remove("copied", "failed");
    if (cls) btn.classList.add(cls);
    btn.querySelector(".copy-btn-label").textContent = text;
    resetTimer = setTimeout(() => {
      btn.classList.remove("copied", "failed");
      btn.querySelector(".copy-btn-label").textContent = label;
      resetTimer = null;
    }, 1400);
  };

  btn.addEventListener("click", async () => {
    try {
      const text = typeof getText === "function" ? getText() : String(getText ?? "");
      await navigator.clipboard.writeText(text);
      flash("✓ Copied", "copied");
    } catch (err) {
      flash("Copy failed", "failed");
    }
  });

  return btn;
}

// Builds a Full I/O viewer section: header (label + copy button) +
// Prism-highlighted JSON code block. The wrap state is global (controlled by
// the "Wrap code" toggle in the trace header), not per-section.
// `copyable=false` skips the copy button (e.g. for "(unavailable)").
function renderIOSection(label, jsonText, copyable) {
  const section = document.createElement("div");
  section.className = "io-section";

  const header = document.createElement("div");
  header.className = "io-section-header";

  const labelEl = document.createElement("div");
  labelEl.className = "io-label";
  labelEl.textContent = label;
  header.appendChild(labelEl);

  if (copyable) {
    header.appendChild(makeCopyButton(() => jsonText, { ariaLabel: `Copy ${label}` }));
  }
  section.appendChild(header);

  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.className = "language-json";
  code.textContent = jsonText;
  // Inherit the current global wrap state on render so newly added sections
  // match what the user already sees in other branches.
  if (wrapTraceCodeEl && !wrapTraceCodeEl.checked) {
    pre.classList.add("io-nowrap");
  }
  pre.appendChild(code);
  section.appendChild(pre);

  if (typeof Prism !== "undefined") {
    Prism.highlightElement(code);
  }

  return section;
}

function addMessage(role, text, cls = "", parent = messagesEl) {
  const div = document.createElement("div");
  div.className = `msg ${role} ${cls}`.trim();

  // Errors that reference "the Settings modal" or "the settings" should have
  // a clickable link that opens the settings modal.
  if (cls === "error" && /settings/i.test(text)) {
    const re = /(Settings modal|the settings)/i;
    const match = text.match(re);
    if (match) {
      const before = text.slice(0, match.index);
      const linkText = match[0];
      const after = text.slice(match.index + linkText.length);
      div.appendChild(document.createTextNode(before));
      const link = document.createElement("a");
      link.className = "open-settings-link";
      link.textContent = linkText;
      link.href = "#";
      link.addEventListener("click", (e) => {
        e.preventDefault();
        openSettings();
      });
      div.appendChild(link);
      div.appendChild(document.createTextNode(after));
    } else {
      div.textContent = text;
    }
  } else {
    div.textContent = text;
  }

  parent.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function syncTurnCollapse(turnIdx, collapsed) {
  if (!syncPanesEl || !syncPanesEl.checked) return;
  const chatTurn = messagesEl.querySelector(`.chat-turn[data-turn="${turnIdx}"]`);
  const traceGroup = traceEl.querySelector(`.turn-group[data-turn="${turnIdx}"]`);
  if (chatTurn) chatTurn.classList.toggle("collapsed", collapsed);
  if (traceGroup) traceGroup.classList.toggle("collapsed", collapsed);
}

function createChatTurn(turnIdx, previewText) {
  const wrap = document.createElement("div");
  wrap.className = "chat-turn";
  wrap.dataset.turn = turnIdx;

  const header = document.createElement("div");
  header.className = "chat-turn-header";
  const truncated = (previewText || "").replace(/\s+/g, " ").slice(0, 100);
  const preview = (previewText || "").length > 100 ? `${truncated}…` : truncated;
  header.innerHTML = `
    <span class="chat-turn-label">Turn ${turnIdx}</span>
    <span class="chat-turn-preview">${escapeHtml(preview)}</span>
    <span class="chat-turn-toggle">▾</span>
  `;
  wrap.appendChild(header);

  const body = document.createElement("div");
  body.className = "chat-turn-body";
  wrap.appendChild(body);

  header.addEventListener("click", () => {
    wrap.classList.toggle("collapsed");
    syncTurnCollapse(turnIdx, wrap.classList.contains("collapsed"));
  });

  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  // Caller appends to the body (not the outer wrap), so return it.
  return body;
}

function addBranchBubble(branch, parent = messagesEl) {
  const wrap = document.createElement("div");
  wrap.className = `branch-bubble ${BRANCHES[branch].cls} branch-pending`;
  wrap.innerHTML = `
    <div class="branch-chip-row">
      <span class="branch-chip">${escapeHtml(BRANCHES[branch].label)}</span>
      <span class="branch-model-pill" title="Models used by this branch">${escapeHtml(branchModelBadge(branch))}</span>
      <span class="branch-elapsed">0.0s</span>
      <span class="branch-toggle" title="Collapse / expand this branch">▾</span>
    </div>
    <div class="branch-body thinking">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    </div>
  `;
  parent.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  // Clicking the chip row toggles collapse on this single branch bubble
  wrap.querySelector(".branch-chip-row").addEventListener("click", () => {
    wrap.classList.toggle("collapsed");
  });

  // Live elapsed-time counter so it's obvious the request is in-flight.
  const started = Date.now();
  const elapsedEl = wrap.querySelector(".branch-elapsed");
  wrap._timerId = setInterval(() => {
    const secs = (Date.now() - started) / 1000;
    elapsedEl.textContent = secs < 10 ? `${secs.toFixed(1)}s` : `${Math.floor(secs)}s`;
  }, 100);

  return wrap;
}

function clearBubbleTimer(wrap) {
  if (wrap && wrap._timerId) {
    clearInterval(wrap._timerId);
    delete wrap._timerId;
  }
}

function finishBranchBubble(wrap, text, isError = false) {
  clearBubbleTimer(wrap);
  wrap.classList.remove("branch-pending");
  if (isError) wrap.classList.add("branch-error");
  // Drop the elapsed chip — final duration is shown in the trace card
  const elapsed = wrap.querySelector(".branch-elapsed");
  if (elapsed) elapsed.remove();
  const body = wrap.querySelector(".branch-body");
  body.classList.remove("thinking");
  body.innerHTML = "";
  body.textContent = text;
}

function addSystemNote(text) {
  const div = document.createElement("div");
  div.className = "system-note";
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function extractAssistantText(content) {
  return content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

// ============================================================================
// Step mapping (unchanged from prior versions; see earlier commits for rationale)
// ============================================================================
function mapStepsToBlocks(content, iterations, executorModel, topLevelUsage) {
  // Baseline branches (executor-solo, advisor-model-solo) use the non-beta
  // endpoint which does NOT return a usage.iterations[] array. In that case,
  // synthesize a single executor step from the top-level usage fields.
  if (!iterations || iterations.length === 0) {
    const iter = {
      type: "message",
      input_tokens: topLevelUsage?.input_tokens || 0,
      output_tokens: topLevelUsage?.output_tokens || 0,
      cache_read_input_tokens: topLevelUsage?.cache_read_input_tokens || 0,
      cache_creation_input_tokens: topLevelUsage?.cache_creation_input_tokens || 0,
    };
    return [{ role: "executor", model: executorModel, iter, blocks: content || [] }];
  }

  const steps = [];
  let iterIdx = 0;
  let currentBlocks = [];

  const flushExecutor = () => {
    const iter = iterations[iterIdx] || {};
    steps.push({ role: "executor", model: executorModel, iter, blocks: currentBlocks });
    iterIdx += 1;
    currentBlocks = [];
  };

  for (const block of content) {
    if (block.type === "server_tool_use") {
      currentBlocks.push(block);
      flushExecutor();
    } else if (block.type === "advisor_tool_result") {
      const iter = iterations[iterIdx] || {};
      steps.push({ role: "advisor", model: iter.model || "(advisor)", iter, blocks: [block] });
      iterIdx += 1;
    } else {
      currentBlocks.push(block);
    }
  }

  if (currentBlocks.length > 0 || iterIdx < iterations.length) {
    flushExecutor();
  }
  return steps;
}

// Map Anthropic advisor error codes to human-readable messages. The request
// itself succeeds when these fire — the executor sees the error in the tool
// result and continues without further advice.
const ADVISOR_ERROR_MESSAGES = {
  max_uses_exceeded: "Advisor call limit reached for this request",
  too_many_requests: "Advisor rate-limited",
  overloaded: "Advisor capacity exceeded",
  prompt_too_long: "Conversation too long for advisor",
  execution_time_exceeded: "Advisor timed out",
  unavailable: "Advisor unavailable",
};

function blockPreview(block) {
  const wrap = document.createElement("div");
  wrap.className = "produced-block";

  if (block.type === "text") {
    wrap.innerHTML = `<span class="bt bt-text">text</span><pre>${escapeHtml(block.text)}</pre>`;
  } else if (block.type === "server_tool_use") {
    wrap.innerHTML = `<span class="bt bt-tool">server_tool_use → ${escapeHtml(block.name)}</span><pre class="muted">id: ${escapeHtml(block.id)} · input: ${escapeHtml(JSON.stringify(block.input || {}))}</pre>`;
  } else if (block.type === "advisor_tool_result") {
    const c = block.content || {};
    if (c.type === "advisor_result") {
      wrap.innerHTML = `<span class="bt bt-advice">advice</span><pre>${escapeHtml(c.text || "")}</pre>`;
    } else if (c.type === "advisor_redacted_result") {
      const len = (c.encrypted_content || "").length;
      wrap.innerHTML = `
        <span class="bt bt-advice">advice · redacted</span>
        <pre class="muted">Advisor response is encrypted — content not visible to the client. The executor still received the plaintext advice server-side.
encrypted_content: ${len} chars</pre>`;
    } else if (c.type === "advisor_tool_result_error") {
      const code = c.error_code || "unknown";
      const humanMsg = ADVISOR_ERROR_MESSAGES[code] || "Advisor failure";
      wrap.innerHTML = `
        <span class="bt bt-error">advisor error</span>
        <pre><strong>${escapeHtml(humanMsg)}</strong>
error_code: ${escapeHtml(code)}

The request itself succeeded — the executor continued without further advice.</pre>`;
    } else {
      wrap.innerHTML = `<span class="bt">advisor_tool_result</span><pre>${escapeHtml(JSON.stringify(c, null, 2))}</pre>`;
    }
  } else {
    wrap.innerHTML = `<span class="bt">${escapeHtml(block.type)}</span><pre>${escapeHtml(JSON.stringify(block, null, 2))}</pre>`;
  }
  return wrap;
}

function hasAdvisorError(step) {
  return step.blocks.some(
    (b) => b.type === "advisor_tool_result" && b.content?.type === "advisor_tool_result_error"
  );
}

function renderStep(step, idx, opts = {}) {
  const card = document.createElement("div");
  const roleClass = step.role === "advisor" ? "step-advisor" : "step-executor";
  const errorClass = hasAdvisorError(step) ? " step-error" : "";
  card.className = `step ${roleClass}${errorClass}`;

  const cost = estCost(step.model, step.iter);
  const iter = step.iter;

  // For advisor steps, show "Advisor · call N" or "Advisor · call N of M" when
  // the user set a max_uses cap. This makes multi-call conversations easy to
  // follow in the trace.
  let roleLabel;
  if (step.role === "advisor") {
    const { advisorCallIdx, maxUses } = opts;
    if (advisorCallIdx != null) {
      const suffix =
        Number.isInteger(maxUses) && maxUses > 0
          ? `call ${advisorCallIdx} of ${maxUses}`
          : `call ${advisorCallIdx}`;
      roleLabel = `Advisor · ${suffix}`;
    } else {
      roleLabel = "Advisor";
    }
  } else {
    roleLabel = step.blocks.some((b) => b.type === "server_tool_use")
      ? "Executor · calling advisor"
      : "Executor";
  }

  card.innerHTML = `
    <div class="step-head">
      <span class="step-num">${idx + 1}</span>
      <span class="step-role">${escapeHtml(roleLabel)}</span>
      <span class="step-model">${escapeHtml(step.model)}</span>
      <span class="step-cost" title="Estimated cost based on public list prices. Approximate.">${fmtCost(cost)}</span>
    </div>
    <div class="step-tokens">
      <span><b>in</b> ${fmtNum(iter.input_tokens)}</span>
      <span><b>out</b> ${fmtNum(iter.output_tokens)}</span>
      ${
        step.role === "advisor"
          ? `<span title="cache_read_input_tokens — served from prompt cache at ~10% of input rate"><b>cache_r</b> ${fmtNum(iter.cache_read_input_tokens)}</span>
             <span title="cache_creation_input_tokens — written into cache (~125% of input rate, one-time)"><b>cache_w</b> ${fmtNum(iter.cache_creation_input_tokens)}</span>`
          : ""
      }
    </div>
  `;

  const produced = document.createElement("div");
  produced.className = "step-produced";
  const producedTitle = document.createElement("div");
  producedTitle.className = "produced-title";
  producedTitle.textContent = step.role === "advisor" ? "Advisor output" : "Produced";
  produced.appendChild(producedTitle);
  step.blocks.forEach((b) => produced.appendChild(blockPreview(b)));
  card.appendChild(produced);

  return card;
}

function computeTotals(steps, run) {
  let totalIn = 0, totalOut = 0, totalCacheR = 0, totalCacheW = 0, totalCost = 0, hasUnknownPrice = false;
  for (const s of steps) {
    totalIn += s.iter.input_tokens || 0;
    totalOut += s.iter.output_tokens || 0;
    totalCacheR += s.iter.cache_read_input_tokens || 0;
    totalCacheW += s.iter.cache_creation_input_tokens || 0;
    const c = estCost(s.model, s.iter);
    if (c == null) hasUnknownPrice = true;
    else totalCost += c;
  }
  return {
    input: totalIn,
    output: totalOut,
    cache_r: totalCacheR,
    cache_w: totalCacheW,
    cost: hasUnknownPrice ? null : totalCost,
    duration_ms: run.duration_ms,
    advisorCalls: steps.filter((s) => s.role === "advisor").length,
    stepCount: steps.length,
  };
}

function renderTurnSummary(totals, maxUses) {
  const wrap = document.createElement("div");
  wrap.className = "turn-summary";
  // When showing a ratio, always use plural "calls" — "2 / 1 advisor call"
  // reads awkward. Only use the count-based singular when no ratio is shown.
  const advisorPill =
    Number.isInteger(maxUses) && maxUses > 0
      ? `${totals.advisorCalls} / ${maxUses} advisor calls`
      : `${totals.advisorCalls} advisor call${totals.advisorCalls === 1 ? "" : "s"}`;
  wrap.innerHTML = `
    <div class="summary-row">
      <span class="pill pill-advisor">${advisorPill}</span>
      <span class="pill">${totals.stepCount} step${totals.stepCount === 1 ? "" : "s"}</span>
    </div>
    <div class="summary-grid">
      <div><div class="k">in</div><div class="v">${fmtNum(totals.input)}</div></div>
      <div><div class="k">out</div><div class="v">${fmtNum(totals.output)}</div></div>
      <div><div class="k">cost</div><div class="v">${totals.cost == null ? "—" : fmtCost(totals.cost)}</div></div>
      <div><div class="k">time</div><div class="v">${fmtDuration(totals.duration_ms)}</div></div>
    </div>
  `;
  return wrap;
}

// Cumulative per-branch totals shown in the strip pinned above the trace
// list. Refreshed after every successful turn. Hidden entirely on an empty
// conversation.
function renderDashboard() {
  if (!traceTotalsEl) return;

  if (conversationTurnCount === 0) {
    traceTotalsEl.hidden = true;
    traceTotalsEl.innerHTML = "";
    return;
  }

  const activeBranches = branchesForMode(modeEl.value);

  // Each metric carries:
  //   numFor   — the raw comparable number (used to pick the leader)
  //   valueFor — the display string (already formatted)
  //   known    — whether this branch's value is comparable (false = the cost
  //              for that branch is unknown and should be excluded from the
  //              leader calculation)
  // Lower is better for all four metrics — fewer tokens, cheaper, faster.
  const metrics = [
    {
      label: "in",
      numFor:   (b) => conversationTotals[b].input,
      valueFor: (b) => fmtNum(conversationTotals[b].input),
      known:    ()  => true,
    },
    {
      label: "out",
      numFor:   (b) => conversationTotals[b].output,
      valueFor: (b) => fmtNum(conversationTotals[b].output),
      known:    ()  => true,
    },
    {
      label: "cost",
      numFor:   (b) => conversationTotals[b].cost,
      valueFor: (b) => conversationTotals[b].costUnknown ? "—" : fmtCost(conversationTotals[b].cost),
      known:    (b) => !conversationTotals[b].costUnknown,
    },
    {
      label: "time",
      numFor:   (b) => conversationTotals[b].durationMs,
      valueFor: (b) => fmtDuration(conversationTotals[b].durationMs),
      known:    ()  => true,
    },
  ];

  // Only show a leader marker when there's an actual comparison to make.
  const showLeader = activeBranches.length >= 2;

  const tileHtml = metrics
    .map((m) => {
      const comparable = activeBranches.filter((b) => m.known(b));
      const minN = comparable.length > 0
        ? Math.min(...comparable.map((b) => m.numFor(b)))
        : null;

      const rows = activeBranches
        .map((b) => {
          const isLeader =
            showLeader && m.known(b) && minN != null && m.numFor(b) === minN;
          const marker = isLeader
            ? `<span class="totals-leader" title="Lowest — leading on this metric">←</span>`
            : "";
          return `<span class="totals-tile-v ${BRANCHES[b].cls}">${escapeHtml(m.valueFor(b))}${marker}</span>`;
        })
        .join("");

      return `
        <div class="totals-tile">
          <div class="totals-tile-k">${m.label}</div>
          <div class="totals-tile-vstack">${rows}</div>
        </div>
      `;
    })
    .join("");

  const turnsTile = `
    <div class="totals-tile totals-tile-turns">
      <div class="totals-tile-k">turns</div>
      <div class="totals-tile-vstack">
        <span class="totals-tile-v totals-tile-v-solo">${conversationTurnCount}</span>
      </div>
    </div>
  `;

  const legendHtml = activeBranches
    .map(
      (b) =>
        `<span class="totals-legend-item ${BRANCHES[b].cls}">
          <span class="totals-legend-dot"></span>${escapeHtml(BRANCHES[b].label)}
          <span class="totals-legend-model">${escapeHtml(branchModelBadge(b))}</span>
        </span>`
    )
    .join("");

  // Effort is locked after the first turn, so it's consistent across the whole
  // conversation. Haiku 4.5 doesn't support effort → show "n/a (<model>)"
  // instead of a value that wasn't actually sent. Styled to match the branch
  // legend items (dot + label + value) with its own accent color on the label.
  const isHaiku = executorEl.value.startsWith("claude-haiku");
  const effortLabel = isHaiku
    ? `n/a (${shortModel(executorEl.value)})`
    : effortEl.value;
  const effortHtml = `<span class="totals-legend-item legend-effort">
    <span class="totals-legend-dot"></span>EFFORT
    <span class="totals-legend-model">${escapeHtml(effortLabel)}</span>
  </span>`;

  traceTotalsEl.hidden = false;
  traceTotalsEl.innerHTML = `
    <div class="totals-grid">${tileHtml}${turnsTile}</div>
    <div class="totals-legend">${legendHtml}${effortHtml}</div>
  `;
}

function renderTurnCard(turnIdx, branch, run, userText, opts = {}) {
  const turn = document.createElement("div");
  turn.className = `turn ${BRANCHES[branch].cls}`;

  if (run.error) {
    turn.innerHTML = `
      <div class="turn-header">
        <span class="turn-title">${escapeHtml(BRANCHES[branch].label)}</span>
        <span class="turn-model-badge">${escapeHtml(branchModelBadge(branch))}</span>
        <span class="turn-meta">
          <span class="turn-duration">⏱ ${fmtDuration(run.duration_ms)}</span>
        </span>
      </div>
      <div class="turn-error"><b>Error:</b> ${escapeHtml(run.error)}</div>
    `;
    return { el: turn, totals: null };
  }

  const steps = mapStepsToBlocks(
    run.content,
    run.usage?.iterations,
    run.model || executorEl.value,
    run.usage
  );

  const totals = computeTotals(steps, run);

  const header = document.createElement("div");
  header.className = "turn-header";
  header.innerHTML = `
    <span class="turn-title">${escapeHtml(BRANCHES[branch].label)}</span>
    <span class="turn-model-badge" title="Models used by this branch">${escapeHtml(branchModelBadge(branch))}</span>
    <span class="turn-meta">
      <span class="turn-stop"><code title="stop_reason">${escapeHtml(run.stop_reason || "?")}</code></span>
      <span class="turn-duration" title="Wall-clock duration of this branch's API call">⏱ ${fmtDuration(run.duration_ms)}</span>
      <span class="turn-toggle">▾</span>
    </span>
  `;
  turn.appendChild(header);

  // max_uses is only relevant for the advisor branch (baselines don't call it).
  const maxUsesForBranch = branch === "advisor" ? opts.maxUses : null;

  turn.appendChild(renderTurnSummary(totals, maxUsesForBranch));

  const body = document.createElement("div");
  body.className = "turn-body";

  const userSection = document.createElement("div");
  userSection.className = "user-section";
  userSection.innerHTML = `<div class="section-label">Prompt</div><pre class="user-text">${escapeHtml(userText)}</pre>`;
  body.appendChild(userSection);

  const timeline = document.createElement("div");
  timeline.className = "timeline";
  let advisorCallCounter = 0;
  steps.forEach((s, i) => {
    const stepOpts = {};
    if (s.role === "advisor") {
      advisorCallCounter += 1;
      stepOpts.advisorCallIdx = advisorCallCounter;
      stepOpts.maxUses = maxUsesForBranch;
    }
    timeline.appendChild(renderStep(s, i, stepOpts));
    if (i < steps.length - 1) {
      const arrow = document.createElement("div");
      arrow.className = "step-arrow";
      arrow.textContent = "↓";
      timeline.appendChild(arrow);
    }
  });
  body.appendChild(timeline);

  const raw = document.createElement("details");
  raw.className = "raw-toggle";

  const requestObj = run.request || null;
  const responseObj = {
    model: run.model,
    stop_reason: run.stop_reason,
    duration_ms: run.duration_ms,
    usage: run.usage,
    content: run.content,
  };

  const summary = document.createElement("summary");
  summary.textContent = "View full I/O (request + response)";
  raw.appendChild(summary);

  const requestText = requestObj ? JSON.stringify(requestObj, null, 2) : "(unavailable)";
  const responseText = JSON.stringify(responseObj, null, 2);

  raw.appendChild(renderIOSection("Request sent to the API", requestText, requestObj != null));
  raw.appendChild(renderIOSection("Response from the API", responseText, true));

  body.appendChild(raw);

  turn.appendChild(body);

  header.addEventListener("click", () => turn.classList.toggle("collapsed"));

  return { el: turn, totals };
}

function renderDeltaPills(branchTotals) {
  // Only render deltas when there are ≥ 2 branches and advisor is present
  const branches = Object.keys(branchTotals).filter((b) => branchTotals[b]);
  if (branches.length < 2 || !branchTotals.advisor) return null;

  const advisorT = branchTotals.advisor;
  const wrap = document.createElement("div");
  wrap.className = "delta-row";

  for (const b of branches) {
    if (b === "advisor") continue;
    const t = branchTotals[b];
    if (!t) continue;

    const dIn = t.input - advisorT.input;
    const dOut = t.output - advisorT.output;
    const dCost = (t.cost != null && advisorT.cost != null) ? (t.cost - advisorT.cost) : null;
    const dDur = (t.duration_ms != null && advisorT.duration_ms != null) ? (t.duration_ms - advisorT.duration_ms) : null;

    const pill = document.createElement("div");
    pill.className = `delta-pill ${BRANCHES[b].cls}`;
    pill.title =
      "Delta = (baseline − advisor). Negative means the baseline used less / was cheaper / was faster. " +
      "Green = baseline beat the advisor on this metric; red = baseline lost.";
    pill.innerHTML = `
      <div class="delta-pill-title">${escapeHtml(BRANCHES[b].label)} vs Advisor</div>
      <div class="delta-pill-row">
        <span>in: ${fmtDelta(dIn, fmtNum, true)}</span>
        <span>out: ${fmtDelta(dOut, fmtNum, true)}</span>
        <span>cost: ${dCost == null ? "—" : fmtDelta(dCost, fmtCostSigned, true)}</span>
        <span>time: ${dDur == null ? "—" : fmtDelta(dDur, fmtDuration, true)}</span>
      </div>
    `;
    wrap.appendChild(pill);
  }
  return wrap;
}

// ============================================================================
// Send + render
// ============================================================================
let turnCounter = 0;

// Per-turn evaluation state: turnIdx -> { status, userText, branchResponses, groupEl, bodyEl, isFirstTurn, evalData }
const turnState = new Map();

async function send(userText) {
  sendBtn.disabled = true;

  // Capture max_uses at send time so the render reflects what was actually
  // sent, even if the user edits the input while the request is in flight.
  const turnMaxUses = parseMaxUses(maxUsesEl.value);

  // Lock all config selectors the moment the user hits send — gives immediate
  // visual feedback that the conversation has started. If the send fails
  // before any turn is recorded, the finally block unlocks them again so the
  // user can retry with different settings.
  const wasFirstTurn = conversationTurnCount === 0;
  if (wasFirstTurn) {
    setModeLocked(true);
    setEffortLocked(true);
    setExecutorLocked(true);
    setAdvisorLocked(true);
  }

  // Bump turn counter at the start so chat and trace share the same number.
  turnCounter += 1;
  const currentTurn = turnCounter;

  // Create the per-turn wrapper in the chat pane and append user + branches to it.
  // createChatTurn returns the body element (inside the collapsible wrapper).
  const chatTurn = createChatTurn(currentTurn, userText);
  addMessage("user", userText, "", chatTurn);

  const mode = modeEl.value;
  const activeBranches = branchesForMode(mode);

  const pendingBubbles = {};
  for (const b of activeBranches) {
    pendingBubbles[b] = addBranchBubble(b, chatTurn);
  }

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userMessage: userText,
        histories: branchHistories,
        executorModel: executorEl.value,
        advisorModel: advisorEl.value,
        systemPrompt: systemEl.value,
        maxTokens: parseInt(maxTokensEl.value, 10) || 8192,
        advisorCaching: advisorCachingEl.value,
        maxUses: turnMaxUses,
        effort: executorEl.value.startsWith("claude-haiku") ? null : effortEl.value,
        apiKey: apiKeyEl.value || undefined,
        mode,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      for (const b of activeBranches) {
        clearBubbleTimer(pendingBubbles[b]);
        pendingBubbles[b].remove();
      }
      addMessage("assistant", `Error: ${err.error || res.statusText}`, "error", chatTurn);
      return;
    }

    const data = await res.json();
    const runs = data.runs || {};

    // Update chat bubbles and persist successful branches to local history.
    for (const b of activeBranches) {
      const run = runs[b];
      if (!run || run.error) {
        finishBranchBubble(pendingBubbles[b], `Error: ${run?.error || "unknown"}`, true);
      } else {
        finishBranchBubble(
          pendingBubbles[b],
          extractAssistantText(run.content) || "(no text output)"
        );
        branchHistories[b].push({ role: "user", content: userText });
        branchHistories[b].push({ role: "assistant", content: run.content });
      }
    }

    // Build the turn group wrapper: header (always visible) + body (collapsible)
    const group = document.createElement("div");
    group.className = "turn-group";
    group.dataset.turn = currentTurn;

    const groupHeader = document.createElement("div");
    groupHeader.className = "turn-group-header";
    groupHeader.innerHTML = `<span class="turn-group-title">Turn ${currentTurn}</span>`;

    const stripEl = document.createElement("div");
    stripEl.className = "turn-group-summary-strip";
    groupHeader.appendChild(stripEl);

    // Evaluate button — shown only when ≥ 2 branches are active and we have
    // at least 2 non-error responses to compare. Stopping propagation so
    // clicking it doesn't toggle the group collapse.
    const evalBtn = document.createElement("button");
    evalBtn.className = "eval-btn";
    evalBtn.type = "button";
    evalBtn.textContent = "Evaluate";
    evalBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      triggerEvaluation(currentTurn);
    });
    groupHeader.appendChild(evalBtn);

    const toggleEl = document.createElement("span");
    toggleEl.className = "turn-group-toggle";
    toggleEl.textContent = "▾";
    groupHeader.appendChild(toggleEl);

    // Body: turn row with one card per branch, followed by delta pills
    const groupBody = document.createElement("div");
    groupBody.className = "turn-group-body";

    const turnRow = document.createElement("div");
    turnRow.className = "turn-row";

    const branchTotals = {};
    for (const b of activeBranches) {
      const run = runs[b];
      if (!run) continue;
      const { el, totals } = renderTurnCard(currentTurn, b, run, userText, { maxUses: turnMaxUses });
      branchTotals[b] = totals;
      turnRow.appendChild(el);

      // Compact chip for the group header strip
      const chip = document.createElement("div");
      chip.className = `group-summary-chip ${BRANCHES[b].cls}`;
      if (totals) {
        chip.innerHTML = `
          <span class="chip-label">${escapeHtml(BRANCHES[b].label)}</span>
          <span class="chip-nums">${fmtNum(totals.input)} in · ${fmtNum(totals.output)} out · ${totals.cost == null ? "—" : fmtCost(totals.cost)} · ${fmtDuration(totals.duration_ms)}</span>
        `;
      } else {
        chip.innerHTML = `
          <span class="chip-label">${escapeHtml(BRANCHES[b].label)}</span>
          <span class="chip-nums chip-error">error</span>
        `;
      }
      stripEl.appendChild(chip);
    }

    // Delta pills go ABOVE the turn row so they don't float to the bottom
    // when one column (usually advisor) is much taller than the others.
    const deltaRow = renderDeltaPills(branchTotals);
    if (deltaRow) groupBody.appendChild(deltaRow);
    groupBody.appendChild(turnRow);

    group.appendChild(groupHeader);
    group.appendChild(groupBody);

    // Click the group header (but not the inner turn cards) to collapse/expand
    groupHeader.addEventListener("click", () => {
      group.classList.toggle("collapsed");
      syncTurnCollapse(currentTurn, group.classList.contains("collapsed"));
    });

    // Register turn state so the Evaluate button can find this turn's data later.
    // Build a map of branch -> response text (for branches that actually returned).
    const branchResponses = {};
    for (const b of activeBranches) {
      const run = runs[b];
      if (run && !run.error) {
        const text = extractAssistantText(run.content);
        if (text) branchResponses[b] = text;
      }
    }
    const successfulBranches = Object.keys(branchResponses).length;

    // Hide Evaluate if there aren't at least 2 successful branches to compare.
    if (successfulBranches < 2) {
      evalBtn.style.display = "none";
    }

    turnState.set(currentTurn, {
      status: "idle",
      userText,
      branchResponses,
      groupEl: group,
      bodyEl: groupBody,
      isFirstTurn: currentTurn === 1,
      evalBtn,
      evalPanelEl: null,
      evalData: null,
    });

    traceEl.appendChild(group);
    traceEl.scrollTop = traceEl.scrollHeight;

    // Accumulate per-branch totals for the conversation dashboard. A branch
    // that errored has a null `totals` entry and contributes nothing.
    let anyBranchSucceeded = false;
    for (const b of activeBranches) {
      const t = branchTotals[b];
      if (t) {
        accumulateTurnTotals(b, t);
        anyBranchSucceeded = true;
      }
    }
    if (anyBranchSucceeded) {
      conversationTurnCount += 1;
      renderDashboard();
    }
  } catch (e) {
    for (const b of activeBranches) {
      clearBubbleTimer(pendingBubbles[b]);
      pendingBubbles[b].remove();
    }
    addMessage("assistant", `Network error: ${e.message}`, "error", chatTurn);
  } finally {
    sendBtn.disabled = false;
    // If this was supposed to be the first turn but nothing got recorded
    // (network error, non-OK response, or every branch errored), release the
    // locks so the user can retry with different settings.
    if (wasFirstTurn && conversationTurnCount === 0) {
      setModeLocked(false);
      setEffortLocked(false);
      setExecutorLocked(false);
      setAdvisorLocked(false);
    }
    inputEl.focus();
  }
}

// ============================================================================
// Evaluation — triggers and rendering
// ============================================================================

async function triggerEvaluation(turnIdx) {
  const state = turnState.get(turnIdx);
  if (!state) return;
  if (state.status === "running") return;

  // Auto-expand the turn group so the eval panel is visible
  state.groupEl.classList.remove("collapsed");

  // Remove any existing eval panel (re-evaluation overwrites)
  if (state.evalPanelEl) {
    state.evalPanelEl.remove();
    state.evalPanelEl = null;
  }

  // Show loading state on the button
  state.status = "running";
  state.evalBtn.disabled = true;
  state.evalBtn.textContent = "Evaluating…";

  // Insert a loading panel at the top of the group body
  const loading = document.createElement("div");
  loading.className = "eval-panel eval-loading";
  loading.innerHTML = `
    <div class="eval-loading-row">
      <span class="eval-spinner"></span>
      <span>Running judge · 2 passes with swapped candidate orders…</span>
    </div>
  `;
  state.bodyEl.insertBefore(loading, state.bodyEl.firstChild);
  state.evalPanelEl = loading;

  const t0 = Date.now();

  try {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userMessage: state.userText,
        branchResponses: state.branchResponses,
        provider: evalProviderEl.value,
        judgePrompt: judgePromptEl.value || DEFAULT_JUDGE_PROMPT,
        apiKey: apiKeyEl.value || undefined,
        openaiKey: openaiKeyEl.value || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      renderEvalError(turnIdx, err.error || res.statusText);
      return;
    }

    const data = await res.json();
    state.evalData = data;
    state.status = "done";
    state.evalBtn.disabled = false;
    state.evalBtn.textContent = "Re-evaluate";
    renderEvalPanel(turnIdx);
  } catch (e) {
    renderEvalError(turnIdx, `Network error: ${e.message}`);
  }
}

function renderEvalError(turnIdx, errorMsg) {
  const state = turnState.get(turnIdx);
  if (!state) return;
  state.status = "idle";
  state.evalBtn.disabled = false;
  state.evalBtn.textContent = "Evaluate";

  if (state.evalPanelEl) state.evalPanelEl.remove();

  const panel = document.createElement("div");
  panel.className = "eval-panel eval-error-panel";
  panel.innerHTML = `
    <div class="eval-warning">
      <span class="warning-icon">⚠</span>
      <span class="warning-text"><b>Evaluation failed.</b> ${escapeHtml(errorMsg)}</span>
    </div>
  `;
  state.bodyEl.insertBefore(panel, state.bodyEl.firstChild);
  state.evalPanelEl = panel;
}

function renderEvalPanel(turnIdx) {
  const state = turnState.get(turnIdx);
  if (!state || !state.evalData) return;

  const data = state.evalData;
  const isFirstTurn = state.isFirstTurn;

  // Remove old panel (re-eval case)
  if (state.evalPanelEl) state.evalPanelEl.remove();

  // --- Outer panel with collapsible header + body ---
  const panel = document.createElement("div");
  panel.className = "eval-panel";

  const header = document.createElement("div");
  header.className = "eval-panel-header";
  header.innerHTML = `
    <span class="eval-panel-title">Quality Evaluation</span>
    <span class="eval-panel-model" title="Evaluator model">${escapeHtml(data.model || data.provider || "?")}</span>
    <span class="eval-panel-toggle">▾</span>
  `;
  header.addEventListener("click", () => panel.classList.toggle("collapsed"));
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = "eval-panel-body";
  panel.appendChild(body);

  // --- Warning block (short for turn 1, long for turn 2+) ---
  const warning = document.createElement("div");
  warning.className = "eval-warning";
  let warningText =
    "LLM-generated evaluation. Subjective — treat scores as a directional signal, not a measurement.";
  if (!isFirstTurn) {
    warningText +=
      " After turn 1, branches have diverged conversation histories, so this reflects cumulative trajectory quality rather than a same-input comparison.";
  }
  warning.innerHTML = `
    <span class="warning-icon">⚠</span>
    <span class="warning-text">${escapeHtml(warningText)}</span>
  `;
  body.appendChild(warning);

  // Judges-disagreed note
  if (data.judgesDisagreed) {
    const note = document.createElement("div");
    note.className = "eval-warning eval-warning-soft";
    note.innerHTML = `
      <span class="warning-icon">ⓘ</span>
      <span class="warning-text">The two judge passes disagreed on the winner. This has been flagged as <b>low confidence</b>.</span>
    `;
    body.appendChild(note);
  }

  // --- Scores table ---
  const branches = Object.keys(data.scores);
  const table = document.createElement("table");
  table.className = "eval-scores";
  const dims = ["correctness", "completeness", "clarity", "depth"];
  const dimLabels = {
    correctness: "Correct",
    completeness: "Complete",
    clarity: "Clarity",
    depth: "Depth",
  };
  table.innerHTML = `
    <thead>
      <tr>
        <th class="branch-col">Branch</th>
        ${dims.map((d) => `<th>${dimLabels[d]}</th>`).join("")}
        <th>Total</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  for (const b of branches) {
    const row = document.createElement("tr");
    row.className = BRANCHES[b]?.cls || "";
    const branchLabel = BRANCHES[b]?.label || b;
    const modelStr = branchModelBadge(b);
    const cells = [
      `<td class="branch-col">
        <div class="branch-name">${escapeHtml(branchLabel)}</div>
        <div class="branch-model">${escapeHtml(modelStr)}</div>
      </td>`,
    ];
    for (const d of dims) {
      const v = data.scores[b]?.[d];
      cells.push(`<td>${v == null ? "—" : v.toFixed(1)}</td>`);
    }
    const total = data.scores[b]?.total;
    cells.push(`<td class="total">${total == null ? "—" : total.toFixed(2)}</td>`);
    row.innerHTML = cells.join("");
    tbody.appendChild(row);
  }
  body.appendChild(table);

  // --- Winner + confidence row ---
  const verdict = document.createElement("div");
  verdict.className = "eval-verdict";
  const winnerBranch = data.winner;
  const winnerLabel =
    winnerBranch === "tie"
      ? "Tie"
      : BRANCHES[winnerBranch]?.label || winnerBranch || "—";
  const winnerCls =
    winnerBranch && winnerBranch !== "tie" ? BRANCHES[winnerBranch]?.cls || "" : "";
  const safeConfidence = ["low", "medium", "high"].includes(data.confidence) ? data.confidence : "medium";
  verdict.innerHTML = `
    <span class="winner ${winnerCls}">
      <span class="verdict-label">Winner</span>
      <strong>${escapeHtml(winnerLabel)}</strong>
    </span>
    <span class="confidence confidence-${safeConfidence}">${escapeHtml(safeConfidence)} confidence</span>
  `;
  body.appendChild(verdict);

  // --- Summary sentence ---
  if (data.summary) {
    const summary = document.createElement("div");
    summary.className = "eval-summary";
    summary.textContent = `"${data.summary}"`;
    body.appendChild(summary);
  }

  // --- Reasoning (expandable) ---
  const reasoning = document.createElement("details");
  reasoning.className = "eval-reasoning";
  const reasoningInner = [];
  reasoningInner.push(`<summary>View reasoning</summary>`);
  reasoningInner.push(`<div class="reasoning-content">`);

  for (const runKey of ["run1", "run2"]) {
    const runLabel = runKey === "run1" ? "Pass 1 (original order)" : "Pass 2 (reversed order)";
    reasoningInner.push(`<div class="reasoning-run"><div class="reasoning-run-label">${runLabel}</div>`);
    const runReasoning = data.reasoning?.[runKey] || {};
    for (const b of branches) {
      const rb = runReasoning[b];
      if (!rb) continue;
      const branchLabel = BRANCHES[b]?.label || b;
      const modelStr = branchModelBadge(b);
      reasoningInner.push(
        `<div class="reasoning-branch ${BRANCHES[b]?.cls || ""}">`
      );
      reasoningInner.push(
        `<div class="reasoning-branch-label">${escapeHtml(branchLabel)} <span class="reasoning-branch-model">${escapeHtml(modelStr)}</span></div>`
      );
      for (const d of dims) {
        if (rb[d]) {
          reasoningInner.push(
            `<div class="reasoning-dim"><span class="rdim">${dimLabels[d]}:</span> ${escapeHtml(rb[d])}</div>`
          );
        }
      }
      reasoningInner.push(`</div>`);
    }
    reasoningInner.push(`</div>`);
  }

  reasoningInner.push(`</div>`);
  reasoning.innerHTML = reasoningInner.join("");
  body.appendChild(reasoning);

  // --- Footer: cost, duration, tokens ---
  const totalIn =
    (data.usage?.run1?.input_tokens || 0) + (data.usage?.run2?.input_tokens || 0);
  const totalOut =
    (data.usage?.run1?.output_tokens || 0) + (data.usage?.run2?.output_tokens || 0);
  const costIter = { input_tokens: totalIn, output_tokens: totalOut };
  const cost = estCost(data.model, costIter);

  const footer = document.createElement("div");
  footer.className = "eval-footer";
  footer.innerHTML = `
    <span class="eval-footer-chip">${cost == null ? "— cost" : `est. ${fmtCost(cost)}`}</span>
    <span class="eval-footer-chip">⏱ ${fmtDuration(data.duration_ms)}</span>
    <span class="eval-footer-chip">${fmtNum(totalIn)} in · ${fmtNum(totalOut)} out</span>
    <span class="eval-footer-chip">2 passes averaged</span>
  `;
  body.appendChild(footer);

  state.bodyEl.insertBefore(panel, state.bodyEl.firstChild);
  state.evalPanelEl = panel;
}

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = "";
  autoGrowInput();
  send(text);
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    formEl.requestSubmit();
  }
});

// ----- Reusable confirm modal ---------------------------------------------
const confirmModalEl = $("#confirm-modal");
const confirmTitleEl = $("#confirm-title");
const confirmBodyEl = $("#confirm-body");
const confirmOkBtn = $("#confirm-ok");
const confirmCancelBtn = $("#confirm-cancel");
let confirmResolver = null;

function showConfirm({ title, body, okLabel = "OK", cancelLabel = "Cancel", okVariant = "danger" }) {
  confirmTitleEl.textContent = title;
  confirmBodyEl.textContent = body;
  confirmOkBtn.textContent = okLabel;
  confirmCancelBtn.textContent = cancelLabel;
  confirmOkBtn.className = okVariant === "danger" ? "btn-danger" : "btn-primary";
  confirmModalEl.classList.add("open");
  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function closeConfirm(result) {
  confirmModalEl.classList.remove("open");
  if (confirmResolver) {
    confirmResolver(result);
    confirmResolver = null;
  }
}

confirmOkBtn.addEventListener("click", () => closeConfirm(true));
confirmCancelBtn.addEventListener("click", () => closeConfirm(false));
confirmModalEl
  .querySelectorAll("[data-confirm-close]")
  .forEach((el) => el.addEventListener("click", () => closeConfirm(false)));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && confirmModalEl.classList.contains("open")) {
    closeConfirm(false);
  }
});

resetBtn.addEventListener("click", async () => {
  const ok = await showConfirm({
    title: "Start a new conversation?",
    body:
      "This will clear all messages, trace data, and evaluation results from the current session. This action cannot be undone.",
    okLabel: "Clear conversation",
    cancelLabel: "Cancel",
    okVariant: "danger",
  });
  if (!ok) return;

  resetBranchHistories();
  resetConversationTotals();
  messagesEl.innerHTML = "";
  traceEl.querySelectorAll(".turn-group, .system-note").forEach((el) => el.remove());
  turnState.clear();
  turnCounter = 0;
  renderDashboard();
  setModeLocked(false);
  setEffortLocked(false);
  setExecutorLocked(false);
  setAdvisorLocked(false);
  inputEl.focus();
});

// ----- Auto-grow textarea --------------------------------------------------
function autoGrowInput() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 200) + "px";
}
inputEl.addEventListener("input", autoGrowInput);

inputEl.focus();

// ============================================================================
// Welcome slideshow modal
// ============================================================================
const WELCOME_SEEN_KEY = "advisor-playground-welcome-seen-v1";
const welcomeModalEl = $("#welcome-modal");
const welcomeSlideEls = welcomeModalEl.querySelectorAll(".welcome-slide");
const welcomePrevBtn = $("#welcome-prev");
const welcomeNextBtn = $("#welcome-next");
const welcomeDotsEl = $("#welcome-dots");
const welcomeDontshowEl = $("#welcome-dontshow");
const welcomeOpenSettingsBtn = $("#welcome-open-settings");
const resetWelcomeBtn = $("#reset-welcome-btn");

const WELCOME_SLIDE_COUNT = welcomeSlideEls.length;
let welcomeCurrentSlide = 0;

// Build the progress dots once.
for (let i = 0; i < WELCOME_SLIDE_COUNT; i++) {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.className = "welcome-dot";
  dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
  dot.addEventListener("click", () => showWelcomeSlide(i));
  welcomeDotsEl.appendChild(dot);
}

function showWelcomeSlide(idx) {
  welcomeCurrentSlide = Math.max(0, Math.min(WELCOME_SLIDE_COUNT - 1, idx));
  welcomeSlideEls.forEach((slide, i) => {
    slide.classList.toggle("active", i === welcomeCurrentSlide);
  });
  welcomeDotsEl.querySelectorAll(".welcome-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === welcomeCurrentSlide);
  });
  welcomePrevBtn.disabled = welcomeCurrentSlide === 0;
  welcomeNextBtn.textContent =
    welcomeCurrentSlide === WELCOME_SLIDE_COUNT - 1 ? "Done" : "Next";
}

// On the final welcome slide, show only the "Next steps" that still need
// action based on the user's current settings. Steps already done are hidden
// so returning users aren't told to set up things they already have.
function updateWelcomeNextSteps() {
  const apikeyStep = document.getElementById("welcome-step-apikey");
  const evalStep = document.getElementById("welcome-step-eval");
  const promptsNumEl = document.getElementById("welcome-step-prompts-num");
  if (!apikeyStep || !evalStep || !promptsNumEl) return;

  const needsApiKey = !apiKeyEl.value.trim();
  // Eval is considered configured if: Anthropic provider (reuses the Anthropic
  // key — covered by step 1), OR OpenAI provider with a non-empty OpenAI key.
  const provider = evalProviderEl.value;
  const needsEvalSetup = provider === "openai" && !openaiKeyEl.value.trim();

  apikeyStep.style.display = needsApiKey ? "" : "none";
  evalStep.style.display = needsEvalSetup ? "" : "none";

  // Renumber step 3 (the prompts list) to reflect which earlier steps are
  // visible. If no steps are shown before it, it's just "Try one of these".
  let promptsNum = 1;
  if (needsApiKey) promptsNum++;
  if (needsEvalSetup) promptsNum++;
  promptsNumEl.textContent = promptsNum;
}

function openWelcome() {
  welcomeDontshowEl.checked = false;
  updateWelcomeNextSteps();
  showWelcomeSlide(0);
  welcomeModalEl.classList.add("open");
}

function closeWelcome() {
  if (welcomeDontshowEl.checked) {
    try { localStorage.setItem(WELCOME_SEEN_KEY, "1"); } catch {}
  }
  welcomeModalEl.classList.remove("open");

  // If the user closed the welcome but still has no API key, nudge them by
  // opening the settings modal so the flow isn't dead-ended.
  if (!apiKeyEl.value.trim()) {
    openSettings();
  } else {
    inputEl.focus();
  }
}

welcomePrevBtn.addEventListener("click", () => showWelcomeSlide(welcomeCurrentSlide - 1));
welcomeNextBtn.addEventListener("click", () => {
  if (welcomeCurrentSlide === WELCOME_SLIDE_COUNT - 1) {
    closeWelcome();
  } else {
    showWelcomeSlide(welcomeCurrentSlide + 1);
  }
});

welcomeModalEl.querySelectorAll("[data-welcome-close]").forEach((el) => {
  el.addEventListener("click", closeWelcome);
});

document.addEventListener("keydown", (e) => {
  if (!welcomeModalEl.classList.contains("open")) return;
  if (e.key === "Escape") closeWelcome();
  else if (e.key === "ArrowRight") showWelcomeSlide(welcomeCurrentSlide + 1);
  else if (e.key === "ArrowLeft") showWelcomeSlide(welcomeCurrentSlide - 1);
});

// "Open settings & add API key" button on the last slide — closes welcome
// (remembering the don't-show preference) and jumps straight to settings.
welcomeOpenSettingsBtn.addEventListener("click", () => {
  if (welcomeDontshowEl.checked) {
    try { localStorage.setItem(WELCOME_SEEN_KEY, "1"); } catch {}
  }
  welcomeModalEl.classList.remove("open");
  openSettings();
});

// "Show welcome again" button in Settings → Notices & Disclaimers.
if (resetWelcomeBtn) {
  resetWelcomeBtn.addEventListener("click", () => {
    try { localStorage.removeItem(WELCOME_SEEN_KEY); } catch {}
    closeSettings();
    openWelcome();
  });
}

// "Factory reset" button — clears all localStorage + conversation state and
// reloads the page to first-launch state.
const factoryResetBtn = $("#factory-reset-btn");
if (factoryResetBtn) {
  factoryResetBtn.addEventListener("click", async () => {
    const ok = await showConfirm({
      title: "Factory reset?",
      body:
        "This will erase all settings (including API keys), conversation history, and preferences. The app will return to its first-launch state. This cannot be undone.",
      okLabel: "Erase everything",
      cancelLabel: "Cancel",
      okVariant: "danger",
    });
    if (!ok) return;

    resetBranchHistories();
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    try { localStorage.removeItem(WELCOME_SEEN_KEY); } catch {}
    closeSettings();
    location.reload();
  });
}

// Decide whether to show the welcome on load.
let welcomeSeen = false;
try { welcomeSeen = localStorage.getItem(WELCOME_SEEN_KEY) === "1"; } catch {}

if (!welcomeSeen) {
  openWelcome();
} else if (!apiKeyEl.value.trim()) {
  // Welcome was previously dismissed but key is missing — open settings directly.
  openSettings();
}
