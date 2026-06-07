/**
 * Diagram color palette.
 *
 * The restricted 5-color palette shared by all node-and-arrow diagrams. Mirrors
 * the Mission Control diagram contract — do not introduce additional base colors.
 * Entity-model diagrams may alias `fk`/`pk` but must not add new base colors.
 */
export interface DiagramColors {
  /** Borders, arrows, active headers, source node headers. */
  primary: string;
  /** Node fills, light backgrounds, arrow label backgrounds. */
  background: string;
  /** Emphasis text, catalog background, darker active elements. */
  accent: string;
  /** Secondary text, inactive borders, secondary arrows. */
  muted: string;
  /** Output/result node headers and borders (green). */
  outputBorder: string;
  /** Foreign-key relationship alias (entity-model diagrams). */
  fk: string;
  /** Primary-key alias (entity-model diagrams). */
  pk: string;
}

export const COLORS: DiagramColors = {
  primary: '#2d7de4',
  background: '#f7fbfe',
  accent: '#1069dc',
  muted: '#62758a',
  outputBorder: '#10b981',
  fk: '#10b981',
  pk: '#f59e0b',
};
