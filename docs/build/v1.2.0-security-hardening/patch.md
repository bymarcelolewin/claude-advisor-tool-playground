# Patch – v1.2.0 — Security Hardening
This document captures the comprehensive security pass before production deployment.

## Patch Version
v1.2.0 — Security Hardening

## Date
2026-04-11

## Type
Small Enhancement (Security)

## Original Prompt
Security hardening pass to prepare the app for public hosting — ensure API keys are safe, prevent cross-origin abuse, and harden against common web vulnerabilities.

## Problem
The app was built as a local dev tool and lacked production-grade security protections. Before deploying publicly, it needed:
- Protection against cross-origin API abuse (other sites using the server as a proxy)
- Rate limiting to prevent abuse
- HTTPS enforcement for data in transit
- XSS protections since the app renders AI-generated content via innerHTML
- Standard security headers

## Plan
- Add same-origin CORS policy on `/api` routes
- Add per-IP rate limiting (in-memory, no extra dependencies)
- Add HTTPS redirect + HSTS when behind a TLS-terminating proxy
- Audit all innerHTML render sites and harden the escapeHtml() function
- Add security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Add 2MB payload cap on request bodies

## Solution
All security measures implemented:
- **CORS:** API routes only accept requests where the Origin header matches the server's own origin. Same-origin requests (no Origin header) pass through. Cross-origin requests get 403.
- **Rate limiting:** 60 requests/hour per IP using an in-memory Map cleared on a timer. Configurable via `RATE_LIMIT` and `RATE_WINDOW_MS` environment variables. Returns `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers.
- **HTTPS:** Detects `x-forwarded-proto: http` behind a reverse proxy and redirects to HTTPS. Sets HSTS with 2-year max-age when behind HTTPS. Skipped on localhost.
- **XSS:** Audited 35 innerHTML sites. Hardened `escapeHtml()` to cover all 5 OWASP-recommended characters (`&`, `<`, `>`, `"`, `'`).
- **Headers:** X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy: camera=(), microphone=(), geolocation=().
- **Payload cap:** `express.json({ limit: "2mb" })`.

## Files Changed

| File | Action |
|------|--------|
| server.js | Modified (CORS, rate limiting, HTTPS redirect, HSTS, security headers, payload cap) |
| public/app.js | Modified (hardened escapeHtml, XSS audit fixes) |
| public/index.html | Modified (minor security-related markup changes) |
| public/styles.css | Modified |
| package.json | Modified (version bump to 1.2.0) |
| package-lock.json | Modified |
| README.md | Modified (added Security section) |

## Testing Notes
- Run locally: verify HTTPS redirect and HSTS do NOT activate (localhost skip)
- Deploy behind a proxy: verify HTTP → HTTPS redirect works
- Open browser DevTools → Network: confirm security headers are present on responses
- Try a cross-origin fetch from a different domain: should get 403
- Send >60 requests in an hour: should get 429 rate limit response
- Test rendering of AI content with special characters (`<script>`, `"onclick"`, etc.) to verify XSS protection
