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

## Installation

### Option 1: npm Package (Recommended)

```bash
npm install -g @flanksource/facet
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
facet generate html --template MyDatasheet.tsx --output-dir ./dist
```

This creates:
- Print-ready HTML with embedded styles
- Scoped HTML for embedding in docs
- `.facet/` - Build cache directory (can be gitignored)

### 3. Generate PDF

```bash
facet generate pdf --template MyDatasheet.tsx
```

## Available Components

### Layout Components
- `DatasheetTemplate` - Main template wrapper with print styles
- `Page` - Single page container
- `Section` - Section with optional title
- `Header` - Title header with subtitle and logo support
- `Footer` - Page footer with customizable content

### Data Display
- `StatCard` - Key metric display with label and value
- `MetricGrid` - Grid of metrics with icons
- `CompactTable` - Dense data tables
- `SpecificationTable` - Technical specification tables
- `ComparisonTable` - Side-by-side comparisons

### Content Components
- `BulletList` - Styled bullet point lists
- `CalloutBox` - Highlighted callout sections
- `TwoColumnSection` - Two-column layouts
- `ValueProposition` - Value prop with icon and description
- `CapabilitySection` - Feature capabilities display

### Interactive Elements
- `IntegrationGrid` - Integration logos and descriptions
- `SocialProof` - Customer logos and testimonials
- `CallToAction` - CTA buttons and links

### Visualizations
- `ProgressBar` - Progress indicators
- `ScoreGauge` - Circular score gauges
- `KPITargetActual` - Target vs actual KPI displays

### Code & Terminal
- `SyntaxHighlighter` - Syntax-highlighted code blocks
- `TerminalOutput` - Terminal-style output
- `QueryResponseExample` - Query/response examples

### Project Management
- `ProjectSummaryCard` - Project summary displays
- `TaskSummarySection` - Task status summaries
- `StageIndicator` - Multi-stage progress indicators
- `StageSection` - Stage-based content sections

### Security & Compliance
- `SecurityChecksTable` - Security check results
- `VulnerabilityBreakdown` - Vulnerability statistics
- `SeverityStatCard` - Severity-based stats
- `AlertsTable` - Alert listings

[See full component documentation →](./docs/components.md)

## CLI Commands

### `facet build <template>`

Build HTML datasheet from a React template.

```bash
facet build MyDatasheet.tsx [options]

Options:
  -o, --output-dir <dir>  Output directory (default: "dist")
  -v, --verbose           Enable verbose logging
  --no-scoped            Skip generating scoped version
```

**Example:**
```bash
facet build MyDatasheet.tsx --output-dir ./build --verbose
```

### `facet pdf <template>`

Generate PDF from a React template.

```bash
facet pdf MyDatasheet.tsx [options]

Options:
  -d, --data <file>       JSON data file
  -o, --output-dir <dir>  Output directory (default: "dist")
  -v, --verbose           Enable verbose logging
```

**Example:**
```bash
facet pdf MyDatasheet.tsx --data data.json
```

## How It Works

### Build Process

When you run `facet build MyDatasheet.tsx`:

1. **Setup `.facet/` directory** - Creates build working directory
2. **Symlink your files** - Symlinks your templates and assets into `.facet/src/`
3. **Symlink node_modules** - Links dependencies for fast access
4. **Generate configs** - Creates `vite.config.ts`, `tsconfig.json`, `entry.tsx`
5. **Run Vite build** - Compiles React + TypeScript + MDX to static bundle
6. **Server-side render** - Renders React to static HTML
7. **Output files** - Writes HTML to your `dist/` directory

```
your-project/
├── MyDatasheet.tsx          # Your template
├── node_modules/
│   └── @facet/             # Installed package
├── .facet/                  # Build cache (auto-generated)
│   ├── src/                 # Symlinks to your files
│   │   └── MyDatasheet.tsx -> ../../MyDatasheet.tsx
│   ├── node_modules/        # Symlink to ../node_modules
│   ├── entry.tsx            # Generated entry point
│   ├── vite.config.ts       # Generated Vite config
│   └── dist/                # Vite build output
└── dist/                    # Final output
    ├── datasheet-MyDatasheet.html
    └── datasheet-MyDatasheet-scoped.html
```

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

### Default Import (All Components)
```tsx
import { StatCard, Header, Page } from '@facet';
```

### Individual Component Imports
```tsx
import StatCard from '@facet/StatCard';
import Header from '@facet/Header';
```

### TypeScript Support

All components include full TypeScript definitions:

```tsx
import { StatCard } from '@facet';

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
npm install -D tailwindcss autoprefixer postcss
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

## MDX Support

Templates support MDX for content-rich pages:

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

```mdx
# content.mdx

## Overview

This is **MDX content** with React components:

<StatCard label="Users" value="10,000+" />

- Bullet point one
- Bullet point two
```

## Development

### Component Development

Use Storybook for component development:

```bash
npm run storybook
```

### Building the CLI

```bash
npm run build:cli
```

### Publishing

```bash
npm run prepublishOnly  # Builds CLI automatically
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
