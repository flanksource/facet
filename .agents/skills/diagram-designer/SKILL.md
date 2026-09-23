---
name: diagram-designer
description: Design node-and-arrow architecture and journey diagrams the Flanksource way, in four phases — understand the audience and detail level, agree the groups/elements with the user, recommend a layout style (pipeline, data flow, swimlane flow, fan-in/fan-out, entity model, hub-and-spoke), then iterate a render-and-review loop with `facet png` until the diagram is clean. Use whenever creating, styling, or reviewing an architecture, workflow, lifecycle, data-flow, or ER diagram; converting a sketch, mermaid, or slide diagram to the house style; or porting a Docusaurus/react-xarrows diagram to facet.
argument-hint: "[what the diagram should show]"
user-invocable: true
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Diagram Designer

Flanksource diagrams are React templates compiled by facet. Use the reusable `FlowDiagram` primitive for numbered actor or system journeys; compose `Diagram`, `BoxNode`, and `Arrow` directly for architecture and relationship layouts. Boxes are pure CSS; arrows are measured in a live browser and baked to SVG — so every diagram template starts with `// @live` on its first line (the bake fails loudly if hydration never completes; there is no silent arrow-less fallback).

Work through the four phases in order. Phases 1–3 are cheap conversation; phase 4 is the render loop. Don't write template code before the layout is agreed.

## Phase 1 — Understand

Establish purpose, audience, and medium before anything else — they set the level of detail. Infer what you can from the request and surrounding context; ask only for what's missing.

| Use case | Audience | Detail level |
| --- | --- | --- |
| Marketing / landing page | Evaluators, skim-readers | 3–5 boxes, big labels, icon grids, zero field-level detail |
| Feature / how-it-works docs | Users configuring the feature | 5–8 boxes, NodeSections with real item names, arrow labels |
| Architecture / reference docs | Engineers integrating | Full detail; split into multiple diagrams rather than crowding one |
| Schema / data-model docs | Engineers querying | Entity model with exact fields, PK/FK badges, cardinality labels |
| Workflow / lifecycle report | Business and technical reviewers | Numbered steps in actor lanes, short action labels, detailed rules in surrounding narrative |

**Output:** a one-line brief — *audience + medium + detail level* (e.g. "feature docs page for operators, moderate detail, HTML embed"). State it to the user before moving on.

## Phase 2 — Elements

Inventory what could appear, then let the user choose how much of it does.

1. List the candidate **groups**: sources, intermediaries/processors, the central hub, outputs, personas, entities/tables, actor or system lanes, external systems.
2. For each group, list its candidate **elements**: named items (NodeSection pills), icon grids of platforms/vendors, tables, PK/FK field rows, step badges — vocabulary in **`references/box-styles-and-content.md`**.
3. Present the user with 2–3 named element sets to choose from (use AskUserQuestion when available; otherwise a short list). Typically:
   - **Minimal** — group boxes with titles + icons only
   - **Standard** — group boxes with NodeSections naming the key items
   - **Detailed** — sections, tables, badges, and supplementary flows
4. Confirm the icon vocabulary: `@flanksource/icons/mi` for vendor/product logos, `react-icons/*` for generic concepts (both always available to facet templates — no package.json needed; nothing else resolves without one). Match icon variant to background: `*White` variants (`MissionControlWhite`) only inside colored headers; light bodies and pills get the colored variant (`MissionControl`).

**Output:** the agreed group/element list, each group with its box type (BoxNode, borderless IconNode, anchor box, output box) or lane type (`FlowLane`).

## Phase 3 — Layout

Recommend 1–2 layout styles matched to the Phase 1 brief and the Phase 2 element count — with the runnable example as the preview for each option. One layout per diagram; never mix vertical and horizontal flow. More than 7–8 boxes → split into multiple `<Section>`s, each with its own `<Diagram>` (combinations are normal: e.g. a pipeline Section followed by an entity-model Section).

| Style | Use for | Runnable example |
| --- | --- | --- |
| **Pipeline** | Sequential chain: source → processor → destination | `examples/pipeline.tsx` |
| **Data Flow** | Source → borderless intermediary services → target → output | `examples/data-flow.tsx` |
| **Swimlane Flow** | Numbered actions moving left-to-right across actor or system lanes | `examples/swimlane-flow.tsx` |
| **Fan-in/Fan-out** | Many sources → central hub → many outputs | `examples/fan-in-fan-out.tsx` |
| **Entity Model** | ER tables with PK/FK badges and relationship arrows | `examples/entity-model.tsx` |
| **Hub & Spoke** | Product overview: personas + systems around a central platform | `examples/hub-and-spoke.tsx` |

Layout mechanics (rows, columns, spacers, gaps): **`references/layout-styles.md`**.

**Output:** the chosen style(s) — recommend one, note the runner-up, let the user pick if the fit is genuinely close.

## Phase 4 — Design loop

Now write code, and iterate: render → look at the PNG → fix → repeat. Never ship a diagram whose render you haven't looked at.

1. Copy the chosen style's `examples/*.tsx` as the skeleton (keep `// @live` as line 1) and fill in the Phase 2 elements. For swimlanes, supply `lanes`, `steps`, and `edges` to `FlowDiagram`; do not copy its internal grid and arrow mechanics into the report.
2. Render a PNG: `facet png diagram.tsx -o dist` (defaults 1280×800, `--selector body`; pass `--width` for wide layouts). For an embedded or print diagram, also render the containing page: an autocropped diagram cannot reveal duplicate headings, forced page starts, sparse continuation pages, or wasted page whitespace.
3. Optionally run the structured visual review on exactly one rendered image with `facet lint --diagrams --diagrams-ai`. Facet uses Captain only as a generic prompt runner; select any Captain-supported model with `--llm-model` or use Captain's configured default. The review prompt reports alignment, spacing, text-overlap, and arrow-rendering defects as structured findings. Treat those findings as evidence, not as a substitute for looking at the render yourself.
4. **Read `dist/diagram.png`** and review it against the checklist:
   - [ ] No arrow crosses through or routes behind a box
   - [ ] ≤ 4 arrow crossings total; no overlapping arrow bundles at one anchor
   - [ ] No stub arrows (line shorter than its head)
   - [ ] Labels sit on their lines without covering them; no text overlaps, truncates, or wraps unexpectedly
   - [ ] Arrows anchor at box borders, not floating in space
   - [ ] Straight lines between aligned nodes (no gratuitous curves)
   - [ ] Swimlane steps advance left-to-right; every cross-lane connector has one 90-degree bend and lands on the top edge, or the bottom edge when connecting to a lane above
   - [ ] Even whitespace (gap-6/8/12/16), consistent shadows, headers colored / bodies light
   - [ ] No large unused canvas or page region caused by an oversized wrapper, forced page break, or overly strict `break-inside`; continuation pages use the available space
   - [ ] Embedded diagrams follow the existing section heading without repeating the same title and do not start a new page unless the remaining space cannot fit the intact diagram frame
   - [ ] Labels and narrative text wrap naturally to the available width; no manual newline artifacts, avoidable one-word lines, orphaned headings, or isolated continuation fragments
   - [ ] Every icon is legible: `*White` variants only on colored headers, colored variants on light bodies
   - [ ] Only `COLORS.*` tokens (hub-and-spoke may use the semantic Tailwind palette); no text below `text-[8px]`
5. Fix every visible checklist failure and every actionable visual-review finding, then re-render and repeat both reviews. Common symptom → fix:

| Symptom | Fix |
| --- | --- |
| Arrow cuts through a box | Rearrange columns, or switch anchor sides (`startAnchor="top"` → `"right"`); for swimlanes, change the step column rather than overriding `FlowDiagram` arrows |
| Arrows pile up on one anchor | Offset anchors: `endAnchor={{ position: 'left', offset: { y: ±40 } }}` |
| Stub arrow between close nodes | Spacer `<div style={{ minWidth: '60px' }} />`, or `headSize={3}` / `showHead={false}` |
| Curve noise between aligned nodes | `path="straight"` |
| Label covers the line | Move to a different `labels` slot or add `mt-1`-style nudge on the pill |
| Text truncated / wrapped | Widen the box `minWidth`; shorten the label |
| Large blank page region or one-item continuation | Remove the outer forced `Page`/page break or broad `break-inside: avoid`; keep only the diagram frame intact and let its narrative flow |
| Repeated diagram/section title | Keep the surrounding document heading and remove the duplicate title from the embedded diagram wrapper |
| Awkward or unnecessary line breaks | Remove manual newlines, let text wrap naturally, or widen the text container before reducing font size |
| Diagram feels crowded | Cut elements back toward the Phase 2 minimal set, or split into another `<Section>` |

   Deep dives: **`references/arrows-and-flows.md`**, **`references/anti-patterns.md`**.
6. When the checklist passes and the visual review returns `pass: true` (when enabled), show the user the final PNG, then produce the deliverable the Phase 1 brief calls for: `facet html diagram.tsx -o dist` for embedding, `facet pdf` for print, or the PNG itself.

## Core primitives

Everything imports from `@flanksource/facet`:

```tsx
// @live
import { Page, Section, Diagram, BoxNode, Arrow, FlowDiagram, NodeSection, NodePill, SectionDivider, COLORS } from '@flanksource/facet';

export default function MyDiagram() {
  return (
    <Page>
      <Section title="My Flow">
        <Diagram className="relative">
          {(id) => (
            <>
              <div className="flex items-center justify-center gap-16 py-8">
                <BoxNode id={id('src')} title="Source" headerColor={COLORS.primary} bodyColor={COLORS.background} minWidth="160px">
                  <NodeSection title="Inputs" items={['Kubernetes', 'AWS']} />
                </BoxNode>
                <BoxNode id={id('out')} title="Report" headerColor={COLORS.outputBorder} borderColor={COLORS.outputBorder} minWidth="160px" />
              </div>
              <Arrow variant="primary" from={id('src')} to={id('out')} startAnchor="right" endAnchor="left" />
            </>
          )}
        </Diagram>
      </Section>
    </Page>
  );
}
```

**BoxNode** — the primary node: colored header over a light body. Props: `id` (arrow endpoint), `title` (string or icon+label node), `headerColor`/`bodyColor`/`borderColor` (COLORS tokens; border defaults from header), `minWidth`, `compact`, `shadow` (`"shadow-none"` for print), `ports`, or Tailwind fallback `className="bg-blue-600" bodyClassName="bg-blue-50"` (border auto-derived). Bodies are always light — never dark.

**Ports** — chips docked on the box border for endpoints, protocols and schedules: `ports={[{ position: 'top-middle', icon: Http, label: 'JSON' }]}`. `position` is `{top,bottom}-{left,middle,right}` or `{left,right}-{top,middle,bottom}`; `size` is the extent along that edge (`"100%"` spans the box). Give a port an `id` and an arrow may terminate on it — the sanctioned exception to targeting only the outer box id. Recipes in **`references/box-styles-and-content.md`**.

**Arrow** — thin wrapper over react-xarrows; `from`/`to` take box ids, `variant` picks a preset, any explicit prop (anchors, `path`, `labels`, `color`, `dashness`…) overrides it:

| Variant | Look | Use for |
| --- | --- | --- |
| `primary` | primary blue, 3px, animated dashed | The main data flow — the story the reader follows first |
| `secondary` | muted, 2px, animated dashed | Supplementary flows alongside the main one |
| `er` | muted, 1.5px, solid, curved (0.4) | FK/structural relationships in entity models |
| `bidirectional` | muted, 2px, solid, circle both ends | Non-directional connections |

Animated dashed = active data movement (scraping, streaming, API calls). Static solid = permanent structure (schema, FKs).

**FlowDiagram** — the reusable numbered swimlane flow. Supply ordered `lanes`, positioned `steps`, explicit `edges`, and the total `columns`. Each step starts on the right edge of its numbered badge; cross-lane arrows use one 90-degree bend and land on the target's top edge, or its bottom edge when moving upward. Steps use `column` for the horizontal sequence; keep each next step at the prior column plus the default offset unless the story needs a deliberate gap. `laneWidthMm`, `stepOffsetMm`, and `rowHeightMm` let print layouts fit A4/A3 without rebuilding the grid. Supply controls, exceptions, and long rules through each step's `narrative`; `FlowDiagram` renders the colored, single-column step list directly below the intact frame. Do not add footer boxes, a repeated diagram title, or a repeated systems legend. Runnable recipe: **`examples/swimlane-flow.tsx`**.

**Content inside boxes** — `NodeSection` (uppercase micro-header + pills), `NodePill`, `SectionDivider`. Recipes for IconGrid, entity field rows, step badges, and the Mission Control anchor box: **`references/box-styles-and-content.md`**. Icon sizes: `w-4 h-4` in headers, `w-6 h-6` in grids, `w-7 h-7` for hero/IconNode icons.

## Never

- Hardcode hex colors — use `COLORS.*` tokens (entity models may use the `COLORS.fk`/`COLORS.pk` aliases).
- Put more than 7–8 boxes in one diagram — split it.
- Rebuild swimlane grids and connector rules in a report when `FlowDiagram` fits the journey.
- Point arrows at inner sections — target the outer box `id` only.
- Use `start`/`end` props on `Arrow` — the API is `from`/`to`.
- Forget `// @live` as the first line — boxes render but arrows never draw.
- Use margin/padding to lengthen arrows — insert a spacer div.
- Give box bodies dark fills — only headers carry color.
- Put a `*White` icon variant on a light background — it disappears; use the colored variant.
- Ship a render you haven't visually reviewed in the loop.

Full list with rationale: **`references/anti-patterns.md`**.

## See also

- **`examples/README.md`** — render commands and prerequisites for all six examples; each `examples/*.png` is the rendered preview of its `.tsx`
- **`references/layout-styles.md`**, **`references/box-styles-and-content.md`**, **`references/arrows-and-flows.md`**, **`references/colors-and-typography.md`**, **`references/anti-patterns.md`**
- **facet-documents** skill (`../facet-documents/SKILL.md`) — embedding a diagram in a report: `Document`/`Page`/`Section`, components, theming
- **facet-cli** skill (`../facet-cli/SKILL.md`) — render flags, `--live`, `--viewport`, troubleshooting
- Facet primitives: `github.com/flanksource/facet` → `src/components/diagram/`
