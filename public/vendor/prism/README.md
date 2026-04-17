# Prism — Self-Hosted

This folder contains a pinned, self-hosted copy of [Prism](https://prismjs.com) used by the Claude Advisor Tool Playground for syntax highlighting in the Code View modal and the Full I/O viewer.

## Pinned version

**Prism 1.30.0** — verified latest stable on the npm registry at the time v1.5.0 was built.

Do not auto-upgrade. Bumping the Prism version requires a deliberate, tested change: re-download all files at the new version, re-test the Code View modal and Full I/O viewer, and update the version reference in `prism-theme.css` and this README.

## Files

| File | Purpose |
|------|---------|
| `prism.min.js` | Prism core runtime |
| `prism-json.min.js` | JSON language — used by the Full I/O viewer |
| `prism-typescript.min.js` | TypeScript language — used by Code View → TypeScript tab |
| `prism-javascript.min.js` | JavaScript language — TypeScript depends on it |
| `prism-python.min.js` | Python language — used by Code View → Python tab |
| `prism-bash.min.js` | Bash language — used by Code View → curl tab |
| `prism-theme.css` | Custom dark theme tuned to the app palette |

## Source

Files were downloaded from cdnjs:

```
https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/prism.min.js
https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/components/prism-json.min.js
https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/components/prism-typescript.min.js
https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/components/prism-javascript.min.js
https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/components/prism-python.min.js
https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/components/prism-bash.min.js
```

The Prism download builder at [prismjs.com/download.html](https://prismjs.com/download.html) is the official alternative — pick the same languages, the "Tomorrow Night" theme as a starting reference, and "Minified version" output.

## Why self-hosted?

- Preserves the same-origin security posture set in v1.2.0 — no third-party script domains.
- One fewer network round-trip; Railway serves these directly with HTTPS.
- Works offline in local dev.
- Reproducible across deploys — version is pinned in the repo.

## Why not `npm install prismjs`?

The app has no build step. Static files in `/public/` are served as-is by Express. Adding npm/build tooling just to consume Prism would change the project's architecture for no real benefit at this scale.

## License

Prism is MIT-licensed. See [github.com/PrismJS/prism/blob/master/LICENSE](https://github.com/PrismJS/prism/blob/master/LICENSE).
