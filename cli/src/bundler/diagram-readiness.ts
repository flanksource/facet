/** Attributes a <Diagram> root exposes: data-facet-ready and data-facet-error. */
export interface DiagramState {
  ready: string | null;
  error: string | null;
}

export interface DiagramReadiness {
  settled: boolean;
  errors: string[];
  pending: number;
}

export const DIAGRAM_SELECTOR = '[data-facet-diagram]';

/**
 * A diagram is settled once it is ready="true" or carries an error attribute.
 * The page-side wait predicate in live-snapshot.ts mirrors this rule; keep both in sync.
 */
export function diagramReadiness(states: DiagramState[]): DiagramReadiness {
  const errors: string[] = [];
  let pending = 0;
  states.forEach(({ ready, error }, index) => {
    if (error !== null) errors.push(`Diagram ${index + 1}: ${error}`);
    else if (ready !== 'true') pending++;
  });
  return { settled: pending === 0, errors, pending };
}
