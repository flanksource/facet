// @live
import React from 'react';
import { Page, Diagram, Arrow, COLORS } from '@flanksource/facet';
import { Graphql, Grpc, Http, Kafka, Mqtt, Nats, Postgres, Rabbitmq, Redis, Webhook } from '@flanksource/icons/mi';
import { UiPlugsConnected, UiRepeat } from '@flanksource/clicky-ui/icons';

type Icon = React.ComponentType<{ className?: string }>;
type Mode = 'sync' | 'async';
type Flow = 'inbound' | 'outbound' | 'bidirectional';

const MODES: Record<Mode, { label: string; icon: Icon; color: string }> = {
  sync: { label: 'Synchronous', icon: UiRepeat, color: COLORS.primary },
  async: { label: 'Asynchronous', icon: UiPlugsConnected, color: COLORS.outputBorder },
};

// One entry per grid column after the lead column: protocol above, gateway capability below, backend bus beneath.
const LANES: Array<{ key: string; mode: Mode; flow: Flow; title: string; icons: Icon[]; transport: string; capability: string }> = [
  { key: 'ingest', mode: 'sync', flow: 'inbound', title: 'Data ingestion', icons: [Http], transport: 'HTTP POST', capability: 'API design' },
  { key: 'poll', mode: 'sync', flow: 'inbound', title: 'Polling', icons: [Http], transport: 'HTTP GET', capability: 'Gateway & management' },
  { key: 'graphql', mode: 'sync', flow: 'inbound', title: 'Queries · Mutations', icons: [Http], transport: 'HTTP', capability: 'Access control' },
  { key: 'ws', mode: 'async', flow: 'bidirectional', title: 'WebSocket messages', icons: [Http], transport: 'WebSocket', capability: 'API productization' },
  { key: 'hooks', mode: 'async', flow: 'outbound', title: 'Webhooks', icons: [Webhook], transport: 'HTTPS POST', capability: 'API monitoring' },
  { key: 'stream', mode: 'async', flow: 'outbound', title: 'Stream processing', icons: [Mqtt, Rabbitmq, Kafka], transport: 'TCP', capability: 'Environment management' },
];

const BACKENDS: Array<{ icon: Icon; label: string }> = [
  { icon: Kafka, label: 'Kafka' }, { icon: Mqtt, label: 'MQTT' }, { icon: Rabbitmq, label: 'RabbitMQ' }, { icon: Nats, label: 'NATS' },
  { icon: Grpc, label: 'gRPC' }, { icon: Postgres, label: 'Postgres' }, { icon: Redis, label: 'Redis' },
];

const GRID = 'grid grid-cols-[150px_repeat(6,140px)]';
const tint = (color: string, alpha: string) => `${color}${alpha}`;

function ModeHeader({ mode }: { mode: Mode }) {
  const { label, icon: ModeIcon, color } = MODES[mode];
  return (
    <div className="col-span-full flex items-center gap-2 px-4 pt-3 text-[10pt] font-bold uppercase tracking-[0.3em]" style={{ color }}>
      <ModeIcon className="h-5 w-5" />{label}
    </div>
  );
}

function ProtocolColumn({ id, title, icons, transport }: { id: string; title: string; icons: Icon[]; transport: string }) {
  return (
    <div id={id} className="flex h-[150px] flex-col items-center justify-between px-2 pb-3 pt-4 text-center">
      <div className="text-[9pt] uppercase leading-tight tracking-wider" style={{ color: COLORS.muted }}>{title}</div>
      <div className="flex items-center gap-2">{icons.map((LaneIcon, index) => <LaneIcon key={index} className={icons.length > 1 ? 'h-7 w-7' : 'h-9 w-9'} />)}</div>
      <div className="font-mono text-[10pt] font-bold" style={{ color: COLORS.accent }}>{transport}</div>
    </div>
  );
}

function ModePanel({ id, mode, span, children }: { id: (name: string) => string; mode: Mode; span: string; children?: React.ReactNode }) {
  const color = MODES[mode].color;
  return (
    <div className={`${span} grid grid-cols-subgrid rounded-2xl border-2`} style={{ backgroundColor: tint(color, '0d'), borderColor: tint(color, '40') }}>
      <ModeHeader mode={mode} />
      {children}
      {LANES.filter((lane) => lane.mode === mode && lane.key !== 'graphql').map((lane) => (
        <ProtocolColumn key={lane.key} id={id(`proto-${lane.key}`)} title={lane.title} icons={lane.icons} transport={lane.transport} />
      ))}
    </div>
  );
}

function RequestResponse() {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <span className="border-[3px] px-2 py-1 font-mono leading-none text-[18pt] font-bold" style={{ borderColor: COLORS.accent, color: COLORS.accent }}>SOAP</span>
      <span className="font-mono text-[18pt] font-bold" style={{ color: COLORS.accent }}>{'{REST}'}</span>
    </div>
  );
}

function GatewayBand({ id }: { id: (name: string) => string }) {
  return (
    <div className={`${GRID} col-span-full border-y-2 border-dashed`} style={{ borderColor: tint(COLORS.primary, '60') }}>
      <div className="flex h-[56px] items-center text-[14pt] font-bold" style={{ color: COLORS.accent }}>API Gateway</div>
      {LANES.map((lane, index) => (
        <div key={lane.key} id={id(`cap-${lane.key}`)}
          className={`flex h-[56px] items-center justify-center px-2 text-center font-mono text-[9pt] font-bold uppercase leading-tight ${index > 0 ? 'border-l' : ''}`}
          style={{ color: COLORS.accent, borderColor: tint(COLORS.primary, '30') }}>
          {lane.capability}
        </div>
      ))}
    </div>
  );
}

function BackendPanel({ id }: { id: (name: string) => string }) {
  return (
    <div className={`${GRID} col-span-full rounded-2xl border-2`} style={{ backgroundColor: tint(COLORS.muted, '0d'), borderColor: tint(COLORS.muted, '30') }}>
      <div className="row-start-1 flex h-[40px] items-center whitespace-nowrap px-4 font-mono text-[8pt] uppercase tracking-wider" style={{ color: COLORS.muted }}>Backend connectors</div>
      <div className="col-span-6 col-start-2 row-start-1 mx-[70px] self-center border-t-2 border-dotted" style={{ borderColor: tint(COLORS.muted, '60') }} />
      {LANES.map((lane, index) => (
        <div key={lane.key} className="relative row-start-1 flex h-[40px] items-center justify-center" style={{ gridColumnStart: index + 2 }}>
          <span id={id(`bus-${lane.key}`)} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MODES[lane.mode].color }} />
        </div>
      ))}
      <div className="col-span-full mx-4 mb-4 flex items-center justify-around rounded-xl bg-white py-4">
        {BACKENDS.map(({ icon: BackendIcon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <BackendIcon className="h-8 w-8" />
            <span className="text-[8pt]" style={{ color: COLORS.muted }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LaneArrows({ id, lane }: { id: (name: string) => string; lane: (typeof LANES)[number] }) {
  const hops = [id(`proto-${lane.key}`), id(`cap-${lane.key}`), id(`bus-${lane.key}`)];
  const path = lane.flow === 'outbound' ? [...hops].reverse() : hops;
  const anchors = lane.flow === 'outbound' ? { startAnchor: 'top', endAnchor: 'bottom' } as const : { startAnchor: 'bottom', endAnchor: 'top' } as const;
  return (
    <>
      {path.slice(1).map((to, index) => (
        <Arrow key={to} variant="secondary" color={MODES[lane.mode].color} path="straight" from={path[index]!} to={to} showTail={lane.flow === 'bidirectional'} {...anchors} />
      ))}
    </>
  );
}

export default function ProtocolBands() {
  const graphql = LANES.find((lane) => lane.key === 'graphql')!;
  return (
    <Page pageSize="a3-landscape" margins={{ top: 8, right: 8, bottom: 8, left: 8 }}>
      <Diagram className="w-max bg-white p-4">
        {(id) => (
          <>
            <div className={`${GRID} gap-y-12`}>
              <div className="col-span-full grid grid-cols-subgrid items-end">
                <ModePanel id={id} mode="sync" span="col-span-3"><RequestResponse /></ModePanel>
                <div className="flex flex-col rounded-2xl border-2 bg-white" style={{ borderColor: tint(COLORS.primary, '40') }}>
                  <div className="flex items-center justify-center gap-2 pt-3 text-[11pt] font-bold" style={{ color: COLORS.accent }}>
                    <Graphql className="h-5 w-5" />GraphQL
                  </div>
                  <ProtocolColumn id={id('proto-graphql')} title={graphql.title} icons={graphql.icons} transport={graphql.transport} />
                </div>
                <ModePanel id={id} mode="async" span="col-span-3" />
              </div>
              <GatewayBand id={id} />
              <BackendPanel id={id} />
            </div>
            {LANES.map((lane) => <LaneArrows key={lane.key} id={id} lane={lane} />)}
          </>
        )}
      </Diagram>
    </Page>
  );
}
