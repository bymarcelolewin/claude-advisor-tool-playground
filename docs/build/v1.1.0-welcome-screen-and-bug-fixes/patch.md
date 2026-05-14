# Patch – v1.1.0 — Welcome Screen & Bug Fixes
This document captures the welcome slideshow addition and evaluation bug fix.

## Patch Version
v1.1.0 — Welcome Screen & Bug Fixes

## Date
2026-04-11

## Type
Small Enhancement + Bug Fix

## Original Prompt
Multiple incremental changes: evaluation bug was discovered during testing, welcome slideshow was added to onboard new users, and documentation/images were updated.

## Problem
1. A bug in the quality evaluation panel was producing incorrect results.
2. New users had no introduction to what the advisor tool is or how the playground works — they landed on a blank chat with no guidance.
3. The README needed screenshots and the advisor flow diagram to be useful.

## Plan
- Fix the evaluation bug in server.js
- Add a first-launch welcome slideshow that walks users through the advisor strategy and playground features
- Create an SVG advisor flow diagram showing the executor → advisor interaction
- Add app screenshots and update documentation

## Solution
- Fixed evaluation bug in `server.js` (robust JSON parsing for judge responses)
- Built a multi-slide welcome overlay in `public/index.html` + `public/app.js` + `public/styles.css` that appears on first launch and explains the advisor tool concept, the playground's features, and how to get started
- Created `images/advisor-flow.svg` illustrating the executor → advisor escalation pattern
- Added `images/claude-advistor-tool-playground.png` (app screenshot) and `images/evaluation.png` (evaluation panel screenshot)
- Comprehensive README rewrite with clearer structure

## Files Changed

| File | Action |
|------|--------|
| server.js | Modified (eval bug fix, static image serving) |
| public/app.js | Modified (welcome slideshow logic) |
| public/index.html | Modified (slideshow markup) |
| public/styles.css | Modified (slideshow styling) |
| package.json | Modified (version bump) |
| package-lock.json | Modified |
| README.md | Modified (major rewrite, added image references) |
| images/advisor-flow.svg | Created |
| images/claude-advistor-tool-playground.png | Created |
| images/evaluation.png | Created |
| .gitignore | Modified |

## Testing Notes
- Clear localStorage to trigger the welcome slideshow on next page load
- Verify all slides render correctly and the "Open Settings & add API key" button works
- Run an evaluation in compare mode to verify the bug fix
- Check that images load in the README on GitHub
