import React from 'react';

import Arrow, { type ArrowProps } from './Arrow';
import type { IdFn } from './Diagram';
import type { FlowEdge, FlowLane, FlowOffset, FlowStep } from './flowTypes';

type FlowAnchorPosition = 'left' | 'right' | 'top' | 'bottom';

export const FLOW_STATIC_DASH = { strokeLen: 4, nonStrokeLen: 3 } as const;

export function flowAnchor(position: FlowAnchorPosition, offset?: FlowOffset): ArrowProps['startAnchor'] {
  if (offset?.x === undefined && offset?.y === undefined) return position;
  return { position, offset };
}

export function flowEdgeEndAnchor(sourceLaneIndex: number, targetLaneIndex: number): 'left' | 'top' | 'bottom' {
  if (targetLaneIndex === sourceLaneIndex) return 'left';
  return targetLaneIndex < sourceLaneIndex ? 'bottom' : 'top';
}

function FlowEdgeLabel({ children, edge, color, textColor }: { children: React.ReactNode; edge: FlowEdge; color: string; textColor: string }) {
  const label = (
    <span
      className="block whitespace-nowrap rounded-full border px-1.5 text-[6.5pt] font-semibold leading-[1.5]"
      data-facet-label={`edge "${edge.from}" -> "${edge.to}" label`}
      data-flow-edge-label
      style={{ backgroundColor: '#ffffff', borderColor: color, color: textColor }}
    >
      {children}
    </span>
  );
  if (edge.labelAbove == null) return label;
  return (
    <span className="relative inline-block">
      <span className="absolute bottom-[calc(100%+1mm)] left-1/2 -translate-x-1/2 whitespace-nowrap" data-facet-label={`edge "${edge.from}" -> "${edge.to}" annotation`} data-flow-edge-label-above>
        {edge.labelAbove}
      </span>
      {label}
    </span>
  );
}

export interface FlowEdgeArrowProps {
  path: 'grid' | 'smooth';
  gridBreak?: string;
  curveness?: number;
  startAnchor: ArrowProps['startAnchor'];
  endAnchor: ArrowProps['endAnchor'];
  color: string;
  dashness: false | typeof FLOW_STATIC_DASH;
  strokeWidth: number;
  headSize: number;
  labels?: { middle: React.ReactElement };
}

export interface FlowEdgeStyle {
  stepOffsetMm: number;
  rowHeightMm: number;
  arrowColor: string;
  mutedColor: string;
  textColor: string;
}

export interface FlowEdgeArrowInput extends FlowEdgeStyle {
  edge: FlowEdge;
  source: FlowStep;
  target: FlowStep;
  laneIndex: ReadonlyMap<string, number>;
}

export function flowEdgeArrowProps(input: FlowEdgeArrowInput): FlowEdgeArrowProps {
  const { edge, source, target, laneIndex, stepOffsetMm, rowHeightMm, arrowColor, mutedColor, textColor } = input;
  const variant = edge.variant ?? 'primary';
  const color = variant === 'alternate' ? mutedColor : arrowColor;
  const sourceLaneIndex = laneIndex.get(source.lane)!;
  const targetLaneIndex = laneIndex.get(target.lane)!;
  const shared = {
    color,
    strokeWidth: 1,
    headSize: 3,
    ...(edge.label == null ? {} : { labels: { middle: <FlowEdgeLabel edge={edge} color={color} textColor={textColor}>{edge.label}</FlowEdgeLabel> } }),
  };
  if (variant === 'return' && sourceLaneIndex !== targetLaneIndex) {
    return {
      path: 'grid',
      // Leave the source's left edge and turn once, at the target column, into the target edge that faces the source lane.
      gridBreak: '100%',
      startAnchor: flowAnchor('left', edge.startOffset),
      endAnchor: flowAnchor(flowEdgeEndAnchor(sourceLaneIndex, targetLaneIndex), edge.endOffset),
      dashness: FLOW_STATIC_DASH,
      ...shared,
    };
  }
  if (variant === 'return') {
    const distanceMm = Math.hypot((source.column - target.column) * stepOffsetMm, (sourceLaneIndex - targetLaneIndex) * rowHeightMm);
    return {
      path: 'smooth',
      // A bottom-to-bottom cubic dips 0.375 x curveness x distance below the badges; keep that dip at 0.3 of a lane row.
      curveness: (rowHeightMm * 4) / (distanceMm * 5),
      startAnchor: flowAnchor('bottom', edge.startOffset),
      endAnchor: flowAnchor('bottom', edge.endOffset),
      dashness: FLOW_STATIC_DASH,
      ...shared,
    };
  }
  if (variant === 'alternate') {
    return {
      path: 'grid',
      gridBreak: edge.gridBreak ?? '50%',
      startAnchor: flowAnchor('right', edge.startOffset),
      endAnchor: flowAnchor('left', edge.endOffset),
      dashness: FLOW_STATIC_DASH,
      ...shared,
    };
  }
  return {
    path: 'grid',
    gridBreak: edge.gridBreak ?? '100%',
    startAnchor: flowAnchor('right', edge.startOffset),
    endAnchor: flowAnchor(flowEdgeEndAnchor(sourceLaneIndex, targetLaneIndex), edge.endOffset),
    dashness: false,
    ...shared,
  };
}

export function flowStepLabelPosition<LaneKey extends string>({
  step,
  edges,
  stepByKey,
  laneIndex,
}: {
  step: FlowStep<LaneKey>;
  edges: readonly FlowEdge[];
  stepByKey: ReadonlyMap<string, FlowStep<LaneKey>>;
  laneIndex: ReadonlyMap<string, number>;
}): 'top' | 'bottom' {
  const stepLaneIndex = laneIndex.get(step.lane)!;
  const incoming = edges.find((edge) => edge.to === step.key && (edge.variant ?? 'primary') === 'primary');
  const sourceLaneIndex = incoming ? laneIndex.get(stepByKey.get(incoming.from)!.lane)! : stepLaneIndex;
  if (sourceLaneIndex > stepLaneIndex) return 'top';
  const returnEdges = edges.filter((edge) => edge.variant === 'return' && (edge.from === step.key || edge.to === step.key));
  const returnLaneIndex = (edge: FlowEdge, end: 'from' | 'to') => laneIndex.get(stepByKey.get(edge[end])!.lane)!;
  if (returnEdges.some((edge) => edge.to === step.key && returnLaneIndex(edge, 'from') > stepLaneIndex)) return 'top';
  const onSameLaneReturnLoop = returnEdges.some((edge) => returnLaneIndex(edge, 'from') === returnLaneIndex(edge, 'to'));
  return onSameLaneReturnLoop && sourceLaneIndex === stepLaneIndex ? 'top' : 'bottom';
}

export function FlowArrows<LaneKey extends string>({
  id,
  lanes,
  steps,
  edges,
  ...options
}: FlowEdgeStyle & {
  id: IdFn;
  lanes: readonly FlowLane<LaneKey>[];
  steps: readonly FlowStep<LaneKey>[];
  edges: readonly FlowEdge[];
}) {
  const stepByKey = new Map(steps.map((step) => [step.key, step]));
  const laneIndex = new Map(lanes.map((lane, index) => [lane.key as string, index]));
  return edges.map((edge) => (
    <Arrow
      key={`${edge.from}-${edge.to}-${edge.variant ?? 'primary'}`}
      variant="primary"
      from={id(edge.from)}
      to={id(edge.to)}
      {...flowEdgeArrowProps({ edge, source: stepByKey.get(edge.from)!, target: stepByKey.get(edge.to)!, laneIndex, ...options })}
    />
  ));
}
