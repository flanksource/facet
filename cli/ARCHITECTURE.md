# CLI Architecture

## Overview

The `@flanksource/reports` CLI is a zero-setup tool that generates PDF reports, HTML pages, and WebComponents from React templates. It uses a **hybrid approach** that reuses proven code from the existing `scripts/` directory while adding dynamic template compilation capabilities.

## Design Decisions

### Why Hybrid Approach?

1. **Reuse Proven Code**: CSS scoping, PDF generation, and React SSR patterns already work perfectly in `scripts/`
2. **Vite Ecosystem**: Leverage existing Vite plugins and configuration patterns
3. **Faster Development**: Extract and adapt rather than rewrite from scratch
4. **Compatibility**: Support existing Flanksource variants as templates with minimal changes

### Alternative Considered (Rejected)

**Full esbuild rewrite**: Would require recreating icon loading, MDX support, CSS handling - significant duplicate effort without clear benefit over the Vite approach.

## Architecture

```
cli/
├── src/
│   ├── cli.ts                    # CLI entry point with Commander.js
│   ├── index.ts                  # Public API exports
│   ├── types.ts                  # Shared TypeScript types
│   │
│   ├── bundler/
│   │   ├── vite-builder.ts       # Dynamic template compilation with Vite
│   │   └── renderer.ts           # React SSR rendering (from build-datasheet.js)
│   │
│   ├── generators/
│   │   ├── html.ts               # HTML output generator
│   │   ├── pdf.ts                # PDF output generator (uses Puppeteer)
│   │   └── webcomponent.ts       # WebComponent with scoped CSS
│   │
│   ├── utils/
│   │   ├── logger.ts             # Colored console logging
│   │   ├── data-loader.ts        # Load data from JSON or TS modules
│   │   ├── validator.ts          # JSON Schema validation with Ajv
│   │   ├── css-scoper.ts         # CSS scoping (from scope-css.js)
│   │   └── pdf-generator.ts      # Puppeteer PDF utilities (from generate-pdfs.js)
│   │
│   └── server/
│       └── preview.ts            # Preview server (not yet implemented)
│
├── bin/
│   └── cli.js                    # Executable shebang script
│
└── examples/
    ├── SimpleReport.tsx          # Example template
    ├── simple-data.json          # Example JSON data
    ├── simple-data-loader.ts     # Example async data loader
    └── simple-schema.json        # Example JSON Schema
```

## Core Components

### 1. Dynamic Template Compilation (`vite-builder.ts`)

**Problem**: Existing system uses fixed variants with hardcoded entry points. CLI needs to compile arbitrary user templates.

**Solution**: Create temporary build environment for each generation:

```typescript
1. Create temp directory
2. Copy user template
3. Generate vite.config.ts programmatically
4. Run `npx vite build --ssr`
5. Load compiled bundle
6. Return component + CSS
7. Cleanup temp directory
```

**Why Vite?**
- Reuses existing plugin ecosystem (unplugin-icons, MDX, etc.)
- Handles React JSX transformation
- CSS extraction works out of the box
- Compatible with existing Flanksource variants

### 2. React SSR Rendering (`renderer.ts`)

**Extracted from**: `scripts/build-datasheet.js`

**Purpose**: Render React components to static HTML

```typescript
renderToHTML({
  component: UserComponent,
  data: userData,
  css: compiledCSS
})
// → { html, css }
```

Uses `ReactDOMServer.renderToStaticMarkup` with data prop injection.

### 3. CSS Scoping (`css-scoper.ts`)

**Extracted from**: `scripts/scope-css.js`

**Purpose**: Scope all CSS selectors for WebComponent embedding

**Algorithm**:
1. Prefix all selectors with `.datasheet-wrapper` (or custom scope class)
2. Handle special cases: `:root`, `html`, `body`, `@media`, `@keyframes`
3. Wrap HTML body in `<div class="datasheet-wrapper">`

**Result**: CSS won't conflict with host site styles when embedded in Docusaurus or other sites.

### 4. PDF Generation (`pdf-generator.ts`)

**Extracted from**: `scripts/generate-pdfs.js`

**Purpose**: Convert HTML to PDF using Puppeteer

**Configuration**:
- Zero margins (spacing controlled by CSS)
- A4 format
- Print background colors/images
- Wait for fonts and dynamic content

### 5. Data Loading (`data-loader.ts`)

**Purpose**: Load data from JSON files or TypeScript modules

**Supports**:
- Static JSON: `--data report.json`
- Static TS object: `export const data = { ... }`
- Async TS function: `export const data = async () => { ... }`

**Features**:
- Extracts output filename from data field (supports dot notation)
- Sanitizes filenames for safe file system usage

### 6. Schema Validation (`validator.ts`)

**Purpose**: Validate data against JSON Schema (Draft 7)

Uses Ajv for schema validation with helpful error messages showing field paths.

## Build Flow

### HTML Generation

```
User Template (.tsx)
    ↓
vite-builder.ts → Compile to JS + extract CSS
    ↓
renderer.ts → React SSR with user data
    ↓
combineHTMLAndCSS → Inline CSS
    ↓
Write output/{name}.html
```

### PDF Generation

```
User Template (.tsx)
    ↓
vite-builder.ts → Compile to JS + extract CSS
    ↓
renderer.ts → React SSR with user data
    ↓
combineHTMLAndCSS → Inline CSS
    ↓
pdf-generator.ts → Puppeteer HTML → PDF
    ↓
Write output/{name}.pdf
```

### WebComponent Generation

```
User Template (.tsx)
    ↓
vite-builder.ts → Compile to JS + extract CSS
    ↓
renderer.ts → React SSR with user data
    ↓
combineHTMLAndCSS → Inline CSS
    ↓
css-scoper.ts → Prefix selectors + wrap HTML
    ↓
Write output/{name}-wc.html
```

## Bundling Strategy

**Approach**: Bundle all dependencies within the CLI package using tsup.

**Why?**
- Zero-setup user experience
- No `package.json` required in user's directory
- No `node_modules` pollution

**Bundled Dependencies**:
- React + ReactDOM
- Puppeteer
- Vite + @vitejs/plugin-react
- Commander.js
- Ajv (JSON Schema)
- Chalk (colors)

**External**: None (everything bundled)

**Trade-off**: Larger package size (~50-100MB) vs. instant usability

## CLI Interface

### Commands

```bash
# Generate PDF
facet generate pdf --template Report.tsx --data data.json

# Generate HTML
facet generate html --template Report.tsx --data data.json

# Generate WebComponent
facet generate webcomponent \
  --template Report.tsx \
  --data data.json \
  --css-scope "my-report"

# Generate all formats
facet generate all --template Report.tsx --data data.json

# Preview server (not yet implemented)
facet serve --template Report.tsx --data data.json
```

### Options

- `--template, -t` - Path to React template (.tsx) **[required]**
- `--data, -d` - Path to JSON data file
- `--data-loader, -l` - Path to TS/JS data loader
- `--output-dir, -o` - Output directory (default: ./output)
- `--output-name-field` - Data field for filename (default: name)
- `--css-scope` - CSS scope prefix for WebComponent mode
- `--schema, -s` - JSON Schema for validation
- `--no-validate` - Skip validation
- `--verbose, -v` - Detailed logging

## Comparison with Existing System

| Feature | Existing (`scripts/`) | CLI (`@flanksource/reports`) |
|---------|---------------------|-------------------------------|
| Template Model | Fixed variants (idp, mcp, etc.) | Dynamic user templates |
| Data Model | Baked into TSX files | External JSON or TS modules |
| Build System | `npx vite build` with local config | In-memory Vite builds in temp dir |
| Dependencies | User installs locally | Bundled in CLI |
| Output Formats | HTML + scoped HTML + PDF | HTML + PDF + WebComponent |
| Configuration | vite.config.ts required | Zero config |

## Migration Path

Existing Flanksource variants can become CLI templates with minimal changes:

**Before** (variant):
```typescript
// DatasheetApp-idp.tsx
export default function DatasheetAppIDP({ css }: { css: string }) {
  return (
    <html>
      <head><style dangerouslySetInnerHTML={{ __html: css }} /></head>
      <body>...</body>
    </html>
  );
}
```

**After** (CLI template):
```typescript
// IDPTemplate.tsx
export default function IDPTemplate({ data, css }: { data: IDPData; css?: string }) {
  return (
    <html>
      <head>{css && <style>{css}</style>}</head>
      <body>
        <h1>{data.title}</h1>
        ...
      </body>
    </html>
  );
}
```

Data moves to external JSON:
```json
{
  "name": "IDP-Datasheet",
  "title": "Internal Developer Platform",
  ...
}
```

## Future Enhancements

1. **Preview Server**: Live development with hot reload and data editing UI
2. **Template Registry**: npm packages as templates (e.g., `@flanksource/idp-template`)
3. **Custom Vite Plugins**: Allow users to specify plugins for advanced use cases
4. **Batch Generation**: Multiple reports from array of data objects
5. **Watch Mode**: Auto-regenerate on file changes
6. **PDF Headers/Footers**: Custom header/footer components (like existing system)

## Testing Strategy

1. **Unit Tests**: Data loader, CSS scoper, validator, renderer
2. **Integration Tests**: End-to-end generation with example templates
3. **Manual Tests**: Global installation, various template types
4. **Compatibility Tests**: Existing Flanksource variants as templates

## Known Limitations

1. **Temp Directory**: Each build creates/deletes temp directory (disk I/O overhead)
2. **Vite Requirement**: Still depends on Vite being available (via npx)
3. **No Icon Plugins Yet**: Unplugin-icons and Flanksource icons not yet integrated
4. **No MDX Support Yet**: MDX compilation not yet implemented
5. **Preview Server**: Not yet implemented

## Performance Considerations

**Build Time**: ~3-5 seconds per template (Vite compilation)
**Memory**: ~500MB peak (Puppeteer + Vite)
**Disk**: Temp directory ~5-10MB per build

**Optimizations**:
- Reuse browser instance for batch PDF generation
- Cache compiled templates (future)
- Parallel builds for `generate all` (future)

## Security

- Sanitizes user data for filenames
- Validates JSON Schema to catch data issues
- No arbitrary code execution beyond user's own template
- Temp directories use OS-level isolation

## Distribution

**Package**: `@flanksource/reports`
**Registry**: npm
**Installation**: `npm install -g @flanksource/reports`
**Size**: ~50-100MB (with bundled dependencies)

## Development

```bash
# Install dependencies
npm install

# Build CLI
npm run build

# Test locally (link globally)
npm link
facet --help

# Run tests
npm test

# Type check
npm run lint
```
