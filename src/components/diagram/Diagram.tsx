import React, { useEffect, useId, useRef, useState } from 'react';
import { Xwrapper, useXarrow } from 'react-xarrows';
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

/** Frames the root rect must hold still before the diagram counts as settled. */
const STABLE_FRAMES = 10;
/** Upper bound on settling; after this many frames the diagram is captured as-is. */
const MAX_FRAMES = 600;

/**
 * Re-draws the arrows every animation frame until the diagram's root rect has
 * been stable for STABLE_FRAMES frames, then reports settled. react-xarrows
 * measures rects only when triggered, so late layout shifts (webfont loads,
 * dev-server CSS injection) would otherwise freeze arrows at stale coordinates.
 * Must render inside <Xwrapper> for useXarrow's update context.
 */
function ArrowSettler({
  rootRef,
  onSettled,
}: {
  rootRef: React.RefObject<HTMLDivElement>;
  onSettled: () => void;
}) {
  const updateArrows = useXarrow();
  const updateRef = useRef(updateArrows);
  updateRef.current = updateArrows;

  useEffect(() => {
    let raf = 0;
    let stable = 0;
    let frames = 0;
    let last = '';
    const tick = () => {
      const el = rootRef.current;
      if (!el) return;
      frames += 1;
      const r = el.getBoundingClientRect();
      const sig = `${r.x},${r.y},${r.width},${r.height}`;
      if (sig === last) {
        stable += 1;
      } else {
        stable = 0;
        last = sig;
      }
      updateRef.current();
      if (stable >= STABLE_FRAMES || frames >= MAX_FRAMES) {
        onSettled();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/**
 * Container for a node-and-arrow diagram.
 *
 * react-xarrows measures DOM rects, so arrows only render in a browser. Under
 * SSR the children are skipped and a placeholder is emitted; the live render
 * path (Vite dev server + Puppeteer) mounts this in a real browser, where the
 * arrows draw. Once the layout has settled and the arrows have been redrawn
 * against it, the root gets `data-facet-ready="true"` so the snapshotter knows
 * the diagram is final before capturing.
 */
export default function Diagram({ children, colors = COLORS, className }: DiagramProps) {
  const prefix = useId();
  const id: IdFn = (name) => `${prefix}-${name}`.replace(/:/g, '');
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  if (!isBrowser) {
    return <div className={className} data-facet-diagram data-facet-ready="false" />;
  }

  return (
    <div
      ref={rootRef}
      className={className}
      data-facet-diagram
      data-facet-ready={ready ? 'true' : 'false'}
      // position:relative makes this container the offset parent for the
      // absolutely-positioned react-xarrows SVGs, so the arrows paginate with
      // the diagram instead of anchoring to the page body in print output.
      style={{ position: 'relative', ['--facet-diagram-primary' as string]: colors.primary }}
    >
      <Xwrapper>
        {children(id)}
        <ArrowSettler rootRef={rootRef} onSettled={() => setReady(true)} />
      </Xwrapper>
    </div>
  );
}
