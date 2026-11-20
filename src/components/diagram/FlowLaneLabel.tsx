import type { FlowLane } from './flowTypes';

const LANE_PADDING_X_MM = 1.5;
const LANE_BADGE_MM = 7.5;
const LANE_ICON_MM = 5;
const LANE_GAP_MM = 1.5;

export default function LaneLabel<LaneKey extends string>({ lane, backgroundColor, mutedColor, showDivider, showDetail }: {
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
        <span className={`break-words text-[8.5pt] font-bold ${lane.labelClassName ?? ''}`} data-facet-label={`lane "${lane.key}"`} style={lane.labelClassName ? undefined : { color: lane.color }}>{lane.label}</span>
        {showDetail && lane.detail != null && <span className="text-[8pt]" style={{ color: mutedColor }}>{lane.detail}</span>}
      </div>
    </div>
  );
}
