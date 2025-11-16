# @flanksource/reports

> Generate PDF reports, HTML pages, and embeddable WebComponents from React templates

A zero-setup CLI tool that generates professional PDF reports, static HTML pages, and embeddable WebComponents from TypeScript React templates. No build configuration, no node_modules, no package.json required in your template directory - just install globally and start generating.

## Features

- **Zero Setup**: Works immediately after global install - no configuration needed
- **Multiple Output Formats**: Generate PDFs, HTML, and WebComponents with scoped CSS
- **React Templates**: Write templates in TypeScript with full React support
- **Dynamic Data**: Load data from JSON files or TypeScript modules with async support
- **Schema Validation**: Validate data against JSON Schema before generation
- **Preview Server**: Live preview with data editing and hot reload
- **Self-Contained**: All dependencies bundled - no local package.json needed

## Installation

```bash
npm install -g @flanksource/reports
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
        <style>{`
          body { font-family: sans-serif; padding: 2rem; }
          h1 { color: #2563eb; }
        `}</style>
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
facet generate pdf --template MyReport.tsx --data report-data.json
```

Output: `Q4-Report.pdf` ✨

## Usage

### Generate PDF

```bash
facet generate pdf \
  --template MyReport.tsx \
  --data report-data.json
```

### Generate HTML

```bash
facet generate html \
  --template MyReport.tsx \
  --data report-data.json \
  --output-dir ./output
```

### Generate WebComponent (with scoped CSS)

```bash
facet generate webcomponent \
  --template MyReport.tsx \
  --data report-data.json \
  --css-scope "my-report"
```

### Generate All Formats

```bash
facet generate all \
  --template MyReport.tsx \
  --data report-data.json
```

### Preview Server

Start a development server with live preview and data editing:

```bash
facet serve \
  --template MyReport.tsx \
  --data report-data.json \
  --port 3000
```

Open http://localhost:3000 to see live preview. Edit your template or data, and see changes instantly.

## Data Loading

### JSON File

```bash
facet generate pdf --template Report.tsx --data data.json
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
facet generate pdf --template Report.tsx --data-loader data-loader.ts
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
facet generate pdf --template Report.tsx --data-loader data-loader.ts
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
facet generate pdf \
  --template Report.tsx \
  --data data.json \
  --output-name-field title
```

Supports dot notation for nested fields:

```bash
--output-name-field metadata.reportId
```

## Data Validation

Validate data against a JSON Schema:

**schema.json**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "title"],
  "properties": {
    "name": { "type": "string" },
    "title": { "type": "string" }
  }
}
```

```bash
facet generate pdf \
  --template Report.tsx \
  --data data.json \
  --schema schema.json
```

Skip validation:

```bash
facet generate pdf \
  --template Report.tsx \
  --data data.json \
  --no-validate
```

## WebComponent Mode

WebComponent mode generates HTML with scoped CSS, perfect for embedding in documentation sites like Docusaurus:

```bash
facet generate webcomponent \
  --template FeatureDoc.tsx \
  --data features.json \
  --css-scope "flanksource-feature"
```

Output: `feature-doc-wc.html` with all CSS selectors prefixed with `.flanksource-feature`

Embed in your site:

```html
<div class="flanksource-feature">
  <!-- Contents of feature-doc-wc.html -->
</div>
```

CSS won't conflict with your site styles!

## Verbose Logging

Enable detailed logging for debugging:

```bash
facet generate pdf \
  --template Report.tsx \
  --data data.json \
  --verbose
```

Shows:
- Data loading details
- Template compilation steps
- Timing information
- Full stack traces on errors

## CLI Reference

### Commands

- `generate <type>` - Generate output (type: pdf, html, webcomponent, all)
- `serve` - Start preview server

### Options

#### generate command

- `-t, --template <file>` - Path to React template file (.tsx) **[required]**
- `-d, --data <file>` - Path to JSON data file
- `-l, --data-loader <file>` - Path to data loader module (.ts or .js)
- `-o, --output-dir <dir>` - Output directory (default: ./output)
- `--output-name-field <field>` - Data field for filename (default: name)
- `--css-scope <prefix>` - CSS scope prefix for webcomponent mode
- `-s, --schema <file>` - JSON Schema file for validation
- `--no-validate` - Skip data validation
- `-v, --verbose` - Enable verbose logging

#### serve command

- `-t, --template <file>` - Path to React template file (.tsx) **[required]**
- `-d, --data <file>` - Path to JSON data file
- `-l, --data-loader <file>` - Path to data loader module (.ts or .js)
- `-p, --port <number>` - Server port (default: 3000)
- `-v, --verbose` - Enable verbose logging

### Global Options

- `-h, --help` - Show help
- `-V, --version` - Show version

## Template Requirements

Templates must:

1. Be valid TypeScript React files (`.tsx`)
2. Export a default function component
3. Accept a `data` prop with your data type
4. Return a complete HTML document (including `<html>`, `<head>`, `<body>`)

**Example**:

```tsx
import React from 'react';

interface MyData {
  title: string;
}

export default function MyTemplate({ data }: { data: MyData }) {
  return (
    <html>
      <head>
        <title>{data.title}</title>
      </head>
      <body>
        <h1>{data.title}</h1>
      </body>
    </html>
  );
}
```

## Data Loader Requirements

Data loaders must:

1. Be valid TypeScript or JavaScript files (`.ts` or `.js`)
2. Export a named export called `data`
3. Data can be either:
   - A static object: `export const data = { ... }`
   - An async function: `export const data = async () => { ... }`

**Static Example**:

```typescript
export const data = {
  name: "Report-2024",
  title: "Annual Report"
};
```

**Async Example**:

```typescript
export const data = async () => {
  const db = await connectToDatabase();
  const records = await db.query('SELECT * FROM reports WHERE id = ?', [123]);
  return {
    name: `Report-${records[0].id}`,
    title: records[0].title,
    data: records[0].data
  };
};
```

## Examples

See the [`examples/`](./examples) directory for:

- `SimpleReport.tsx` - Basic report template
- `simple-data.json` - Static JSON data
- `simple-data-loader.ts` - Async data loader
- `simple-schema.json` - JSON Schema validation

## Architecture

The CLI is built with:

- **Commander.js** - CLI argument parsing
- **TypeScript** - Type-safe code
- **esbuild** - Fast TypeScript compilation
- **React** - Template rendering (SSR)
- **Puppeteer** - PDF generation
- **PostCSS** - CSS scoping for WebComponents
- **Ajv** - JSON Schema validation
- **Vite** - Development server

All dependencies are bundled within the CLI package - no installation required in your project.

## Requirements

- Node.js 18 or higher

## Development

**Install dependencies**:

```bash
cd cli
npm install
```

**Build**:

```bash
npm run build
```

**Test**:

```bash
npm test
```

**Watch mode**:

```bash
npm run dev
```

## License

Apache-2.0

## Contributing

Issues and pull requests welcome! See the main [facet](https://github.com/flanksource/facet) repository.
