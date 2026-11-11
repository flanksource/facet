/** Attributes exposed by a <Diagram> root. */
export interface DiagramState {
  ready: string | null;
  error: string | null;
  warning: string | null;
}

export interface DiagramReadiness {
  settled: boolean;
  errors: string[];
  warnings: string[];
  pending: number;
}

export const DIAGRAM_SELECTOR = '[data-facet-diagram]';

/**
 * A diagram is settled once it is ready="true" or carries an error attribute.
 * The page-side wait predicate in live-snapshot.ts mirrors this rule; keep both in sync.
 */
export function diagramReadiness(states: DiagramState[]): DiagramReadiness {
  const errors: string[] = [];
  const warnings: string[] = [];
  let pending = 0;
  states.forEach(({ ready, error, warning }, index) => {
    if (warning !== null) warnings.push(`Diagram ${index + 1}: ${warning}`);
    if (error !== null) errors.push(`Diagram ${index + 1}: ${error}`);
    else if (ready !== 'true') pending++;
  });
  return { settled: pending === 0, errors, warnings, pending };
}
