# Arrows and flows

All arrows are `<Arrow>` from `@flanksource/facet` — a thin wrapper over react-xarrows. `from`/`to` take box ids from the Diagram `id()` factory (never `start`/`end` — Xarrow silently anchors a missing endpoint at (0,0)); `variant` applies a preset from the Line Style Catalog; any explicitly-passed Xarrow prop (`startAnchor`, `endAnchor`, `path`, `gridBreak`, `labels`, `color`, `dashness`, `showHead`, …) overrides the preset.

## Line Style Catalog

| Variant | Color | Stroke | Head | Line | Animated | Curve | Head shape | Use for |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `primary` | `COLORS.primary` | 3 | 4 | Dashed 10/5 | Yes | — | arrow1 | Main data flow in flow/pipeline diagrams |
| `secondary` | `COLORS.muted` | 2 | 3 | Dashed 6/4 | Yes | — | arrow1 | Supplementary flows alongside the main one |
| `er` | `COLORS.muted` | 1.5 | 4 | Solid | No | 0.4 | arrow1 | FK relationships in entity models |
| `bidirectional` | `COLORS.muted` | 2 | 3 | Solid | No | — | circle both ends | Non-directional connections |

ER FK highlight: `variant="er"` + `color={COLORS.fk}` for the relationships to emphasize.

## Decision rules

- **Animated dashed** = active data movement: scraping, streaming, API calls, pipelines. The animation says "data flows through here continuously". (In baked HTML/PDF output the dashes are static — animation is web-only.)
- **Static solid** = structural relationships: entity models, schema references, FKs — things that exist permanently rather than move.
- **Primary vs secondary** — primary is the story the reader follows first; secondary is thinner and muted to signal lower priority.
- **Head shapes** — `arrow1` (default) for all directional connections; `circle` for bidirectional/non-directional; `showHead={false}` for undirected associations or when a label already conveys the relationship.
- **Cardinality** — text labels (`N:1`, `1:N`) via `labels={{ middle: <RelLabel text="N:1" /> }}`, never custom arrow shapes.

## Anchors and offsets

Default anchors for horizontal flow: `startAnchor="right" endAnchor="left"`. Vertical: `"bottom"` → `"top"`.

`FlowDiagram` owns swimlane anchors and paths: it starts at the numbered badge's right edge, uses `path="grid"` with a single 90-degree bend, and lands on the target's top edge unless the target lane is above the source, in which case it lands on the bottom edge. Adjust step columns or the component's millimetre spacing props; do not patch individual journey arrows.

Each step badge sits on its lane's centre line whatever its label length; the action, detail and tag hang below the badge (or above it when a connector arrives from a lower lane or a rework loop runs underneath). Same-lane connectors therefore stay straight without `placementOffset`, so reserve offsets for deliberate nudges. Two steps may not share a lane and column; that throws.

### Label span

A step label is centred on its badge and may stretch wider than its column, so short phrases stay on one line. Its width is `span × stepOffsetMm − 2mm` (the 2mm is a gutter between neighbouring labels), where `span` is the smallest of:

- `FlowStep.labelColumns` if set, otherwise `FlowDiagram` `maxLabelColumns` (default `2`). Both accept fractions but must be finite and ≥ 1, otherwise the diagram throws.
- `2 × column − 1` and `2 × (columns − column) + 1`, so a first- or last-column label never spills into the lane labels or past the frame.
- The column distance to every conflicting step: one in the same lane whose label hangs on the same side of its badge, or any same-lane step when either is `fullColor`. Adjacent same-lane steps therefore stay at 1 column, while a step whose neighbour's label hangs on the other side can still use 2.

Normal steps have vertical padding only, so the text uses the full span; `fullColor` steps keep 1mm padding on every side inside their coloured box. Lane labels are sized in millimetres (1.5mm side padding, 1.5mm gap, 7.5mm icon badge, 5mm icon) so the lane text width is predictable against `laneWidthMm`.

### Layout check

Once a diagram's layout and arrows settle, `Diagram` measures every element marked `data-facet-label` (step action and detail, lane label, edge label pill, legend text; narratives are not checked) and samples each arrow path every 2px. Any problem sets `data-facet-error` on the diagram root instead of `data-facet-ready="true"`, which the CLI reports as a render failure, one line per problem:

| Error | Meaning | Fix |
| --- | --- | --- |
| `label <name> overflows its box by <n>mm` | A line of text (usually one unbreakable word) is wider than its label box | Shorten or hyphenate the word, raise `labelColumns` on that step, widen `stepOffsetMm` or `laneWidthMm`, or move a same-lane neighbour further away so the span can grow |
| `labels <a> and <b> overlap` | Text from two labels occupies the same space (for example a bottom label in one lane and a top label in the lane below) | Cap `labelColumns` on one step, move a step to another column, raise `rowHeightMm`, or shorten the text |
| `arrow <from> -> <to> crosses label <name>` | A connector runs through label text; an edge label pill on its own arrow is ignored | Cap `labelColumns` on the crossed step, move the step or the edge's source/target column, or change the edge (`variant`, `gridBreak`, offsets) so it routes clear |

Alternate edges turn halfway between columns (`gridBreak` 50%), so a 2-column label on their source or target can sit in their path; cap that step with `labelColumns: 1` when the check reports it.

### Branches, tags and legend

`FlowDiagram` draws decision branches and notation from data, never from step prose:

- `FlowEdge.label` puts a small white pill on the connector midpoint ("Approved", "Changes requested").
- `FlowEdge.variant` is `primary` (default, solid), `alternate` (static dashes in `mutedColor`, for optional or exception paths; it turns halfway to the target column and lands on the target's left edge, so it splits away from a forward edge leaving the same badge instead of hiding its label under it) or `return` (static dashes, a rework loop). A cross-lane `return` leaves the source badge's left edge, runs back to the target column and turns once into the target edge that faces the source lane (its bottom when the target lane is above, its top when below), so it and the forward edge form a rectangle instead of overlapping; a target entered from below hangs its label above the badge. A same-lane `return` dips under the lane as a U out of the source badge's bottom and into the target badge's bottom, because a left exit would overlay the forward connector. A `return` edge must target an earlier column and cannot take a `gridBreak` (it routes itself); both throw.
- `FlowStep.tag` (`{ label, color? }`, default amber `#b45309`) adds a pill under the step label and at the start of its narrative line, for status markers such as "Needs detail". One tag label must use one colour.
- `FlowLane.kind` is `person` (default, circular icon badge) or `system` (rounded-square badge).
- `showLegend` renders a legend between the swimlane and the narrative, derived from what the diagram uses: edge variants present, "Outcome" when a step is `fullColor`, each distinct tag, and Person/System only when both lane kinds appear. Override wording with `legendLabels`.

```tsx
<FlowDiagram
  columns={4}
  showLegend
  legendLabels={{ alternate: 'Rejection path' }}
  lanes={[
    { key: 'requester', label: 'Requester', color: COLORS.primary, icon: UiUser },
    { key: 'approver', label: 'Approver', color: COLORS.pk, icon: UiSealCheck },
    { key: 'system', label: 'Records system', color: COLORS.outputBorder, icon: UiDatabase, kind: 'system' },
  ]}
  steps={[
    { key: 'submit', lane: 'requester', column: 1, number: 1, action: 'Submit request' },
    { key: 'review', lane: 'approver', column: 2, number: 2, action: 'Review request', tag: { label: 'Needs detail' } },
    { key: 'close', lane: 'requester', column: 3, number: '2A', action: 'Close request' },
    { key: 'record', lane: 'system', column: 4, number: 3, action: 'Record decision', fullColor: true },
  ]}
  edges={[
    { from: 'submit', to: 'review' },
    { from: 'review', to: 'submit', variant: 'return', label: 'Changes requested' },
    { from: 'review', to: 'close', variant: 'alternate', label: 'Rejected' },
    { from: 'review', to: 'record', label: 'Approved' },
  ]}
/>
```

**Parallel arrows between the same pair** — offset the second one and force it straight:

```tsx
<Arrow variant="primary" from={id('a')} to={id('b')} startAnchor="right" endAnchor="left" />
<Arrow variant="secondary" from={id('a')} to={id('b')}
  startAnchor={{ position: 'right', offset: { y: 110 } }}
  endAnchor={{ position: 'left', offset: { y: 110 } }}
  path="straight"
/>
```

**Fan-in/fan-out** — distribute endpoints along the hub edge so converging arrows don't pile up:

```tsx
endAnchor={{ position: 'left', offset: { y: -40 } }}  // top source → upper hub edge
endAnchor={{ position: 'left', offset: { y: 40 } }}   // bottom source → lower hub edge
```

**Crowded ER anchors** — spread multiple FKs leaving one entity with x-offsets: `startAnchor={{ position: 'top', offset: { x: -20 } }}` / `{ x: 20 }`, or switch sides (`top` vs `left`).

## Paths

- `path="straight"` whenever the two nodes are roughly aligned (same row/column) — react-xarrows defaults to smooth curves, which add noise on aligned nodes. `curveness={0}` is equivalent for the default path.
- Reserve `curveness: 0.4` (the `er` preset) for dense ER diagrams where curves help distinguish overlapping lines.
- `path="grid"` + `gridBreak="75%"` for feedback/return arrows that must route around the outside of a row (e.g. a GitOps "Apply" loop); pair with `showHead={false}` and a label, and mark the landing point with a small badge on the target box. **The `%` is required** — `geometry.ts` matches `gridBreak` against `/^(-?\d+(?:\.\d+)?%)$/` and silently falls back to `0.5` on anything else, so a bare `"75"` routes the arrow through the middle of the row instead of clear of it, usually straight across whatever box sits there.
- `path="smooth"` for vertical hub connections that shouldn't dogleg.

## Arrow labels

Small pills positioned so the line stays visible:

```tsx
labels={{
  middle: (
    <div className="rounded px-1.5 py-0.5 text-[9px] font-semibold mt-1"
      style={{ backgroundColor: COLORS.background, color: COLORS.accent, border: `1px solid ${COLORS.primary}` }}>
      Scraper
    </div>
  ),
}}
```

ER cardinality labels use the same shape with muted text/border (`RelLabel` recipe in `examples/entity-model.tsx`).

## Constraint (forbidden) arrows

A relationship that must NOT happen — e.g. "LLMs have no direct access to infrastructure" — is a thin red dashed arrow with an explanatory label. Red `#ef4444` is the one sanctioned off-palette semantic color (see `references/colors-and-typography.md`):

```tsx
<Arrow from={id('llms')} to={id('infra')} color="#ef4444" strokeWidth={2} dashness
  startAnchor="left" endAnchor="bottom"
  labels={{ middle: <span className="flex items-center gap-1 bg-red-100 border border-red-300 rounded px-2 py-1 text-red-700 text-xs font-semibold"><FaBan className="w-3 h-3" /> No Direct Access</span> }}
/>
```

## Arrow length and stubs

- Control gaps with spacer divs (`<div style={{ minWidth: '60px' }} />`), never node margins.
- Keep `gap-8` minimum between connected nodes so the line is longer than its head; if nodes must sit close, drop `headSize` to 3 or use `showHead={false}` and let the dash animation carry direction.
- Never let an arrow route over, under, or behind another box — rearrange the layout or change anchor sides instead.
