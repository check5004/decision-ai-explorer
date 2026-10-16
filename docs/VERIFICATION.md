# Verification record

Updated: 2026-10-16 UTC (initial release verified 2026-10-15). The tests here distinguish transport/UI validation from actual model inference.

## Browser key persistence (2026-10-16 UTC)

- At the user's request, explicit Save now persists their own UI-entered key in one app-specific localStorage entry. Reload restores it without making a request; result/history persistence is unchanged. The password field is cleared and never repopulated with the saved value.
- Delete clears active memory plus the stored entry and verifies deletion. Read/write/delete failures are visible and never reported as successful. Authentication rejection removes the saved key. Other tabs follow storage changes.
- UI and security documentation explain plaintext browser storage, same-origin access, shared-device risk, and the deletion action.
- New regression tests use only a clearly synthetic credential. They cover restoration, deletion and reload, blocked read/write/delete, silent storage failures, invalid values, other-tab removal, and credential redaction from error display, console, URLs and exported diagnostics.
- Full Node/browser/Docker checks are pending review-branch CI. No real key was read, entered, saved or sent by the maintainers.

## Canonical model identity correction (2026-10-16 UTC)

- Official evidence: [OpenRouter decision-model catalog](https://openrouter.ai/api/v1/models?output_modalities=decisions) returns one record with `id: microsoft/microsoft-decision-1` and `canonical_slug: microsoft/microsoft-decision-1-20261009`. The unfiltered text-model list did not contain this decision model; the decisions modality filter is required for this check.
- The request alias is unchanged. Identity inspection and latency aggregation both accept only the requested alias or this one exact documented canonical ID. There is no prefix match, date regex, auto-discovery call, or model fallback. Unknown identifiers still trigger a warning and remain excluded.
- Both raw IDs and the canonical-match source/date are retained in diagnostics and JSON exports.
- The user reported the displayed returned ID. That report alone does not establish answer correctness, actual response timing, or successful end-to-end inference verified by the maintainers. No real key or paid inference is used for this correction.
- Regression coverage adds exact canonical acceptance, lookalike/unknown-date rejection, mixed timing aggregation, unchanged request/response IDs, and isolated browser checks for accepted and unknown IDs. The selected local execution environment is unavailable; full tests will run in the review branch CI before production publication.

## UX revision (2026-10-16 UTC)

- The six topics remain cards, with direct Japanese titles, benefits, ordinary editable fields, and a short input → decision → use explanation.
- Result candidates are a Japanese table. Unrun rows have no percentage or color bar; returned choice probabilities receive bars and a selected-row marker. Score stays a continuous score with per-level probabilities; noul shows the returned true degree and a clearly identified complement. No model-generated rationale is invented.
- Raw JSON, request criteria, and measurement metadata are collapsed by default. Edited input marks previous output as stale, and rerun removes previous results while waiting.
- All 25 local syntax/unit/static-server/presentation checks passed again on 2026-10-16. The exact API transport, model ID, and fictional presets are unchanged.
- Twelve isolated Chromium browser tests are prepared (desktop and mobile), with deny-by-default external networking and visible TEST-ONLY-MOCK watermarks. Local launch was blocked before page load by executor socket restrictions; the supported escalated execution path also failed before launching. This is not a passed or failed application interaction test. The same 12 cases passed on the non-deploying CI branch before promotion to main; see the run below.
- [CI run 38829534886](https://github.com/check5004/decision-ai-explorer/actions/runs/38829534886), candidate commit `85885113fa3e0be252d9ef99ffbd8094aa7fc8c1`: all 25 Node checks, 12 browser regressions, and Docker build/runtime smoke passed. Pages deployment was skipped as intended on the review branch.
- Visual review of the CI artifact passed for desktop and mobile initial/no-key screens, Japanese choice rows and selected outcome, score, noul, and error-without-result states. Seven screenshots were inspected; all are labeled TEST-ONLY-MOCK and are not real inference measurements. Mobile coverage is Chromium Pixel 7 emulation, not a physical-device test. Keyboard selection, multiple questions, stale output, pending rerun, key removal, then reload clearing, and failure without retries passed as browser assertions.
- Authenticated inference remains unverified: no real API key has been supplied and no inference request was made.

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
- Narrow-width visual review found a grid intrinsic-width overflow; the CSS was fixed to permit the hero grid item to shrink. The deployed fix was visually rechecked at 388 and 323 CSS pixels: document scrollWidth equaled viewport width, with no horizontal overflow. Cards, the stacked editor/output layout, and the key dialog remained usable. A small-screen CTA spacing polish was added afterward.
- Cloud-browser developer tools are organization-restricted; they were not bypassed. Responsive layout is checked by resizing the ordinary browser window and changing zoom, not by claiming device emulation or physical-device coverage.

## Still not verified

- Authenticated Microsoft Decision-1 inference: no key was supplied to the build environment and no inference request was made. The page starts with empty output and no latency/accuracy claims. A successful live call is required to confirm the end-to-end integration and returned model snapshot.
- Localhost access (not needed for deployed UI QA) remains blocked: the supported cloud browser blocked `http://127.0.0.1:8080` with `ERR_BLOCKED_BY_CLIENT`. That restriction was not bypassed. Public Pages browser verification is a separate deployment step.
- Cloud Run: no project, billing activation, image push or deployment was performed.

## Live QA procedure

Use a low-limit key and fictional inputs only. Enter the key directly in the app; do not put it in chat. At least one example for each type should be exercised: support (`choice`), release (`noul`), inventory (`score`). Record actual API ID, exact model snapshot, provider, input/output tokens, usage.cost, header time and total time through the app's JSON export. Confirm no canned result appears on an unrun card. Check an input edit marks an old output as stale. Check reset, tab switching, modal close/Escape, saved-key restoration on reload without automatic calls, and key removal followed by reload. Verify that failed storage operations explain the problem without claiming success.

Any test failure should remain visible and should not be replaced with a guessed response. Do not repeatedly retry a failing request automatically. Keep actual benchmark attempts and known API charges within the user's approved limit.

Unit tests use named synthetic transport fixtures only in `tests/`; they are not production output and are not deployed in `public/` or `dist/`.
