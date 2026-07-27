import { createContext, useContext, type RefObject } from 'react';

interface DiagramLayout {
  rootRef: RefObject<HTMLDivElement>;
  version: number;
}

const DiagramLayoutContext = createContext<DiagramLayout | null>(null);

export const DiagramLayoutProvider = DiagramLayoutContext.Provider;

export function useDiagramLayout(): DiagramLayout {
  const layout = useContext(DiagramLayoutContext);
  if (!layout) throw new Error('Arrow must be rendered inside Diagram');
  return layout;
}
