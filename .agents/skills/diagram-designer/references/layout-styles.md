# Layout styles

Canonical layouts for node-and-arrow diagrams. Pick **one** layout per diagram — never mix vertical and horizontal flow in the same diagram; create two diagrams instead. All layouts live inside `<Diagram>{(id) => ...}</Diagram>` from `@flanksource/facet`, which supplies the scoped `id()` factory (no manual `useId` prefixing) and marks the container `relative` so arrows paginate with it.

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
- The component starts every connector at the step badge's right edge, uses one grid bend, and chooses the target top/bottom edge from lane direction. Do not override those rules per report.
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

## Hub & Spoke (product overview)

Personas and systems arranged around a central platform box — the "how it works" style. Runnable example: `examples/hub-and-spoke.tsx`.

- Skeleton: `flex flex-col items-center gap-16 py-8` with a persona row on top, a `flex items-center gap-16` main row (system | hub | system), and a bottom stack.
- The hub contains its own internal stage row (numbered step badges — recipe in `references/box-styles-and-content.md`).
- This style uses the semantic Tailwind stage palette instead of the 5-color COLORS — see `references/colors-and-typography.md` for when that is allowed.
- Feedback/return paths route around the outside with `path="grid"` + `gridBreak`; constraint ("not allowed") relationships use the red dashed arrow. Both in `references/arrows-and-flows.md`.

## Entity Model (ER)

Rows of entity tables with relationship arrows. Runnable example: `examples/entity-model.tsx`. Layout is plain stacked rows (`flex justify-center gap-12 mb-12` per row) with the junction/fact table centered so FK arrows fan outward to each side. Use solid `variant="er"` arrows — see `references/arrows-and-flows.md`.

## Readability rules

- **Max 7–8 boxes** per diagram; split larger stories (multiple Sections/diagrams).
- **Minimize arrow crossings** (≤ 4): rearrange the layout rather than tolerating spaghetti.
- **Consistent shadows** — boxes `shadow-lg`, the hub `shadow-2xl`; never mix shadowed and shadowless nodes in one row.
- **White space** — stick to the `gap-6/8/12/16` values used above; don't crowd.
- **Spacer divs** (`<div style={{ minWidth: '60px' }} />`) control arrow gaps — never margins on nodes.
