# @flanksource/facet

Build beautiful, print-ready datasheets and PDFs from React templates.

**@flanksource/facet** is a framework for creating professional datasheets, reports, and documentation using React components. It provides a rich component library optimized for print and PDF generation, along with a powerful CLI for building HTML and PDF outputs.

## Features

- 📄 **Print-optimized components** - 47+ components designed for professional datasheets
- 🎨 **React & TypeScript** - Full type safety and modern React patterns
- 🔧 **Zero-config CLI** - Build HTML and PDF with a single command
- 🔗 **Component imports** - `import { StatCard } from '@flanksource/facet'`
- ⚡ **Fast builds** - Powered by Vite with smart caching
- 📦 **Isolated builds** - `.facet/` build directory (like `.next` in Next.js)
- 🔀 **Live diagrams** - Box-and-arrow diagrams baked to static SVG via `// @live`

## Installation

### Option 1: npm (recommended)

```bash
npm install -g @flanksource/facet-cli
# or: pnpm add -g @flanksource/facet-cli
```

This installs the `facet` command, which runs on your Node.js (>=20.19). Rendering
uses `pnpm` to populate the shared module cache and reconcile project-specific
dependencies. PDF output also needs a system Chrome/Chromium. Run `facet doctor`
to check the environment. For a Node-free environment, use the standalone binary
below.

### Option 2: Standalone binary

Download the binary for your platform from [GitHub Releases](https://github.com/flanksource/facet/releases):

- **Linux (x64)**: `facet-linux-x64`
- **Linux (arm64)**: `facet-linux-arm64`
- **macOS (Apple Silicon)**: `facet-macos-arm64`
- **Windows (x64)**: `facet-windows-x64.exe`

Make it executable and put it on your `PATH` (substitute the file you downloaded):
```bash
chmod +x facet-linux-x64
sudo mv facet-linux-x64 /usr/local/bin/facet
```

## Quick Start

### 1. Create a Template

Create a file `MyDatasheet.tsx` in your project:

```tsx
import React from 'react';
import {
  DatasheetTemplate,
  Header,
  Page,
  StatCard,
  Section,
  BulletList
} from '@flanksource/facet';

export default function MyDatasheet() {
  return (
    <DatasheetTemplate>
      <Header
        title="Mission Control Platform"
        subtitle="Cloud-Native Observability & Incident Management"
      />

      <Page>
        <Section title="Key Metrics">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Response Time" value="< 2min" />
            <StatCard label="Uptime" value="99.99%" />
            <StatCard label="Incidents Resolved" value="1,247" />
          </div>
        </Section>

        <Section title="Key Features">
          <BulletList items={[
            'Real-time incident detection and alerting',
            'Automated runbook execution',
            'Multi-cloud observability',
            'Integrated ChatOps workflows'
          ]} />
        </Section>
      </Page>
    </DatasheetTemplate>
  );
}
```

### 2. Build HTML Output

```bash
facet html MyDatasheet.tsx -o ./dist
```

This creates:
- Print-ready HTML with embedded styles
- Scoped HTML for embedding in docs (use `--css-scope` for a custom prefix)
- `.facet/` - Build cache directory (can be gitignored)

### 3. Generate PDF

```bash
facet pdf MyDatasheet.tsx
```

## Performance benchmarks

Facet includes a repeatable end-to-end benchmark for cold and warm HTML/PDF generation:

```bash
cd cli
pnpm build
pnpm bench:render
pnpm bench:server

# Optional fixture and warm-iteration count
FACET_BENCH_ITERATIONS=5 pnpm bench:render -- \
  examples/SimpleReport.tsx examples/simple-data.json

# Large server document, including streamed PDF download
FACET_BENCH_SECTIONS=250 pnpm bench:server

# Select a benchmark template
FACET_BENCH_TEMPLATE=BenchmarkMixedReport pnpm bench:server
```

The benchmark uses the release SEA binary, clears `.facet/` before each cold run,
keeps caches for warm runs, enables `FACET_PROFILE`, and samples aggregate process-tree
RSS (Facet, pnpm/Vite, and Chromium). RSS is the sum of process resident sizes and may
count shared pages more than once; use it for comparisons rather than as an exact
physical-memory measurement.

### Performance checkpoints

Fixture: `cli/examples/SimpleReport.tsx` with `simple-data.json`. The first three
checkpoints report the mean of three warm runs. Stabilized checkpoints use the median
of five runs. Server benchmarks report per-request RSS and include downloading the
result PDF; `FACET_BENCH_SECTIONS` controls document size.

| Checkpoint | HTML cold | HTML warm | PDF cold | PDF warm | HTML warm peak RSS | PDF warm peak RSS |
|---|---:|---:|---:|---:|---:|---:|
| 2026-07-12 — SSR/Tailwind caches, minimal PDF passes, isolated contexts | 8.19 s | 1.05 s | 7.20 s | 1.57 s | 380 MB | 947 MB |
| 2026-07-12 — persistent server workspaces | 10.17 s | 1.10 s | 8.08 s | 1.97 s | 385 MB | 945 MB |
| 2026-07-12 — streamed cache responses and early PDF buffer release | 9.34 s | 1.41 s | 9.86 s | 2.39 s | 384 MB | 947 MB |
| 2026-07-12 — stabilized 5-run median, no metadata-only PDF rewrite | 11.30 s | 1.39 s | 9.83 s | 2.28 s | 379 MB | 961 MB |

The persistent-workspace phase targets server throughput, not one-shot CLI latency.
Its server benchmark sends unique data with every request to bypass final-output caching:

| Server checkpoint | First HTML | Subsequent HTML | First PDF | Subsequent PDF | Peak process-tree RSS |
|---|---:|---:|---:|---:|---:|
| Before persistent workspaces | 6.46 s | 3.86 s | 4.17 s | 4.64 s | 1,547 MB |
| After persistent workspaces | 8.04 s | 0.62 s | 0.95 s | 0.75 s | 1,544 MB |
| After streamed cache responses/buffer release | 5.89 s | 0.58 s | 0.75 s | 0.72 s | 1,568 MB |

The buffer-release checkpoint improved subsequent server HTML by approximately 6%
and PDF by approximately 4% in this run. Its primary goal is lower memory retention for
large documents and downloads; the small fixture and cold-install-dominated aggregate
RSS measurement do not demonstrate that benefit. The CLI timings regressed while RSS
was unchanged, despite this phase not changing the CLI rendering path materially; this
illustrates the current machine/load variance and should not be interpreted as a causal
regression without repeated controlled runs.

Subsequent HTML and PDF request latency improved by approximately **84%** while peak
RSS remained effectively unchanged. First-request values are dominated by dependency
installation and global pnpm/filesystem cache state, so they are substantially noisier.
The CLI checkpoint shows no expected improvement and some timing variance; its warm
RSS remained stable.

For the latest CLI checkpoint, warm PDF stages averaged approximately 567 ms for HTML
and 546 ms for Chromium/PDF. Cold runs remain dominated by dependency installation.

### Mixed-page multi-pass checkpoint

The `BenchmarkMixedReport` fixture exercises three page types, three page sizes,
headers, footers, content grouping, and `pdf-lib` compositing:

```bash
FACET_BENCH_TEMPLATE=BenchmarkMixedReport \
FACET_BENCH_FORMATS=pdf \
FACET_BENCH_SECTIONS=250 \
pnpm --dir cli bench:server
```

| Multi-pass checkpoint | Median PDF latency | Median peak RSS | Output size |
|---|---:|---:|---:|
| Cartesian type × size overlays | 3.82 s | 1,876 MB | 305 KB |
| Only overlays used by actual pages | 2.06 s | 1,891 MB | 208 KB |

Rendering only page type/size combinations that occur reduced latency by **46%** and
output size by **32%**. Peak RSS was effectively unchanged. This was retained because
it removes 12 unnecessary Chromium overlay renders for this fixture; broader benchmark
work was deferred until another concrete bottleneck justifies it. A bounded overlay
concurrency experiment was rejected: median latency regressed to 2.86 s (39% slower)
with no meaningful RSS improvement, confirming that Chromium overlay work contends
more than it parallelizes within one browser.

### Stabilized large-document baseline

The five-run median baseline using `FACET_BENCH_SECTIONS=250` includes fetching the
file-backed PDF result and records peak RSS separately for every request:

| Format | Median latency | Median request peak RSS | Output size |
|---|---:|---:|---:|
| HTML baseline | 476 ms | 986 MB | 189 KB |
| PDF baseline, including download | 1.37 s | 1,074 MB | 76 KB |
| PDF without metadata-only `pdf-lib` pass | 1.05 s | 1,049 MB | 193 KB |
| HTML after fragment concurrency safety | 526 ms | 988 MB | 189 KB |
| PDF after fragment concurrency safety | 878 ms | 1,047 MB | 193 KB |
| HTML with persistent SSR loader | 15 ms | 1,061 MB | 189 KB |
| PDF with persistent SSR loader | 363 ms | 1,327 MB | 193 KB |

Content-addressed header/footer fragments and workspace-wide build serialization fix
concurrent rendering correctness. They do not affect sequential benchmark architecture;
the lower latency in that checkpoint should be treated as run-to-run variance.

Persistent SSR loaders remove the per-request Node/Vite process startup. In this
checkpoint warm HTML became approximately **97% faster** and PDF approximately **59%
faster**, while median process-tree RSS increased by about 73 MB for HTML and 280 MB
for PDF because the Vite/React loader remains resident. Loaders are limited to four by
default (`FACET_MAX_SSR_LOADERS`), close after five idle minutes
(`FACET_SSR_LOADER_IDLE_MS`), and can be disabled with
`--no-persistent-ssr` or `FACET_PERSISTENT_SSR=false`.

Removing the metadata-only full-document load/save made the large PDF path approximately
**24% faster** and reduced median request peak RSS by approximately **2%**. Direct
Chromium PDFs are larger because they are no longer rewritten by `pdf-lib`; PDFs that
already require header/footer compositing still receive Facet Creator/Producer metadata.

The benchmark now also reports Chromium RSS and Node RSS/heap/external memory after
every request. A 30-request PDF-only stress run measured Chromium between 549–552 MB
while Node RSS rose from 194 MB to 254 MB and showed repeated heap collection cycles.
This points to V8 heap/allocator high-water retention rather than Chromium leakage. An
aggressive 545 MB Chromium recycle threshold increased median PDF latency from 1.05 s
to 1.51 s while changing median peak RSS from 1,049 MB to 1,046 MB, so RSS recycling
remains opt-in.

Benchmark environment: Intel Core i7-1260P (12 cores/16 threads), 16 GiB RAM,
Linux x86-64, Node.js 24.11.0, pnpm 9.15.9, and Chrome for Testing. Results from
other machines or Chromium versions should not be directly compared.

Add a new row after each performance change rather than replacing previous results.
Keep the fixture, iteration count, worker settings, and environment unchanged.

## How It Works

![](assets/how-it-works.svg)



### Build Process

**CLI mode** — without a Facet server URL, `facet html` and `facet pdf` run the full pipeline locally:

1. **Setup `.facet/`** — Creates an isolated build directory with symlinks to your sources
2. **Generate configs** — Auto-generates `vite.config.ts`, `tsconfig.json`, `entry.tsx`
3. **Vite SSR compile** — Compiles React + TypeScript + MDX via Vite
4. **React SSR render** — Renders components to static HTML with `ReactDOMServer`
5. **Tailwind CSS** — Extracts only the styles your template uses
6. **HTML output** — Combines markup + inlined CSS into a self-contained HTML file
7. **PDF output** *(optional)* — Puppeteer prints the HTML to PDF, with optional encryption and digital signatures

**Server mode** — `facet serve` wraps the same pipeline behind an HTTP API with a worker pool, LRU cache, optional S3 upload, and an interactive playground at `localhost:3010`.

When `FACET_URL` or `--facet-url` is set, the CLI loads and validates data locally, uploads the template project to `/render`, downloads the result, and writes it to the normal local output path. The upload excludes Git metadata, dependencies, Facet caches, temporary files, and build output.



## Page Component API

The `Page` component is the primary layout container for multi-page PDF documents.

```tsx
<Page
  title="Section Title"
  product="Mission Control"
  header={<Header variant="solid" />}
  headerHeight={15}
  footer={<PdfFooter />}
  footerHeight={15}
  margins={{ top: 5, right: 0, bottom: 0, left: 0 }}
  watermark="DRAFT"
  debug={false}
>
  {/* page content */}
</Page>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | Page content |
| `title` | `string` | — | Section title bar text (renders a blue bar below the header) |
| `product` | `string` | — | Sub-label shown in the title bar |
| `header` | `ReactNode` | — | Fixed header rendered at the top of every physical page |
| `headerHeight` | `number` (mm) | `0` | Height of the header; used to offset content so it doesn't overlap |
| `footer` | `ReactNode` | — | Fixed footer rendered at the bottom of every physical page |
| `footerHeight` | `number` (mm) | `15` | Height of the footer; used to add bottom padding to content |
| `margins` | `PageMargins` | `{}` | Additional content margins `{ top, right, bottom, left }` in mm |
| `pageSize` | `string` | `'a4'` | Page size — `a4`, `a3`, `letter`, `legal`, `fhd`, `a4-landscape`, or custom `WxH` in mm |
| `type` | `string` | `'default'` | Page type — groups pages for header/footer extraction (e.g. `cover`, `default`) |
| `watermark` | `string` | — | Diagonal watermark text (e.g. `"DRAFT"`, `"CONFIDENTIAL"`) |
| `debug` | `boolean` | `false` | Renders dashed red lines at margin boundaries for layout debugging |
| `className` | `string` | — | Extra CSS class applied to the `<main>` element |

### Multi-page PDF layout

A single React document with mixed page sizes (e.g. `<Page size="a4" type="cover">`, `<Page size="a4">`, `<Page size="a4-landscape">`) is compiled into a final PDF via a 4-phase multi-pass pipeline:

1. **DOM Scan** — Puppeteer renders to DOM, measures header/footer heights per type×size group (e.g. `cover:a4`, `default:a4`, `default:a4-landscape`)
2. **Extract** — Each unique type×size group's header and footer are rendered as isolated PDFs using a dedicated Puppeteer pass, loaded into pdf-lib
3. **Content Render** — Decorators are stripped from the DOM; `@page` margins are set to the measured header/footer heights; Puppeteer prints content-only PDFs per group
4. **Composite** — pdf-lib `page.drawPage()` overlays the correct header at the top and footer at the bottom of every physical page, producing a single merged PDF

```tsx
  {/* Cover page with unique header/footer */}
  <Page pageSize="a4" type="cover">
    <Header height={20} />
    <CoverContent />
    <Footer height={10} />
  </Page>

  {/* Standard A4 page */}
  <Page pageSize="a4">
    <Header height={18} />
    {/* Content starts after header automatically */}
    <Footer height={8} />
  </Page>

  {/* Landscape page for wide content */}
  <Page pageSize="a4-landscape">
    <Header height={18} />
    <WideTableContent />
    <Footer height={8} />
  </Page>
```

![](assets/pdf-layout.svg)

## Diagrams

Facet ships box-and-arrow diagram primitives for data-flow and architecture
diagrams. Boxes are pure CSS (server-rendered), while arrows are drawn by
[`react-xarrows`](https://www.npmjs.com/package/react-xarrows), which measures
the rendered DOM positions of the boxes at runtime.

| Component | Description |
|-----------|-------------|
| `Diagram` | Render-prop container. Yields an `id(name)` helper for stable, per-instance element ids and defers arrows until after mount. |
| `BoxNode` | Pure-CSS box with optional header/body. Connected to other boxes via its `id`. |
| `Arrow` | Connector between two box ids (`from` / `to`), with `primary` / `secondary` presets. |
| `NodeSection` | Labeled vertical column of boxes (e.g. "Sources", "Outputs"). |
| `COLORS` | Shared 5-color diagram palette. |

```tsx
import { Diagram, BoxNode, Arrow, NodeSection, COLORS } from '@flanksource/facet';

<Diagram className="flex items-center justify-between gap-8">
  {(id) => (
    <>
      <NodeSection label="Sources">
        <BoxNode id={id('db')} title="PostgreSQL" />
      </NodeSection>
      <BoxNode id={id('engine')} title="Facet Engine"
        headerColor={COLORS.primary} borderColor={COLORS.primary} />
      <NodeSection label="Outputs">
        <BoxNode id={id('pdf')} title="PDF" />
      </NodeSection>

      <Arrow from={id('db')} to={id('engine')} variant="secondary" />
      <Arrow from={id('engine')} to={id('pdf')} />
    </>
  )}
</Diagram>
```

### `// @live` — hydrate and bake

Because arrows are measured from the DOM, they can't be produced by server-side
rendering alone. Mark a template **live** by making its first line the `// @live`
directive:

```tsx
// @live
import React from 'react';
import { Diagram, BoxNode, Arrow } from '@flanksource/facet';
// ...
```

For live templates, facet runs one extra headless-browser pass: it hydrates the
SSR HTML, lets `react-xarrows` draw the arrows into the DOM, then captures the
now-static HTML with arrows baked as plain SVG. That baked HTML flows through the
unchanged HTML/PDF pipeline. The bake fails loudly if hydration never completes —
there is no silent arrow-less fallback.

This works in `facet html`, `facet pdf`, and `facet serve` (including the
playground). In the playground, pick **Live Diagram** from the **Example**
dropdown to try it.

## CLI Commands

### Remote rendering

Set `FACET_URL` or pass the global `--facet-url` option to submit `html` and `pdf` jobs to a Facet server. The explicit flag takes precedence over the environment variable.

```bash
FACET_URL=https://facet.example.com facet pdf MyDatasheet.tsx -d data.json -o report.pdf
facet --facet-url https://facet.example.com html MyDatasheet.tsx -o ./dist/
```

Remote mode requires `tar` locally but does not require local Chromium or pnpm. Data loaders and schema validation still run locally. The server controls sandboxing, module mode, and cache lifecycle, so `--sandbox`, `--skip-modules`, and `--clear-cache` fail when combined with a Facet URL. A server or network error stops the command without falling back to local rendering.

### Shared modules

`--skip-modules` is a global option and may appear before or after any subcommand:

```bash
facet --skip-modules html MyDatasheet.tsx -d data.json
facet pdf MyDatasheet.tsx --skip-modules -o out.pdf
facet serve --skip-modules --templates-dir ./templates
```

The first use installs a Facet-only module set pinned to the CLI version under
`${FACET_CACHE_DIR:-~/.facet/cache}/modules/<facet-version>/<platform>-<arch>-node<abi>`.
Later invocations link `.facet/node_modules` directly to that immutable entry, so
they do not read consumer or nested `package.json` files, package-manager pins,
lockfiles, overrides, `.npmrc`, or directory-based `FACET_PACKAGE_PATH` overrides.
Templates that import additional packages must run without `--skip-modules`.
Server requests containing `dependencies` receive HTTP 400 while the server uses
this mode. `facet doctor --skip-modules --fix` verifies or rebuilds the exact
shared entry selected by the current Facet and Node versions.

Without `--skip-modules`, a new `.facet` install is seeded by cloning the shared
`node_modules` directory on APFS, then reconciled against the generated project
manifest with `pnpm install`. Facet logs and uses a fresh install when cloning is
unavailable, including on non-macOS filesystems. `--clear-cache` clears only the
project `.facet` scaffold; it does not remove the versioned shared module cache.

### `facet html <template>`

Generate HTML from a React template.

```
facet html [options] <template>

Options:
  --css-scope <prefix>         CSS scope prefix for scoped HTML generation
  -s, --schema <file>          Path to JSON Schema file for data validation
  --no-validate                Skip data validation
  -d, --data <file>            Path to JSON data file
  -l, --data-loader <file>     Path to data loader module (.ts or .js)
  -o, --output <path>          Output file path or directory (default: "dist")
  --output-name-field <field>  Data field to use for output filename
  -v, --verbose                Enable verbose logging
```

Facet automatically starts render-related child processes at below-normal scheduling priority so Vite, pnpm, data loaders, archive extraction, and Chromium yield resources to interactive OS workloads. It uses background task policy with niceness `+10` on macOS, niceness `+10` on Linux, and below-normal process priority on Windows.

**Example:**
```bash
facet html MyDatasheet.tsx -o ./dist --verbose
facet html MyDatasheet.tsx -d data.json -o report.html
```

### `facet pdf <template>`

Generate PDF from a React template.

```
facet pdf [options] <template>

Options:
  -s, --schema <file>          Path to JSON Schema file for data validation
  --no-validate                Skip data validation
  -d, --data <file>            Path to JSON data file
  -l, --data-loader <file>     Path to data loader module (.ts or .js)
  -o, --output <path>          Output file path or directory (default: "dist")
  --output-name-field <field>  Data field to use for output filename
  -v, --verbose                Enable verbose logging
```

**Example:**
```bash
facet pdf MyDatasheet.tsx -d data.json -o out.pdf
```

### `facet serve`

Start an API server with a built-in playground for interactive template development.

```
facet serve [options]

Options:
  -p, --port <number>          Server port (default: 3010)
  --templates-dir <dir>        Directory containing templates (default: ".")
  --workers <count>            Number of browser workers (default: 2)
  --max-renders-per-worker <n> Recycle Chromium after N renders (default: 50)
  --max-queue-depth <count>    Maximum queued browser requests (default: 20)
  --max-worker-age <ms>        Maximum Chromium worker age (default: 1800000)
  --max-worker-rss <mb>        Linux Chromium RSS recycle threshold (default: 0/off)
  --worker-acquire-timeout <ms> Browser queue wait timeout (default: 30000)
  --no-persistent-ssr          Disable persistent SSR loader processes
  --timeout <ms>               Render timeout in milliseconds (default: 60000)
  --api-key <key>              API key for authentication
  --max-upload <bytes>         Max upload size in bytes (default: 52428800)
  --cache-max-size <bytes>     Max render cache size in bytes (default: 104857600)
  --s3-endpoint <url>          S3 endpoint URL
  --s3-bucket <name>           S3 bucket name
  --s3-region <region>         S3 region (default: us-east-1)
  --s3-prefix <prefix>         S3 key prefix
  -v, --verbose                Enable verbose logging
```

**Example:**
```bash
facet serve --templates-dir ./templates --port 3010

# With authentication
facet serve --api-key my-secret-key

# With S3 upload
facet serve --s3-endpoint https://s3.amazonaws.com --s3-bucket my-bucket

# Reuse the immutable Facet-only modules for every request
facet serve --skip-modules --templates-dir ./templates
```

The playground is available at `http://localhost:3010/` with a Monaco editor, live preview, and render logs. Use the **Example** dropdown to load a starting point:

- **Datasheet** — a multi-component TSX template
- **Live Diagram** — a `// @live` box-and-arrow diagram (see [Diagrams](#diagrams))
- **Markdown** — a plain `.md` document auto-wrapped in a printable page
- **MDX** — Markdown prose mixed with Facet React components

Switching examples sets the editor language and the file extension sent to the server (`.tsx`, `.md`, or `.mdx`).

See [openapi.yaml](openapi.yaml) for the full API specification.

### Docker

```bash
docker run -p 3000:3000 -v ./templates:/templates ghcr.io/flanksource/facet
```

### Helm

```bash
helm install facet ./chart
```

See [chart/values.yaml](chart/values.yaml) for configuration options.

### Why `.facet/`?

Similar to Next.js (`.next/`) or Nuxt (`.nuxt/`), the `.facet/` directory:
- **Isolates build artifacts** - Keeps your project clean
- **Enables fast rebuilds** - Symlinks avoid file copying
- **Supports incremental builds** - Only rebuilds what changed
- **Simplifies debugging** - All build files in one place

**Add to `.gitignore`:**

```gitignore
.facet/
dist/
```

## Import Patterns

### Named Imports (Recommended)
```tsx
import { StatCard, Header, Page } from '@flanksource/facet';
```

### TypeScript Support

All components include full TypeScript definitions:

```tsx
import { StatCard } from '@flanksource/facet';

<StatCard
  label="Response Time"  // string
  value="< 2min"         // string | number
  trend="up"             // 'up' | 'down' | 'neutral' (optional)
  icon="clock"           // string (optional)
/>
```

## Styling

Components use Tailwind CSS for styling. Include Tailwind in your project:

```bash
pnpm add -D tailwindcss autoprefixer postcss
```

**tailwind.config.js:**
```js
module.exports = {
  content: [
    './MyDatasheet.tsx',
    './node_modules/@facet/core/src/components/**/*.tsx'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## Markdown & MDX

Markdown (`.md`) and MDX (`.mdx`) files are first-class templates — `facet html`,
`facet pdf`, `facet serve`, and inline renders all accept them directly. A
Markdown/MDX template is auto-wrapped in a printable `<Page>` with prose styling,
so you can render a plain document with zero React boilerplate:

```bash
facet pdf Report.md
```

MDX additionally lets you mix prose with Facet React components, and exposes the
loaded data as props:

```mdx
import { StatCard } from '@flanksource/facet';

# {props.title}

This is **MDX content** with a React component:

<StatCard label="Users" value="10,000+" />
```

MDX can also be imported into a TSX template when you need a custom layout:

```tsx
// MyDatasheet.tsx
import Content from './content.mdx';

export default function MyDatasheet() {
  return (
    <DatasheetTemplate>
      <Content />
    </DatasheetTemplate>
  );
}
```

Try the **Markdown** and **MDX** entries in the playground's **Example** dropdown.

## Development

### Component Development

Use Storybook for component development:

```bash
pnpm run storybook
```

### Building the CLI

```bash
pnpm run build:cli
```

To build the npm CLI package from the current checkout and replace any existing
global `facet` command managed through npm's prefix:

```bash
task install
```

### Publishing

```bash
pnpm run prepublishOnly  # Builds CLI automatically
npm publish
```

## Architecture

- **`src/components/`** - React component library (47 components)
- **`src/styles.css`** - Global styles and Tailwind
- **`cli/`** - CLI package source
  - **`cli/src/builders/`** - Build orchestration
  - **`cli/src/generators/`** - HTML/PDF generators
  - **`cli/src/utils/`** - Shared utilities
  - **`cli/src/plugins/`** - Vite plugins
- **`assets/`** - Static assets (logos, icons)

## Examples

See `src/examples/` for complete working examples:

- **Basic Datasheet** - Simple single-page datasheet
- **Multi-page Report** - Complex multi-page document
- **Security Report** - Security-focused datasheet
- **POC Evaluation** - POC evaluation template

## Contributing

This is an internal Flanksource package. For issues or feature requests, contact the platform team.

## License

Proprietary - Flanksource Inc.

---

**Built with ❤️ by Flanksource**
