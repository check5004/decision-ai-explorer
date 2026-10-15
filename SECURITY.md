# Security and data handling

## Credentials

The user enters an OpenRouter key in a password-type field. It moves into a module-scoped variable after explicit acknowledgment, and the field is cleared. The application does not use cookies, localStorage, sessionStorage, IndexedDB, analytics, or telemetry. It clears the key on pagehide and provides a remove-key action. Ordinary JavaScript cannot promise cryptographic erasure of all process memory; browser extensions, browser developer tools, a compromised host, or a compromised dependency/OS could still access the tab.

The key is sent only as an Authorization header to the fixed `https://openrouter.ai/api/alpha/decisions` endpoint. Requests omit browser credentials, disallow redirects and use no-referrer. The public site and static server never receive or store the key. Do not put keys in GitHub Actions secrets, Docker builds, URLs, source files, or chat for this static design.

If a provider echoes the active key in a response/error, the client redacts exact occurrences before displaying or exporting it. Do not put a credential inside editable input data; request exports intentionally include the submitted input.

## Data transmission

Each explicit Run sends the edited state and questions to OpenRouter and its model provider. Public hosting does not publish entered data, but remote inference is a third-party data transfer. Presets are fictional. Users should not enter personal, confidential, regulated, or secret information. There is no local inference mode.

The site makes no automatic model calls. There are no retry loops, no automatic batch benchmark, no alternate-model fallback, and no server credential. Rate/payload/session limits are client-side and bypassable; they are not account spending controls. Use a dedicated low-limit OpenRouter key. A request aborted by the browser may still incur provider charges. All incomplete billing records are shown as unknown.

## Application defenses

- No runtime dependencies, external scripts, external styles/fonts, analytics, or dynamic HTML injection.
- UI data is rendered using DOM textContent.
- A narrow Content Security Policy permits scripts/styles only from the site and fetch only from OpenRouter.
- The Docker/Node host also sends X-Frame-Options, frame-ancestors, nosniff and a Permissions Policy.
- GitHub Pages does not provide configurable HTTP security headers; its CSP is a meta policy. The app disables embedded iframe operation as an additional defense. It is not a replacement for a host-level frame-ancestors header.
- The static server serves only an explicit asset allowlist and ignores secret environment variables.
- The container runs as the non-root node user. The recommended local invocation drops capabilities and uses a read-only filesystem.
- Responses are size bounded and validate expected question keys, type/choice/score/probability bounds before rendering. Returned model identity is shown verbatim; nonmatching IDs are flagged and excluded from headline Decision-1 latency statistics, rather than silently treated as the requested model.
- No uploaded files, webhooks, tool execution, email, deployment, purchase, or other consequential actions occur based on model output.

## Expected risks / boundaries

Alpha API behavior and pricing can change. Request formats and canonical model names may change; the client should fail visibly rather than silently route to something else. Model output is advisory. Confidence is not calibrated accuracy. A polished UI does not make predictions reliable.

The server endpoint does not process keys, but ordinary hosting access logs may include IP and user agent under the host's own policy. The app itself has no access logging. Hosting and OpenRouter have separate terms and privacy policies.

No live credentials are part of the repository. Test fixtures are clearly labeled, kept outside public assets, and are never used as fallback production responses.
