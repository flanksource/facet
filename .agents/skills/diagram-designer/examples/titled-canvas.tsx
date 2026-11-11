// @live
import React from 'react';
import { Page, Diagram, Arrow, COLORS, type ArrowProps } from '@flanksource/facet';
import { TbApi, TbBrowser, TbCloud, TbCreditCard, TbDatabase, TbHexagonLetterA, TbMail, TbShoppingCart, TbStack2 } from 'react-icons/tb';

type Icon = React.ComponentType<{ className?: string }>;
type NodeKind = 'external' | 'service' | 'focal' | 'store';
type EdgeKind = 'http' | 'primary' | 'call' | 'async';

// The legend renders from these catalogs, so a swatch can never drift from the nodes and edges it explains.
const NODE_KINDS: Record<NodeKind, { label: string; fill: string; border: string }> = {
  external: { label: 'External', fill: `${COLORS.muted}14`, border: `${COLORS.muted}66` },
  service: { label: 'Service', fill: '#ffffff', border: COLORS.muted },
  focal: { label: 'Focal', fill: `${COLORS.primary}1a`, border: COLORS.primary },
  store: { label: 'Store', fill: `${COLORS.muted}26`, border: COLORS.muted },
};

const EDGE_KINDS: Record<EdgeKind, { label: string; color: string; strokeWidth: number; dashed?: boolean }> = {
  http: { label: 'HTTP / API', color: COLORS.outputBorder, strokeWidth: 1.5 },
  primary: { label: 'Primary path', color: COLORS.primary, strokeWidth: 2.5 },
  call: { label: 'Call / flow', color: COLORS.muted, strokeWidth: 1.5 },
  async: { label: 'Async', color: COLORS.muted, strokeWidth: 1.5, dashed: true },
};

const NODES: Array<{ key: string; kind: NodeKind; title: string; detail: string; icon: Icon; cell: string }> = [
  { key: 'db', kind: 'store', title: 'Orders DB', detail: 'Postgres', icon: TbDatabase, cell: 'col-start-4 row-start-1' },
  { key: 'browser', kind: 'external', title: 'Browser', detail: 'Web storefront', icon: TbBrowser, cell: 'col-start-1 row-start-2' },
  { key: 'edge', kind: 'external', title: 'CDN edge', detail: 'TLS · caching', icon: TbCloud, cell: 'col-start-2 row-start-2' },
  { key: 'api', kind: 'service', title: 'Storefront API', detail: 'Cart · session', icon: TbApi, cell: 'col-start-3 row-start-2' },
  { key: 'checkout', kind: 'focal', title: 'Checkout service', detail: 'Price · reserve · charge', icon: TbShoppingCart, cell: 'col-start-4 row-start-2' },
  { key: 'payments', kind: 'external', title: 'Payment provider', detail: 'Card authorisation', icon: TbCreditCard, cell: 'col-start-5 row-start-2' },
  { key: 'events', kind: 'store', title: 'Order events', detail: 'Message queue', icon: TbStack2, cell: 'col-start-4 row-start-3' },
  { key: 'email', kind: 'service', title: 'Email worker', detail: 'Receipts', icon: TbMail, cell: 'col-start-3 row-start-3' },
];

const EDGES: Array<{ from: string; to: string; kind: EdgeKind; startAnchor: ArrowProps['startAnchor']; endAnchor: ArrowProps['endAnchor'] }> = [
  { from: 'browser', to: 'edge', kind: 'http', startAnchor: 'right', endAnchor: 'left' },
  { from: 'edge', to: 'api', kind: 'http', startAnchor: 'right', endAnchor: 'left' },
  { from: 'api', to: 'checkout', kind: 'primary', startAnchor: 'right', endAnchor: 'left' },
  { from: 'checkout', to: 'payments', kind: 'primary', startAnchor: 'right', endAnchor: 'left' },
  { from: 'checkout', to: 'db', kind: 'call', startAnchor: 'top', endAnchor: 'bottom' },
  { from: 'checkout', to: 'events', kind: 'async', startAnchor: 'bottom', endAnchor: 'top' },
  { from: 'events', to: 'email', kind: 'async', startAnchor: 'left', endAnchor: 'right' },
];

function CanvasNode({ id, kind, title, detail, icon: NodeIcon, cell }: { id: string; kind: NodeKind; title: string; detail: string; icon: Icon; cell: string }) {
  const { fill, border } = NODE_KINDS[kind];
  return (
    <div id={id} className={`${cell} flex items-center gap-2 rounded-lg border-2 px-3 py-2`} style={{ backgroundColor: fill, borderColor: border }}>
      <NodeIcon className="h-5 w-5 shrink-0" />
      <div className="flex flex-col">
        <span className="whitespace-nowrap text-[10pt] font-semibold leading-tight">{title}</span>
        <span className="text-[8pt] leading-tight" style={{ color: COLORS.muted }}>{detail}</span>
      </div>
    </div>
  );
}

function EdgeSwatch({ kind }: { kind: EdgeKind }) {
  const { color, strokeWidth, dashed } = EDGE_KINDS[kind];
  return (
    <svg width="36" height="10" viewBox="0 0 36 10" aria-hidden>
      <line x1="0" y1="5" x2="28" y2="5" stroke={color} strokeWidth={strokeWidth} strokeDasharray={dashed ? '4 3' : undefined} />
      <path d="M28 1 L36 5 L28 9 Z" fill={color} />
    </svg>
  );
}

function Legend() {
  const item = 'flex items-center gap-2 text-[9pt]';
  return (
    <div className="mt-10 flex flex-col gap-2 border-t pt-3" style={{ borderColor: `${COLORS.muted}33` }}>
      <div className="text-[8pt] font-semibold uppercase tracking-[0.25em]" style={{ color: COLORS.muted }}>Legend</div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
        {(Object.keys(NODE_KINDS) as NodeKind[]).map((kind) => (
          <span key={kind} className={item}>
            <span className="h-4 w-6 rounded border-2" style={{ backgroundColor: NODE_KINDS[kind].fill, borderColor: NODE_KINDS[kind].border }} />
            {NODE_KINDS[kind].label}
          </span>
        ))}
        {(Object.keys(EDGE_KINDS) as EdgeKind[]).map((kind) => (
          <span key={kind} className={item}><EdgeSwatch kind={kind} />{EDGE_KINDS[kind].label}</span>
        ))}
      </div>
    </div>
  );
}

export default function TitledCanvas() {
  return (
    <Page pageSize="a4-landscape" margins={{ top: 8, right: 8, bottom: 8, left: 8 }}>
      <div className="flex w-max flex-col bg-white p-8">
        <div className="text-[9pt] font-semibold uppercase tracking-[0.3em]" style={{ color: COLORS.muted }}>Architecture</div>
        <h1 className="m-0 mt-2 font-serif text-[28pt] font-semibold leading-tight">Checkout in production</h1>
        <p className="m-0 mt-2 text-[12pt]" style={{ color: COLORS.muted }}>How an order travels from the browser to the payment provider.</p>

        <Diagram className="mt-10">
          {(id) => (
            <>
              <div className="grid grid-cols-[repeat(5,176px)] grid-rows-[repeat(3,auto)] gap-x-12 gap-y-12">
                {NODES.map((node) => <CanvasNode key={node.key} id={id(node.key)} {...node} />)}
              </div>
              {EDGES.map(({ from, to, kind, ...anchors }) => {
                const { color, strokeWidth, dashed } = EDGE_KINDS[kind];
                return (
                  <Arrow key={`${from}-${to}`} from={id(from)} to={id(to)} path="straight" color={color} strokeWidth={strokeWidth} headSize={4}
                    dashness={dashed ? { strokeLen: 5, nonStrokeLen: 4 } : false} {...anchors} />
                );
              })}
            </>
          )}
        </Diagram>

        <Legend />
        <div className="mt-6 flex items-center justify-end gap-1 text-[12pt] font-bold" style={{ color: COLORS.muted }}>
          <TbHexagonLetterA className="h-6 w-6" style={{ color: COLORS.pk }} />acme
        </div>
      </div>
    </Page>
  );
}
