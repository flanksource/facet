import { FLOW_STATIC_DASH } from './flowEdges';
import { FlowTagPill } from './FlowTagPill';
import type {
  FlowEdge,
  FlowEdgeVariant,
  FlowLane,
  FlowLaneKind,
  FlowLegendKey,
  FlowLegendLabels,
  FlowStep,
  FlowStepTag,
} from './flowTypes';

export const DEFAULT_FLOW_LEGEND_LABELS: Record<FlowLegendKey, string> = {
  primary: 'Process flow',
  alternate: 'Optional / exception path',
  return: 'Rework loop',
  outcome: 'Outcome',
  person: 'Person',
  system: 'System',
};

const EDGE_VARIANTS: readonly FlowEdgeVariant[] = ['primary', 'alternate', 'return'];
const LANE_KINDS: readonly FlowLaneKind[] = ['person', 'system'];

type FlowLegendItem = { kind: FlowLegendKey } | { kind: 'tag'; tag: FlowStepTag };

function flowLegendItems<LaneKey extends string>({
  lanes,
  steps,
  edges,
}: {
  lanes: readonly FlowLane<LaneKey>[];
  steps: readonly FlowStep<LaneKey>[];
  edges: readonly FlowEdge[];
}): FlowLegendItem[] {
  const variants = new Set(edges.map((edge) => edge.variant ?? 'primary'));
  const tags = new Map<string, FlowStepTag>();
  for (const step of steps) {
    if (step.tag && !tags.has(step.tag.label)) tags.set(step.tag.label, step.tag);
  }
  const laneKinds = new Set(lanes.map((lane) => lane.kind ?? 'person'));
  return [
    ...EDGE_VARIANTS.filter((variant) => variants.has(variant)).map((kind) => ({ kind })),
    ...(steps.some((step) => step.fullColor) ? [{ kind: 'outcome' as const }] : []),
    ...[...tags.values()].map((tag) => ({ kind: 'tag' as const, tag })),
    ...(laneKinds.size > 1 ? LANE_KINDS.map((kind) => ({ kind })) : []),
  ];
}

function FlowLegendSwatch({ kind, arrowColor, mutedColor }: { kind: FlowLegendKey; arrowColor: string; mutedColor: string }) {
  if (kind === 'person' || kind === 'system') {
    return <span className={`inline-block h-3 w-3 border-2 ${kind === 'system' ? 'rounded-sm' : 'rounded-full'}`} style={{ borderColor: mutedColor }} />;
  }
  if (kind === 'outcome') {
    return <span className="inline-block h-3 w-4 rounded-sm" style={{ backgroundColor: mutedColor }} />;
  }
  return (
    <svg aria-hidden="true" height="10" viewBox="0 0 20 10" width="20">
      <path
        d={kind === 'return' ? 'M 2 1 C 2 10, 18 10, 18 1' : 'M 0 5 L 20 5'}
        fill="none"
        stroke={kind === 'alternate' ? mutedColor : arrowColor}
        strokeDasharray={kind === 'primary' ? undefined : `${FLOW_STATIC_DASH.strokeLen} ${FLOW_STATIC_DASH.nonStrokeLen}`}
        strokeWidth={1.2}
      />
    </svg>
  );
}

export function FlowLegend<LaneKey extends string>({
  lanes,
  steps,
  edges,
  labels,
  arrowColor,
  mutedColor,
  textColor,
}: {
  lanes: readonly FlowLane<LaneKey>[];
  steps: readonly FlowStep<LaneKey>[];
  edges: readonly FlowEdge[];
  labels?: FlowLegendLabels;
  arrowColor: string;
  mutedColor: string;
  textColor: string;
}) {
  const items = flowLegendItems({ lanes, steps, edges });
  if (items.length === 0) return null;
  return (
    <div
      aria-label="Flow legend"
      className="mt-[3mm] flex break-inside-avoid-page flex-wrap items-center gap-x-[4mm] gap-y-[1.5mm] text-[7pt] leading-tight"
      data-flow-legend
      style={{ color: textColor }}
    >
      {items.map((item) => item.kind === 'tag' ? (
        <div key={`tag-${item.tag.label}`} className="flex items-center" data-flow-legend-item="tag">
          <FlowTagPill tag={item.tag} />
        </div>
      ) : (
        <div key={item.kind} className="flex items-center gap-1" data-flow-legend-item={item.kind}>
          <FlowLegendSwatch kind={item.kind} arrowColor={arrowColor} mutedColor={mutedColor} />
          <span data-facet-label={`legend "${item.kind}"`}>{labels?.[item.kind] ?? DEFAULT_FLOW_LEGEND_LABELS[item.kind]}</span>
        </div>
      ))}
    </div>
  );
}
