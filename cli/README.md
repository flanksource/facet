# @flanksource/facet

> Generate PDF reports, HTML pages, and embeddable WebComponents from React templates

A zero-setup CLI tool that generates professional PDF reports, static HTML pages, and embeddable WebComponents from TypeScript React templates. No build configuration, no node_modules, no package.json required in your template directory - just install globally and start generating.

## Features

- **Zero Setup**: Works immediately after global install - no configuration needed
- **Multiple Output Formats**: Generate PDFs, HTML, and WebComponents with scoped CSS
- **React Templates**: Write templates in TypeScript with full React support
- **Dynamic Data**: Load data from JSON files or TypeScript modules with async support
- **Schema Validation**: Validate data against JSON Schema before generation
- **Style Linting**: Catch styling issues, page structure problems, and CSS conflicts
- **Preview Server**: Live preview with data editing and hot reload
- **Self-Contained**: All dependencies bundled - no local package.json needed

## Installation

### Option 1: npm Package (Recommended)

```bash
pnpm add -g @flanksource/facet
# or: npm install -g @flanksource/facet
```

### Option 2: Standalone Binary

Download platform-specific binaries from [GitHub Releases](https://github.com/flanksource/facet/releases):

- **Linux**: `facet-linux`
- **macOS**: `facet-macos`
- **Windows**: `facet-windows.exe`

Make executable (Linux/macOS):
```bash
chmod +x facet-*
sudo mv facet-* /usr/local/bin/facet
```

## Quick Start

**1. Create a template** (`MyReport.tsx`):

```tsx
import React from 'react';

interface ReportData {
  title: string;
  sections: Array<{ title: string; content: string }>;
}

export default function MyReport({ data }: { data: ReportData }) {
  return (
    <html>
      <head>
        <title>{data.title}</title>
      </head>
      <body>
        <h1>{data.title}</h1>
        {data.sections.map((section, i) => (
          <section key={i}>
            <h2>{section.title}</h2>
            <p>{section.content}</p>
          </section>
        ))}
      </body>
    </html>
  );
}
```

**2. Create data** (`report-data.json`):

```json
{
  "name": "Q4-Report",
  "title": "Q4 2024 Review",
  "sections": [
    {
      "title": "Summary",
      "content": "Strong performance across all metrics."
    }
  ]
}
```

**3. Generate PDF**:

```bash
facet pdf MyReport.tsx --data report-data.json
```

Output: `Q4-Report.pdf`

## Usage

### Generate PDF

```bash
facet pdf MyReport.tsx --data report-data.json
```

### Generate HTML

```bash
facet html MyReport.tsx --data report-data.json --output ./output
```

### Preview Server

Start an API server for rendering templates:

```bash
facet serve --templates-dir ./templates --port 3010
```

### Lint Templates

Scan TSX files for styling, CSS, and page layout issues:

```bash
facet lint src/components/
```

Run a specific rule only:

```bash
facet lint --rule inline-hex-colors src/
```

Show only errors (skip warnings):

```bash
facet lint --severity error .
```

## Data Loading

### JSON File

```bash
facet pdf Report.tsx --data data.json
```

### TypeScript Module (Static Data)

**data-loader.ts**:
```typescript
export const data = {
  name: "MyReport",
  title: "Static Data Report",
  sections: [...]
};
```

```bash
facet pdf Report.tsx --data-loader data-loader.ts
```

### TypeScript Module (Async Data)

**data-loader.ts**:
```typescript
export const data = async () => {
  const response = await fetch('https://api.example.com/report-data');
  return response.json();
};
```

```bash
facet pdf Report.tsx --data-loader data-loader.ts
```

## Output Naming

By default, output files are named using the `name` field from your data:

```json
{
  "name": "Q4-Report-2024",
  "title": "Quarterly Report"
}
```

Generates: `Q4-Report-2024.pdf`

Use a different field:

```bash
facet pdf Report.tsx --data data.json --output-name-field title
```

Supports dot notation for nested fields:

```bash
--output-name-field metadata.reportId
```

## Data Validation

Validate data against a JSON Schema:

```bash
facet pdf Report.tsx --data data.json --schema schema.json
```

Skip validation:

```bash
facet pdf Report.tsx --data data.json --no-validate
```

## CLI Reference

### Commands

| Command | Description |
|---------|-------------|
| `facet pdf <templates...>` | Generate PDF from one or more templates |
| `facet html <templates...>` | Generate HTML from one or more templates |
| `facet serve` | Start API server for rendering templates |
| `facet lint [paths...]` | Scan TSX files for styling and layout issues |

### pdf / html Options

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --data <file>` | Path to JSON data file | |
| `-l, --data-loader <file>` | Path to data loader module (.ts or .js) | |
| `-o, --output <path>` | Output file path or directory | `.` |
| `--output-name-field <field>` | Data field to use for output filename | `name` |
| `-s, --schema <file>` | JSON Schema file for validation | |
| `--no-validate` | Skip data validation | |
| `-v, --verbose` | Enable verbose logging | |
| `--refresh` | Force re-fetch of remote template (bypass cache) | |
| `--sandbox [settings]` | Enable sandbox (optionally specify settings file) | |

### pdf-only Options

| Option | Description | Default |
|--------|-------------|---------|
| `--page-size <size>` | Page size (a4, a3, letter, legal, fhd, qhd, wqhd, 4k, 5k, 16k) | `a4` |
| `--landscape` | Use landscape orientation | |
| `--margin-top <mm>` | Top margin in mm | |
| `--margin-bottom <mm>` | Bottom margin in mm | |
| `--margin-left <mm>` | Left margin in mm | |
| `--margin-right <mm>` | Right margin in mm | |
| `--header <file>` | Header template file (.tsx) | |
| `--footer <file>` | Footer template file (.tsx) | |
| `--debug` | Add debug overlay for header/footer zones | |
| `--owner-password <pw>` | PDF owner password (controls permissions) | |
| `--user-password <pw>` | PDF password required to open | |
| `--no-print` | Disable printing permission | |
| `--no-copy` | Disable copy permission | |
| `--sign-cert <path>` | Path to PKCS#12 certificate for signing | |
| `--self-signed` | Auto-generate a self-signed certificate | |
| `--timestamp-url <url>` | RFC 3161 Timestamp Authority URL | |

### html-only Options

| Option | Description |
|--------|-------------|
| `--css-scope <prefix>` | CSS scope prefix for scoped HTML generation |

### serve Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --port <number>` | Server port | `3010` |
| `--templates-dir <dir>` | Directory containing templates | `.` |
| `--workers <count>` | Number of browser workers | `2` |
| `--timeout <ms>` | Render timeout in milliseconds | `60000` |
| `--api-key <key>` | API key for authentication | |

### lint Options

| Option | Description | Default |
|--------|-------------|---------|
| `-v, --verbose` | Show detailed output including passing files | |
| `--rule <name>` | Run only a specific rule | all rules |
| `--severity <level>` | Minimum severity to report (`warning` or `error`) | `warning` |

### Lint Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `hardcoded-page-break` | error | Inline `pageBreakAfter`/`breakAfter` styles — use `<PageBreak />` |
| `page-structure` | error | Missing `<Page>` wrapper, nested pages, content outside page |
| `conflicting-print-css` | error | `@page`, `@media print`, `break-before-page` classes in components |
| `conflicting-tailwind` | error | Contradictory Tailwind utilities (`flex-row flex-col`, duplicate gaps) |
| `inline-hex-colors` | warning | Hex colors in `style={{}}` — use Tailwind classes |
| `inline-style-layout` | warning | Layout props in inline styles — use Tailwind arbitrary values |
| `mixed-units` | warning | `px` units in PDF-targeted code — use `mm` or `pt` |

Suppress a line with `// facet-lint-disable` or `// facet-lint-disable-next-line`.

### Global Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help |
| `-V, --version` | Show version and build date |

## Template Requirements

Templates must:

1. Be valid TypeScript React files (`.tsx`)
2. Export a default function component
3. Accept a `data` prop with your data type
4. Wrap content in `<Page>` components (for PDF output)

## Data Loader Requirements

Data loaders must:

1. Be valid TypeScript or JavaScript files (`.ts` or `.js`)
2. Export a named export called `data`
3. Data can be either:
   - A static object: `export const data = { ... }`
   - An async function: `export const data = async () => { ... }`

## Architecture

The CLI is built with:

- **Commander.js** - CLI argument parsing
- **TypeScript** - Type-safe code
- **Vite** - Dynamic template compilation (SSR)
- **React** - Template rendering (SSR)
- **Puppeteer** - PDF generation
- **LightningCSS** - CSS scoping for WebComponents
- **Ajv** - JSON Schema validation
- **Bun** - Standalone binary compilation

All dependencies are bundled within the CLI package - no installation required in your project.

## Requirements

- Node.js 20 or higher (for development)
- Standalone binary requires no runtime

## License

Apache-2.0

## Contributing

Issues and pull requests welcome! See the main [facet](https://github.com/flanksource/facet) repository.
