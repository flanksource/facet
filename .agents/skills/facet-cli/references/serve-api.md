# `facet serve` — render API and playground

```bash
facet serve --templates-dir ./templates --port 3010
```

Opens a playground at `http://localhost:3010/` — Monaco editor, live preview and logs, with an Example dropdown covering Datasheet, Live Diagram, Markdown and MDX. It is the fastest way to iterate on a template without a build loop.

## Flags

| Flag | Default | Purpose |
| --- | --- | --- |
| `-p, --port <n>` | `3010` | Listen port |
| `--templates-dir <dir>` | `.` | Template root served by `/templates` |
| `--workers <n>` | `2` | Render worker pool size |
| `--max-renders-per-worker <n>` | `50` | Recycle a worker after N renders |
| `--max-worker-age <ms>` | `1800000` | Recycle a worker after this age |
| `--max-worker-rss <mb>` | `0` (off) | Recycle on RSS, Linux only |
| `--max-queue-depth <n>` | `20` | Reject beyond this backlog |
| `--worker-acquire-timeout <ms>` | `30000` | Wait for a free worker |
| `--no-persistent-ssr` | — | Disable the persistent SSR loader |
| `--timeout <ms>` | `300000` | Per-render timeout |
| `--api-key <key>` | — | Require auth |
| `--max-upload <bytes>` | `52428800` | Upload cap |
| `--cache-max-size <bytes>` | `104857600` | Result cache cap |
| `--cache-dir <dir>` | `./.facet` | Cache location |
| `--s3-endpoint\|--s3-bucket\|--s3-region\|--s3-prefix` | region `us-east-1` | Write results to S3 instead of returning them |

Equivalent env vars: `FACET_PORT`, `FACET_TEMPLATES_DIR`, `FACET_WORKERS`, `FACET_CACHE_DIR`, `FACET_CACHE_MAX_SIZE`, `FACET_RENDER_TIMEOUT`, `FACET_PERSISTENT_SSR`, `FACET_API_KEY`.

## Endpoints

Full schema in `openapi.yaml` (OpenAPI 3.1).

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/healthz` | Health check |
| `GET` | `/templates` | List available templates |
| `POST` | `/render` | Render a template |
| `POST` | `/render/stream` | Render with streaming progress |
| `GET` | `/results/{id}` | Fetch a cached render result |
| `GET` | `/types` | TypeScript type definitions |

Auth: `X-API-Key` header or a bearer token, when `--api-key` is set.

### `RenderRequest`

```jsonc
{
  "code":     "…",              // inline source; or…
  "template": "Report.tsx",     // …a path under --templates-dir
  "ext":      "tsx",            // tsx | jsx | ts | js | md | mdx
  "data":     { },              // passed to the template as the `data` prop
  "format":   "pdf",            // html | pdf | png
  "output":   "direct"          // direct | s3
}
```

`output: "s3"` requires the `--s3-*` flags and returns a key rather than the bytes.

## Using the server as a render backend

Point the CLI at it and skip local Chromium entirely — only `tar` is needed client-side:

```bash
FACET_URL=https://facet.internal FACET_API_KEY=… facet pdf Report.tsx -o dist
```

`--sandbox`, `--skip-modules` and `--clear-cache` are rejected when a facet URL is in play.

## Deployment

- **Docker** — `docker run -p 3000:3000 -v ./templates:/templates ghcr.io/flanksource/facet`. Tags and build details in `DOCKER.md`.
- **Helm** — `helm install facet ./chart`; see `chart/values.yaml`.

Size the worker pool against available memory: each worker holds a Chromium instance. `--max-worker-rss` (Linux) plus `--max-renders-per-worker` keep long-running deployments from drifting.
