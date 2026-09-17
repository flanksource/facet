import type { Meta, StoryObj } from '@storybook/react';
import {
  UiDatabase,
  UiQuestion,
  UiRocket,
  UiSealCheck,
  UiUser,
} from '@flanksource/clicky-ui/icons';
import Badge from '../../components/Badge';
import { COLORS, FlowDiagram } from '../../components/diagram';
import type { FlowEdge, FlowLane, FlowStep } from '../../components/diagram';

type LaneKey = 'requester' | 'approver' | 'operator' | 'system';

const lanes = [
  { key: 'requester', label: 'Requester', detail: 'Supplies the evidence', icon: UiUser, color: COLORS.primary },
  { key: 'approver', label: 'Approver', detail: 'Records the decision', icon: UiSealCheck, color: COLORS.pk },
  { key: 'operator', label: 'Operator', detail: 'Applies the approved change', icon: UiRocket, color: COLORS.accent },
  { key: 'system', label: 'System', detail: 'Enforces the new state', icon: UiDatabase, color: COLORS.outputBorder },
] as const satisfies readonly FlowLane<LaneKey>[];

const steps = [
  {
    key: 'submit',
    lane: 'requester',
    column: 1,
    number: 1,
    action: 'Submit request',
    detail: 'Evidence attached',
    narrative: 'The requester submits the change request with its supporting evidence.',
  },
  {
    key: 'review',
    lane: 'approver',
    column: 2,
    number: 2,
    action: 'Review request',
    detail: 'Approve or return',
    narrative: 'The approver confirms that the request is complete and records the decision.',
  },
  {
    key: 'prepare',
    lane: 'operator',
    column: 3,
    number: 3,
    action: 'Prepare change',
    detail: 'Use approved input',
  },
  {
    key: 'apply',
    lane: 'operator',
    column: 4,
    number: 4,
    action: 'Apply change',
    detail: 'Record audit reference',
    narrative: 'The operator applies the approved change and records the audit reference.',
  },
  {
    key: 'enforce',
    lane: 'system',
    column: 5,
    number: 5,
    action: 'Enforce state',
    detail: 'Invalidate old access',
  },
  {
    key: 'confirm',
    lane: 'approver',
    column: 6,
    number: 6,
    action: 'Confirm outcome',
    detail: 'Reconcile and close',
    narrative: 'The approver reconciles the applied state and closes the request.',
    fullColor: true,
  },
] as const satisfies readonly FlowStep<LaneKey>[];

const edges = [
  { from: 'submit', to: 'review' },
  { from: 'review', to: 'prepare' },
  { from: 'prepare', to: 'apply' },
  { from: 'apply', to: 'enforce' },
  { from: 'enforce', to: 'confirm' },
] as const satisfies readonly FlowEdge[];

const meta = {
  title: 'Diagram/FlowDiagram',
  component: FlowDiagram,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    lanes,
    steps,
    edges,
    columns: 6,
    laneWidthMm: 50,
    stepOffsetMm: 30,
    rowHeightMm: 28,
    showAlternatingLaneBackgrounds: false,
    showFrame: true,
    showLaneDivider: true,
    showLaneDetails: true,
    showLaneSeparators: true,
    showLegend: false,
  },
  argTypes: {
    lanes: { control: false },
    steps: { control: false },
    edges: { control: false },
    legendLabels: { control: false },
    legendExtra: { control: false },
    columns: { control: { type: 'number', min: 1 } },
    laneWidthMm: { control: { type: 'range', min: 36, max: 70, step: 1 } },
    stepOffsetMm: { control: { type: 'range', min: 22, max: 40, step: 1 } },
    rowHeightMm: { control: { type: 'range', min: 20, max: 40, step: 1 } },
    maxLabelColumns: { control: { type: 'range', min: 1, max: 3, step: 0.25 } },
    backgroundColor: { control: 'color' },
    laneBackgroundColor: { control: 'color' },
    laneBackgroundOpacity: { control: { type: 'range', min: 0, max: 1, step: 0.02 } },
    laneSeparatorColor: { control: 'color' },
    laneSeparatorOpacity: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    textColor: { control: 'color' },
    mutedColor: { control: 'color' },
    arrowColor: { control: 'color' },
  },
} satisfies Meta<typeof FlowDiagram>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ApprovalFlow: Story = {};

export const DisplayOptions: Story = {
  args: {
    showAlternatingLaneBackgrounds: true,
  },
};

export const MinimalChrome: Story = {
  args: {
    showAlternatingLaneBackgrounds: true,
    showFrame: false,
    showLaneDetails: false,
    showLaneDivider: false,
  },
};

const branchingLanes = lanes.map((lane) => lane.key === 'system' ? { ...lane, kind: 'system' as const } : lane) satisfies readonly FlowLane<LaneKey>[];

const branchingSteps = [
  steps[0],
  { ...steps[1], tag: { label: 'Needs detail' }, narrative: 'The approver checks the evidence. Missing evidence returns the request to the requester; a rejection closes it.' },
  {
    key: 'close',
    lane: 'requester',
    column: 3,
    number: '2A',
    action: 'Close request',
    detail: 'Rejected, no change applied',
    narrative: 'The requester is told the request was rejected and no change is made.',
    labelColumns: 1,
  },
  ...steps.slice(2),
] as const satisfies readonly FlowStep<LaneKey>[];

const branchingEdges = [
  { from: 'submit', to: 'review', label: 'Submitted' },
  { from: 'review', to: 'submit', variant: 'return', label: 'Changes requested' },
  { from: 'review', to: 'close', variant: 'alternate', label: 'Rejected' },
  { from: 'review', to: 'prepare', label: 'Approved' },
  { from: 'prepare', to: 'apply' },
  { from: 'apply', to: 'enforce' },
  { from: 'enforce', to: 'confirm' },
] as const satisfies readonly FlowEdge[];

export const BranchesAndLegend: Story = {
  args: {
    lanes: branchingLanes,
    steps: branchingSteps,
    edges: branchingEdges,
    showLegend: true,
    legendLabels: { alternate: 'Rejection path' },
  },
};

const stretchedSteps = [
  { key: 'submit', lane: 'requester', column: 1, number: 1, action: 'Submit statement', detail: 'First column stays narrow' },
  { key: 'reconcile', lane: 'operator', column: 2, number: 2, action: 'Reconcile supplier statement', detail: 'No same-lane neighbour: spans 2 columns' },
  { key: 'post', lane: 'system', column: 3, number: 3, action: 'Post journal', detail: 'Neighbour next door' },
  { key: 'archive', lane: 'system', column: 4, number: 4, action: 'Archive evidence', detail: 'Kept to 1 column' },
  { key: 'approve', lane: 'approver', column: 5, number: 5, action: 'Approve balance', detail: 'labelColumns: 1 override', labelColumns: 1 },
  { key: 'close', lane: 'requester', column: 6, number: 6, action: 'Close', detail: 'Last column', fullColor: true },
] as const satisfies readonly FlowStep<LaneKey>[];

const stretchedEdges = [
  { from: 'submit', to: 'reconcile' },
  { from: 'reconcile', to: 'post' },
  { from: 'post', to: 'archive' },
  { from: 'archive', to: 'approve' },
  { from: 'approve', to: 'close' },
] as const satisfies readonly FlowEdge[];

export const StretchedLabels: Story = {
  args: {
    steps: stretchedSteps,
    edges: stretchedEdges,
    maxLabelColumns: 2,
  },
};

const overrideSteps = [
  steps[0],
  { ...steps[1], action: 'Review request and evidence', detail: 'labelWidthMm: 44', labelWidthMm: 44 },
  steps[2],
  { ...steps[3], detail: "labelPosition: 'top'", labelPosition: 'top' },
  ...steps.slice(4),
] as const satisfies readonly FlowStep<LaneKey>[];

/**
 * `labelPosition` pins a label to one side of its badge instead of deriving it
 * from the incoming edge, and `labelWidthMm` sets a minimum label width that
 * ignores the column cap. Here every label is capped to one column, except
 * "Review" (`labelWidthMm: 44`) and "Apply" (`labelPosition: 'top'`).
 */
export const LabelOverrides: Story = {
  args: {
    steps: overrideSteps,
    maxLabelColumns: 1,
  },
};

function OpenQuestion({ id, children }: { id: string; children?: string }) {
  return (
    <Badge variant="label" size="xxs" shape="rounded" icon={UiQuestion} color={COLORS.accent} textColor="#ffffff" label={id} value={children} />
  );
}

const annotatedSteps = [
  steps[0],
  {
    ...steps[1],
    annotation: <OpenQuestion id="Q01">Delegate approvals?</OpenQuestion>,
    annotationPlacement: { xMm: 20, yMm: -8, widthMm: 36 },
  },
  ...steps.slice(2),
] as const satisfies readonly FlowStep<LaneKey>[];

const annotatedEdges = [
  ...edges.slice(0, 3),
  { from: 'apply', to: 'enforce', label: 'Applied', labelAbove: <OpenQuestion id="Q02">Rollback owner?</OpenQuestion> },
  edges[4],
] as const satisfies readonly FlowEdge[];

/**
 * Review notes pinned onto the flow. A step `annotation` is placed by
 * `annotationPlacement`, in millimetres from the badge centre; an edge
 * `labelAbove` sits over that edge's label pill. `legendExtra` adds a key for
 * the markers to the same legend bar as the flow notation.
 */
export const Annotations: Story = {
  args: {
    steps: annotatedSteps,
    edges: annotatedEdges,
    showLegend: true,
    legendExtra: (
      <span className="flex items-center gap-1">
        <OpenQuestion id="Q" />
        Open question
      </span>
    ),
  },
};
