# Security and data handling

## Credentials

The user enters an OpenRouter key in a password-type field and explicitly confirms browser storage and API charges. On Save, the app writes only that key to the app-specific localStorage entry `decision-atelier.openrouter-key.v1`, verifies the write, copies it into a module-scoped variable, and clears the input field. A saved key is restored on reload; no API call is made until the user clicks Run. Restored values are never populated back into the input field. Inputs, results and execution history are not persisted.

This is plaintext, origin-scoped browser storage, not encrypted secret storage. Other pages on the same origin (including other GitHub Pages projects under the same owner), extensions, developer tools, a compromised host or OS can access it. Use a low-limit key and do not save it on shared/untrusted devices. Clearing browser site data may also remove it. The application does not use cookies, sessionStorage, IndexedDB, analytics, or telemetry.

The remove-key action clears active memory and the field first, removes only this app's entry, and checks deletion. Other tabs observe storage changes. A failed read/write/delete displays a fixed explanation without logging the exception or claiming completion; a failed deletion explains that persisted data may remain and how to retry/clear site data. HTTP 401 checks the request\'s captured key against the current saved value before invoking deletion; if another tab saved a newer key, it is preserved and restored instead. A model-specific HTTP 403 preserves the saved key so other permitted models remain usable. Pagehide clears active memory but deliberately leaves the saved entry so reload works. Ordinary JavaScript cannot guarantee cryptographic erasure of all browser process memory.

The key is sent only as an Authorization header to the fixed `https://openrouter.ai/api/alpha/decisions` endpoint. Requests omit browser credentials, disallow redirects and use no-referrer. The public site and static server never receive or store the key. Do not put keys in GitHub Actions secrets, Docker builds, URLs, source files, or chat for this static design.

If a provider echoes the active key in a response/error, the client redacts exact occurrences before displaying or exporting it. Do not put a credential inside editable input data; request exports intentionally include the submitted input.

## Data transmission

Each explicit single Run sends the edited state and questions to the selected model through OpenRouter. Compare sends one immutable input snapshot to all five displayed models concurrently (five requests), and each model provider receives that state/questions. Public hosting does not publish entered data, but remote inference is a third-party data transfer. Presets are fictional. Users should not enter personal, confidential, regulated, or secret information. There is no local inference mode.

The site makes no automatic model calls. There are no retry loops, no automatic benchmark, no failure fallback, and no server credential. Parallel comparison occurs only on its explicit button click, with the exact five target names and request count visible beforehand. A failed free route never falls back to a paid one. The fixed model allowlist, maximum five concurrent requests, 20 requests/tab and payload/session limits are client-side and bypassable; they are not account spending controls. Use a dedicated low-limit OpenRouter key. A request aborted by the browser may still incur provider charges. All incomplete billing records are shown as unknown.

## Application defenses

- No runtime dependencies, external scripts, external styles/fonts, analytics, or dynamic HTML injection.
- UI data is rendered using DOM textContent.
- A narrow Content Security Policy permits scripts/styles only from the site and fetch only from OpenRouter.
- The Docker/Node host also sends X-Frame-Options, frame-ancestors, nosniff and a Permissions Policy.
- GitHub Pages does not provide configurable HTTP security headers; its CSP is a meta policy. The app disables embedded iframe operation as an additional defense. It is not a replacement for a host-level frame-ancestors header.
- The static server serves only an explicit asset allowlist and ignores secret environment variables.
- The container runs as the non-root node user. The recommended local invocation drops capabilities and uses a read-only filesystem.
- Responses are size bounded and validate expected question keys, type/choice/score/probability bounds before rendering. Returned model identity is shown verbatim. For each request model, only its exact alias or its explicitly documented canonical ID is included in that model's latency statistics (registry verified against the official catalog on 2026-10-16). Another registered model's canonical ID does not qualify. Unknown IDs, other dates, suffixes, and prefix lookalikes remain flagged and excluded. Requested and returned IDs plus the matching basis remain in diagnostic data.
- Input text and request model/key are captured at start. In-flight model/topic/input controls are disabled, duplicate runs are blocked, independent responses settle without discarding other successes, and cancellation aborts the group. Per-request timeout also invalidates late results. Results/history/billing aggregation remain partitioned by the captured request model. Shared comparison-start elapsed time includes network and browser scheduling, not pure model inference.
- No uploaded files, webhooks, tool execution, email, deployment, purchase, or other consequential actions occur based on model output.

## Expected risks / boundaries

Alpha API behavior and pricing can change. Request formats and canonical model names may change; the client should fail visibly rather than silently route to something else. Model output is advisory. Confidence is not calibrated accuracy. A polished UI does not make predictions reliable.

The server endpoint does not process keys, but ordinary hosting access logs may include IP and user agent under the host's own policy. The app itself has no access logging. Hosting and OpenRouter have separate terms and privacy policies.

No live credentials are part of the repository. Test fixtures are clearly labeled, kept outside public assets, and are never used as fallback production responses.
