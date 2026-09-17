import type { FlowDiagramProps, FlowEdge, FlowOffset, FlowStep } from './flowTypes';

function validateOffset(label: string, offset?: FlowOffset) {
  for (const value of [offset?.x, offset?.y]) {
    if (value !== undefined && !Number.isFinite(value)) {
      throw new Error(`FlowDiagram: ${label} must contain finite numbers`);
    }
  }
}

function validateLabelColumns(label: string, value: number) {
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`FlowDiagram: ${label} must be a finite number ≥ 1, received ${value}`);
  }
}

function validateSteps<LaneKey extends string>(steps: readonly FlowStep<LaneKey>[], laneKeys: Set<string>, columns: number) {
  const stepByKey = new Map<string, FlowStep<LaneKey>>();
  const stepByCell = new Map<string, FlowStep<LaneKey>>();
  const tagColors = new Map<string, string | undefined>();
  for (const step of steps) {
    if (!laneKeys.has(step.lane)) throw new Error(`FlowDiagram: step "${step.key}" uses unknown lane "${step.lane}"`);
    if (stepByKey.has(step.key)) throw new Error(`FlowDiagram: duplicate step "${step.key}"`);
    if (!Number.isInteger(step.column) || step.column < 1 || step.column > columns) {
      throw new Error(`FlowDiagram: step "${step.key}" uses column ${step.column}, outside 1-${columns}`);
    }
    const cell = JSON.stringify([step.lane, step.column]);
    const occupant = stepByCell.get(cell);
    if (occupant) {
      throw new Error(`FlowDiagram: steps "${occupant.key}" and "${step.key}" share lane "${step.lane}" column ${step.column}`);
    }
    stepByCell.set(cell, step);
    if (step.labelColumns !== undefined) validateLabelColumns(`step "${step.key}" labelColumns`, step.labelColumns);
    if (step.labelWidthMm !== undefined && (!Number.isFinite(step.labelWidthMm) || step.labelWidthMm <= 0)) {
      throw new Error(`FlowDiagram: step "${step.key}" labelWidthMm must be a positive finite number, received ${step.labelWidthMm}`);
    }
    if (step.labelPosition !== undefined && step.labelPosition !== 'top' && step.labelPosition !== 'bottom') {
      throw new Error(`FlowDiagram: step "${step.key}" labelPosition must be top or bottom, received ${step.labelPosition}`);
    }
    if ((step.annotation != null) !== (step.annotationPlacement != null)) {
      throw new Error(`FlowDiagram: step "${step.key}" annotation and annotationPlacement must be supplied together`);
    }
    if (step.annotationPlacement) {
      const { xMm, yMm, widthMm } = step.annotationPlacement;
      if ((xMm !== undefined && !Number.isFinite(xMm)) || !Number.isFinite(yMm) || !Number.isFinite(widthMm) || widthMm <= 0) {
        throw new Error(`FlowDiagram: step "${step.key}" annotationPlacement must contain finite offsets and a positive width`);
      }
    }
    validateOffset(`step "${step.key}" placement offset`, step.placementOffset);
    if (step.tag) {
      if (tagColors.has(step.tag.label) && tagColors.get(step.tag.label) !== step.tag.color) {
        throw new Error(`FlowDiagram: tag "${step.tag.label}" on step "${step.key}" uses colour ${step.tag.color ?? 'default'}, but an earlier step uses ${tagColors.get(step.tag.label) ?? 'default'}`);
      }
      tagColors.set(step.tag.label, step.tag.color);
    }
    stepByKey.set(step.key, step);
  }
  return stepByKey;
}

function validateEdge<LaneKey extends string>(edge: FlowEdge, stepByKey: Map<string, FlowStep<LaneKey>>) {
  const name = `edge ${edge.from} -> ${edge.to}`;
  const source = stepByKey.get(edge.from);
  const target = stepByKey.get(edge.to);
  if (!source || !target) throw new Error(`FlowDiagram: unknown ${name}`);
  validateOffset(`${name} start offset`, edge.startOffset);
  validateOffset(`${name} end offset`, edge.endOffset);
  if (edge.variant === 'return') {
    if (target.column >= source.column) {
      throw new Error(`FlowDiagram: return ${name} must target an earlier column (source column ${source.column}, target column ${target.column})`);
    }
    if (edge.gridBreak !== undefined) {
      throw new Error(`FlowDiagram: return ${name} routes itself and cannot use a grid break`);
    }
  }
  if (edge.gridBreak !== undefined && !/^-?\d+(?:\.\d+)?%$/.test(edge.gridBreak.trim())) {
    throw new Error(`FlowDiagram: ${name} grid break must be a percentage`);
  }
}

export function validateFlow<LaneKey extends string>({
  lanes,
  steps,
  edges,
  columns,
  maxLabelColumns,
}: Pick<FlowDiagramProps<LaneKey>, 'lanes' | 'steps' | 'edges' | 'columns'> & { maxLabelColumns: number }) {
  if (!Number.isInteger(columns) || columns < 1) {
    throw new Error(`FlowDiagram: columns must be a positive integer, received ${columns}`);
  }
  validateLabelColumns('maxLabelColumns', maxLabelColumns);
  const laneKeys = new Set<string>();
  for (const lane of lanes) {
    if (laneKeys.has(lane.key)) throw new Error(`FlowDiagram: duplicate lane "${lane.key}"`);
    laneKeys.add(lane.key);
  }
  const stepByKey = validateSteps(steps, laneKeys, columns);
  for (const edge of edges ?? []) validateEdge(edge, stepByKey);
}
