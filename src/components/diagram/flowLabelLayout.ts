import type { FlowStep } from './flowTypes';

export function flowStepLabelColumns<LaneKey extends string>({
  step,
  steps,
  labelPositions,
  columns,
  maxLabelColumns,
}: {
  step: FlowStep<LaneKey>;
  steps: readonly FlowStep<LaneKey>[];
  labelPositions: ReadonlyMap<string, 'top' | 'bottom'>;
  columns: number;
  maxLabelColumns: number;
}): number {
  const positionOf = (key: string) => {
    const position = labelPositions.get(key);
    if (!position) throw new Error(`FlowDiagram: no label position for step "${key}"`);
    return position;
  };
  const conflicts = steps.filter((other) => other.key !== step.key
    && other.lane === step.lane
    && (positionOf(other.key) === positionOf(step.key) || other.fullColor || step.fullColor));
  return Math.min(
    step.labelColumns ?? maxLabelColumns,
    2 * step.column - 1,
    2 * (columns - step.column) + 1,
    ...conflicts.map((other) => Math.abs(step.column - other.column)),
  );
}
