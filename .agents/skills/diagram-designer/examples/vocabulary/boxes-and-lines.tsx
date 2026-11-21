import { useId, type ReactNode } from "react";
import { UiDatabase, UiLockKey, UiServerProcess, UiStack } from "@flanksource/clicky-ui/icons";
import { Postgres } from "@flanksource/icons/mi";
import { BOX_STYLES, BoxNode, DEFAULT_NODE_PALETTE } from "@flanksource/facet";
import { ROLES, ROLE_KEYS, R, INK, MUTED, Swatch, Sheet, Title, Detail, Chip } from "./common";

// Boxes

export function BoxStyles() {
  const notes = {
    outlined: "Default component", header: "Component with a role colour", tinted: "Light fill, no header",
    card: "White card on a tinted zone", dashed: "Planned, optional or phase 2", stacked: "An outside party",
    "chip-dark": "The one hub everything meets", pill: "Small node, member or tag", tile: "Icon-first square",
    accent: "Left stripe marks the role", borderless: "Icon + label row inside a zone", ghost: "Out of scope or removed",
  };
  return (
    <Sheet columns={4} intro="Box styles. Pick the shape by what the box is, not by taste: solid and header boxes are components, cards sit inside tinted zones, dashed means planned or optional, stacked means an outside party. box/round and box/square are corner treatments for any of them; use one per diagram.">
      {BOX_STYLES.map((variant) => <Swatch key={variant} name={`box/${variant}`} note={notes[variant]} height={112}>
        <div className="rounded-md p-2" style={{ backgroundColor: variant === "card" ? R.body : undefined }}>
          <BoxNode variant={variant} title={variant === "tile" ? "Router" : "Run API"} compact
            palette={{ ...DEFAULT_NODE_PALETTE, accent: R.header, border: R.border, tint: R.body }}
            minWidth={variant === "tile" ? "48pt" : "84pt"}
            {...(variant === "header" ? { description: "Validates requests" } : {})}
            {...(["pill", "tile", "borderless"].includes(variant) ? { icon: <UiServerProcess className="h-4 w-4" /> } : {})}
            {...(variant === "chip-dark" ? { icon: <UiStack className="h-4 w-4" /> } : {})} />
        </div>
      </Swatch>)}
      {CORNERS.map(({ name, corners, note }) => (
        <Swatch key={name} name={`box/${name}`} note={note} height={112}>
          <div className="flex gap-2">
            <div className={`flex min-w-[48pt] items-center justify-center border bg-white px-2 py-2 text-xs font-bold ${corners}`} style={{ borderColor: R.border, color: INK }}>Run API</div>
            <div className={`min-w-[48pt] overflow-hidden border-2 ${corners}`} style={{ borderColor: R.border }}>
              <div className="px-2 py-1 text-center text-[7.5pt] font-bold text-white" style={{ backgroundColor: R.header }}>Run API</div>
              <div className="px-2 py-1 text-[6.75pt]" style={{ backgroundColor: R.body, color: MUTED }}>Validates</div>
            </div>
          </div>
        </Swatch>
      ))}
    </Sheet>
  );
}

/** Corner treatments; they apply to any box style above, shown on outlined and header boxes. */
const CORNERS = [
  { name: "round", corners: "rounded-xl", note: "Soft corners; product and marketing figures" },
  { name: "square", corners: "rounded-none", note: "Hard corners; spec sheets, blueprints, dense grids" },
] as const;

export function BoxColors() {
  return (
    <Sheet columns={4} intro="Box colour schemes. A role colour says what kind of thing a box is. Colour the header or border, keep the body light, and use at most four roles in one diagram.">
      {ROLE_KEYS.map((key) => {
        const role = ROLES[key];
        return (
          <Swatch key={key} name={`role/${key}`} note={{ new: "New in this change", existing: "Already in the estate", external: "Outside our control", security: "Identity, policy, secrets", store: "Data at rest", action: "Queues, jobs, actions", cloud: "Cloud and edge services", muted: "Context, out of focus" }[key]}>
            <div className="w-[84pt] overflow-hidden rounded-md border" style={{ borderColor: role.border }}>
              <div className="px-2 py-0.5 text-[7.5pt] font-semibold text-white" style={{ backgroundColor: role.header }}>{role.label}</div>
              <div className="flex gap-1 px-2 py-1.5" style={{ backgroundColor: role.body }}>
                {[role.header, role.border, role.body].map((c) => <span key={c} className="h-3 w-3 rounded-sm border border-black/5" style={{ backgroundColor: c }} />)}
              </div>
            </div>
          </Swatch>
        );
      })}
    </Sheet>
  );
}

export function BoxDensities() {
  const box = "w-[112.5pt] rounded-md border bg-white px-2 py-1.5";
  return (
    <Sheet columns={3} intro="Box information density. Raise density only as far as the reader needs; put everything else in the caption or a second diagram.">
      <Swatch name="box-density/glyph" note="Icon only, for repeated members"><span className="flex h-9 w-9 items-center justify-center rounded-md border bg-white" style={{ borderColor: R.border, color: R.header }}><UiDatabase className="h-5 w-5" /></span></Swatch>
      <Swatch name="box-density/label" note="Name only"><div className={box} style={{ borderColor: R.border }}><Title>Run history</Title></div></Swatch>
      <Swatch name="box-density/label-detail" note="Name plus one fact"><div className={box} style={{ borderColor: R.border }}><Title>Run history</Title><Detail>Sessions, cost, results</Detail></div></Swatch>
      <Swatch name="box-density/tagged" note="Adds chips for kinds or tech" height={108}><div className={box} style={{ borderColor: R.border }}><Title>Run history</Title><Detail>Sessions, cost, results</Detail><div className="mt-1 flex gap-1"><Chip>PostgreSQL</Chip><Chip>90 days</Chip></div></div></Swatch>
      <Swatch name="box-density/listed" note="Members as rows" height={108}><div className={box} style={{ borderColor: R.border }}><Title>Run history</Title>{["Sessions", "Cost", "Results"].map((r) => <div key={r} className="flex items-center gap-1 text-[7.125pt] text-slate-700"><span className="h-1 w-1 rounded-full" style={{ backgroundColor: R.header }} />{r}</div>)}</div></Swatch>
      <Swatch name="box-density/detailed" note="Field table, for spec figures only" height={108}><div className={box} style={{ borderColor: R.border }}><Title>Run history</Title>{[["Engine", "PostgreSQL"], ["Retention", "90 days"], ["Access", "read: audit"]].map(([k, v]) => <div key={k} className="flex justify-between border-b border-slate-100 text-[6.75pt]"><span className="text-slate-500">{k}</span><b className="text-slate-800">{v}</b></div>)}</div></Swatch>
    </Sheet>
  );
}

export function BoxTagVariants() {
  const box = "relative w-[112.5pt] rounded-md border bg-white px-2 py-1.5";
  const accent = { borderColor: R.border };
  return (
    <Sheet columns={4} intro="Alternatives to box-density/tagged. The same two facts (engine and retention) placed differently; pick one per diagram.">
      <Swatch name="tags/chips" note="Chips under the detail line" height={96}><div className={box} style={accent}><Title>Run history</Title><Detail>Sessions, cost, results</Detail><div className="mt-1 flex gap-1"><Chip>PostgreSQL</Chip><Chip>90 days</Chip></div></div></Swatch>
      <Swatch name="tags/inline" note="Badge beside the title" height={96}><div className={box} style={accent}><div className="flex items-center gap-1"><Title>Run history</Title><Chip>PG</Chip></div><Detail>Sessions, cost · 90 days</Detail></div></Swatch>
      <Swatch name="tags/corner" note="Badge on the top-right edge" height={96}><div className={box} style={accent}><span className="absolute -right-1.5 -top-2 rounded-full px-1.5 text-[6pt] font-semibold text-white" style={{ backgroundColor: R.header }}>90 days</span><Title>Run history</Title><Detail>Sessions, cost, results</Detail></div></Swatch>
      <Swatch name="tags/logo" note="Technology as a logo, not text" height={96}><div className={`${box} flex items-center gap-2`} style={accent}><Postgres className="h-6 w-6 shrink-0" /><div><Title>Run history</Title><Detail>Sessions, cost, results</Detail></div></div></Swatch>
      <Swatch name="tags/footer" note="Mono metadata line" height={96}><div className={box} style={accent}><Title>Run history</Title><Detail>Sessions, cost, results</Detail><div className="mt-1 border-t border-slate-100 pt-0.5 font-mono text-[6pt] text-slate-500">postgres · 90d · encrypted</div></div></Swatch>
      <Swatch name="tags/header" note="Tag in the header bar" height={96}><div className="w-[112.5pt] overflow-hidden rounded-md border" style={accent}><div className="flex items-center justify-between px-2 py-0.5 text-[7.5pt] font-semibold text-white" style={{ backgroundColor: R.header }}>Run history<span className="rounded bg-white/20 px-1 text-[6pt]">PostgreSQL</span></div><div className="px-2 py-1" style={{ backgroundColor: R.body }}><Detail>Sessions, cost · 90 days</Detail></div></div></Swatch>
      <Swatch name="tags/edge" note="Tag sitting on the top border" height={96}><div className={`${box} pt-2.5`} style={accent}><span className="absolute -top-[5.25pt] left-2 rounded-[1.5pt] border bg-white px-1 font-mono text-[6pt] leading-[9pt]" style={{ borderColor: R.header, color: R.header }}>postgres</span><Title>Run history</Title><Detail>Sessions, cost, results</Detail></div></Swatch>
      <Swatch name="tags/icons" note="Icon-only facts with a legend" height={96}><div className={box} style={accent}><Title>Run history</Title><Detail>Sessions, cost, results</Detail><div className="mt-1 flex items-center gap-1.5 text-slate-500"><UiDatabase className="h-3 w-3" /><UiLockKey className="h-3 w-3" /><span className="font-mono text-[6pt]">90d</span></div></div></Swatch>
    </Sheet>
  );
}

// Lines

const LINE_W = 140;
function LineSample({ d = `M 8 20 L ${LINE_W - 10} 20`, color = R.header, dash, width = 1.6, start, end = "arrow", label, chip = "plain", height = 40 }: {
  d?: string; color?: string; dash?: string | undefined; width?: number; start?: "arrow" | "dot"; end?: "arrow" | "open" | "dot" | "diamond" | "none"; label?: ReactNode; chip?: "plain" | "pill" | "box" | "step" | "verb"; height?: number;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const heads = {
    arrow: <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />,
    open: <path d="M 1 1 L 9 5 L 1 9" fill="none" stroke={color} strokeWidth={1.6} />,
    dot: <circle cx={5} cy={5} r={3.5} fill={color} />,
    diamond: <path d="M 0 5 L 5 1 L 10 5 L 5 9 z" fill="white" stroke={color} strokeWidth={1.2} />,
  };
  const marker = (kind: keyof typeof heads, suffix: string) => (
    <marker id={`${uid}${suffix}`} viewBox="0 0 10 10" refX={kind === "dot" ? 5 : 9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">{heads[kind]}</marker>
  );
  const chipClass = { plain: "bg-slate-50 px-0.5", pill: "rounded-full border bg-white px-1.5", box: "rounded-[1.5pt] border bg-white px-1", step: "", verb: "bg-slate-50 px-0.5 font-mono uppercase tracking-[0.1em] text-[6pt]" }[chip];
  return (
    <div className="relative w-[105pt]" style={{ height }}>
      <svg width={LINE_W} height={height} aria-hidden="true">
        <defs>{end !== "none" && marker(end, "e")}{start && marker(start, "s")}</defs>
        <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" markerEnd={end !== "none" ? `url(#${uid}e)` : undefined} markerStart={start ? `url(#${uid}s)` : undefined} />
      </svg>
      {label && (
        <span className={`absolute left-1/2 top-[15pt] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[6.375pt] leading-[9.75pt] ${chipClass}`} style={{ color, borderColor: color }}>
          {label}
        </span>
      )}
    </div>
  );
}
const Step = ({ n, children }: { n: number; children: ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded bg-white px-1 font-semibold text-slate-700"><span className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[6pt] text-white" style={{ backgroundColor: R.header }}>{n}</span>{children}</span>
);

export function LineStyles() {
  return (
    <Sheet columns={4} intro="Line styles. The stroke says how the connection behaves; the head says direction. Route straight when aligned, orthogonal in dense layouts, and curve only to avoid an obstacle.">
      <Swatch name="line/solid" note="Synchronous call or data"><LineSample /></Swatch>
      <Swatch name="line/dashed" note="Async, optional or revoke"><LineSample dash="6 4" /></Swatch>
      <Swatch name="line/dotted" note="Batch or derived"><LineSample dash="1.5 3.5" width={2} /></Swatch>
      <Swatch name="line/thick" note="The primary path"><LineSample width={3} /></Swatch>
      <Swatch name="line/both" note="Request and response pair"><LineSample start="arrow" /></Swatch>
      <Swatch name="line/plain" note="Association, no direction"><LineSample end="none" /></Swatch>
      <Swatch name="line/orthogonal" note="Right angles, dense layouts" height={56}><LineSample d="M 8 10 L 70 10 L 70 46 L 130 46" height={56} /></Swatch>
      <Swatch name="line/curved" note="Detours around an obstacle" height={56}><LineSample d="M 8 46 C 50 46, 80 10, 130 10" height={56} /></Swatch>
      <Swatch name="line/bus" note="Many sources combed into one" height={56}><LineSample d="M 8 8 L 50 8 M 8 28 L 50 28 M 8 48 L 50 48 M 50 8 L 50 48 M 50 28 L 130 28" height={56} /></Swatch>
      <Swatch name="head/open" note="Lighter arrowhead"><LineSample end="open" /></Swatch>
      <Swatch name="head/dot" note="Attachment or subscription"><LineSample end="dot" /></Swatch>
      <Swatch name="head/diamond" note="Ownership or composition"><LineSample end="diamond" /></Swatch>
    </Sheet>
  );
}

const LINE_ROLES: { name: string; color: string; dash?: string; note: string }[] = [
  { name: "data", color: "#059669", note: "Primary data path" },
  { name: "control", color: R.header, note: "Commands and API calls" },
  { name: "policy", color: "#e11d48", dash: "6 4", note: "Sensitive, identity, secrets" },
  { name: "async", color: "#7c3aed", dash: "1.5 3.5", note: "Queues and batch" },
  { name: "context", color: "#94a3b8", note: "Background, out of focus" },
  { name: "error", color: "#dc2626", note: "Failure or exception path" },
];

export function LineColors() {
  return (
    <Sheet columns={3} intro="Line colour schemes and label styles. Colour a line by what flows on it, and keep one label style per diagram.">
      {LINE_ROLES.map(({ name, color, dash, note }) => <Swatch key={name} name={`flow/${name}`} note={note} height={56}><LineSample color={color} dash={dash} label={name} /></Swatch>)}
      <Swatch name="label/plain" note="Text on the line" height={56}><LineSample label="tool calls" /></Swatch>
      <Swatch name="label/pill" note="Rounded, for busy canvases" height={56}><LineSample label="plan" chip="pill" /></Swatch>
      <Swatch name="label/box" note="Boxed, for boundary crossings" height={56}><LineSample label="mTLS" chip="box" /></Swatch>
      <Swatch name="label/step" note="Numbered sequence" height={56}><LineSample label={<Step n={2}>Grant</Step>} chip="step" /></Swatch>
      <Swatch name="label/verb" note="Uppercase verb" height={56}><LineSample label="invokes" chip="verb" /></Swatch>
    </Sheet>
  );
}

export function LineDensities() {
  return (
    <Sheet columns={3} intro="Line information density. Label a line only when the endpoints do not already say what flows; add a protocol only where it is the point.">
      <Swatch name="line-density/bare" note="Endpoints say it all" height={56}><LineSample /></Swatch>
      <Swatch name="line-density/verb" note="What happens" height={56}><LineSample label="dispatches" /></Swatch>
      <Swatch name="line-density/protocol" note="Verb plus transport" height={56}><LineSample label="dispatches · gRPC" /></Swatch>
      <Swatch name="line-density/step" note="Order matters" height={56}><LineSample label={<Step n={3}>dispatches</Step>} chip="step" /></Swatch>
      <Swatch name="line-density/condition" note="Only sometimes" height={56}><LineSample label="when approved" dash="6 4" /></Swatch>
      <Swatch name="line-density/payload" note="What travels, for data flows" height={56}><div className="flex flex-col items-center"><LineSample label="run event" height={30} /><span className="font-mono text-[6pt] text-slate-500">{"{ id, cost, status }"}</span></div></Swatch>
    </Sheet>
  );
}

