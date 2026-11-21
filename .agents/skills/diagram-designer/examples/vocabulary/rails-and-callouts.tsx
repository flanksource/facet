import type { CSSProperties, ReactNode } from "react";
import { UiDatabase, UiServerProcess, UiStack } from "@flanksource/clicky-ui/icons";
import { MissionControl } from "@flanksource/icons/mi";
import { ROLES, R, INK, Swatch, Sheet } from "./common";
import { Frame, NIGHT, SquareTile } from "./night";

// Numbered rail: the night theme's element types and colours (layouts/temporal-styles.tsx)

const NIGHT_CANVAS: CSSProperties = {
  backgroundColor: NIGHT.bg,
  backgroundImage: `linear-gradient(${NIGHT.grid} 0.75pt, transparent 0.75pt), linear-gradient(90deg, ${NIGHT.grid} 0.75pt, transparent 0.75pt)`,
  backgroundSize: "9pt 9pt",
};

function NightSwatch({ name, note, children, height = 92 }: { name: string; note: string; children: ReactNode; height?: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-center rounded-md px-3" style={{ ...NIGHT_CANVAS, height }}>{children}</div>
      <code className="text-[7.5pt] font-semibold text-slate-800">{name}</code>
      <div className="text-[7.125pt] leading-tight text-slate-500">{note}</div>
    </div>
  );
}

const NightMono = ({ children, color = NIGHT.muted }: { children: ReactNode; color?: string }) => <span className="font-mono text-[6.75pt] uppercase tracking-[0.1em]" style={{ color }}>{children}</span>;

export function RailTypes() {
  return (
    <Sheet columns={4} intro="Numbered rail element types. The rail and its layered stack share one small kit on the night canvas: number the steps only when order matters, frame what runs where, and keep every scene to tiles, cards and chevrons.">
      <NightSwatch name="rail/step" note="Numbered marker on the gradient rail">
        <div className="relative flex h-16 items-center">
          <span className="absolute bottom-0 left-[10.5pt] top-0 w-px" style={{ backgroundImage: `linear-gradient(${NIGHT.rail}, ${NIGHT.railEnd})` }} />
          <span className="relative flex h-[22.5pt] w-[22.5pt] items-center justify-center rounded-full border font-mono text-[9pt] font-semibold" style={{ borderColor: NIGHT.rail, backgroundColor: NIGHT.bg, color: NIGHT.text }}>2</span>
          <div className="ml-2"><div className="text-[8.25pt] font-semibold" style={{ color: NIGHT.text }}>Runs survive</div><div className="text-[6.75pt]" style={{ color: NIGHT.muted }}>One sentence</div></div>
        </div>
      </NightSwatch>
      <NightSwatch name="rail/frame" note="Dashed environment or layer, mono label on the edge">
        <div className="w-full"><Frame label="Your app" color={NIGHT.green}><div className="h-5" /></Frame></div>
      </NightSwatch>
      <NightSwatch name="rail/band" note="Layered stack row: label, title, tiles">
        <div className="relative flex w-full items-center gap-2 rounded-md border border-dashed px-2 pb-1.5 pt-2.5" style={{ borderColor: NIGHT.purple }}>
          <span className="absolute -top-2 left-2 px-1 font-mono text-[6pt] font-semibold uppercase tracking-[0.14em]" style={{ backgroundColor: NIGHT.bg, color: NIGHT.purple }}>Runtime</span>
          <span className="text-[6.75pt] font-semibold" style={{ color: NIGHT.text }}>Survives</span>
          <span className="ml-auto flex gap-1">{[UiStack, UiServerProcess].map((G, i) => <span key={i} className="flex h-5 w-5 items-center justify-center" style={{ backgroundColor: NIGHT.purple, color: NIGHT.bg }}><G className="h-3 w-3" /></span>)}</span>
        </div>
      </NightSwatch>
      <NightSwatch name="rail/tile" note="Flat square, glyph in the canvas colour"><SquareTile icon={UiDatabase} color={NIGHT.orange} label="History" /></NightSwatch>
      <NightSwatch name="rail/tile-brand" note="Light tile so a brand mark keeps its colours"><SquareTile icon={MissionControl} color={NIGHT.text} label="Mission Control" /></NightSwatch>
      <NightSwatch name="rail/card" note="Code or list card on the dark edge">
        <div className="w-[82.5pt] border px-2 py-1.5" style={{ borderColor: NIGHT.edge, backgroundColor: NIGHT.card }}><NightMono color={NIGHT.green}>Agent</NightMono><div className="font-mono text-[7.5pt]" style={{ color: NIGHT.muted }}>plan()</div></div>
      </NightSwatch>
      <NightSwatch name="rail/chevrons" note="Flow between tiles, no arrows"><span className="flex items-center gap-2"><span className="h-6 w-6" style={{ backgroundColor: NIGHT.purple }} /><span className="font-mono text-[10.5pt] font-bold tracking-[-0.15em]" style={{ color: NIGHT.purple }}>{">>"}</span><span className="h-6 w-6" style={{ backgroundColor: NIGHT.green }} /></span></NightSwatch>
      <NightSwatch name="rail/window" note="Window mock for the outcome">
        <div className="w-[72pt] border" style={{ borderColor: NIGHT.edge, backgroundColor: NIGHT.card }}>
          <div className="flex gap-1 border-b px-1.5 py-1" style={{ borderColor: NIGHT.edge }}>{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: NIGHT.edge }} />)}</div>
          <div className="flex h-8 items-center justify-center"><span className="h-4 w-4 rounded-full" style={{ backgroundColor: NIGHT.green }} /></div>
        </div>
      </NightSwatch>
    </Sheet>
  );
}

const NIGHT_COLORS: { name: string; color: string; note: string; ring?: boolean }[] = [
  { name: "night/canvas", color: NIGHT.bg, note: "Background, with a 7% slate grid", ring: true },
  { name: "night/card", color: NIGHT.card, note: "Card and window fill", ring: true },
  { name: "night/edge", color: NIGHT.edge, note: "Card borders, separators, idle bars" },
  { name: "night/text", color: NIGHT.text, note: "Titles; brand tile fill" },
  { name: "night/muted", color: NIGHT.muted, note: "Body copy, tile labels, people" },
  { name: "night/rail", color: NIGHT.rail, note: "Rail start and step rings" },
  { name: "night/rail-end", color: NIGHT.railEnd, note: "Rail gradient end" },
  { name: "night/green", color: NIGHT.green, note: "Base layer, your environment, success" },
  { name: "night/purple", color: NIGHT.purple, note: "Shared engines, runtime, the platform" },
  { name: "night/orange", color: NIGHT.orange, note: "The domain on top, warnings" },
];

export function RailColors() {
  return (
    <Sheet columns={5} intro="Numbered rail colour theme. Ten tokens from NIGHT in layouts/temporal-styles.tsx. Give each frame or band one role colour and repeat it on its label and tiles; use at most three role colours (green, purple, orange) per figure, bottom layer green.">
      {NIGHT_COLORS.map(({ name, color, note, ring }) => (
        <NightSwatch key={name} name={name} note={note} height={64}>
          <span className="flex flex-col items-center gap-1">
            <span className="h-7 w-12 rounded-sm" style={{ backgroundColor: color, boxShadow: ring ? `inset 0 0 0 0.75pt ${NIGHT.edge}` : undefined }} />
            <NightMono>{color}</NightMono>
          </span>
        </NightSwatch>
      ))}
      <NightSwatch name="night/rail-gradient" note="Rail line: rail to rail-end, top to bottom" height={64}>
        <span className="h-10 w-1 rounded-full" style={{ backgroundImage: `linear-gradient(${NIGHT.rail}, ${NIGHT.railEnd})` }} />
      </NightSwatch>
    </Sheet>
  );
}

// Rails: how a figure numbers and joins an ordered sequence

const Dot = ({ n, color = R.header, filled = true }: { n?: number; color?: string; filled?: boolean }) => (
  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[6.75pt] font-bold" style={filled ? { backgroundColor: color, borderColor: color, color: "white" } : { backgroundColor: "white", borderColor: color, color }}>{n}</span>
);

function VerticalRail({ line, done = 0 }: { line: CSSProperties; done?: number }) {
  return (
    <div className="relative flex flex-col gap-2.5">
      <span className="absolute bottom-2 left-[6.75pt] top-2 w-0.5" style={line} />
      {[1, 2, 3].map((n) => (
        <div key={n} className="relative flex items-center gap-1.5">
          <Dot n={n} filled={n <= done || done === 0} />
          <span className="text-[7.125pt] font-semibold text-slate-800">{["Plan", "Edit", "Verify"][n - 1]}</span>
        </div>
      ))}
    </div>
  );
}

export function RailStyles() {
  const gradient = { backgroundImage: `linear-gradient(${R.header}, ${ROLES.store.header})` };
  return (
    <Sheet columns={4} intro="Rail styles: the spine that numbers an ordered sequence. Use a rail only when order matters; vertical rails pair each step with prose, horizontal rails fit a header or a slide strip.">
      <Swatch name="rail/vertical" note="Numbered steps down the left, prose beside" height={108}><VerticalRail line={{ backgroundColor: R.border }} /></Swatch>
      <Swatch name="rail/gradient" note="Night-theme rail; colour shifts with progress" height={108}><VerticalRail line={gradient} /></Swatch>
      <Swatch name="rail/progress" note="Done steps filled, the rest outlined" height={108}><VerticalRail line={{ backgroundImage: `linear-gradient(${R.header} 50%, ${ROLES.muted.border} 50%)` }} done={2} /></Swatch>
      <Swatch name="rail/dashed" note="Optional or asynchronous hand-offs" height={108}><VerticalRail line={{ backgroundImage: `repeating-linear-gradient(${R.border} 0 2.25pt, transparent 2.25pt 4.5pt)` }} /></Swatch>
      <Swatch name="rail/horizontal" note="Stepper across the top of a figure">
        <div className="flex items-center gap-0.5">{[1, 2, 3].map((n) => <span key={n} className="flex items-center gap-0.5"><Dot n={n} /><span className="text-[6.375pt] font-semibold text-slate-800">{["Plan", "Edit", "Verify"][n - 1]}</span>{n < 3 && <span className="h-0.5 w-2" style={{ backgroundColor: R.border }} />}</span>)}</div>
      </Swatch>
      <Swatch name="rail/chevron" note="Stages as arrowed segments">
        <div className="flex">{["Plan", "Edit", "Verify"].map((s, i) => <span key={s} className="py-1 pl-3 pr-2 text-[6.75pt] font-semibold text-white" style={{ backgroundColor: i === 2 ? R.border : R.header, clipPath: "polygon(0 0, calc(100% - 4.5pt) 0, 100% 50%, calc(100% - 4.5pt) 100%, 0 100%, 4.5pt 50%)" }}>{s}</span>)}</div>
      </Swatch>
      <Swatch name="rail/timeline" note="Dated ticks; when matters more than order">
        <div className="relative w-[112.5pt] pt-3"><span className="absolute inset-x-0 top-[12.75pt] h-px bg-slate-300" />{["Mon", "Wed", "Fri"].map((d, i) => <span key={d} className="absolute flex flex-col items-center" style={{ left: `${10 + i * 60}px`, top: 12 }}><span className="h-2.5 w-2.5 rounded-full border-2 bg-white" style={{ borderColor: R.header }} /><span className="mt-1 font-mono text-[6pt] text-slate-500">{d}</span></span>)}<div className="h-8" /></div>
      </Swatch>
      <Swatch name="rail/lettered" note="Parallel paths: A, B, C instead of 1, 2, 3">
        <div className="flex gap-2">{["A", "B", "C"].map((l) => <span key={l} className="flex h-5 w-5 items-center justify-center rounded-[3pt] border-2 bg-white text-[6.75pt] font-bold" style={{ borderColor: ROLES.action.header, color: ROLES.action.header }}>{l}</span>)}</div>
      </Swatch>
    </Sheet>
  );
}

// Callouts: notes that point at part of a diagram, or at one step of a sequence

function Target({ children = "Create_Class" }: { children?: ReactNode }) {
  return <span className="rounded-md border bg-white px-2 py-1 font-mono text-[7.125pt] font-semibold text-slate-800" style={{ borderColor: R.border }}>{children}</span>;
}

export function CalloutStyles() {
  const card = "rounded-md border bg-white px-1.5 py-1 text-[6.375pt] leading-tight text-slate-700 shadow-sm";
  return (
    <Sheet columns={4} intro="Callout styles. Diagram callouts point at a part of the figure; step callouts annotate one step of a sequence. Number callouts that the caption or notes refer to, and keep one callout style per figure.">
      <Swatch name="callout/marker" note="Numbered dot; the note lives in the caption"><span className="relative"><Target /><span className="absolute -right-2 -top-2.5"><Marker n={1} /></span></span></Swatch>
      <Swatch name="callout/leader" note="Card joined by a leader line" height={96}>
        <div className="flex w-full items-center">
          <Target />
          <span className="relative h-px min-w-3 flex-1" style={{ backgroundColor: R.header }}><span className="absolute -left-0.5 -top-[1.5pt] h-[3.75pt] w-[3.75pt] rounded-full" style={{ backgroundColor: R.header }} /></span>
          <span className={`${card} w-[48pt] shrink-0`} style={{ borderColor: R.border }}>Too many arguments</span>
        </div>
      </Swatch>
      <Swatch name="callout/exploded" note="Detail pulled out beside the subject, elbow leader" height={96}>
        <div className="flex h-14 w-full items-stretch">
          <span className="self-end rounded-sm px-0.5 font-mono text-[6.375pt] leading-[10.5pt]" style={{ backgroundColor: "#fee2e2", boxShadow: "inset 0 -0.75pt 0 #b91c1c" }}>EXEC …</span>
          <svg className="min-w-4 flex-1" viewBox="0 0 40 56" preserveAspectRatio="none" aria-hidden>
            <path d="M 0 49 H 20 V 15 H 40" fill="none" stroke="#b91c1c" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          </svg>
          <span className={`${card} w-[55.5pt] shrink-0 self-start`} style={{ borderColor: "#b91c1c" }}><b className="font-mono text-[#b91c1c]">Create_Class</b><br />Root cause</span>
        </div>
      </Swatch>
      <Swatch name="callout/edge-tag" note="Short tag sitting on the target's border"><span className="relative pt-1"><Target /><span className="absolute -top-1.5 left-2 rounded-[1.5pt] border bg-white px-1 font-mono text-[6pt]" style={{ borderColor: ROLES.security.header, color: ROLES.security.header }}>failed</span></span></Swatch>
      <Swatch name="callout/bubble" note="Speech bubble for a person or agent's comment" height={96}>
        <div className="flex flex-col items-start gap-1"><span className="relative rounded-lg border bg-white px-2 py-1 text-[6.375pt] text-slate-700" style={{ borderColor: R.border }}>Fix the argument list<span className="absolute -bottom-[3.75pt] left-3 h-2 w-2 rotate-45 border-b border-r bg-white" style={{ borderColor: R.border }} /></span><Target /></div>
      </Swatch>
      <Swatch name="step-callout/badge" note="Step number on the box itself"><span className="relative"><Target>Verify</Target><span className="absolute -left-2 -top-2"><Dot n={3} /></span></span></Swatch>
      <Swatch name="step-callout/banner" note="Step label bar above the scene">
        <div className="w-[90pt] overflow-hidden rounded-md border" style={{ borderColor: R.border }}><div className="flex items-center gap-1 px-1.5 py-0.5 text-[6.375pt] font-bold text-white" style={{ backgroundColor: R.header }}><span className="font-mono">02</span>Edit and test</div><div className="h-6 bg-white" /></div>
      </Swatch>
      <Swatch name="step-callout/note" note="Numbered note under the figure, tied by its marker">
        <div className="flex w-[112.5pt] items-start gap-1 text-[6.375pt] leading-tight text-slate-700"><Marker n={2} /><span>ExecCreateClass_SP issues the call; fix its argument list.</span></div>
      </Swatch>
    </Sheet>
  );
}

const Marker = ({ n }: { n: number }) => <span className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[6pt] font-bold text-white" style={{ backgroundColor: INK }}>{n}</span>;

