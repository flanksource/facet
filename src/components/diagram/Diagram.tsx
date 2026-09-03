import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { COLORS, type DiagramColors } from './colors';
import { DiagramLayoutProvider } from './context';

export type IdFn = (name: string) => string;

export interface DiagramProps {
  children: (id: IdFn) => React.ReactNode;
  colors?: DiagramColors;
  className?: string;
}

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const STABLE_FRAMES = 10;
const MAX_FRAMES = 600;

function rectSignature(rect: DOMRect): string {
  return `${rect.x},${rect.y},${rect.width},${rect.height}`;
}

function layoutSignature(root: HTMLDivElement): string {
  const signatures = [rectSignature(root.getBoundingClientRect())];
  const endpointIds = new Set<string>();
  for (const arrow of root.querySelectorAll<HTMLElement>('[data-facet-arrow]')) {
    if (arrow.dataset.facetFrom) endpointIds.add(arrow.dataset.facetFrom);
    if (arrow.dataset.facetTo) endpointIds.add(arrow.dataset.facetTo);
  }
  for (const id of endpointIds) {
    const endpoint = root.ownerDocument.getElementById(id);
    signatures.push(endpoint ? `${id}:${rectSignature(endpoint.getBoundingClientRect())}` : `${id}:missing`);
  }
  return signatures.join('|');
}

function arrowsReady(root: HTMLDivElement): boolean {
  return [...root.querySelectorAll<HTMLElement>('[data-facet-arrow]')]
    .every((arrow) => arrow.dataset.facetArrowReady === 'true');
}

function LayoutSettler({
  rootRef,
  onFrame,
  onSettled,
}: {
  rootRef: React.RefObject<HTMLDivElement>;
  onFrame: () => void;
  onSettled: () => void;
}) {
  const onFrameRef = useRef(onFrame);
  const onSettledRef = useRef(onSettled);
  onFrameRef.current = onFrame;
  onSettledRef.current = onSettled;

  useEffect(() => {
    let raf = 0;
    let stable = 0;
    let frames = 0;
    let last = '';
    let widthFrozen = false;
    const tick = () => {
      const root = rootRef.current;
      if (!root) return;
      frames += 1;
      const signature = layoutSignature(root);
      if (signature === last) {
        stable += 1;
      } else {
        stable = 0;
        last = signature;
      }
      onFrameRef.current();
      if (stable >= STABLE_FRAMES && !widthFrozen) {
        root.style.width = `${root.getBoundingClientRect().width}px`;
        root.style.marginLeft = 'auto';
        root.style.marginRight = 'auto';
        widthFrozen = true;
        stable = 0;
        last = '';
      } else if (stable >= STABLE_FRAMES && arrowsReady(root)) {
        onSettledRef.current();
        return;
      }
      if (frames >= MAX_FRAMES) {
        root.dataset.facetError = 'Diagram arrows did not resolve to finite geometry';
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rootRef]);

  return null;
}

export default function Diagram({ children, colors = COLORS, className }: DiagramProps) {
  const prefix = useId();
  const id: IdFn = (name) => `${prefix}-${name}`.replace(/:/g, '');
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const layout = useMemo(() => ({ rootRef, version }), [version]);
  const diagramClassName = clsx('diagram', className);

  if (!isBrowser) {
    return <div className={diagramClassName} data-facet-diagram data-facet-ready="false" />;
  }

  return (
    <div
      ref={rootRef}
      className={diagramClassName}
      data-facet-diagram
      data-facet-ready={ready ? 'true' : 'false'}
      style={{ position: 'relative', ['--facet-diagram-primary' as string]: colors.primary }}
    >
      <DiagramLayoutProvider value={layout}>
        {children(id)}
        <LayoutSettler
          rootRef={rootRef}
          onFrame={() => setVersion((current) => current + 1)}
          onSettled={() => setReady(true)}
        />
      </DiagramLayoutProvider>
    </div>
  );
}
