import React, { useEffect, useId, useRef, useState } from 'react';
import { COLORS, type DiagramColors } from './colors';

/** Scoped id factory: `id('source')` → a page-unique id for an arrow endpoint. */
export type IdFn = (name: string) => string;

export interface DiagramProps {
  /**
   * Render-prop receiving a scoped id factory. Lay out BoxNodes with the ids,
   * then render Arrows connecting those ids. Children render once the component
   * is mounted in a browser (react-xarrows needs a live DOM to measure).
   */
  children: (id: IdFn) => React.ReactNode;
  /** Override the 5-color palette. Defaults to COLORS. */
  colors?: DiagramColors;
  /** Optional wrapper className for the diagram container. */
  className?: string;
}

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Container for a node-and-arrow diagram.
 *
 * react-xarrows measures DOM rects, so arrows only render in a browser. Under
 * SSR the children are skipped and a placeholder is emitted; the live render
 * path (Vite dev server + Puppeteer) mounts this in a real browser, where the
 * arrows draw. Once they have, the root gets `data-facet-ready="true"` so the
 * snapshotter knows the diagram has settled before capturing.
 */
export default function Diagram({ children, colors = COLORS, className }: DiagramProps) {
  const prefix = useId();
  const id: IdFn = (name) => `${prefix}-${name}`.replace(/:/g, '');
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Arrows are drawn by react-xarrows in a post-mount effect. Wait two animation
  // frames after our own mount so those arrow SVGs exist in the DOM before we
  // signal readiness to the snapshotter.
  useEffect(() => {
    if (!isBrowser) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  if (!isBrowser) {
    return <div className={className} data-facet-diagram data-facet-ready="false" />;
  }

  return (
    <div
      ref={rootRef}
      className={className}
      data-facet-diagram
      data-facet-ready={ready ? 'true' : 'false'}
      style={{ ['--facet-diagram-primary' as string]: colors.primary }}
    >
      {children(id)}
    </div>
  );
}
