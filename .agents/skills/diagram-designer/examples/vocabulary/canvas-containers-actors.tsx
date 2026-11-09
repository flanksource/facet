import type { ComponentType, CSSProperties } from "react";
import { UiCursorClick, UiGlobe, UiKey, UiLockKey, UiRobotAi, UiServerProcess, UiShieldCheck, UiUser, UiUserCheck, UiUsersThree } from "@flanksource/clicky-ui/icons";
import { BoxNode, CONTAINER_STYLES, ContainerNode, DEFAULT_NODE_PALETTE } from "@flanksource/facet";
import { ROLES, ROLE_KEYS, R, INK, MUTED, Swatch, Sheet, Title, Detail } from "./common";

type Icon = ComponentType<{ className?: string }>;

// Canvas: the diagram's own background and outer frame

function Mini({ dark = false }: { dark?: boolean | undefined }) {
  const box = dark ? "rounded-sm border border-white/30 bg-white/10" : "rounded-sm border border-slate-300 bg-white";
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-5 w-9 ${box}`} />
      <span className={`h-px w-4 ${dark ? "bg-white/50" : "bg-slate-400"}`} />
      <span className={`h-5 w-9 ${box}`} />
    </div>
  );
}

const CANVASES: { name: string; note: string; style: CSSProperties; dark?: boolean }[] = [
  { name: "canvas/plain", note: "White; the default for print", style: { backgroundColor: "#ffffff" } },
  { name: "canvas/paper", note: "Warm off-white", style: { backgroundColor: "#f7f5f0" } },
  { name: "canvas/dots", note: "Dot grid; sketch or whiteboard feel", style: { backgroundColor: "#fbfbfa", backgroundImage: "radial-gradient(#d6d3d1 0.75pt, transparent 0.75pt)", backgroundSize: "7.5pt 7.5pt" } },
  { name: "canvas/grid", note: "Blueprint line grid", style: { backgroundColor: "#f8fbfd", backgroundImage: "linear-gradient(#dbeaf3 0.75pt, transparent 0.75pt), linear-gradient(90deg, #dbeaf3 0.75pt, transparent 0.75pt)", backgroundSize: "9pt 9pt" } },
  { name: "canvas/tint", note: "Soft grey card, figures in prose", style: { backgroundColor: "#f4f4f3" } },
  { name: "canvas/wash", note: "Light gradient, product pages", style: { backgroundImage: "linear-gradient(135deg, #eff6ff, #ffffff 60%)" } },
  { name: "canvas/night", note: "Dark grid; slides and heroes", style: { backgroundColor: "#0b1023", backgroundImage: "linear-gradient(rgba(148,163,184,0.12) 0.75pt, transparent 0.75pt), linear-gradient(90deg, rgba(148,163,184,0.12) 0.75pt, transparent 0.75pt)", backgroundSize: "9pt 9pt" }, dark: true },
  { name: "canvas/transparent", note: "Inherits the page; never for PNG", style: { background: "repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 7.5pt 7.5pt" } },
];

export function CanvasBackgrounds() {
  return (
    <Sheet columns={4} intro="Canvas backgrounds: what the whole diagram sits on. Choose once per document; dotted and grid canvases suit working drawings, plain and paper suit print.">
      {CANVASES.map(({ name, note, style, dark }) => (
        <Swatch key={name} name={name} note={note}><div className="flex h-[57pt] w-full items-center justify-center rounded" style={style}><Mini dark={dark} /></div></Swatch>
      ))}
    </Sheet>
  );
}

export function CanvasFrames() {
  return (
    <Sheet columns={3} intro="Canvas frames: how the diagram as a whole is bounded and captioned on the page.">
      <Swatch name="frame/none" note="Bleeds into the page; inline figures" height={110}><Mini /></Swatch>
      <Swatch name="frame/card" note="Rounded border, optional shadow" height={110}><div className="flex h-[58.5pt] w-[127.5pt] items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm"><Mini /></div></Swatch>
      <Swatch name="frame/figure" note="Grey card with a numbered caption below" height={110}><div className="space-y-1"><div className="flex h-[49.5pt] w-[127.5pt] items-center justify-center rounded-lg border border-[#e4e4e2] bg-[#f4f4f3]"><Mini /></div><div className="text-center text-[6.375pt] text-slate-500">Figure 1. Runs pass one gateway.</div></div></Swatch>
      <Swatch name="frame/titled" note="Title bar and tag above the canvas" height={110}><div className="w-[127.5pt] space-y-1"><div className="flex items-center gap-1.5"><span className="text-[7.5pt] font-semibold">Deployment</span><span className="border-y border-sky-700 px-1 font-mono text-[6pt] tracking-[0.15em] text-sky-800">REV 01</span></div><div className="flex h-[45pt] items-center justify-center border border-sky-200 bg-[#f8fbfd]"><Mini /></div></div></Swatch>
      <Swatch name="frame/crop" note="Corner crop marks, reference drawing" height={110}><div className="relative flex h-[58.5pt] w-[127.5pt] items-center justify-center bg-[#f8fbfd]">{["left-1 top-1 border-l border-t", "right-1 top-1 border-r border-t", "bottom-1 left-1 border-b border-l", "bottom-1 right-1 border-b border-r"].map((c) => <span key={c} className={`absolute h-2.5 w-2.5 border-slate-400 ${c}`} />)}<Mini /></div></Swatch>
      <Swatch name="frame/footer" note="Uppercase title bottom-left" height={110}><div className="relative flex h-[58.5pt] w-[127.5pt] items-center justify-center bg-[#fafafa] pb-3"><Mini /><span className="absolute bottom-1.5 left-2 text-[6pt] font-semibold uppercase tracking-[0.06em]">Agent runs · sandboxes</span></div></Swatch>
    </Sheet>
  );
}

// Containers

export function ContainerStyles() {
  const notes = {
    zone: "Tinted group of members", boundary: "Trust or network edge", binding: "Solid: owns its children",
    region: "Cloud account or region", header: "Box-like group with a bar", panel: "Grey panel, part of an app",
    frame: "What you deploy", exception: "Off the happy path", lane: "Horizontal: one party per lane",
    column: "Vertical: one stage per column", "card-group": "White cards on a tint",
  };
  return (
    <Sheet columns={4} intro="Container styles. A container groups things; its edge says what kind of group. Dashed edges are boundaries you cross, solid edges are things that own their children.">
      {CONTAINER_STYLES.map((variant) => <Swatch key={variant} name={`container/${variant}`} note={notes[variant]} height={176}>
        <ContainerNode variant={variant} title="Control plane" minWidth="112.5pt"
          palette={{ ...DEFAULT_NODE_PALETTE, accent: R.header, border: R.border, tint: R.body }}
          {...(["boundary", "binding", "region"].includes(variant) ? { tag: "Private network" } : {})}>
          <div className={variant === "column" || variant === "card-group" ? "flex flex-col gap-1" : "flex gap-1"}>
            {["API", "Worker"].map(title => <BoxNode key={title} title={title} variant={variant === "card-group" ? "card" : "outlined"} compact shadow="shadow-none" />)}
          </div>
        </ContainerNode>
      </Swatch>)}
      <Swatch name="container/nested" note="Region › network › subnet" height={176}>
        <ContainerNode variant="region" tag="Region"><ContainerNode variant="boundary" tag="Network"><BoxNode title="Subnet" variant="outlined" compact /></ContainerNode></ContainerNode>
      </Swatch>
    </Sheet>
  );
}

export function ContainerColors() {
  return (
    <Sheet columns={4} intro="Container colour schemes. Containers reuse the box roles at lower intensity: a light tint or only a coloured edge, so the boxes inside stay readable.">
      {ROLE_KEYS.map((key) => {
        const role = ROLES[key];
        return (
          <Swatch key={key} name={`zone/${key}`}>
            <div className="flex gap-1.5">
              <div className="h-12 w-[46.5pt] rounded-md border p-1" style={{ borderColor: role.border, backgroundColor: role.body }}><div className="text-[6.375pt] font-semibold" style={{ color: role.header }}>tint</div></div>
              <div className="h-12 w-[46.5pt] rounded-md border border-dashed p-1" style={{ borderColor: role.header }}><div className="text-[6.375pt] font-semibold" style={{ color: role.header }}>edge</div></div>
            </div>
          </Swatch>
        );
      })}
    </Sheet>
  );
}

export function ContainerDensities() {
  const zone = { borderColor: R.border, backgroundColor: R.body };
  const members = <div className="space-y-0.5">{["Run API", "Scheduler", "Policy"].map((m) => <div key={m} className="flex items-center gap-1 text-[6.75pt] text-slate-800"><span className="h-1 w-1 rounded-full" style={{ backgroundColor: R.header }} />{m}</div>)}</div>;
  return (
    <Sheet columns={5} intro="Container information density. A container needs a name once it is a boundary someone crosses; members and footers are only for containers that are the subject of the figure.">
      <Swatch name="container-density/unlabelled" height={104}><div className="h-16 w-[88.5pt] rounded-md border" style={zone} /></Swatch>
      <Swatch name="container-density/tag" height={104}><div className="relative h-16 w-[88.5pt] rounded-md border border-dashed" style={{ borderColor: R.header }}><span className="absolute -top-[5.25pt] left-2 rounded-[1.5pt] border bg-white px-1 font-mono text-[6pt] leading-[9pt]" style={{ borderColor: R.header, color: R.header }}>control plane</span></div></Swatch>
      <Swatch name="container-density/titled" height={104}><div className="h-16 w-[88.5pt] rounded-md border p-1.5" style={zone}><Title color={R.header}>Control plane</Title><Detail>Decides and records</Detail></div></Swatch>
      <Swatch name="container-density/members" height={104}><div className="w-[88.5pt] rounded-md border p-1.5" style={zone}><Title color={R.header}>Control plane</Title>{members}</div></Swatch>
      <Swatch name="container-density/footer" height={104}><div className="w-[88.5pt] rounded-md border p-1.5" style={zone}><Title color={R.header}>Control plane</Title>{members}<div className="mt-1 border-t pt-0.5 text-[6pt] text-slate-500" style={{ borderColor: R.border }}>3 replicas · 2 AZs</div></div></Swatch>
    </Sheet>
  );
}

// Actors

function ActorIcon({ icon: Glyph, color, size = 22 }: { icon: Icon; color: string; size?: number }) {
  return <span style={{ color }}><Glyph className={size > 20 ? "h-6 w-6" : "h-4 w-4"} /></span>;
}

export function ActorStyles() {
  return (
    <Sheet columns={4} intro="Actor styles. Actors start or approve work; draw them differently from components so a reader can tell people and agents from systems at a glance.">
      <Swatch name="actor/figure" note="Icon above a label"><div className="flex flex-col items-center gap-0.5"><ActorIcon icon={UiUser} color={INK} /><Title>Engineer</Title></div></Swatch>
      <Swatch name="actor/avatar" note="Initials in a circle"><div className="flex items-center gap-1.5"><span className="flex h-8 w-8 items-center justify-center rounded-full text-[8.25pt] font-semibold text-white" style={{ backgroundColor: R.header }}>JD</span><Title>Engineer</Title></div></Swatch>
      <Swatch name="actor/stacked" note="An outside party"><div className="relative pb-1.5"><div className="absolute inset-x-1.5 bottom-0 top-1.5 rounded-md border border-slate-300 bg-white" /><div className="relative flex flex-col items-center rounded-md border border-slate-800 bg-white px-3 py-1.5"><ActorIcon icon={UiUser} color={INK} size={16} /><Title>Customer</Title></div></div></Swatch>
      <Swatch name="actor/pill" note="Inline, in a lane or list"><span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[7.875pt] font-semibold"><UiUser className="h-3.5 w-3.5" />Engineer</span></Swatch>
      <Swatch name="actor/cursor" note="Who did this step"><div className="relative rounded-md border border-slate-200 bg-white px-3 py-2"><Title>Edit and test</Title><span className="absolute -bottom-3 right-1 inline-flex items-center gap-0.5 rounded-full px-1.5 text-[6.375pt] font-semibold text-white" style={{ backgroundColor: "#f25533" }}><UiCursorClick className="h-3 w-3" />Agent</span></div></Swatch>
      <Swatch name="actor/agent" note="An AI agent"><div className="flex flex-col items-center gap-0.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: R.body, color: R.header }}><UiRobotAi className="h-5 w-5" /></span><Title color={R.header}>Agent</Title></div></Swatch>
      <Swatch name="actor/group" note="A role, many people"><div className="flex flex-col items-center gap-0.5"><ActorIcon icon={UiUsersThree} color={INK} /><Title>Configurators</Title></div></Swatch>
      <Swatch name="actor/identity" note="A workload identity"><span className="inline-flex items-center gap-1 rounded border border-dashed border-slate-400 bg-white px-1.5 py-0.5 font-mono text-[6.75pt] text-slate-700"><UiKey className="h-3 w-3" />sa/runner</span></Swatch>
    </Sheet>
  );
}

const ACTOR_ROLES: { name: string; icon: Icon; color: string; label: string; note: string }[] = [
  { name: "human", icon: UiUser, color: INK, label: "Engineer", note: "Starts work" },
  { name: "approver", icon: UiUserCheck, color: ROLES.existing.header, label: "Approver", note: "Decides, never executes" },
  { name: "agent", icon: UiRobotAi, color: R.header, label: "Agent", note: "Acts on someone's behalf" },
  { name: "service", icon: UiServerProcess, color: ROLES.external.header, label: "CI pipeline", note: "Automated caller" },
  { name: "external", icon: UiGlobe, color: ROLES.cloud.header, label: "Customer", note: "Outside the organisation" },
  { name: "untrusted", icon: UiUser, color: ROLES.security.header, label: "Visitor", note: "Unauthenticated" },
];

export function ActorColors() {
  return (
    <Sheet columns={6} intro="Actor colour schemes. Colour actors by their authority, not by team, so approval and automation stand out.">
      {ACTOR_ROLES.map(({ name, icon, color, label, note }) => (
        <Swatch key={name} name={`actor-role/${name}`} note={note}><div className="flex flex-col items-center gap-0.5"><ActorIcon icon={icon} color={color} /><Title color={color}>{label}</Title></div></Swatch>
      ))}
    </Sheet>
  );
}

export function ActorDensities() {
  return (
    <Sheet columns={5} intro="Actor information density. Add the role once there is more than one person, and the identity or permissions only in access and security figures.">
      <Swatch name="actor-density/icon" height={96}><ActorIcon icon={UiUser} color={INK} /></Swatch>
      <Swatch name="actor-density/name" height={96}><div className="flex flex-col items-center"><ActorIcon icon={UiUser} color={INK} /><Title>Engineer</Title></div></Swatch>
      <Swatch name="actor-density/role" height={96}><div className="flex flex-col items-center"><ActorIcon icon={UiUser} color={INK} /><Title>Engineer</Title><Detail>Platform team</Detail></div></Swatch>
      <Swatch name="actor-density/identity" height={96}><div className="flex flex-col items-center gap-0.5"><ActorIcon icon={UiUser} color={INK} /><Title>Engineer</Title><span className="inline-flex items-center gap-0.5 rounded border border-dashed border-slate-400 px-1 font-mono text-[6pt] text-slate-600"><UiLockKey className="h-2.5 w-2.5" />Azure AD</span></div></Swatch>
      <Swatch name="actor-density/permissions" height={96}><div className="rounded-md border border-slate-200 bg-white px-2 py-1"><div className="flex items-center gap-1"><UiUser className="h-3.5 w-3.5" /><Title>Engineer</Title></div>{["read: UAT", "run: playbooks"].map((p) => <div key={p} className="flex items-center gap-1 font-mono text-[6pt] text-slate-600"><UiShieldCheck className="h-2.5 w-2.5 text-emerald-600" />{p}</div>)}</div></Swatch>
    </Sheet>
  );
}

