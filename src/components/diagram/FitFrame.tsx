import React, { useEffect, useRef, useState } from 'react';

export interface FitFrameProps {
  children: React.ReactNode;
  className?: string;
  /** Widest CSS px the content is laid out at; narrower content is fitted by its own width. */
  layoutWidth?: number;
  /** Absolute CSS length (e.g. "128mm") the scaled content may not exceed in height. */
  maxHeight?: string;
  style?: React.CSSProperties;
}

interface Fit {
  height: number;
  /** Horizontal offset that centres content narrower than the frame (height-limited fits). */
  left: number;
  ready: boolean;
  scale: number;
}

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const DEFAULT_LAYOUT_WIDTH = 1280;

function measureFit(options: {
  inner: HTMLElement;
  maxHeight?: string;
  outer: HTMLElement;
  probe: HTMLElement | null;
}): Fit | null {
  const { inner, maxHeight, outer, probe } = options;
  // offsetWidth/offsetHeight are untransformed, so the frame can itself sit inside a scaled ancestor.
  const frameWidth = outer.offsetWidth;
  // The inner box shrinks to its content (max-content, capped at layoutWidth), so narrow figures fill the frame.
  const naturalWidth = inner.offsetWidth;
  const naturalHeight = inner.offsetHeight;
  if (frameWidth === 0 || naturalWidth === 0 || naturalHeight === 0) return null;
  let scale = frameWidth / naturalWidth;
  if (probe) {
    const maxHeightPx = probe.offsetHeight;
    if (maxHeightPx <= 0) throw new Error(`FitFrame: maxHeight "${maxHeight}" did not resolve to a positive CSS length`);
    scale = Math.min(scale, maxHeightPx / naturalHeight);
  }
  const ready = [...inner.querySelectorAll('[data-facet-ready]')]
    .every((element) => element.getAttribute('data-facet-ready') === 'true');
  return { height: naturalHeight * scale, left: (frameWidth - naturalWidth * scale) / 2, ready, scale };
}

function sameFit(a: Fit | null, b: Fit | null): boolean {
  return a === b || (!!a && !!b && a.height === b.height && a.left === b.left && a.ready === b.ready && a.scale === b.scale);
}

export default function FitFrame({
  children,
  className,
  layoutWidth = DEFAULT_LAYOUT_WIDTH,
  maxHeight,
  style,
}: FitFrameProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const probe = probeRef.current;
    const recompute = () => {
      try {
        const next = measureFit({ inner, maxHeight, outer, probe });
        setError(null);
        setFit((current) => sameFit(current, next) ? current : next);
      } catch (cause) {
        console.error(cause);
        setError(cause instanceof Error ? cause.message : String(cause));
        setFit(null);
      }
    };
    recompute();
    const resizeObserver = new ResizeObserver(recompute);
    resizeObserver.observe(outer);
    resizeObserver.observe(inner);
    if (probe) resizeObserver.observe(probe);
    const mutationObserver = new MutationObserver(recompute);
    mutationObserver.observe(inner, {
      attributeFilter: ['data-facet-ready'],
      attributes: true,
      childList: true,
      subtree: true,
    });
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [layoutWidth, maxHeight]);

  if (!isBrowser) {
    return <div className={className} data-facet-fit data-facet-ready="false" style={style}>{children}</div>;
  }

  return (
    <div
      ref={outerRef}
      className={className}
      data-facet-error={error ?? undefined}
      data-facet-fit
      data-facet-ready={fit?.ready ? 'true' : 'false'}
      style={{
        ...style,
        // Size containment makes the frame monolithic: print pagination otherwise fragments the
        // untransformed (taller) content inside it and shifts parts of the scaled figure off the page.
        contain: 'size layout paint',
        height: fit?.height ?? 0,
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
      }}
    >
      {maxHeight !== undefined && (
        <div
          ref={probeRef}
          aria-hidden
          data-facet-fit-probe
          style={{ height: maxHeight, pointerEvents: 'none', position: 'absolute', visibility: 'hidden', width: 0 }}
        />
      )}
      <div
        ref={innerRef}
        data-facet-fit-inner
        style={{
          left: fit?.left ?? 0,
          position: 'absolute',
          top: 0,
          transform: `scale(${fit?.scale ?? 1})`,
          transformOrigin: '0 0',
          maxWidth: layoutWidth,
          width: 'max-content',
        }}
      >
        {children}
      </div>
    </div>
  );
}
