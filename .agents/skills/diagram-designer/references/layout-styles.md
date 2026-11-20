# Layout styles

Choose a layout that makes the relationship or sequence clear. Keep a legible principal reading direction, while allowing deliberate turns in cycles, snake pipelines, branches and layered layouts. For manually connected Facet diagrams, `<Diagram>{(id) => ...}</Diagram>` supplies scoped endpoint IDs and a relative container. `FlowDiagram` owns its own layout; visual catalog figures may use other primitives.

## Layout catalog

The descriptions below provide the structure needed to select and compose each layout. An `examples/` path identifies a runnable template included with this skill; other entries are design patterns to compose with Facet primitives.

| Key and layout | Choose it for | Defining structure |
| --- | --- | --- |
| `pipeline` — Stage pipeline | Stages with branches and exceptions | Grid-placed stages read as a snake; links carry filters or conditions and dashed exception paths. |
| `layer-stack` — Layer stack | Dependencies among platform layers | Surfaces above core, controls, providers, execution and stores; connectors follow layer order. |
| `planes` — Control and compute planes | Responsibility and trust separation | Interface, control and compute planes read left to right. |
| `durable-loop` — Durable loop | A repeated agent loop in a durable run | Breadcrumb scope, loop stages and one nested sandbox boundary. |
| `request-lanes` — Request lanes | A request moving between actors | Chronological steps cross person, control plane, agent and verifier lanes; see `examples/swimlane-flow.tsx`. |
| `iso-stack` — Isometric stack | Layered product overview | Stacked plates, one highlighted, alternating leader labels. |
| `iso-stack-animated` — Animated isometric stack | Interactive layer-by-layer explanation | Highlight and detail change by selected plate; include a usable static view for print. |
| `arc-platform` — Platform arc | Product ecosystem around a shared core | Core and data at center, control ring, product sectors and outer surfaces. |
| `fan-out` — Fan-out with actors | One outcome and contributing work | Outcome branches to cards tagged by the person or agent. |
| `app-boundary` — Application boundary | What is deployed and what is external | Dashed deployment frame, frontend/backend panels, outside parties and verb-labelled edges. |
| `numbered-rail` — Numbered rail | Ordered explanation paired with scenes | Gradient rail with numbered steps, brief prose and framed scenes. |
| `night-layer-stack` — Night layered stack | Layer structure without step order | Dark canvas, role-coloured dashed bands and tiles, without a numbered rail. |
| `wire-figures` — Wire figures | Compact network explanations | Numbered captioned cards, orthogonal lines combed into a bus and one dark hub. |
| `reference-architecture` — Reference architecture | Service and ownership boundaries | Dotted canvas, people and service tiles, scope/binding boundaries, labelled edges and footer title. |
| `stage-columns` — Stage columns | Data movement by processing stage | Numbered dashed columns, typed nodes, role-coded strokes and brief takeaways. |
| `signal-lanes` — Signal lanes | Runtime flow with policy and recovery | Numbered actor lanes, phases, an exception lane and labelled edges. |
| `blueprint` — Blueprint | Deployment and trust boundaries | Grid paper, crop marks, nested region/network boundaries and boxed boundary-crossing labels. |
| `layered-platform` — Layered platform | Capability tiers with inputs and deployment | Side integrations align with tier rows; `examples/layered-platform.tsx`. |
| `protocol-bands` — Protocol bands | Protocols, capabilities and backends | Shared grid aligns protocol lanes, cross-cutting band and bus; `examples/protocol-bands.tsx`. |
| `titled-canvas` — Titled canvas | Standalone figure with a focal node | Heading, explicit node/edge kinds and legend; `examples/titled-canvas.tsx`. |
| `build-columns` — Build-time columns | Source, build and runtime handoffs | Headed columns, dashed groups, typed cards and technology footers. |
| `hub` — Hub and spoke | Inputs, approval, hub, targets and foundations | Five slots and offset paired flows; related example: `examples/hub-and-spoke.tsx`. |
| `containment` — Containment | Ownership hierarchy and external dependencies | Nested zones, with connections leaving the owning inner zone. |
| `node-graph` — Typed node graph | Typed relationships and execution paths | Automatic graph placement, kind-based legend and faded inactive paths. |
| `cycle` — Cycle | Bounded iterative process | Stages around a fixed center, with exits from the stage where they occur. |
| `timeline` — Timeline | Events or milestones over time | Ordered points on a time axis; use dates when timing matters. |

The recipes below provide additional manual Facet and flow examples.

## Horizontal (left-to-right) — Pipeline

For sequential chains: source → processor → destination. Runnable example: `examples/pipeline.tsx`.

```tsx
<div className="flex items-center justify-center gap-16 py-6">
  <SourceBox id={id('source')} />
  <DiagramNode id={id('proc')} icon={ProcIcon} label="Processor" />
  <MissionControlPill id={id('mc')} />
</div>
<Arrow from={id('source')} to={id('proc')} path="straight" startAnchor="right" endAnchor="left" />
<Arrow from={id('proc')} to={id('mc')} startAnchor="right" endAnchor="left" />
```

- `gap-16` between pipeline stages; `items-center` so arrows run level.
- Standalone stages are the bordered icon+label node (see `references/box-styles-and-content.md`); the anchor at the end is a compact pill.
- If one page tells several pipeline stories, split them into separate `<Section>`s each with its own `<Diagram>` — the pipeline example demonstrates this.

## Horizontal with intermediaries — Data Flow

For flows where services sit between source and target. Runnable example: `examples/data-flow.tsx`. A 4-column flex with **spacer divs** controlling arrow length:

```tsx
<div className="flex items-start justify-center gap-6" style={{ minWidth: '950px' }}>
  {/* Col 1: Source */}
  <BoxNode id={id('source')} title="Source" ... />

  {/* Col 2: borderless intermediary icons, aligned below the arrow line */}
  <div className="flex flex-col items-center self-end mb-2" style={{ minWidth: '180px' }}>
    <div className="flex gap-3">
      <IconNode id={id('svc-a')} icon={ServiceAIcon} label="Service A" />
      <IconNode id={id('svc-b')} icon={ServiceBIcon} label="Service B" />
    </div>
  </div>

  {/* Col 3: Target */}
  <BoxNode id={id('target')} title="Target" ... />

  {/* Spacer — controls arrow length between target and output */}
  <div style={{ minWidth: '60px' }} />

  {/* Col 4: Output (green) */}
  <BoxNode id={id('output')} title="Report" headerColor={COLORS.outputBorder} ... />
</div>
```

- Wrap boxes needing vertical centering relative to taller columns in `self-center`; intermediary icon clusters use `self-end mb-2` so they sit below the main arrow line.
- Intermediaries are **borderless** IconNodes — never bordered boxes.
- Arrow length is controlled with spacer divs, never margin/padding on the nodes themselves.

## Swimlane Flow

For numbered business journeys and system lifecycles where ownership changes between steps. Runnable example: `examples/swimlane-flow.tsx`. Use the `FlowDiagram` component instead of building a custom grid:

```tsx
<FlowDiagram
  lanes={[
    { key: 'requester', label: 'Requester', detail: 'Supplies evidence', icon: UserIcon, color: COLORS.primary },
    { key: 'approver', label: 'Approver', detail: 'Records the decision', icon: CheckIcon, color: COLORS.pk },
  ]}
  steps={[
    { key: 'submit', lane: 'requester', column: 1, number: 1, action: 'Submit', detail: 'Evidence attached' },
    { key: 'approve', lane: 'approver', column: 2, number: 2, action: 'Approve', detail: 'Decision recorded' },
  ]}
  edges={[{ from: 'submit', to: 'approve' }]}
  columns={2}
/>
```

- Keep lanes in reading order and columns chronological. Consecutive steps normally advance one column; `stepOffsetMm` controls the physical offset between columns.
- Forward connectors start at the step badge's right edge, use one grid bend across lanes, and choose the target top/bottom edge from lane direction. Alternate and return edges use their own routing; do not override these rules per report.
- Keep step labels short. Put control detail, exceptions, and explanatory prose in the surrounding document and reuse `FlowStepBadge` to correlate it with the diagram.
- `laneWidthMm`, `stepOffsetMm`, and `rowHeightMm` are print-fit controls. Reduce offsets before moving an A4 diagram to A3.
- A systems legend belongs once in the surrounding document, not inside every journey diagram.

## Fan-in / Fan-out

Many sources → central hub → many outputs. Runnable example: `examples/fan-in-fan-out.tsx`.

```tsx
<div className="relative flex items-start justify-center gap-16 py-8">
  <div className="flex flex-col items-center gap-6">{/* stacked source boxes */}</div>
  <div className="flex items-center" style={{ minHeight: '420px' }}>{/* central hub */}</div>
  <div className="flex items-center" style={{ minHeight: '420px' }}>{/* stacked outputs */}</div>
</div>
```

- Limit to **3–4 sources/outputs per column**.
- The hub is the heavier Mission Control anchor box (`rounded-2xl shadow-2xl`).
- Distribute converging arrows along the hub edge with offset anchors so they don't pile up:

```tsx
<Arrow from={id('src-top')} to={id('hub')} path="straight" startAnchor="right" endAnchor={{ position: 'left', offset: { y: -40 } }} />
<Arrow from={id('src-bottom')} to={id('hub')} path="straight" startAnchor="right" endAnchor={{ position: 'left', offset: { y: 40 } }} />
```

## Vertical (top-to-bottom)

For multi-tier flows with distinct stages:

```tsx
<div className="flex flex-col items-center gap-12 py-8">
  <div className="flex items-start justify-center gap-8">
    <BoxNode id={id('source-a')} title="Source A" ... />
    <BoxNode id={id('source-b')} title="Source B" ... />
  </div>
  <BoxNode id={id('catalog')} title="Catalog" ... />
  <div className="flex items-start justify-center gap-6">
    <BoxNode id={id('out-a')} title="Output A" ... />
    <BoxNode id={id('out-b')} title="Output B" ... />
  </div>
</div>
```

Arrows run `startAnchor="bottom"` → `endAnchor="top"` between tiers.

## Topology Overview

Use `examples/topology-overview.tsx` for a component hierarchy with related operational systems. Keep Teams and Health Checks on the left, a dashed containment group of named `BoxNode`s in the center, and Lookups and Configuration on the right. A separate Components header box leaves a clear vertical gutter for the Sub Components → Components relationship. Nested boxes remain independently named arrow endpoints; use `NodePill` for selector/property/check/config snippets and solid arrows for structural relationships.

## Layered Architecture

Use `examples/architecture.tsx` for AI clients → MCP → platform services, with integration groups alongside the platform. Stack Playbooks, Health Checks, Real-Time RAG, and Unified Catalog as named `BoxNode`s; keep Postgres and K8s CRDs together beneath them. Group integrations by their connector direction so outbound actions and inbound cloud/telemetry data have separate, readable arrows. Render with `--viewport 1500x900`; `--width` changes raster scale, not layout width.

## Layered Platform

Use `examples/layered-platform.tsx` for a product stack: a row of inputs feeding a titled platform frame, capability tiers stacked inside it, integration and application columns on either side, and deployment options underneath.

- Tiers are full-width rows inside a frame whose title sits in a notch on the top border (`absolute -top-[13pt]` with a background matching the canvas).
- Tier tone (commercial / community / open source) comes from one `TONES` map that styles each tier and renders the legend, so the two cannot drift. Tones stay light fills distinguished by tint and border; never a dark tier body.
- Side chips share the tier row height, and the side heading height equals the inputs band plus the frame's top border and padding, so every dotted connector (`showHead={false}`, short dashes) runs level from chip to tier.
- Inputs use chevron glyphs rather than arrows: they show direction without five converging lines landing on the frame title.
- Deployment branches leave the frame bottom with `startAnchor={{ position: 'bottom', offset: { x: ±(frameWidth + gap) / 4 } }}` so each lands on the centre of its half-width group.

## Protocol Bands

Use `examples/protocol-bands.tsx` for a protocol or transport catalogue with a cross-cutting layer between clients and backends.

- One column template (`grid-cols-[150px_repeat(6,140px)]`) drives every row. Panels span columns and use `grid-cols-subgrid`, so each protocol column, its capability cell in the band and its bus dot sit on the same x.
- Each lane is one `LANES` entry: mode (sync/async, which picks panel tint and arrow colour), flow direction, protocol, transport and band capability.
- Arrows hop between adjacent rows (protocol → band cell → bus dot, or reversed for outbound flow), so they never cross band labels and stay straight.
- The bus dots are the sanctioned small endpoints on the backend panel; a dotted rule behind them shows the shared connector bus.

## Titled Canvas

Use `examples/titled-canvas.tsx` when a diagram stands alone as a figure: an eyebrow, a title and a subtitle above the canvas, a legend underneath and a wordmark in the footer.

- `NODE_KINDS` and `EDGE_KINDS` catalogs style the nodes and arrows and generate the legend swatches, so every legend entry matches what is drawn.
- Exactly one node uses the focal kind; the primary-path edges lead into and out of it.
- Lay nodes on an explicit grid (`col-start-*`/`row-start-*`) so every edge is a straight horizontal or vertical line.
- The heading lives in the figure, so do not also wrap it in a `<Section title>`.

## Hub & Spoke (product overview)

Personas and systems arranged around a central platform box — the "how it works" style. Runnable example: `examples/hub-and-spoke.tsx`.

- Skeleton: `flex flex-col items-center gap-16 py-8` with a persona row on top, a `flex items-center gap-16` main row (system | hub | system), and a bottom stack.
- The hub contains its own internal stage row (numbered step badges — recipe in `references/box-styles-and-content.md`).
- This style uses the semantic Tailwind stage palette instead of the 5-color COLORS — see `references/colors-and-typography.md` for when that is allowed.
- Feedback/return paths route around the outside with `path="grid"` + `gridBreak`; constraint ("not allowed") relationships use the red dashed arrow. Both in `references/arrows-and-flows.md`.

## Entity Model (ER)

Rows of entity tables with relationship arrows. Runnable example: `examples/entity-model.tsx`. Layout is plain stacked rows (`flex justify-center gap-12 mb-12` per row) with the junction/fact table centered so FK arrows fan outward to each side. Use solid `variant="er"` arrows — see `references/arrows-and-flows.md`.

## Readability rules

- **Box count** — treat 7–8 primary peers as a prompt to simplify, not a hard limit; preserve clear grouped structures when a larger diagram remains readable.
- **Minimize arrow crossings** (≤ 4): rearrange the layout rather than tolerating spaghetti.
- **Consistent shadows** — boxes `shadow-lg`, the hub `shadow-2xl`; never mix shadowed and shadowless nodes in one row.
- **White space** — stick to the `gap-6/8/12/16` values used above; don't crowd.
- **Spacer divs** (`<div style={{ minWidth: '60px' }} />`) control arrow gaps — never margins on nodes.
