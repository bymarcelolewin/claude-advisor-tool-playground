# Patch – v1.0.0 — Initial Public Release
This document captures the initial build of the Claude Advisor Tool Playground.

## Patch Version
v1.0.0 — Initial Public Release

## Date
2026-04-11

## Type
Initial Release

## Original Prompt
"Read this new tool provided by Anthropic at platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool. I want to build a short program with a web front-end that lets me test this tool and visualize the output and the steps it took to get that output (to see if the tool was called, when, and which model was used)."

## Problem
No interactive way to explore Anthropic's advisor tool beta. The only option was reading documentation — there was no tool to see what actually happens behind the scenes when the executor calls the advisor, how many tokens it costs, or whether the advisor even fires on a given prompt.

## Plan
Build a single-page web app with:
- Node.js + Express backend proxying calls to the Anthropic API
- Vanilla JS frontend (no framework — keeps it simple for a test harness)
- Split-pane layout: chat on the left, step-by-step trace on the right
- Compare modes to run the same prompt through multiple execution paths
- LLM-as-judge quality evaluation with position-bias mitigation
- Settings modal for API keys, system prompt, and configuration

## Solution
Delivered a complete playground with all planned features:
- Chat with advisor tool tracing (step timeline with model, tokens, cost per step)
- Compare modes (advisor, executor-model-solo, advisor-model-solo, all three)
- Delta pills showing cost/latency/token differences between branches
- Full I/O viewer showing exact JSON request + response per branch
- LLM-as-judge evaluation (Claude Opus or GPT, 2-pass bias mitigation, 4-dimension rubric)
- Settings modal with 4 collapsible sections
- Floating chat input, confirm modal for reset, thinking indicators
- Sentinel-based system prompt splitting (`<!-- advisor:only -->`) for fair baseline comparison

## Files Changed

| File | Action |
|------|--------|
| server.js | Created |
| public/app.js | Created |
| public/index.html | Created |
| public/styles.css | Created |
| package.json | Created |
| package-lock.json | Created |
| README.md | Created |
| .gitignore | Created |

## Testing Notes
- Run `npm install && npm start`, open http://localhost:3000
- Paste Anthropic API key in Settings modal
- Test with a complex prompt (e.g., ISO 8601 parser) to trigger the advisor
- Test with a trivial prompt (e.g., "What year was Rust released?") to confirm advisor does NOT fire
- Switch to compare mode and verify delta pills appear
- Run an evaluation and verify scores/reasoning render
