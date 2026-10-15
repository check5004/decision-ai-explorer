# Deployment

## Recommended: GitHub Pages (static, BYOK)

Only `public/` is needed at runtime. All asset paths are relative, so a project URL such as `https://OWNER.github.io/decision-ai-explorer/` works.

1. Push this source to a dedicated public GitHub repository. Review the publication allowlist first; do not publish unrelated work or private data.
2. In Settings → Pages, choose GitHub Actions as the source.
3. The included `.github/workflows/pages.yml` checks the source, builds a static `dist/`, uploads it, and deploys Pages. It needs no OpenRouter secret.
4. Verify the exact commit's Actions run and the deployed URL. Test card switching, JSON validation, API-key dialog, and mobile layout before sharing.

Alternative: copy `public/` to the publishing branch's `/docs` directory and choose branch-based Pages from `main /docs`. Keep the copy synchronized. Do not publish the whole repository as the web root.

Public access applies to source/preset files only. A visitor enters their own key locally. Do not add a shared secret to a public page. The API call remains billable to that visitor's OpenRouter key.

## Docker

```sh
docker build -t decision-atelier .
docker run --rm --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  -p 127.0.0.1:8080:8080 decision-atelier
# Open http://localhost:8080
```

The `127.0.0.1` binding keeps the local server off the wider LAN. The container listens on `0.0.0.0:$PORT` internally for container and Cloud Run compatibility. `/healthz` is a readiness endpoint. No API key or app secret is required by the server.

## Optional: Cloud Run

This is a deployment option, not a required backend. Pages is simpler for this application. Cloud Run requires an appropriately configured Google Cloud project and may require billing. Cloud Build, Artifact Registry, egress, and resource usage have their own charging rules; free-tier allowances are not a hard zero-dollar guarantee.

The following commands are instructions only. Running them publishes a service and may incur charges. Confirm the project, region, access and cost settings before executing.

```sh
# Replace YOUR_PROJECT and the service/region if needed.
gcloud run deploy decision-atelier \
  --project YOUR_PROJECT \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 1 \
  --memory 256Mi \
  --min-instances 0 \
  --max-instances 1 \
  --concurrency 80 \
  --timeout 60
```

- `--min-instances 0` allows scale-to-zero. `--max-instances 1` limits server scale; it is not a spending cap.
- This remains a public static frontend. The user's browser calls OpenRouter directly, so there is no shared server key to protect and no backend inference bill for the publisher.
- Do not add `OPENROUTER_API_KEY` to a public build. This app does not read it.
- Verify health, HTTPS, headers, relative assets and UI after deployment. Review Google Cloud budgets and actual billing separately.
- Container build and Cloud Run deployment were not executed in the initial workspace; see the verification record.

Official references: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Cloud Run deployment from source](https://cloud.google.com/run/docs/deploying-source-code), [Cloud Run pricing](https://cloud.google.com/run/pricing).
