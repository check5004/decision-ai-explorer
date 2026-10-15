# Verification record

Date: 2026-10-15 UTC. The tests here distinguish transport/UI validation from actual model inference.

## Passed locally

- Node.js v24.19.0 syntax checks.
- Unit/integration checks cover all six fictional presets; input/schema/size limits; choice/noul/score response shapes; malformed/extra answers; confidence bounds; exact endpoint and credential handling; HTTP failures; secret redaction; cancellation; response-size limit; probability rendering; aggregation; static hosting allowlist and headers; malformed URL robustness.
- `npm run build` copies only explicitly listed public assets. No build environment secret is read or embedded.
- Independent read-only security review found issues in malformed URL handling and malformed API response rendering; those were fixed and regression tests added before publication.
- Unauthenticated OPTIONS CORS preflight for `https://openrouter.ai/api/alpha/decisions` from `https://example.github.io` returned 204, wildcard allowed origin, POST, and Authorization/Content-Type header support. This is not an inference call.

## Verified after publication

- Exact initial release commit: `525775248930e7ca38fffbc5aaff10299ab5b2ae`. [GitHub Actions run](https://github.com/check5004/decision-ai-explorer/actions/runs/38680984126) passed, including all 15 tests, static checks/build, Docker image build, non-root read-only container runtime, health, HTML content and CSP header smoke.
- [Public Pages URL](https://check5004.github.io/decision-ai-explorer/) loaded successfully in the supported cloud Chromium browser.
- Desktop visual review passed. Interaction checks covered all six example selectors, malformed JSON, reset, both editor tabs and arrow-key navigation, key-dialog empty/consent validation, installing/removing a clearly synthetic non-secret placeholder without calling the API, and Escape dismissal. The displayed attempt count stayed zero.
- Narrow-width visual review found a grid intrinsic-width overflow; the CSS was fixed to permit the hero grid item to shrink. The final deployment is being rechecked at narrow width.
- Cloud-browser developer tools are organization-restricted; they were not bypassed. Responsive layout is checked by resizing the ordinary browser window and changing zoom, not by claiming device emulation or physical-device coverage.

## Still not verified

- Authenticated Microsoft Decision-1 inference: no key was supplied to the build environment and no inference request was made. The page starts with empty output and no latency/accuracy claims. A successful live call is required to confirm the end-to-end integration and returned model snapshot.
- Localhost access remains blocked: the supported cloud browser blocked `http://127.0.0.1:8080` with `ERR_BLOCKED_BY_CLIENT`. That restriction was not bypassed. Public Pages browser verification is a separate deployment step.
- A local Docker executable is unavailable, but Docker build and runtime have now passed in the GitHub-hosted CI environment as recorded above.
- Cloud Run: no project, billing activation, image push or deployment was performed.

## Live QA procedure

Use a low-limit key and fictional inputs only. Enter the key directly in the app; do not put it in chat. At least one example for each type should be exercised: support (`choice`), release (`noul`), inventory (`score`). Record actual API ID, exact model snapshot, provider, input/output tokens, usage.cost, header time and total time through the app's JSON export. Confirm no canned result appears on an unrun card. Check an input edit marks an old output as stale. Check reset, tab switching, modal close/Escape, key removal and reload clearing.

Any test failure should remain visible and should not be replaced with a guessed response. Do not repeatedly retry a failing request automatically. Keep actual benchmark attempts and known API charges within the user's approved limit.

Unit tests use named synthetic transport fixtures only in `tests/`; they are not production output and are not deployed in `public/` or `dist/`.
