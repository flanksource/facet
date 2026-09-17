import type React from 'react';

export type FlowIcon = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

export type FlowLaneKind = 'person' | 'system';

export interface FlowLane<LaneKey extends string = string> {
  key: LaneKey;
  label: React.ReactNode;
  detail?: React.ReactNode;
  icon?: FlowIcon;
  color: string;
  kind?: FlowLaneKind;
  badgeClassName?: string;
  iconClassName?: string;
  labelClassName?: string;
}

export interface FlowStepTag {
  label: string;
  color?: string;
}

export interface FlowOffset {
  x?: number;
  y?: number;
}

export interface FlowAnnotationPlacement {
  xMm?: number;
  yMm: number;
  widthMm: number;
}

export interface FlowStep<LaneKey extends string = string> {
  key: string;
  lane: LaneKey;
  column: number;
  number: number | string;
  action: React.ReactNode;
  detail?: React.ReactNode;
  narrative?: React.ReactNode;
  tag?: FlowStepTag;
  fullColor?: boolean;
  placementOffset?: FlowOffset;
  labelColumns?: number;
  labelPosition?: 'top' | 'bottom';
  labelWidthMm?: number;
  annotation?: React.ReactNode;
  annotationPlacement?: FlowAnnotationPlacement;
}

export type FlowEdgeVariant = 'primary' | 'alternate' | 'return';

export interface FlowEdge {
  from: string;
  to: string;
  label?: React.ReactNode;
  labelAbove?: React.ReactNode;
  variant?: FlowEdgeVariant;
  startOffset?: FlowOffset;
  endOffset?: FlowOffset;
  gridBreak?: string;
}

export type FlowLegendKey = FlowEdgeVariant | 'outcome' | FlowLaneKind;

export type FlowLegendLabels = Partial<Record<FlowLegendKey, React.ReactNode>>;

export interface FlowDiagramProps<LaneKey extends string = string> {
  lanes: readonly FlowLane<LaneKey>[];
  steps: readonly FlowStep<LaneKey>[];
  edges?: readonly FlowEdge[];
  columns: number;
  laneWidthMm?: number;
  stepOffsetMm?: number;
  rowHeightMm?: number;
  maxLabelColumns?: number;
  backgroundColor?: string;
  laneBackgroundColor?: string;
  laneBackgroundOpacity?: number;
  laneSeparatorColor?: string;
  laneSeparatorOpacity?: number;
  textColor?: string;
  mutedColor?: string;
  arrowColor?: string;
  showAlternatingLaneBackgrounds?: boolean;
  showFrame?: boolean;
  showLaneDivider?: boolean;
  showLaneDetails?: boolean;
  showLaneSeparators?: boolean;
  showLegend?: boolean;
  legendLabels?: FlowLegendLabels;
  legendExtra?: React.ReactNode;
  className?: string;
}
