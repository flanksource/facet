---
name: facet-cli
description: Drive the `facet` CLI — render `.tsx`/`.md`/`.mdx` templates to PDF, HTML and PNG, load and validate data, fill PDF forms, run the render server, lint templates, and diagnose environment problems with `facet doctor`. Use whenever running or scripting facet, choosing render flags, wiring facet into CI or a Makefile, debugging a failed or blank render, or setting up the facet render API.
argument-hint: "[what to render or diagnose]"
user-invocable: true
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Facet CLI

`facet` renders React and Markdown templates into HTML, PDF and PNG. One binary, seven commands, and a handful of flags that account for nearly every real failure.

**There is no `facet generate`, `facet init`, or `facet build`.** If you see those in older docs or a `package.json` script, they are wrong — the verbs are the output formats.

## Install and verify

```bash
npm install -g @flanksource/facet-cli     # or: pnpm add -g @flanksource/facet-cli
facet doctor                              # always the first move on a broken environment
facet doctor --fix                         # remediate what it can
```

Requires Node ≥ 20.19, `pnpm` on `PATH` (facet uses it to reconcile the template's module cache), and a system Chrome/Chromium for PDF/PNG. `facet doctor` checks all of it plus native bindings, sharp, tsx, tar and npmrc leakage; `--json` makes it scriptable.

Also available as standalone binaries (GitHub Releases), a container (`ghcr.io/flanksource/facet`, see `DOCKER.md`) and a Helm chart (`chart/`).

## Commands

| Command | Purpose |
| --- | --- |
| `facet html <templates...>` | Self-contained HTML with CSS inlined |
| `facet pdf <templates...>` | Print-quality PDF (also writes a sibling `.html`) |
| `facet png <templates...>` | Raster capture — diagrams, previews, social images |
| `facet fill-pdf <template>` | Fill an existing PDF's form fields from data |
| `facet serve` | Render API + playground on `:3010` |
| `facet lint [paths...]` | Static checks on templates (defaults to `.`) |
| `facet doctor` | Environment diagnosis |

`html`, `pdf` and `png` all accept **multiple templates** in one invocation.

## Shared render flags

| Flag | Effect |
| --- | --- |
| `-d, --data <file>` | JSON or YAML data file |
| `-l, --data-loader <file>` | `.ts`/`.js` module exporting `export const data = async () => ({…})` |
| `-o, --output <path>` | File path or directory (default `.`) |
| `--output-name-field <field>` | Data field to name output files from (default `name`) |
| `--live` | Render in a real browser via Vite dev server — **required for diagrams** |
| `--font-size <pt>` | Base font size; scales the whole type scale (default 10) |
| `--refresh` | Re-fetch remote templates, bypassing cache |
| `--clear-cache` | Delete `.facet/` and the node_modules cache before building |
| `--allow <attr=values>` | Permit a classified region, e.g. `--allow tier=Public,Internal` (repeatable) |
| `--post-process-css <bool>` | Rebuild CSS after render to pick up data-dependent classes |
| `-v` / `-vv` / `-vvv` | Vite progress / Vite debug / plugin debug + profile |
| `--skip-modules` | Use the pinned facet-only module set, ignoring the template's `package.json` |
| `--sandbox [settings]` | Run under `srt` sandbox |

Anything after a bare `--` is passed as argv to the data loader.

Global flags (`--skip-modules`, `--facet-url`) may appear before or after the subcommand.

## Per-command flags

**`facet pdf`** — `--page-size <a4|a3|letter|legal|fhd|qhd|wqhd|4k|5k|16k>` (default `a4`), `--landscape`, `--margin-top|-bottom|-left|-right <mm>`, `--header <file.tsx>`, `--footer <file.tsx>`, `--debug` (layout guides plus font, line-height, and block-spacing annotations), `--debug-typography` (append a font-size reference page), `-s/--schema <file>`, `--no-validate`.

Encryption and signing: `--user-password`, `--owner-password`, `--no-print`, `--no-copy`, `--sign-cert <p12>`, `--sign-password`, `--self-signed`, `--sign-reason`, `--sign-name`, `--timestamp-url <RFC3161 TSA>`.

**`facet png`** — `--width <px>`, `--height <px>`, `--selector <css>` (default `body`), `--viewport <WxH>` (default `1280x800`), `--autocrop`, `--autocrop-padding <px>`.

`--width`/`--height` set the **rasterization scale**, not a canvas size. Aspect ratio is preserved; supplying both means the smaller ratio wins. Cropping happens *before* scaling. Layout is governed by `--viewport`, so widen that — not `--width` — when a wide diagram is wrapping.

**`facet html`** — `--css-scope <prefix>` for scoped output, `-s/--schema`, `--no-validate`.

**`facet fill-pdf`** — `-s/--schema <file>` is **required**; the schema's `x-pdf-field` annotations map data onto form fields.

## Diagrams need `--live`

Boxes are pure CSS, but arrows are measured from the live DOM. A diagram template must either start with `// @live` as its **first non-empty line**, or be rendered with `--live`.

```bash
facet png diagram.tsx --live -o dist
```

Facet fails loudly rather than silently dropping arrows. Two signature errors:

- `Diagram arrows did not resolve to finite geometry` — arrows exist but their endpoints are undefined. Almost always `start`/`end` props instead of `from`/`to` on `<Arrow>`.
- A flat, single-color capture is rejected — usually a `Diagram` rendered without `--live`.

## Data and validation

```bash
facet pdf Report.tsx -d data.yaml -o dist
facet pdf Report.tsx -l loader.ts -o dist -- --tenant acme   # argv after -- goes to the loader
facet pdf Report.tsx -d data.json -s schema.json             # JSON Schema validation
```

The loaded object arrives as the template's `data` prop (as `props.*` in `.md`/`.mdx`). Validation is on whenever `-s` is given; `--no-validate` skips it.

## Output naming

`cli/src/utils/resolve-output.ts`:

- `-o out.pdf` → that exact file.
- `-o dist/` or any extension-less path → a directory; each file is named from the data's `name` field (`--output-name-field` to choose another), falling back to the template's basename.
- `facet pdf` additionally writes `<name>.html` alongside the PDF.

## Remote templates

Templates and loaders may be fetched rather than local (`cli/src/utils/remote-resolver.ts`):

```
github:owner/repo/path/File.tsx@ref
https://github.com/owner/repo/blob/<ref>/path/File.tsx
https://raw.githubusercontent.com/owner/repo/<ref>/path/File.tsx
git+ssh://git@github.com/owner/repo.git#<ref>/path/File.tsx
@scope/pkg:relative/path.tsx@version
```

`--refresh` bypasses the fetch cache.

## Remote rendering

Offload the browser work to a facet server — no local Chromium or pnpm needed, only `tar`:

```bash
FACET_URL=https://facet.internal facet pdf Report.tsx -o dist
facet --facet-url https://facet.internal html Report.tsx
```

`--sandbox`, `--skip-modules` and `--clear-cache` are rejected in combination with a facet URL. Auth via `FACET_API_KEY`. Server details: **`references/serve-api.md`**.

## Linting

`facet lint [paths...]` with `--rule <name>` and `--severity <warning|error>`. The nine rules encode the house authoring style:

| Rule | Catches |
| --- | --- |
| `page-structure` | Malformed `Document`/`Page` nesting |
| `empty-page` | A `<Page>` with no content |
| `hardcoded-page-break` | Manual break hacks instead of `<PageBreak />` |
| `mixed-units` | px mixed with mm/pt in one layout |
| `inline-hex-colors` | Hex literals where a `Theme` token exists |
| `inline-style-layout` | Layout via `style=` instead of Tailwind |
| `conflicting-tailwind` | Mutually contradictory utility classes |
| `conflicting-print-css` | Print rules fighting the pipeline |
| `interactive-content` | Buttons/inputs that mean nothing in print |

Run it before rendering — it is much faster than a PDF round-trip.

`page-structure` understands both template shapes: `Page`-rooted, and `Document`-rooted with chrome declared as siblings. `Document`, `DatasheetTemplate` and fragments are transparent wrappers, and custom `*Header`/`*Footer` components count as chrome, so a local `FlanksourceHeader` is a valid `Document` child.

## Environment variables

`FACET_URL`, `FACET_API_KEY`, `FACET_PORT`, `FACET_TEMPLATES_DIR`, `FACET_CACHE_DIR` (default `~/.facet/cache`), `FACET_CACHE_MAX_SIZE`, `FACET_WORKERS`, `FACET_RENDER_TIMEOUT`, `FACET_PERSISTENT_SSR`, `FACET_PROFILE`, `FACET_LOW_PRIORITY`, `FACET_PACKAGE_PATH`, `FACET_KEEP_BUNDLE`, `FACET_DEBUG_STACK`.

## Never

- Use `facet generate`, `facet init` or `facet build` — they do not exist.
- Render a diagram without `--live` or `// @live`.
- Use `--width` to fix a wrapping layout — that is `--viewport`.
- Combine `--facet-url` with `--sandbox`, `--skip-modules` or `--clear-cache`.
- Reach for `--clear-cache` as a reflex; it forces a full module reinstall. Try `--refresh` first.
- Override `GOCACHE`/`TMPDIR`-style paths or hand-edit `.facet/` to work around a build failure — run `facet doctor`.
- Report a render as working without looking at the output file.

## See also

- **`references/troubleshooting.md`** — symptom → fix table, including cache and pnpm store failures
- **`references/serve-api.md`** — `facet serve`, the render API, Docker and Helm
- **facet-documents** skill — what to write in the template
- **diagram-designer** skill — node-and-arrow diagrams
- `README.md`, `DOCKER.md`, `openapi.yaml`; CLI source `cli/src/cli.ts`
