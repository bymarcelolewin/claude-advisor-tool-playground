import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ADVISOR_BETA = "advisor-tool-2026-03-01";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(join(__dirname, "public")));

// Bind to loopback only for safety. Do NOT change unless you know what you're doing.
const HOST = "127.0.0.1";
const PORT = process.env.PORT || 3000;

/**
 * In-memory conversation store.
 * sessionId -> { advisor: [...], executorSolo: [...], advisorSolo: [...] }
 * Each branch maintains its own independent message history so that
 * conversations diverge naturally when compare mode is on.
 */
const sessions = new Map();

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      advisor: [],
      executorSolo: [],
      advisorSolo: [],
    });
  }
  return sessions.get(sessionId);
}

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

app.post("/api/chat", async (req, res) => {
  try {
    const {
      sessionId,
      userMessage,
      executorModel,
      advisorModel,
      systemPrompt,
      maxTokens,
      advisorCaching,
      apiKey,
      mode,
    } = req.body || {};

    if (!sessionId || !userMessage || !executorModel || !advisorModel) {
      return res.status(400).json({
        error: "sessionId, userMessage, executorModel, advisorModel required",
      });
    }

    const client = clientFor(apiKey);
    const session = getSession(sessionId);
    const activeBranches = branchesForMode(mode || "advisor");
    const baselinePrompt = stripAdvisorOnly(systemPrompt || "");

    // Append the user message to every active branch before dispatch.
    for (const branch of activeBranches) {
      session[branch].push({ role: "user", content: userMessage });
    }

    const buildAdvisorParams = () => {
      const advisorTool = {
        type: "advisor_20260301",
        name: "advisor",
        model: advisorModel,
      };
      if (advisorCaching) {
        advisorTool.caching = { type: "ephemeral", ttl: "5m" };
      }
      const params = {
        model: executorModel,
        max_tokens: maxTokens || 8192,
        tools: [advisorTool],
        messages: session.advisor,
      };
      if (systemPrompt && systemPrompt.trim()) params.system = systemPrompt;
      return params;
    };

    const buildExecutorSoloParams = () => {
      const params = {
        model: executorModel,
        max_tokens: maxTokens || 8192,
        messages: session.executorSolo,
      };
      if (baselinePrompt) params.system = baselinePrompt;
      return params;
    };

    const buildAdvisorSoloParams = () => {
      const params = {
        model: advisorModel,
        max_tokens: maxTokens || 8192,
        messages: session.advisorSolo,
      };
      if (baselinePrompt) params.system = baselinePrompt;
      return params;
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

    // Append successful responses to their branches; roll back user message
    // on errored branches so the history stays valid (no two-user-msgs-in-a-row).
    const runs = {};
    for (const result of settled) {
      if (result.ok) {
        session[result.branch].push({
          role: "assistant",
          content: result.content,
        });
        runs[result.branch] = {
          content: result.content,
          usage: result.usage,
          stop_reason: result.stop_reason,
          model: result.model,
          duration_ms: result.duration_ms,
          request: result.request,
        };
      } else {
        session[result.branch].pop();
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

app.post("/api/reset", (req, res) => {
  const { sessionId } = req.body || {};
  if (sessionId) sessions.delete(sessionId);
  res.json({ ok: true });
});

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
  return JSON.parse(cleaned);
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
  console.log(`Advisor playground running at http://${HOST}:${PORT}`);
  console.log("  Open the app and enter your Anthropic API key in the Settings modal (⚙).");
});
