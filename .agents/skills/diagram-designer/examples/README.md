# Runnable diagram examples

Eight canonical diagram styles, each a standalone facet template. Every template's first line is `// @live`, so plain `facet html` renders it (arrows are measured in a headless browser and baked to SVG).

Each `*.png` next to a template is its checked-in reference render — read it to preview a layout style before committing to one. Rendered `*.html` is not checked in; regenerate it with the commands below.

## Prerequisites

- `facet` on PATH (`npm install -g @flanksource/facet-cli`, or `task install` in the facet repo). Verified against facet 0.1.59 with the live-render Tailwind + width-freeze fixes.
- Chrome/Chromium for the live render (`facet doctor` checks the environment).
- First render bootstraps a `.facet/` pnpm workspace next to the templates (needs registry access once; safe to delete; gitignored here).

## Render

From this directory:

```bash
facet html pipeline.tsx -o dist
facet html data-flow.tsx -o dist
facet html fan-in-fan-out.tsx -o dist
facet html entity-model.tsx -o dist
facet html hub-and-spoke.tsx -o dist
facet html swimlane-flow.tsx -o dist
facet html topology-overview.tsx -o dist
facet html architecture.tsx -o dist
```

Or all at once: `pnpm run html` (see `package.json`). PDF: swap `html` for `pdf`.

During the design loop, render a PNG instead and review it directly (defaults 1280×800, `--selector body`; pass `--width` for wide layouts):

```bash
facet png pipeline.tsx -o dist
```

The `package.json` here is load-bearing: it anchors facet's consumer root to this directory. Without it, facet walks up and can mis-anchor to a stray `.git`/`package.json` higher in the tree.

## The examples

| File | Style | Demonstrates |
| --- | --- | --- |
| `pipeline.tsx` | Pipeline | Horizontal chain, bordered icon+label stages, Mission Control pill, arrow labels, splitting one story per `<Section>` |
| `data-flow.tsx` | Data Flow | 4-column layout, borderless `IconNode` intermediaries, spacer div for arrow length, parallel offset arrows, table in a green output node |
| `fan-in-fan-out.tsx` | Fan-in/Fan-out | Stacked sources → `MissionControlCatalogBox` anchor → outputs, offset `endAnchor`s spreading converging arrows, `IconGrid` recipe |
| `entity-model.tsx` | Entity Model | Relational, junction, event, document, and materialized-view models; complete PostgreSQL 18 general-purpose type tables, SQLite affinity/STRICT/storage tables, verified icon mappings, and a full legend |
| `hub-and-spoke.tsx` | Hub & Spoke | Semantic Tailwind stage palette, step badge via a `node` port, `path="grid"` feedback arrow with `gridBreak="75%"`, red constraint arrow, persona row |
| `swimlane-flow.tsx` | Swimlane Flow | Reusable `FlowDiagram`, actor lanes, numbered steps, compact one-bend connectors, and a highlighted outcome |
| `topology-overview.tsx` | Topology Overview | Teams, nested component selectors/properties/checks/configuration, lookups, and linked health/configuration systems using `BoxNode`, `NodePill`, and structural `Arrow` connectors |
| `architecture.tsx` | Layered Architecture | AI clients → MCP server → platform layers, Postgres/K8s CRD storage, and inbound/outbound integration groups, all using named `BoxNode` endpoints |

The topology and architecture examples recreate the corresponding `topology-overview.svg` and `architecture.svg` references from `website-migration/mission-control/specs/.claude/skills/flanksource-brand/assets/`. They retain the source vocabulary and connector directions while using Facet boxes and readable platform labels. Render their wide layouts with `facet png topology-overview.tsx architecture.tsx --viewport 1500x900 --autocrop -o dist`.

## Verify a render

```bash
rg -c 'data-facet-ready="true"' dist/pipeline.html   # ≥1: diagram settled before capture
rg -o '<svg' dist/pipeline.html | wc -l              # arrows baked (plus icon SVGs)
open dist/pipeline.html                              # eyeball anchors, labels, crossings
```

The entity-model type catalog follows the [PostgreSQL 18 data type reference](https://www.postgresql.org/docs/18/datatype.html), [range types](https://www.postgresql.org/docs/18/rangetypes.html), [object identifier types](https://www.postgresql.org/docs/18/datatype-oid.html), [SQLite datatype and affinity rules](https://www.sqlite.org/datatype3.html), and [SQLite STRICT table types](https://www.sqlite.org/stricttables.html). SQLite ordinary tables accept arbitrary declared type names, so the catalog covers all affinity rules rather than claiming a finite list of spellings.
