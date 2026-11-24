# Installed rendering runtimes

The renderer uses Vite 8 with Rolldown and Oxc for template builds. TypeScript data scripts run through the installed `@oxc-node/core/importer` API, including in standalone executables. Source commands use `oxnode`; `facet doctor` checks the installed runner. JSX lint analysis loads Rolldown from the CLI's normal dependencies.

Run `pnpm run typecheck` for components and `pnpm --dir cli run typecheck` for the CLI. Both use pinned tsrs with upstream defaults. TypeScript remains a development dependency for declaration generation and is excluded from the rendering payload.

Facet distributes precompiled Node/browser component closures, rendering assets, compiler/CSS/data tools and Sharp together. The archive is a rendering projection of the build installation: Facet's public component exports resolve through small facades into the precompiled modules. It excludes editors, source maps, declarations, cached package tarballs, duplicated CLI bundles and PDF inspection dependencies. Bundled libraries retain their license metadata. Rolldown and Lightning CSS are pinned across the rendering toolchain so each native binding ships once.

npm installations select an optional `@flanksource/facet-runtime-<platform>-<arch>[-<libc>]` package pinned to the CLI version. Local npm packages include the matching archive directly; standalone executables embed it. Docker renders with the embedded runtime.

PDF.js, native canvas, Sharp, Rolldown and oxlint are normal dependencies of `@flanksource/facet-cli` for inspection and static lint. These commands do not extract a rendering archive. Sharp also remains in the rendering archive for PNG cropping and Office figure export. `lint --diagrams` uses the renderer and therefore requires the rendering runtime. Use the npm CLI for inspection/lint, or install their normal dependencies beside a standalone executable; they are resolved relative to the CLI, never from the rendering archive.

Install optional dependencies normally. Omitting them removes the rendering runtime and causes an explicit error. Supported release targets are macOS arm64 and Linux x64/arm64 with glibc or musl. Chrome is supplied separately. Other platforms, including Windows x64, have no released runtime package: the npm CLI installs there for inspection and static lint, but rendering fails with an explicit "Rendering is not supported" error unless a runtime is built from a source checkout.

```sh
npm install --global @flanksource/facet-cli
facet doctor
facet html Report.tsx --skip-modules --output report.html
```

The first render verifies the archive SHA-256, checks its Facet version and platform, then extracts it atomically. Later renders reuse that directory. A default render never runs pnpm, npm or corepack. Custom dependencies are resolved from the consumer manifest and any manifest next to the template. Workspace/catalog references and local overrides are resolved before selecting the dependency environment.

The shared cache defaults to `$XDG_CACHE_HOME/facet`, or `~/.cache/facet` when `XDG_CACHE_HOME` is unset. `FACET_CACHE_DIR` explicitly replaces this root for all runtime, server and compilation state. Consumers should inherit these settings rather than assign a project-local cache:

```sh
FACET_CACHE_DIR="$PWD/.tmp/facet-cache" facet html Report.tsx --output report.html
facet html Report.tsx --clear-cache --output report.html
```

`runtimes/` holds shipped archives after extraction; `environments/` holds custom dependency installations; `compiled/` holds reusable Node and browser dependency modules; `compilations/` holds generated Vite scaffolds and compiled templates. `servers/` holds source snapshots and server artifacts. Dependency credentials exist only during preparation and are removed before publication. Failed preparation never publishes a ready environment. Dependency environments are retained, so an active renderer never loses its modules to automatic eviction.

## Named runtimes

Build a named runtime from a project’s `package.json`. The project inherits the shipped Facet runtime, which in turn inherits Clicky UI. Facet keeps the inherited version of any package the project also declares and builds indexes only for new exports. If the source is a Facet or Clicky UI checkout, build that library’s artifacts first. The runtime version defaults to the project version. The build prints a folder you can also select directly or copy to another machine with the same platform and Node ABI.

```sh
facet runtime build facet ./report-project --version 1.2.0
facet runtime list
facet html Report.tsx --runtime facet@1.2.0 -o report.html
facet png Report.tsx --runtime facet --live -o report.png
gavel edit Report.tsx --facet-runtime facet@1.2.0
facet runtime delete facet@1.2.0
```

`facet runtime list` shows each `name@version` selector, the last successful build time in UTC, and the project’s Git commit and clean or dirty state at build time. Git state is unknown for older builds and builds outside a Git repository. Use `--selectors` for one copyable selector per line or `--json` for structured metadata including the runtime path and full commit when available. An empty list shows a build hint on stderr, or emits `[]` with `--json`. Runtime builds show completed stages, pnpm package counts, and browser file verification on stderr, with color on supported terminals. The published runtime folder goes to stdout.

A bare name selects the last successful build for that name. To select a built directory use an absolute path or a relative path such as `./report-runtime`. `--runtime` is available on the local HTML, PNG, PDF, DOCX, and PPTX commands. The templates and their data are still processed on every render. Adding a runtime dependency requires an explicit rebuild, and `--clear-cache` refreshes the template compilation for the selected build.

An explicit build replaces the same `name@version` for future invocations while active renders and editor sessions retain their build. Delete accepts a cached name or `name@version` and reports if that version is still in use.

Source, data and package description/script edits do not reinstall dependencies. Dependency or override changes select a different environment. Local library source and built-module edits invalidate compilation independently. `--clear-cache` publishes a new custom environment generation while preserving old generations for active readers. Clearing a default render only invalidates compilation.

Build the installed runtime after building component/runtime artifacts:

```sh
pnpm run build
pnpm --dir cli run build:bundle
node cli/scripts/pack-npm-cli.cjs 0.1.74 .tmp/facet-cli
```

Use the checkout's version instead of `0.1.74` after a version bump. `make build` additionally builds the standalone executable and requires an official, statically linked Node distribution with SEA support. Release CI creates each runtime on its target platform, publishes runtime packages before the library/CLI, and embeds the target payload in the matching executable.

The tracked verification fixture covers cache identity and concurrency, independent projects, live-request isolation, packaged default rendering with package managers disabled, lint and the release build:

```sh
gavel fixtures cli/test/runtime-cache.fixture.yaml
```

Each install includes distinct dependency layers for Node SSR and the browser. Templates can import public Clicky UI and Facet components and browser-compatible exports such as `@flanksource/icons/mi` without declaring them. Clicky UI supplies the version when both libraries expose a package. Use `--skip-modules` to render exclusively with the shipped runtime. With ordinary rendering, declare any new packages in the project’s `package.json`; Facet installs just those additions. Named runtimes also expose their template imports to `gavel edit --facet-runtime`. Rebuild an existing named runtime to pick up the expanded exports.

Custom compiled generations include the resolved lockfile, compiler implementation, target, ABI, requested exports and library inputs in their identity and validation. Changed library code publishes a new generation while existing readers retain the old one. Named runtime builds index each layer against its installed dependency graph before publication.

The compiled builder is packaged as `@flanksource/page-runtime-build` by the shared page-runtime project in clicky-ui. It contains JavaScript, declarations and its required build dependencies. The parent clicky-ui repository's main-branch Release workflow builds, tests, versions and publishes that package from `packages/page-runtime/dist/build`; pull-request CI uploads its tarball for inspection. Update Facet's dependency and lockfile after that CI release succeeds. The browser host's unpublished workspace dependencies are excluded from the compiler distribution.

For a local browser inspection of a template using the installed runtime:

```sh
pnpm exec oxnode cli/scripts/preview-runtime.ts examples/office/LiveDiagram.tsx
```

Open the printed URL and interrupt the command to stop the preview.

Use `--dev` to test unpublished local Facet, Clicky UI and page-runtime compiler builds:

```sh
facet --dev html Report.tsx --output report.html
facet --dev serve --templates-dir examples
```

The CLI finds a Facet checkout in the current directory, an ancestor, a sibling named `facet`, or the CLI's own checkout. Set `FACET_PACKAGE_PATH=/absolute/path/to/facet` when using another layout. That checkout must link `node_modules/@flanksource/clicky-ui` and `node_modules/@flanksource/page-runtime` to local checkouts. Missing links or runtime/compiler artifacts fail explicitly. `--dev` requires local rendering and cannot be combined with `--facet-url` or `FACET_URL`.

Build artifacts before the first dev render. From the Facet checkout with the usual sibling layout:

```sh
pnpm --dir ../clicky-ui/packages/page-runtime run build:builder
pnpm --dir ../clicky-ui/packages/ui run build:artifacts
pnpm run build:components
pnpm run build:css
pnpm run build:runtime
pnpm exec oxnode cli/src/cli.ts --dev --skip-modules html examples/office/LiveDiagram.tsx --output .tmp/local-diagram.html
```

These artifact builds do not publish to npm or rebuild the installed runtime archive. `--dev` resolves the compiler directly from the local page-runtime checkout and compiles dependency closures against the linked libraries. Consumer dependencies remain available; adding `--skip-modules` ignores them while retaining local libraries. Development caches live under `dev/<checkout-hash>/` in the shared cache. The server bypasses rendered-response reuse in dev mode, and changed built-library inputs invalidate compiled closures. Rebuild the relevant artifacts after library or compiler edits and submit a new render; Clicky UI source hot reload and automatic Clicky UI/compiler builds are not provided by this flag.

## HTML exports

`facet html` exports a live document by default. The file contains the template source, its local imports and assets, and the input data. When the recipient opens the file, the versioned page runtime from unpkg resolves the declared packages, compiles the embedded files in the browser, and renders the document. Share live exports only with recipients who should have access to the source and input data.

```sh
facet html Report.tsx --data report.json -o report.html
facet html Report.tsx --data report.json --inline -o snapshot.html
facet html Report.tsx --data report.json --bundle -o report.html
```

`--inline` renders a static snapshot with inline styles. Use it with `--allow` to redact fields. `--bundle` emits live HTML and a sibling `report.js` containing the template and page runtime. Distribute both files together. Any external fonts or images the template itself references still need to be reachable.

Exports made with `--runtime` or `--dev` link to the runtime script and browser package distribution served by the matching Facet build at `http://localhost:3010` by default. Run `facet serve` with that build and runtime selection. Use `--runtime-origin` for a different address, such as a shared development server. Recipients must be able to reach the selected origin.

```sh
facet --dev serve --port 3010
facet --dev html Report.tsx --data report.json --runtime-origin http://localhost:3010 -o report.html
```

With `--facet-url`, the server prepares the export. Direct API calls with `format: html` produce a snapshot by default. Set `htmlMode: linked` for a live document, or `htmlMode: bundle` on `/render` to get `{html, script}` and write the script beside the HTML using the matching basename.

## Server PDF runtime

`facet serve` defaults to the Node PDF renderer. Enable browser template execution on a host with a working Chromium sandbox:

```sh
facet serve --templates-dir ./reports --pdf-renderer page-runtime
```

The setting applies to PDF jobs on `/render` and `/render/stream`. Both endpoints accept server templates, inline code, project archives, and remote template references. The page runtime lays out each Facet `Page` at its print width, including named presets and custom dimensions. Set `pageSizeOverride` to use one size for the whole PDF or `pdfOptions.landscape` to turn portrait sheets sideways. Use browser-compatible imports and dependencies. Project-local package links, Node APIs, and project package overrides are unavailable in this renderer. Compile and asset errors identify the source file and phase. The standalone local `facet pdf` command and other server output formats continue to use their existing renderers.

Each worker keeps the installed or selected named runtime warm. Operator-installed templates with matching resolved package locks share a frame. Each job mounts a new document, while a new lock opens a fresh frame in that worker. Inline, archive, and remote templates run in separate browser contexts. Facet takes a snapshot after fonts, images, and diagrams are ready. The trusted browser host sanitizes it outside the template frame before handing it to the PDF pipeline for pagination, page sizes, headers and footers, and PDF security.

Compare cold and warm jobs with the `Server-Timing` response header or the streaming result's `timings` field. Vary the data to measure rendering independently of final-PDF cache hits. The timing phases include queue time, frame boot when needed, dependency resolution, module loading and compilation, readiness, snapshot, and PDF generation. Restart with `--pdf-renderer node` to switch back.

The local integration benchmark uses one worker and changes the document data for each request:

```sh
FACET_TEST_PAGE_RUNTIME=1 FACET_BENCH_PAGE_RUNTIME=1 pnpm --dir cli exec vitest run test/page-runtime-pdf.test.ts
```

Set `PUPPETEER_EXECUTABLE_PATH` if Chromium is installed outside the system paths. Worker RSS is available on Linux.

## Playground runtimes

The playground served by `facet serve` has a Runtime selector. Server supports all output formats. For HTML, Browser (Clicky UI / WASM) sends TSX, Markdown or MDX source, JSON data and declared dependencies to `@flanksource/page-runtime`'s isolated frame. Its service worker compiles and links the page using the WASM import lexer, Sucrase for TSX and the native MDX compiler for Markdown/MDX.

Browser mode renders automatically when selected with an empty preview. After a render, edits keep the current preview visible and show a **Refresh preview** button above it. A failed refresh shows the error above the previous result. For Browser HTML, a refresh reuses the runtime frame when possible, and data changes preserve the page's React state. Dependency changes reopen the page to install a new import map.

The CSS tab accepts plain CSS overrides for both runtimes, including HTML download and PDF output. Render or refresh to apply CSS changes. CSS remains in the editor when switching runtime or example. API callers can pass the same text as `css` in a JSON render request or multipart options. The field participates in render caching.

**Download HTML** in Browser mode saves a snapshot with styles and image assets inlined. In either mode, **Render PDF** sends the template and PDF options to the server and displays the generated file in a PDF iframe. The server uses the configured `--pdf-renderer`, including `page-runtime` when selected. The preview includes the same pagination, headers and footers as the downloaded file.

On localhost, leaving Runtime origin empty starts a separate loopback runtime origin automatically. Browser worker/frame assets are embedded with the CLI's playground assets. Normal mode serves the pinned browser package catalog and files from the installed rendering runtime, or from the runtime selected with `--runtime`. Additional dependencies can resolve through npm/unpkg. `--dev` serves immutable local Facet and Clicky UI build publications through the shared package-origin implementation, so testing unpublished libraries needs no npm release. Rebuild/publish local artifacts and restart serve to select a new local generation.

Build the linked page-runtime's browser assets before building this playground from source:

```sh
pnpm --dir ../clicky-ui/packages/page-runtime run build --dev
pnpm run build:playground
pnpm exec oxnode cli/src/cli.ts --dev serve --templates-dir examples
```

The linked libraries must already have successful build publications (`pnpm run build` in each owning checkout); `build:artifacts` alone does not publish a local generation. These are local filesystem publications, not npm releases. Installed page-runtime packages must include their built `static/*` exports.

For a deployed playground, enter a separately hosted HTTPS Runtime origin whose profile permits the playground origin in `embedders` and the needed dependencies. Automatic loopback hosting is restricted to local access. Runtime choice, hosted origin, example and format persist in the playground URL; each tab has independent page state. Hosted runtimes must include the layout, incremental source updates and data-readiness bridge support used by this playground.
