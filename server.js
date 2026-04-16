import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ADVISOR_BETA = "advisor-tool-2026-03-01";
const PKG_VERSION = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8")).version;

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(join(__dirname, "public")));
// Serve the repo-root images/ folder so the running app and the GitHub README
// can both reference the same files (e.g. images/advisor-flow.svg).
app.use("/images", express.static(join(__dirname, "images")));

const HOST = "0.0.0.0";
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Security headers + HTTPS enforcement.
// The x-forwarded-proto check ensures these only activate behind a reverse
// proxy (Railway, Render, etc.) and are skipped on localhost.
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  const proto = req.headers["x-forwarded-proto"];

  // Redirect HTTP → HTTPS when behind a TLS-terminating proxy.
  if (proto === "http") {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }

  // HSTS — only when we know we're behind HTTPS.
  if (proto === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }

  // Always-safe headers (harmless on localhost).
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  next();
});

// ---------------------------------------------------------------------------
// CORS — only allow requests from the same origin (the page we served).
// Same-origin requests omit the Origin header, so those pass through.
// Cross-origin requests (other sites trying to use our API) are blocked.
// ---------------------------------------------------------------------------
app.use("/api", (req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) return next(); // same-origin — no Origin header sent

  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const self = `${proto}://${host}`;

  if (origin === self) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    return next();
  }

  return res.status(403).json({ error: "Cross-origin requests are not allowed." });
});

// ---------------------------------------------------------------------------
// Rate limiting — simple in-memory per-IP limiter. No extra dependencies.
// Allows RATE_LIMIT requests per RATE_WINDOW_MS per IP on /api/* routes.
// ---------------------------------------------------------------------------
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT, 10) || 60;
const RATE_WINDOW_MS = parseInt(process.env.RATE_WINDOW_MS, 10) || 60 * 60 * 1000; // 1 hour
const ipHits = new Map();

setInterval(() => ipHits.clear(), RATE_WINDOW_MS);

app.use("/api", (req, res, next) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;
  const now = Date.now();
  let entry = ipHits.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    entry = { start: now, count: 0 };
    ipHits.set(ip, entry);
  }
  entry.count++;
  res.setHeader("X-RateLimit-Limit", RATE_LIMIT);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, RATE_LIMIT - entry.count));

  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
  }
  next();
});

// Server is stateless — per-branch conversation histories are maintained by
// the client and sent on each request. Nothing is stored in server memory.

function clientFor(apiKey) {
  const key = apiKey && apiKey.trim();
  if (!key) {
    const err = new Error(
      "No Anthropic API key provided. Open the Settings modal (⚙) and enter one under the Anthropic API section."
    );
    err.statusCode = 400;
    throw err;
  }
  return new Anthropic({ apiKey: key });
}

/**
 * Remove advisor-only sections from a system prompt.
 * Anything between <!-- advisor:only --> and <!-- /advisor:only --> is stripped.
 * Used for baseline runs (no advisor tool available).
 */
function stripAdvisorOnly(text) {
  if (!text) return "";
  return text
    .replace(/<!--\s*advisor:only\s*-->[\s\S]*?<!--\s*\/advisor:only\s*-->/g, "")
    .trim();
}

/**
 * Determine which branches to run based on mode.
 * Modes:
 *   advisor       — advisor tool only (default)
 *   advisor_exec  — advisor + executor-solo baseline
 *   advisor_adv   — advisor + advisor-model-solo baseline
 *   all           — all three
 */
function branchesForMode(mode) {
  switch (mode) {
    case "advisor_exec":
      return ["advisor", "executorSolo"];
    case "advisor_adv":
      return ["advisor", "advisorSolo"];
    case "all":
      return ["advisor", "executorSolo", "advisorSolo"];
    case "advisor":
    default:
      return ["advisor"];
  }
}

app.get("/api/version", (_req, res) => res.json({ version: PKG_VERSION }));

app.post("/api/chat", async (req, res) => {
  try {
    const {
      userMessage,
      histories,
      executorModel,
      advisorModel,
      systemPrompt,
      maxTokens,
      advisorCaching,
      maxUses,
      effort,
      apiKey,
      mode,
    } = req.body || {};

    if (!userMessage || !executorModel || !advisorModel) {
      return res.status(400).json({
        error: "userMessage, executorModel, advisorModel required",
      });
    }

    const client = clientFor(apiKey);
    const activeBranches = branchesForMode(mode || "advisor");
    const baselinePrompt = stripAdvisorOnly(systemPrompt || "");

    // Client sends per-branch histories (prior turns only). We append the new
    // user message here before dispatching to the API.
    const branchMessages = {};
    for (const branch of activeBranches) {
      branchMessages[branch] = [...(histories?.[branch] || []), { role: "user", content: userMessage }];
    }

    // Effort is applied to all branches equally so compare-mode remains fair.
    // Sent even when the value is "high" (the API default) — "high" and
    // omitting the field produce identical behavior, but including it keeps
    // the trace transparent about what the user selected.
    const withEffort = (params) => {
      if (effort) {
        params.output_config = { effort };
      }
      return params;
    };

    const buildAdvisorParams = () => {
      const advisorTool = {
        type: "advisor_20260301",
        name: "advisor",
        model: advisorModel,
      };
      // advisorCaching is "off" | "5m" | "1h". Only attach the caching object
      // when the user selected a TTL — otherwise caching is disabled.
      if (advisorCaching === "5m" || advisorCaching === "1h") {
        advisorTool.caching = { type: "ephemeral", ttl: advisorCaching };
      }
      // max_uses caps advisor calls per request. Only include when the client
      // sent a positive integer; missing/null means unlimited.
      if (Number.isInteger(maxUses) && maxUses > 0) {
        advisorTool.max_uses = maxUses;
      }
      const params = {
        model: executorModel,
        max_tokens: maxTokens || 8192,
        tools: [advisorTool],
        messages: branchMessages.advisor,
      };
      if (systemPrompt && systemPrompt.trim()) params.system = systemPrompt;
      return withEffort(params);
    };

    const buildExecutorSoloParams = () => {
      const params = {
        model: executorModel,
        max_tokens: maxTokens || 8192,
        messages: branchMessages.executorSolo,
      };
      if (baselinePrompt) params.system = baselinePrompt;
      return withEffort(params);
    };

    const buildAdvisorSoloParams = () => {
      const params = {
        model: advisorModel,
        max_tokens: maxTokens || 8192,
        messages: branchMessages.advisorSolo,
      };
      if (baselinePrompt) params.system = baselinePrompt;
      return withEffort(params);
    };

    const callOne = async (branch) => {
      const t0 = Date.now();
      let params = null;
      let betaHeader = null;
      try {
        let response;
        if (branch === "advisor") {
          params = buildAdvisorParams();
          betaHeader = ADVISOR_BETA;
          response = await client.beta.messages.create(params, {
            headers: { "anthropic-beta": ADVISOR_BETA },
          });
        } else if (branch === "executorSolo") {
          params = buildExecutorSoloParams();
          response = await client.messages.create(params);
        } else if (branch === "advisorSolo") {
          params = buildAdvisorSoloParams();
          response = await client.messages.create(params);
        }
        // Build a safe copy of the request (no API key involved — params never
        // contains one; the key lives on the Anthropic client instance).
        const safeRequest = {
          model: params.model,
          max_tokens: params.max_tokens,
          system: params.system || null,
          tools: params.tools || null,
          messages: params.messages,
          output_config: params.output_config || null,
          beta: betaHeader,
        };
        return {
          branch,
          ok: true,
          content: response.content,
          usage: response.usage,
          stop_reason: response.stop_reason,
          model: response.model,
          duration_ms: Date.now() - t0,
          request: safeRequest,
        };
      } catch (err) {
        const safeRequest = params
          ? {
              model: params.model,
              max_tokens: params.max_tokens,
              system: params.system || null,
              tools: params.tools || null,
              messages: params.messages,
              output_config: params.output_config || null,
              beta: betaHeader,
            }
          : null;
        return {
          branch,
          ok: false,
          error: err?.message || String(err),
          duration_ms: Date.now() - t0,
          request: safeRequest,
        };
      }
    };

    // Fire all active branches in parallel.
    const settled = await Promise.all(activeBranches.map(callOne));

    const runs = {};
    for (const result of settled) {
      if (result.ok) {
        runs[result.branch] = {
          content: result.content,
          usage: result.usage,
          stop_reason: result.stop_reason,
          model: result.model,
          duration_ms: result.duration_ms,
          request: result.request,
        };
      } else {
        runs[result.branch] = {
          error: result.error,
          duration_ms: result.duration_ms,
          request: result.request,
        };
      }
    }

    res.json({ runs, mode: mode || "advisor" });
  } catch (err) {
    // Deliberately do NOT log request body — contains the API key.
    console.error("Chat error:", err?.message || err);
    const status = err?.statusCode || 500;
    res.status(status).json({
      error: err?.message || String(err),
      details: err?.error || null,
    });
  }
});

// /api/reset is no longer needed — the server is stateless. Conversation
// history lives on the client and is cleared there on reset.

// ============================================================================
// Evaluation endpoint
// ============================================================================

const JUDGE_MAX_TOKENS = 4096;
const JUDGE_LETTERS = ["A", "B", "C", "D"];

// Hardcoded current evaluator model names. Update when models turn over.
const EVAL_MODEL_ANTHROPIC = "claude-opus-4-6";
const EVAL_MODEL_OPENAI = "gpt-5.4";

// Build the candidate block for a given ordering. Returns the text block
// and a letter→branch map so we can un-blind the judge's output afterwards.
function buildCandidateBlock(ordering, branchResponses) {
  const labelToBranch = {};
  const parts = [];
  ordering.forEach((branch, i) => {
    const letter = JUDGE_LETTERS[i];
    labelToBranch[letter] = branch;
    parts.push(`=== Response ${letter} ===\n${branchResponses[branch] || "(no output)"}\n`);
  });
  return { block: parts.join("\n"), labelToBranch };
}

// Robustly parse a judge response as JSON (strip markdown fences, find first
// {...} block if there's surrounding prose).
function parseJudgeJSON(text) {
  if (!text) throw new Error("empty judge response");
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Judges sometimes embed code/regex in reasoning strings with stray
    // backslashes that aren't valid JSON escapes (e.g. \d, \s, Windows paths).
    // Escape any backslash not followed by a valid JSON escape char and retry.
    const repaired = cleaned.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
    return JSON.parse(repaired);
  }
}

// Un-blind scores/reasoning/winner by translating letters back to branch names.
function unblindJudgeOutput(parsed, labelToBranch) {
  const out = {
    reasoning: {},
    scores: {},
    winner: null,
    confidence: parsed.confidence || "medium",
    summary: parsed.summary || "",
  };
  for (const [letter, branch] of Object.entries(labelToBranch)) {
    if (parsed.scores && parsed.scores[letter]) {
      out.scores[branch] = parsed.scores[letter];
    }
    if (parsed.reasoning && parsed.reasoning[letter]) {
      out.reasoning[branch] = parsed.reasoning[letter];
    }
  }
  if (parsed.winner && parsed.winner !== "tie") {
    out.winner = labelToBranch[parsed.winner] || null;
  } else if (parsed.winner === "tie") {
    out.winner = "tie";
  }
  return out;
}

// Call OpenAI chat completions directly via fetch (no SDK dependency).
async function callOpenAIJudge(prompt, apiKey, model) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("OpenAI API key not provided. Set it in the Evaluation section of the settings modal.");
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content || "",
    usage: {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
  };
}

// Call Anthropic judge via the SDK.
async function callAnthropicJudge(client, prompt, model) {
  const response = await client.messages.create({
    model,
    max_tokens: JUDGE_MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return {
    text,
    usage: response.usage || {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
  };
}

// Run the judge once on a given candidate ordering. Returns the un-blinded
// parse + raw text + usage + duration.
async function runJudgeOnce({
  ordering,
  userMessage,
  branchResponses,
  judgePrompt,
  provider,
  anthropicClient,
  openaiKey,
}) {
  const { block, labelToBranch } = buildCandidateBlock(ordering, branchResponses);
  const fullPrompt =
    `${judgePrompt}\n\n` +
    `USER PROMPT:\n${userMessage}\n\n` +
    `CANDIDATE RESPONSES:\n\n${block}`;

  const t0 = Date.now();
  let raw;
  let model;
  if (provider === "openai") {
    model = EVAL_MODEL_OPENAI;
    raw = await callOpenAIJudge(fullPrompt, openaiKey, model);
  } else {
    model = EVAL_MODEL_ANTHROPIC;
    raw = await callAnthropicJudge(anthropicClient, fullPrompt, model);
  }
  const duration_ms = Date.now() - t0;

  const parsed = parseJudgeJSON(raw.text);
  const unblinded = unblindJudgeOutput(parsed, labelToBranch);

  return {
    parsed: unblinded,
    rawText: raw.text,
    usage: raw.usage,
    duration_ms,
    model,
    ordering,
  };
}

app.post("/api/evaluate", async (req, res) => {
  try {
    const {
      userMessage,
      branchResponses,
      provider,
      judgePrompt,
      apiKey, // Anthropic key (for Anthropic provider)
      openaiKey, // OpenAI key (for OpenAI provider)
    } = req.body || {};

    if (!userMessage || !branchResponses || !judgePrompt) {
      return res.status(400).json({
        error: "userMessage, branchResponses, judgePrompt required",
      });
    }

    const branchNames = Object.keys(branchResponses);
    if (branchNames.length < 2) {
      return res.status(400).json({
        error: "at least 2 branches required for evaluation",
      });
    }

    const actualProvider = provider === "openai" ? "openai" : "anthropic";
    let anthropicClient = null;
    if (actualProvider === "anthropic") {
      anthropicClient = clientFor(apiKey);
    }

    // Two orderings: one as given, one reversed. Position-bias mitigation.
    const ordering1 = [...branchNames];
    const ordering2 = [...branchNames].reverse();

    const [run1, run2] = await Promise.all([
      runJudgeOnce({
        ordering: ordering1,
        userMessage,
        branchResponses,
        judgePrompt,
        provider: actualProvider,
        anthropicClient,
        openaiKey,
      }),
      runJudgeOnce({
        ordering: ordering2,
        userMessage,
        branchResponses,
        judgePrompt,
        provider: actualProvider,
        anthropicClient,
        openaiKey,
      }),
    ]);

    // Average the scores per branch per dimension
    const dims = ["correctness", "completeness", "clarity", "depth"];
    const avgScores = {};
    for (const branch of branchNames) {
      avgScores[branch] = {};
      for (const dim of dims) {
        const s1 = Number(run1.parsed.scores?.[branch]?.[dim] ?? 0);
        const s2 = Number(run2.parsed.scores?.[branch]?.[dim] ?? 0);
        avgScores[branch][dim] = (s1 + s2) / 2;
      }
      // Total = average of the four dimensions
      avgScores[branch].total =
        dims.reduce((sum, d) => sum + avgScores[branch][d], 0) / dims.length;
    }

    // Determine winner + confidence
    const judgesDisagreed = run1.parsed.winner !== run2.parsed.winner;
    let winner;
    let confidence;
    if (!judgesDisagreed) {
      winner = run1.parsed.winner;
      // Keep whichever confidence the judges stated (use the lower of the two if they differ)
      const confRank = { low: 0, medium: 1, high: 2 };
      const c1 = confRank[run1.parsed.confidence] ?? 1;
      const c2 = confRank[run2.parsed.confidence] ?? 1;
      const minConf = Math.min(c1, c2);
      confidence = ["low", "medium", "high"][minConf];
    } else {
      // Disagreement = by definition low confidence.
      // Compute winner from averaged totals.
      let best = null;
      let bestTotal = -1;
      for (const branch of branchNames) {
        if (avgScores[branch].total > bestTotal) {
          bestTotal = avgScores[branch].total;
          best = branch;
        }
      }
      winner = best;
      confidence = "low";
    }

    res.json({
      scores: avgScores,
      winner,
      confidence,
      judgesDisagreed,
      summary: run1.parsed.summary || run2.parsed.summary || "",
      reasoning: {
        run1: run1.parsed.reasoning,
        run2: run2.parsed.reasoning,
      },
      raw: {
        run1_text: run1.rawText,
        run2_text: run2.rawText,
      },
      usage: {
        run1: run1.usage,
        run2: run2.usage,
      },
      duration_ms: Math.max(run1.duration_ms, run2.duration_ms),
      model: run1.model,
      provider: actualProvider,
    });
  } catch (err) {
    console.error("Evaluation error:", err?.message || err);
    const status = err?.statusCode || 500;
    res.status(status).json({
      error: err?.message || String(err),
    });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Advisor playground running at http://localhost:${PORT}`);
});
