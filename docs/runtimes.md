# Installed rendering runtimes

Facet distributes the precompiled component libraries, browser runtime artifacts, exact dependency closure and native/compiler tools together. npm installations select an optional `@flanksource/facet-runtime-<platform>-<arch>[-<libc>]` package pinned to the CLI version. Local npm packages include the matching archive directly; standalone executables embed it. Docker renders with the embedded runtime.

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

Each install includes distinct ESM dependency closures for Node SSR and the browser. Vite compiles template-owned modules and CSS against those closures. Additional imported packages and subpaths compile once into the dependency cache using the installed compiler; they share the base runtime's React instance. A new subpath never triggers package installation. Redaction policies are passed through the template's provider, so audiences can reuse one dependency runtime.

Custom compiled generations include the resolved lockfile, compiler implementation, target, ABI, requested exports and library inputs in their identity and validation. Changed library code publishes a new generation while existing readers retain the old one. Named imports use published barrel indexes to avoid loading unrelated optional features.

The compiled builder is packaged as `@flanksource/page-runtime-build` by the shared page-runtime project in clicky-ui. It contains JavaScript, declarations and its required build dependencies. The parent clicky-ui repository's main-branch Release workflow builds, tests, versions and publishes that package from `packages/page-runtime/dist/build`; pull-request CI uploads its tarball for inspection. Update Facet's dependency and lockfile after that CI release succeeds. The browser host's unpublished workspace dependencies are excluded from the compiler distribution.

For a local browser inspection of a template using the installed runtime:

```sh
pnpm exec tsx cli/scripts/preview-runtime.ts examples/office/LiveDiagram.tsx
```

Open the printed URL and interrupt the command to stop the preview.
