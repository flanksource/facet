# Quickstart Example

This example demonstrates the basic usage of `@facet/core` to create a simple datasheet.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Build the datasheet:

```bash
npm run build
```

This will create:
- `dist/datasheet-MyDatasheet.html` - Print-ready HTML
- `dist/datasheet-MyDatasheet-scoped.html` - Scoped for embedding

3. View the output:

```bash
open dist/datasheet-MyDatasheet.html
```

## What's Included

- **MyDatasheet.tsx** - Example template using @facet components
- Components used:
  - `DatasheetTemplate` - Main wrapper
  - `Header` - Page header with title
  - `Page` - Page container
  - `Section` - Content sections
  - `StatCard` - Metric displays
  - `BulletList` - Feature lists
  - `CallToAction` - CTA component

## Customization

Edit `MyDatasheet.tsx` to:
- Change the title and subtitle
- Update metrics in StatCard components
- Add more sections
- Customize colors and styling
- Add your own components

## Next Steps

See the [main README](../../../README.md) for:
- Complete component list
- CLI commands
- Advanced usage
- MDX support
