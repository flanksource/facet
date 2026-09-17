# Box styles and content patterns

Node types and box-body content for facet diagrams. `BoxNode`, `NodeSection`, `NodePill`, `SectionDivider`, and `COLORS` come from `@flanksource/facet`; everything labelled **recipe** is a small inline component you write in the template (facet deliberately keeps the primitive surface minimal). The one thing promoted from recipe to primitive is **ports** — a chip on the box border can be an arrow endpoint, and a local recipe cannot be.

## BoxNode — the primary node

Colored header over a light body (sub-items, icon grids, tables). Arrows target its `id` — the outer container, never inner sections.

```tsx
<BoxNode
  id={id('source')}
  title={
    <span className="flex items-center justify-center gap-2">
      <AzureAd className="w-5 h-5" />
      Entra ID
    </span>
  }
  headerColor={COLORS.primary}
  bodyColor={COLORS.background}
  borderColor={COLORS.primary}
  minWidth="180px"
  compact // optional: p-2 instead of p-3 padding
>
  {/* body content */}
</BoxNode>
```

| Prop | Notes |
| --- | --- |
| `id` | Arrow endpoint (from the Diagram `id()` factory) |
| `title` | String or node (icon + label span) — rendered white, `text-xs font-bold` |
| `headerColor` / `bodyColor` / `borderColor` | COLORS tokens; border defaults to header color, body must always be light |
| `minWidth` | e.g. `"160px"`; use wider for boxes holding sections/tables |
| `compact` | Tighter padding for dense diagrams |
| `shadow` | Tailwind shadow class, default `shadow-lg`. Pass `"shadow-none"` for print — a shadow makes Chromium emit a PDF soft mask that some viewers flatten to a grey block |
| `ports` | Chips docked onto the box border — see **Ports** below |
| `className` / `bodyClassName` | Tailwind fallback (`bg-blue-600` / `bg-blue-50`); border auto-derived as `border-blue-600`. Used by the hub-and-spoke semantic palette |

Prefer the inline color props with COLORS. When using the Tailwind fallback, always pass a `bg-{color}-{shade}` literal class (never a computed string — Tailwind can't extract dynamic class names).

## Node type catalog

**Icon+Label with border** (recipe) — standalone pipeline stage representing a single concept:

```tsx
function DiagramNode({ id, icon: Icon, label }: { id: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string }) {
  return (
    <div id={id} className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl border-2 shadow-lg"
      style={{ borderColor: COLORS.primary, backgroundColor: COLORS.background }}>
      <Icon className="w-8 h-8" style={{ color: COLORS.accent }} />
      <span className="text-xs font-bold" style={{ color: COLORS.muted }}>{label}</span>
    </div>
  );
}
```

**IconNode — borderless** (recipe) — intermediary services between major nodes. No border, no shadow, minimal padding. Never wrap intermediaries in bordered containers:

```tsx
function IconNode({ id, icon: Icon, label }: DiagramNodeProps) {
  return (
    <div id={id} className="flex flex-col items-center gap-1 px-2 py-1">
      <Icon className="w-7 h-7" style={{ color: COLORS.accent }} />
      <span className="text-[10px] font-bold" style={{ color: COLORS.muted }}>{label}</span>
    </div>
  );
}
```

**Mission Control anchor box** (recipe) — the visually heavier hub: `rounded-2xl shadow-2xl`, larger title, pill grid body:

```tsx
<div id={id('hub')} className="rounded-2xl overflow-hidden border-2 shadow-2xl"
  style={{ borderColor: COLORS.primary, backgroundColor: COLORS.background }}>
  <div className="px-6 py-3 text-center" style={{ backgroundColor: COLORS.primary }}>
    <div className="flex items-center justify-center gap-2">
      <MissionControlWhite className="w-6 h-6 text-white" />
      <span className="text-white text-lg font-bold tracking-wide">Mission Control</span>
    </div>
  </div>
  <div className="p-4 grid grid-cols-2 gap-3">{/* catalog pills */}</div>
</div>
```

For horizontal pipelines use the compact **MissionControlPill** variant — the bordered icon+label pattern with `borderColor: COLORS.accent` and the colored `MissionControl` icon (not `MissionControlWhite`: white variants are for colored headers and vanish on the pill's light body).

**Output node** — result/report boxes get the green treatment to visually mark outputs:

```tsx
<BoxNode title="Audit Report" headerColor={COLORS.outputBorder} bodyColor={COLORS.background}
  borderColor={COLORS.outputBorder} compact minWidth="220px">
  {/* table or content */}
</BoxNode>
```

## Content inside boxes

**NodeSection** (facet export) — titled group of pills: `<NodeSection title="Identity" items={['Users & Groups', 'App Registrations']} />`. Header renders `text-[9px] font-bold uppercase tracking-wide` muted.

**NodePill** (facet export) — single labeled pill: muted text on background fill with a primary border.

**SectionDivider** (facet export) — thin primary line at 0.2 opacity between NodeSections in one box.

**IconGrid** (recipe) — platform icon grid inside a box body:

```tsx
function IconGrid({ items, cols = 3, iconSize = 'w-6 h-6' }: IconGridProps) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map(({ Icon, label }) => (
        <div key={label} className="flex flex-col items-center">
          <Icon className={iconSize} />
          {label && <span className="text-[9px] mt-0.5" style={{ color: COLORS.muted }}>{label}</span>}
        </div>
      ))}
    </div>
  );
}
```

**Catalog pills** (recipe) — icon+label rows inside the hub, arranged `grid grid-cols-2 gap-3` for 4–6 items:

```tsx
<div className="flex items-center gap-2 rounded-lg px-3 py-2 border"
  style={{ backgroundColor: COLORS.background, borderColor: COLORS.primary }}>
  <HiIcon className="w-4 h-4" style={{ color: COLORS.accent }} />
  <span className="text-xs font-medium" style={{ color: COLORS.muted }}>Label</span>
</div>
```

**Tables** — output boxes may hold a real `<table>` with `9px` cells and a header row underlined in the box's border color (see the audit table in `examples/data-flow.tsx`). Facet's base CSS gives bare tables a datasheet skin (blue `thead`, bordered cells, zebra rows) — a diagram table must opt out with inline `backgroundColor: 'transparent'` / `border: 'none'` on `thead`, `tr`, `th`, and `td`, as the example does.

## Entity tables (ER diagrams)

Entities are `BoxNode compact` with field rows as children; PK/FK badges are inline spans using the `COLORS.pk` / `COLORS.fk` aliases (recipe, see `examples/entity-model.tsx`):

```tsx
function FieldRow({ name, type, pk, fk }: FieldDef) {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      {pk && <span className="text-[8px] font-bold px-1 rounded text-white" style={{ backgroundColor: COLORS.pk }}>PK</span>}
      {fk && <span className="text-[8px] font-bold px-1 rounded text-white" style={{ backgroundColor: COLORS.fk }}>FK</span>}
      {!pk && !fk && <span className="w-[18px]" />}
      <span className="text-[10px] font-semibold" style={{ color: COLORS.accent }}>{name}</span>
      <span className="text-[9px] ml-auto" style={{ color: COLORS.muted }}>{type}</span>
    </div>
  );
}
```

Highlight the junction/fact entity with `borderColor={COLORS.fk}`; secondary/reference entities may use `COLORS.muted`.

## Ports — chips docked on the box border

A **port** is an interaction point on the box boundary: an endpoint, a protocol, a schedule, a stage marker. Unlike everything else on this page it is a facet primitive rather than a recipe, because a port can be an *arrow endpoint* — give it an `id` and an arrow terminates on the chip rather than on the box as a whole. That is the one sanctioned exception to "point arrows at the outer box id" (see `anti-patterns.md`).

```tsx
<BoxNode
  id={id('svc')}
  title="Service"
  headerColor={COLORS.primary}
  ports={[
    { position: 'top-middle', icon: Http, label: 'JSON' },
    { id: id('svc-api'), position: 'top-left', size: '100%',
      icon: Https, label: 'https://api-svc.local/v2/orders', color: COLORS.outputBorder },
  ]}
/>
<Arrow variant="primary" from={id('client')} to={id('svc-api')} startAnchor="right" endAnchor="left" />
```

| Field | Notes |
| --- | --- |
| `position` | `{top,bottom}-{left,middle,right}` or `{left,right}-{top,middle,bottom}` — edge first, then where along it |
| `size` | Extent **along the docked edge**: a width on top/bottom, a height on left/right. `"100%"` spans the box; omit for a content-sized chip |
| `color` | Chip fill; defaults to the box's `headerColor`. White text renders on top, so keep it a saturated `COLORS` token |
| `icon` | Icon component (`w-3 h-3`) — never a runtime name string |
| `label` | Chip text; long values clip rather than wrap |
| `id` | Makes the port an arrow endpoint |
| `node` | Escape hatch: renders instead of the icon+label chip |

Ports sit in **normal document flow** and reserve space on their edge — that is what stops an endpoint tab colliding with the row above, and it is why they survive `Diagram`'s width freeze and print cleanly. Multiple ports on one edge stack, and array order always means *distance from the box*, so adding a second port never moves the first.

An overlay that must cost **zero** layout is still a recipe. The numbered stage badge in `examples/hub-and-spoke.tsx` uses a `node` port with its own `-mb-3` to straddle the border; an overlay that must not affect layout at all stays absolutely positioned in a `relative` wrapper.
