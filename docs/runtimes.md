# Installed rendering runtimes

The renderer uses Vite 8 with Rolldown and Oxc for template builds. TypeScript data scripts run through the installed `@oxc-node/core/importer` API, including in standalone executables. Source commands use `oxnode`; `facet doctor` checks the installed runner. JSX lint analysis loads Rolldown from the CLI's normal dependencies.

Run `pnpm run typecheck` for components and `pnpm --dir cli run typecheck` for the CLI. Both use pinned tsrs with upstream defaults. TypeScript remains a development dependency for declaration generation and is excluded from the rendering payload.

Facet distributes precompiled Node/browser component closures, rendering assets, compiler/CSS/data tools and Sharp together. The archive is a rendering projection of the build installation: Facet's public component exports resolve through small facades into the precompiled modules. It excludes editors, source maps, declarations, cached package tarballs, duplicated CLI bundles and PDF inspection dependencies. Bundled libraries retain their license metadata. Rolldown and Lightning CSS are pinned across the rendering toolchain so each native binding ships once.

npm installations select an optional `@flanksource/facet-runtime-<platform>-<arch>[-<libc>]` package pinned to the CLI version. Local npm packages include the matching archive directly; standalone executables embed it. Docker renders with the embedded runtime.

PDF.js, native canvas, Sharp, Rolldown and oxlint are normal dependencies of `@flanksource/facet-cli` for inspection and static lint. These commands do not extract a rendering archive. Sharp also remains in the rendering archive for PNG cropping and Office figure export. `lint --diagrams` uses the renderer and therefore requires the rendering runtime. Use the npm CLI for inspection/lint, or install their normal dependencies beside a standalone executable; they are resolved relative to the CLI, never from the rendering archive.

Install optional dependencies normally. Omitting them removes the rendering runtime and causes an explicit error. Supported release targets are macOS arm64, Windows x64, and Linux x64/arm64 with glibc or musl. Chrome is supplied separately.

```sh
npm install --global @flanksource/facet-cli
facet doctor
facet html Report.tsx --skip-modules --output report.html
```

The first render verifies the archive SHA-256, checks its Facet version and platform, then extracts it atomically. Later renders reuse that directory. A default render never runs pnpm, npm or corepack. Custom dependencies are resolved from the consumer manifest and any manifest next to the template. Workspace/catalog references and local overrides are resolved before selecting the dependency environment.

The shared cache defaults to `~/.facet/cache`. `FACET_CACHE_DIR` replaces this root for all runtime, server and compilation state:

```sh
FACET_CACHE_DIR="$PWD/.tmp/facet-cache" facet html Report.tsx --output report.html
facet html Report.tsx --clear-cache --output report.html
```

`runtimes/` holds shipped archives after extraction; `environments/` holds custom dependency installations; `compiled/` holds reusable Node and browser dependency modules; `compilations/` holds generated Vite scaffolds and compiled templates. `servers/` holds source snapshots and server artifacts. Dependency credentials exist only during preparation and are removed before publication. Failed preparation never publishes a ready environment. Dependency environments are retained, so an active renderer never loses its modules to automatic eviction.

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

Each install includes distinct ESM dependency closures for Node SSR and the browser. Vite compiles template-owned modules and CSS against those closures. The default archive supports Facet's public component/subpath exports and React. Declare additional libraries, including Clicky UI application components and editors, in the consumer's package.json and render without `--skip-modules`; the full dependency environment is installed and cached separately. Additional imported subpaths compile once into that environment's dependency cache using the installed compiler and share the base runtime's React instance. Redaction policies are passed through the template's provider, so audiences can reuse one dependency runtime.

Custom compiled generations include the resolved lockfile, compiler implementation, target, ABI, requested exports and library inputs in their identity and validation. Changed library code publishes a new generation while existing readers retain the old one. Named imports use published barrel indexes to avoid loading unrelated optional features.

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

## Playground runtimes

The playground served by `facet serve` has a Runtime selector. Server (Node) uses the existing renderer and all output formats. Browser (Clicky UI / WASM) sends TSX, Markdown or MDX source, JSON data and declared dependencies to `@flanksource/page-runtime`'s isolated frame. Its service worker compiles and links the page in the browser; no `/render` request or server template build is involved. The worker uses the WASM import lexer, Sucrase for TSX and the native MDX compiler for Markdown/MDX.

Browser mode starts rendering when selected and updates automatically after a 300 ms pause in edits. It retains one iframe, bridge and runtime origin per tab. Data updates preserve the page's React state and wait for readiness. Source edits compile versioned local modules and reconcile through the existing React root, without reloading the document, worker or agent. The previous preview remains visible while compiling; edited components may remount, while page-only edits retain the layout. Changing HTML/PDF output reuses the ready page. Invalid input shows an error above the retained preview; switching to Server or changing runtime origin disposes it. Dependency changes reopen the page to install a new import map.

The CSS tab accepts plain CSS overrides for both runtimes, including HTML download and PDF output. Browser CSS edits replace the loaded stylesheet without remounting the page; the last stylesheet remains active until the replacement loads. Server mode applies the CSS on the next Render. CSS remains in the editor when switching runtime or example. API callers can pass the same text as `css` in a JSON render request or multipart options; the field participates in render caching.

Browser mode supports HTML and PDF. Download HTML saves a snapshot with styles and image assets inlined. For PDF, click Save PDF after the preview is ready and choose Save as PDF in the browser print dialog. The report is one continuous page with Facet page breaks and print minimum heights removed; header/footer editor content appears once. The native Markdown/MDX entry is retained so library-declared export plugins run for HTML and PDF. Both data shapes are available to MDX: `props.data.title` and `props.title`. Facet's multipage pagination, per-page headers/footers, page-size controls and PDF signing are available through the server runtime.

On localhost, leaving Runtime origin empty starts a separate loopback runtime origin automatically. Browser worker/frame assets are embedded with the CLI's playground assets, separately from the rendering archive. Normal mode resolves published libraries through npm/unpkg. `--dev` serves immutable local Facet and Clicky UI build publications through the shared package-origin implementation, so testing unpublished libraries needs no npm release. Rebuild/publish local artifacts and restart serve to select a new local generation.

Build the linked page-runtime's browser assets before building this playground from source:

```sh
pnpm --dir ../clicky-ui/packages/page-runtime run build --dev
pnpm run build:playground
pnpm exec oxnode cli/src/cli.ts --dev serve --templates-dir examples
```

The linked libraries must already have successful build publications (`pnpm run build` in each owning checkout); `build:artifacts` alone does not publish a local generation. These are local filesystem publications, not npm releases. Installed page-runtime packages must include their built `static/*` exports.

For a deployed playground, enter a separately hosted HTTPS Runtime origin whose profile permits the playground origin in `embedders` and the needed dependencies. Automatic loopback hosting is restricted to local access. Runtime choice, hosted origin, example and format persist in the playground URL; each tab has independent page state. Hosted runtimes must include the layout, incremental source updates and data-readiness bridge support used by this playground.
