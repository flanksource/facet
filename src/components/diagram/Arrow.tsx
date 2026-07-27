import React, { useId, useLayoutEffect, useState } from 'react';
import type { xarrowPropsType } from 'react-xarrows';
import { COLORS } from './colors';
import { useDiagramLayout } from './context';
import { measureArrow, type ArrowGeometry } from './geometry';

export type ArrowVariant = 'primary' | 'secondary' | 'er' | 'bidirectional';

type VariantProps = Pick<
  xarrowPropsType,
  'color' | 'strokeWidth' | 'headSize' | 'dashness' | 'curveness' | 'headShape' | 'tailShape' | 'showHead' | 'showTail'
>;

export function variantProps(variant: ArrowVariant): VariantProps {
  switch (variant) {
    case 'primary':
      return {
        color: COLORS.primary,
        strokeWidth: 3,
        headSize: 4,
        dashness: { strokeLen: 10, nonStrokeLen: 5, animation: 1 },
      };
    case 'secondary':
      return {
        color: COLORS.muted,
        strokeWidth: 2,
        headSize: 3,
        dashness: { strokeLen: 6, nonStrokeLen: 4, animation: 1 },
      };
    case 'er':
      return {
        color: COLORS.muted,
        strokeWidth: 1.5,
        headSize: 4,
        curveness: 0.4,
      };
    case 'bidirectional':
      return {
        color: COLORS.muted,
        strokeWidth: 2,
        headSize: 3,
        headShape: 'circle',
        tailShape: 'circle',
        showHead: true,
        showTail: true,
      };
  }
}

export interface ArrowProps extends Omit<xarrowPropsType, keyof VariantProps | 'start' | 'end'> {
  from: string;
  to: string;
  variant?: ArrowVariant;
  color?: string;
  strokeWidth?: number;
  headSize?: number;
  dashness?: xarrowPropsType['dashness'];
  curveness?: number;
  headShape?: xarrowPropsType['headShape'];
  tailShape?: xarrowPropsType['tailShape'];
  showHead?: boolean;
  showTail?: boolean;
}

function labelsFrom(props: ArrowProps['labels']): {
  start?: React.ReactNode;
  middle?: React.ReactNode;
  end?: React.ReactNode;
} {
  if (typeof props === 'string' || React.isValidElement(props)) return { middle: props };
  return (props ?? {}) as { start?: React.ReactNode; middle?: React.ReactNode; end?: React.ReactNode };
}

function markerShape(
  shape: ArrowProps['headShape'],
  color: string,
  markerProps: Record<string, unknown> | undefined,
) {
  if (shape === 'circle') {
    return <circle cx="5" cy="5" fill={color} r="4" {...markerProps} />;
  }
  if (typeof shape === 'object' && React.isValidElement(shape.svgElem)) {
    return React.cloneElement(shape.svgElem, markerProps);
  }
  return <path d="M 0 0 L 10 5 L 0 10 z" fill={color} {...markerProps} />;
}

function ArrowLabel({
  children,
  point,
}: {
  children: React.ReactNode;
  point: { x: number; y: number };
}) {
  if (children == null) return null;
  return (
    <div
      style={{
        display: 'table',
        left: point.x,
        pointerEvents: 'auto',
        position: 'absolute',
        top: point.y,
        transform: 'translate(-50%, -50%)',
        width: 'max-content',
      }}
    >
      {children}
    </div>
  );
}

export default function Arrow({
  variant = 'primary',
  from,
  to,
  startAnchor,
  endAnchor,
  labels,
  path = 'smooth',
  gridBreak,
  curveness,
  color,
  lineColor,
  headColor,
  tailColor,
  strokeWidth,
  headSize,
  tailSize,
  headShape,
  tailShape,
  showHead,
  showTail,
  showXarrow = true,
  dashness,
  zIndex = 0,
  passProps,
  arrowBodyProps,
  arrowHeadProps,
  arrowTailProps,
  SVGcanvasProps,
  SVGcanvasStyle,
  divContainerProps,
  divContainerStyle,
}: ArrowProps) {
  const preset = variantProps(variant);
  const resolvedColor = color ?? preset.color ?? COLORS.primary;
  const resolvedStroke = strokeWidth ?? preset.strokeWidth ?? 2;
  const resolvedHeadSize = headSize ?? preset.headSize ?? 4;
  const resolvedTailSize = tailSize ?? 4;
  const resolvedHeadShape = headShape ?? preset.headShape ?? 'arrow1';
  const resolvedTailShape = tailShape ?? preset.tailShape ?? 'arrow1';
  const resolvedShowHead = showHead ?? preset.showHead ?? true;
  const resolvedShowTail = showTail ?? preset.showTail ?? false;
  const resolvedDash = dashness ?? preset.dashness;
  const resolvedCurveness = curveness ?? preset.curveness ?? 0.8;
  const { rootRef, version } = useDiagramLayout();
  const [geometry, setGeometry] = useState<ArrowGeometry | null>(null);
  const markerPrefix = useId().replace(/:/g, '');

  useLayoutEffect(() => {
    const root = rootRef.current;
    setGeometry(root ? measureArrow({
      curveness: resolvedCurveness,
      endAnchor,
      from,
      gridBreak,
      path,
      root,
      startAnchor,
      to,
    }) : null);
  }, [
    endAnchor,
    from,
    gridBreak,
    path,
    resolvedCurveness,
    rootRef,
    startAnchor,
    to,
    version,
  ]);

  if (!showXarrow) return null;
  const parsedLabels = labelsFrom(labels);
  const dash = typeof resolvedDash === 'object'
    ? `${resolvedDash.strokeLen ?? resolvedStroke * 2} ${resolvedDash.nonStrokeLen ?? resolvedStroke}`
    : resolvedDash ? `${resolvedStroke * 2} ${resolvedStroke}` : undefined;

  return (
    <div
      {...divContainerProps}
      data-facet-arrow
      data-facet-arrow-ready={geometry ? 'true' : 'false'}
      data-facet-from={from}
      data-facet-to={to}
      style={{
        inset: 0,
        pointerEvents: 'none',
        position: 'absolute',
        zIndex,
        ...divContainerStyle,
      }}
    >
      {geometry && (
        <>
          <svg
            {...SVGcanvasProps}
            height="100%"
            overflow="visible"
            style={{ inset: 0, overflow: 'visible', position: 'absolute', ...SVGcanvasStyle }}
            width="100%"
          >
            <defs>
              <marker
                id={`${markerPrefix}-head`}
                markerHeight={resolvedHeadSize}
                markerUnits="strokeWidth"
                markerWidth={resolvedHeadSize}
                orient="auto"
                refX="9"
                refY="5"
                viewBox="0 0 10 10"
              >
                {markerShape(
                  resolvedHeadShape,
                  headColor ?? resolvedColor,
                  arrowHeadProps as Record<string, unknown> | undefined,
                )}
              </marker>
              <marker
                id={`${markerPrefix}-tail`}
                markerHeight={resolvedTailSize}
                markerUnits="strokeWidth"
                markerWidth={resolvedTailSize}
                orient="auto-start-reverse"
                refX="1"
                refY="5"
                viewBox="0 0 10 10"
              >
                {markerShape(
                  resolvedTailShape,
                  tailColor ?? resolvedColor,
                  arrowTailProps as Record<string, unknown> | undefined,
                )}
              </marker>
            </defs>
            <path
              {...passProps}
              {...arrowBodyProps}
              d={geometry.path}
              fill="none"
              markerEnd={resolvedShowHead ? `url(#${markerPrefix}-head)` : undefined}
              markerStart={resolvedShowTail ? `url(#${markerPrefix}-tail)` : undefined}
              stroke={lineColor ?? resolvedColor}
              strokeDasharray={dash}
              strokeWidth={resolvedStroke}
            >
              {typeof resolvedDash === 'object' && resolvedDash.animation && (
                <animate
                  attributeName="stroke-dashoffset"
                  dur={`${1 / Number(resolvedDash.animation)}s`}
                  from={`${(resolvedDash.strokeLen ?? 0) + (resolvedDash.nonStrokeLen ?? 0)}`}
                  repeatCount="indefinite"
                  to="0"
                />
              )}
            </path>
          </svg>
          <ArrowLabel point={geometry.labelStart}>{parsedLabels.start}</ArrowLabel>
          <ArrowLabel point={geometry.labelMiddle}>{parsedLabels.middle}</ArrowLabel>
          <ArrowLabel point={geometry.labelEnd}>{parsedLabels.end}</ArrowLabel>
        </>
      )}
    </div>
  );
}
