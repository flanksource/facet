import type { ReactNode } from "react";
import { UiCloud, UiDatabase, UiGitBranch, UiGlobe, UiKey, UiPackage, UiRobotAi, UiServerProcess, UiShieldCheck, UiUsersThree } from "@flanksource/clicky-ui/icons";
import { Arrow, BoxNode, ContainerNode, DEFAULT_NODE_PALETTE, Diagram } from "@flanksource/facet";
import { ROLES, Sheet, Swatch } from "./common";

const PALETTES = {
  service: { ...DEFAULT_NODE_PALETTE, accent: ROLES.new.header, tint: ROLES.new.body, border: ROLES.new.border },
  external: { ...DEFAULT_NODE_PALETTE, accent: ROLES.external.header, tint: ROLES.external.body, border: ROLES.external.border },
  security: { ...DEFAULT_NODE_PALETTE, accent: ROLES.security.header, tint: ROLES.security.body, border: ROLES.security.border },
  store: { ...DEFAULT_NODE_PALETTE, accent: ROLES.store.header, tint: ROLES.store.body, border: ROLES.store.border },
};

function LinkSample({ left, right, label, both = false }: { left: string; right: string; label: string; both?: boolean }) {
  return (
    <Diagram className="w-full">
      {(id) => (
        <>
          <div className="flex items-center justify-between gap-16 py-5">
            <BoxNode id={id("left")} variant="outlined" title={left} palette={PALETTES.external} compact shadow="shadow-none" />
            <BoxNode id={id("right")} variant="tinted" title={right} palette={PALETTES.service} compact shadow="shadow-none" />
          </div>
          <Arrow from={id("left")} to={id("right")} variant="er" path="straight" startAnchor="right" endAnchor="left" color={ROLES.new.header} headSize={3} showTail={both} labelPosition="top" labels={<span className="whitespace-nowrap rounded bg-white px-1 text-[9px] font-semibold text-slate-700">{label}</span>} />
        </>
      )}
    </Diagram>
  );
}

export function ProtocolInterfaces() {
  return (
    <Sheet columns={2} intro="Name the interface on the flow. These examples label different layers; use only details supported by the architecture.">
      <Swatch name="interface/https" note="HTTP request over TLS" height={100}><LinkSample left="Browser" right="API" label="HTTPS" /></Swatch>
      <Swatch name="interface/grpc" note="Unary or streaming RPC; show the direction" height={100}><LinkSample left="Agent" right="Tool" label="gRPC" /></Swatch>
      <Swatch name="interface/graphql" note="Query or mutation over HTTP" height={100}><LinkSample left="Client" right="API" label="GraphQL" /></Swatch>
      <Swatch name="interface/amqp" note="Publish through a messaging protocol" height={100}><LinkSample left="Worker" right="Broker" label="AMQP" /></Swatch>
      <Swatch name="interface/sql" note="Database interface, not a network transport" height={100}><LinkSample left="Service" right="Store" label="SQL" /></Swatch>
      <Swatch name="interface/oidc" note="OpenID Connect identity interaction" height={100}><LinkSample left="Client" right="IdP" label="OIDC" /></Swatch>
    </Sheet>
  );
}

export function ProtocolFlows() {
  return (
    <Sheet columns={2} intro="Arrowheads describe the illustrated messages. A connection's protocol does not by itself determine whether an interaction is synchronous or one-way.">
      <Swatch name="flow/request" note="Request direction; response omitted" height={100}><LinkSample left="Client" right="API" label="GET /items" /></Swatch>
      <Swatch name="flow/websocket" note="Both peers can send messages" height={100}><LinkSample left="Client" right="Server" label="WebSocket" both /></Swatch>
      <Swatch name="flow/sse" note="Client starts the request; events flow server to client" height={100}><LinkSample left="Server" right="Client" label="SSE events" /></Swatch>
      <Swatch name="flow/webhook" note="Producer sends an event over HTTPS POST" height={100}><LinkSample left="Source" right="Receiver" label="Webhook" /></Swatch>
      <Swatch name="flow/publish" note="Subscriber receives events on a separate flow" height={100}><LinkSample left="Producer" right="Topic" label="publishes" /></Swatch>
      <Swatch name="flow/subscription" note="GraphQL subscription events; transport can be WS or SSE" height={100}><LinkSample left="API" right="Client" label="events" /></Swatch>
    </Sheet>
  );
}

function Element({ title, icon, detail, role = "service" }: { title: string; icon: ReactNode; detail?: string; role?: keyof typeof PALETTES }) {
  return <BoxNode variant="tinted" title={title} icon={icon} description={detail} palette={PALETTES[role]} compact shadow="shadow-none" />;
}

export function ArchitectureElements() {
  return (
    <Sheet columns={2} intro="Use labels and boundaries to identify responsibilities. The example colors distinguish external, service, security and store roles; they are not universal meanings.">
      <Swatch name="element/actors-agents" note="People and agents have distinct responsibilities" height={105}>
        <div className="flex gap-2"><Element title="Team" icon={<UiUsersThree />} role="external" /><Element title="Agent" icon={<UiRobotAi />} /></div>
      </Swatch>
      <Swatch name="element/api-service" note="An external interface and its service" height={105}>
        <div className="flex gap-2"><Element title="Gateway" icon={<UiGlobe />} /><Element title="Service" icon={<UiServerProcess />} /></div>
      </Swatch>
      <Swatch name="element/data-messaging" note="A broker and a store are separate components" height={105}>
        <div className="flex gap-2"><Element title="Broker" icon={<UiPackage />} role="store" /><Element title="Database" icon={<UiDatabase />} role="store" /></div>
      </Swatch>
      <Swatch name="element/delivery" note="Delivery components can be owned independently" height={105}>
        <div className="flex gap-2"><Element title="Source" icon={<UiGitBranch />} role="external" /><Element title="Runner" icon={<UiServerProcess />} /></div>
      </Swatch>
      <Swatch name="security/authentication" note="Identity provider and identity validation" height={105}>
        <Element title="Authentication" icon={<UiKey />} detail="IdP validates identity" role="security" />
      </Swatch>
      <Swatch name="security/authorization" note="Decision and enforcement protect a resource" height={105}>
        <Element title="Authorization" icon={<UiShieldCheck />} detail="PEP enforces policy" role="security" />
      </Swatch>
      <Swatch name="boundary/provider" note="Hosted SaaS: provider operates shared services" height={125}>
        <ContainerNode variant="boundary" title="Provider operated" icon={<UiCloud />} palette={PALETTES.service}><Element title="Shared app" icon={<UiServerProcess />} /></ContainerNode>
      </Swatch>
      <Swatch name="boundary/customer" note="Self-hosted SaaS: customer operates the app" height={125}>
        <ContainerNode variant="boundary" title="Customer operated" icon={<UiCloud />} palette={PALETTES.external}><Element title="Local app" icon={<UiServerProcess />} /></ContainerNode>
      </Swatch>
    </Sheet>
  );
}
