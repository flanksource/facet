import React from 'react';

import { COLORS } from './colors';
import Diagram from './Diagram';
import { FlowArrows, flowStepLabelPosition } from './flowEdges';
import { flowStepLabelColumns } from './flowLabelLayout';
import { FlowLegend } from './FlowLegend';
import { FlowTagPill } from './FlowTagPill';
import type { FlowDiagramProps, FlowLane, FlowStep } from './flowTypes';
import { validateFlow } from './flowValidation';

export { flowAnchor, flowEdgeArrowProps, flowEdgeEndAnchor } from './flowEdges';
export type { FlowEdgeArrowInput, FlowEdgeArrowProps, FlowEdgeStyle } from './flowEdges';
export type {
  FlowDiagramProps,
  FlowAnnotationPlacement,
  FlowEdge,
  FlowEdgeVariant,
  FlowIcon,
  FlowLane,
  FlowLaneKind,
  FlowLegendKey,
  FlowLegendLabels,
  FlowOffset,
  FlowStep,
  FlowStepTag,
} from './flowTypes';

const DEFAULT_LANE_WIDTH_MM = 50;
const DEFAULT_STEP_OFFSET_MM = 28;
const BADGE_SLOT_MM = 7;
const STEP_PADDING_MM = 1;
const BADGE_BASELINE = `calc(50% - ${BADGE_SLOT_MM / 2 + STEP_PADDING_MM}mm)`;
const DEFAULT_MAX_LABEL_COLUMNS = 2;
const LABEL_GUTTER_MM = 2;
const LANE_PADDING_X_MM = 1.5;
const LANE_BADGE_MM = 7.5;
const LANE_ICON_MM = 5;
const LANE_GAP_MM = 1.5;

export interface FlowStepBadgeProps {
  id?: string;
  value: number | string;
  color: string;
  backgroundColor?: string;
  inverted?: boolean;
  compact?: boolean;
}

export function FlowStepBadge({
  id,
  value,
  color,
  backgroundColor = COLORS.background,
  inverted = false,
  compact = false,
}: FlowStepBadgeProps) {
  return (
    <span
      id={id}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${compact ? 'h-[4.5mm] min-w-[4.5mm] px-0.5 text-[6.5pt]' : 'h-6 min-w-6 px-1 text-[8.5pt]'}`}
      style={{ backgroundColor: inverted ? backgroundColor : color, color: inverted ? color : backgroundColor }}
    >
      {value}
    </span>
  );
}

function LaneLabel<LaneKey extends string>({
  lane,
  backgroundColor,
  mutedColor,
  showDivider,
  showDetail,
}: {
  lane: FlowLane<LaneKey>;
  backgroundColor?: string;
  mutedColor: string;
  showDivider: boolean;
  showDetail: boolean;
}) {
  const Icon = lane.icon;
  const kind = lane.kind ?? 'person';
  return (
    <div
      className={`z-10 flex h-full items-center${showDivider ? ' border-r' : ''}`}
      data-flow-lane={lane.key}
      data-flow-lane-divider={showDivider}
      style={{ borderColor: showDivider ? lane.color : undefined, backgroundColor, gap: `${LANE_GAP_MM}mm`, padding: `0 ${LANE_PADDING_X_MM}mm` }}
    >
      <div className={`flex shrink-0 items-center justify-center border-2 ${kind === 'system' ? 'rounded-md' : 'rounded-full'} ${lane.badgeClassName ?? ''}`} data-flow-lane-badge={kind} style={{ width: `${LANE_BADGE_MM}mm`, height: `${LANE_BADGE_MM}mm` }}>
        {Icon && <Icon className={lane.iconClassName} style={{ width: `${LANE_ICON_MM}mm`, height: `${LANE_ICON_MM}mm`, ...(lane.iconClassName ? {} : { color: lane.color }) }} />}
      </div>
      <div className="flex min-w-0 flex-col leading-[1.1]">
        <span className={`text-[8.5pt] font-bold ${lane.labelClassName ?? ''}`} data-facet-label={`lane "${lane.key}"`} style={lane.labelClassName ? undefined : { color: lane.color }}>{lane.label}</span>
        {showDetail && lane.detail != null && <span className="text-[8pt]" style={{ color: mutedColor }}>{lane.detail}</span>}
      </div>
    </div>
  );
}

function StepNode<LaneKey extends string>({
  id,
  step,
  lane,
  widthMm,
  labelPosition,
  backgroundColor,
  textColor,
  mutedColor,
}: {
  id: string;
  step: FlowStep<LaneKey>;
  lane: FlowLane<LaneKey>;
  widthMm: number;
  labelPosition: 'top' | 'bottom';
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
}) {
  const label = (
    <div className="flex w-full flex-col items-center gap-0.5" data-flow-step-label={labelPosition}>
      <span className="w-full whitespace-normal break-normal text-[8pt] font-bold leading-tight" data-facet-label={`step "${step.key}" action`} style={{ color: step.fullColor ? backgroundColor : textColor }}>{step.action}</span>
      {step.detail != null && <span className="w-full whitespace-normal break-normal text-[7.5pt] leading-tight" data-facet-label={`step "${step.key}" detail`} style={{ color: step.fullColor ? backgroundColor : mutedColor }}>{step.detail}</span>}
      {step.tag && <FlowTagPill tag={step.tag} />}
    </div>
  );
  return (
    <div
      className={`absolute z-20 box-border flex flex-col items-center gap-0.5 text-center${step.fullColor ? ' rounded-lg' : ''}`}
      data-flow-step={step.key}
      style={{
        width: `${widthMm}mm`,
        left: `calc(50% - ${widthMm / 2}mm)`,
        padding: step.fullColor ? `${STEP_PADDING_MM}mm` : `${STEP_PADDING_MM}mm 0`,
        ...(labelPosition === 'top' ? { bottom: BADGE_BASELINE } : { top: BADGE_BASELINE }),
        backgroundColor: step.fullColor ? lane.color : undefined,
      }}
    >
      {labelPosition === 'top' && label}
      <div className="flex w-full shrink-0 items-center justify-center" data-flow-step-badge-slot style={{ height: `${BADGE_SLOT_MM}mm` }}>
        <FlowStepBadge id={id} value={step.number} color={lane.color} backgroundColor={backgroundColor} inverted={step.fullColor} />
      </div>
      {labelPosition === 'bottom' && label}
    </div>
  );
}

function FlowStepList<LaneKey extends string>({
  lanes,
  steps,
  backgroundColor,
  mutedColor,
}: {
  lanes: readonly FlowLane<LaneKey>[];
  steps: readonly FlowStep<LaneKey>[];
  backgroundColor: string;
  mutedColor: string;
}) {
  const laneByKey = new Map(lanes.map((lane) => [lane.key, lane]));
  const narrativeSteps = steps.filter((step) => step.narrative != null);
  if (narrativeSteps.length === 0) return null;

  return (
    <section aria-label="Flow narrative" className="mb-[5mm] mt-[4mm]" data-flow-step-list>
      <div className="flex flex-col gap-[2mm]">
        {narrativeSteps.map((step, index) => {
          const lane = laneByKey.get(step.lane)!;
          const showLane = index === 0 || narrativeSteps[index - 1].lane !== step.lane;
          return (
            <article key={step.key} className="flex break-inside-avoid-page items-start gap-2" data-flow-step-narrative={step.key}>
              <FlowStepBadge value={step.number} color={lane.color} backgroundColor={backgroundColor} compact />
              <div className="min-w-0 flex-1">
                {showLane && <div className={`mb-0.5 text-[7.5pt] font-bold leading-tight ${lane.labelClassName ?? ''}`} data-flow-step-actor={lane.key} style={lane.labelClassName ? undefined : { color: lane.color }}>{lane.label}</div>}
                <div className="text-[8pt] leading-[1.3]" data-flow-step-narrative-text style={{ color: mutedColor }}>
                  {step.tag && <><FlowTagPill tag={step.tag} />{' '}</>}
                  {step.narrative}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FlowLaneRows<LaneKey extends string>({
  lanes,
  backgroundColor,
  laneBackgroundColor,
  laneBackgroundOpacity,
  laneSeparatorColor,
  laneSeparatorOpacity,
  mutedColor,
  showAlternatingLaneBackgrounds,
  showLaneDivider,
  showLaneDetails,
  showLaneSeparators,
}: Required<Pick<FlowDiagramProps<LaneKey>, 'lanes' | 'backgroundColor' | 'laneBackgroundColor' | 'laneBackgroundOpacity' | 'laneSeparatorColor' | 'laneSeparatorOpacity' | 'mutedColor' | 'showAlternatingLaneBackgrounds' | 'showLaneDivider' | 'showLaneDetails' | 'showLaneSeparators'>>) {
  return lanes.map((lane, index) => (
    <React.Fragment key={lane.key}>
      {showAlternatingLaneBackgrounds && (
        <div
          className="z-0"
          data-flow-lane-background={lane.key}
          style={{
            gridColumn: '1 / -1',
            gridRow: index + 1,
            backgroundColor: index % 2 === 0 ? laneBackgroundColor : 'transparent',
            opacity: index % 2 === 0 ? laneBackgroundOpacity : undefined,
          }}
        />
      )}
      {showLaneSeparators && index < lanes.length - 1 && <div data-flow-lane-separator className="border-b" style={{ gridColumn: '1 / -1', gridRow: index + 1, borderColor: laneSeparatorColor, opacity: laneSeparatorOpacity }} />}
      <div className="z-10" style={{ gridColumn: 1, gridRow: index + 1 }}>
        <LaneLabel lane={lane} backgroundColor={showAlternatingLaneBackgrounds ? undefined : backgroundColor} mutedColor={mutedColor} showDivider={showLaneDivider} showDetail={showLaneDetails} />
      </div>
    </React.Fragment>
  ));
}

function FlowStepCells<LaneKey extends string>({
  id,
  lanes,
  steps,
  edges,
  columns,
  stepOffsetMm,
  maxLabelColumns,
  ...colors
}: Required<Pick<FlowDiagramProps<LaneKey>, 'lanes' | 'steps' | 'edges' | 'columns' | 'stepOffsetMm' | 'maxLabelColumns' | 'backgroundColor' | 'textColor' | 'mutedColor'>> & { id: (name: string) => string }) {
  const laneIndex = new Map(lanes.map((lane, index) => [lane.key as string, index]));
  const stepByKey = new Map(steps.map((step) => [step.key, step]));
  const labelPositions = new Map(steps.map((step) => [step.key, step.labelPosition ?? flowStepLabelPosition({ step, edges, stepByKey, laneIndex })]));
  return steps.map((step) => {
    const stepLaneIndex = laneIndex.get(step.lane)!;
    const labelColumns = flowStepLabelColumns({ step, steps, labelPositions, columns, maxLabelColumns });
    return (
      <div
        key={step.key}
        className="relative z-20"
        style={{
          gridColumn: step.column + 1,
          gridRow: stepLaneIndex + 1,
          transform: step.placementOffset
            ? `translate(${step.placementOffset.x ?? 0}px, ${step.placementOffset.y ?? 0}px)`
            : undefined,
        }}
      >
        <StepNode id={id(step.key)} step={step} lane={lanes[stepLaneIndex]} widthMm={Math.max(step.labelWidthMm ?? 0, labelColumns * stepOffsetMm - LABEL_GUTTER_MM)} labelPosition={labelPositions.get(step.key)!} {...colors} />
        {step.annotation != null && step.annotationPlacement && (
          <div
            className="absolute z-30"
            data-facet-label={`step "${step.key}" annotation`}
            data-flow-step-annotation={step.key}
            style={{
              width: `${step.annotationPlacement.widthMm}mm`,
              left: `calc(50% + ${step.annotationPlacement.xMm ?? 0}mm)`,
              top: `calc(50% + ${step.annotationPlacement.yMm}mm)`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {step.annotation}
          </div>
        )}
      </div>
    );
  });
}

export default function FlowDiagram<LaneKey extends string = string>({
  lanes,
  steps,
  edges = [],
  columns,
  laneWidthMm = DEFAULT_LANE_WIDTH_MM,
  stepOffsetMm = DEFAULT_STEP_OFFSET_MM,
  rowHeightMm = lanes.length >= 6 ? 24 : lanes.length === 5 ? 26 : 28,
  maxLabelColumns = DEFAULT_MAX_LABEL_COLUMNS,
  backgroundColor = COLORS.background,
  laneBackgroundColor = COLORS.primary,
  laneBackgroundOpacity = 0.08,
  laneSeparatorColor = COLORS.muted,
  laneSeparatorOpacity = 0.35,
  textColor = '#0f172a',
  mutedColor = COLORS.muted,
  arrowColor = COLORS.primary,
  showAlternatingLaneBackgrounds = false,
  showFrame = true,
  showLaneDivider = true,
  showLaneDetails = true,
  showLaneSeparators = true,
  showLegend = false,
  legendLabels,
  legendExtra,
  className = 'relative py-2',
}: FlowDiagramProps<LaneKey>) {
  validateFlow({ lanes, steps, edges, columns, maxLabelColumns });
  const laneOptions = { backgroundColor, laneBackgroundColor, laneBackgroundOpacity, laneSeparatorColor, laneSeparatorOpacity, mutedColor, showAlternatingLaneBackgrounds, showLaneDivider, showLaneDetails, showLaneSeparators };
  return (
    <Diagram className={className}>
      {(id) => (
        <div className="mx-auto box-border max-w-none" style={{ width: `${laneWidthMm + columns * stepOffsetMm}mm` }}>
          <div
            className={`relative break-inside-avoid-page ${showFrame ? 'overflow-hidden rounded-xl border' : 'overflow-visible'}`}
            data-flow-frame={showFrame}
            style={{ borderColor: showFrame ? arrowColor : undefined }}
          >
            <div className="relative grid" style={{ gridTemplateColumns: `${laneWidthMm}mm repeat(${columns}, ${stepOffsetMm}mm)`, gridTemplateRows: `repeat(${lanes.length}, ${rowHeightMm}mm)` }}>
              <FlowLaneRows lanes={lanes} {...laneOptions} />
              <FlowStepCells id={id} lanes={lanes} steps={steps} edges={edges} columns={columns} stepOffsetMm={stepOffsetMm} maxLabelColumns={maxLabelColumns} backgroundColor={backgroundColor} textColor={textColor} mutedColor={mutedColor} />
            </div>
          </div>
          <FlowArrows id={id} lanes={lanes} steps={steps} edges={edges} stepOffsetMm={stepOffsetMm} rowHeightMm={rowHeightMm} arrowColor={arrowColor} mutedColor={mutedColor} textColor={textColor} />
          {showLegend && <FlowLegend lanes={lanes} steps={steps} edges={edges} labels={legendLabels} extra={legendExtra} arrowColor={arrowColor} mutedColor={mutedColor} textColor={textColor} />}
          <FlowStepList lanes={lanes} steps={steps} backgroundColor={backgroundColor} mutedColor={mutedColor} />
        </div>
      )}
    </Diagram>
  );
}
