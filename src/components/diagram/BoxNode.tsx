import React from 'react';
import { COLORS } from './colors';

export interface BoxNodeProps {
  /** Arrow-endpoint id. Arrows target this outer container, never inner sections. */
  id?: string;
  /** Header content. May be a string or a node (e.g. icon + label). */
  title: React.ReactNode;
  /** Body content: sub-items, pills, icon grids, tables. */
  children?: React.ReactNode;
  /** Header background. White text is rendered on top. */
  headerColor?: string;
  /** Body background. Always a light tint — never dark. */
  bodyColor?: string;
  /** Border color for the whole box. */
  borderColor?: string;
  /** Minimum box width, e.g. "200px". */
  minWidth?: string;
  /** Compact padding (p-2 header/body instead of px-3 py-2 / p-3). */
  compact?: boolean;
  /**
   * Tailwind fallback for the header background, e.g. "bg-blue-600". When set
   * and no `borderColor` is given, the border color is derived from it.
   */
  className?: string;
  /** Tailwind fallback for the body background, e.g. "bg-blue-50". */
  bodyClassName?: string;
}

const TAILWIND_BG = /\bbg-([a-z]+)-(\d{2,3})\b/;

/** Map a Tailwind `bg-{color}-{shade}` class to a `border-{color}-600` class. */
export function deriveBorderClass(className: string | undefined): string | undefined {
  const match = className?.match(TAILWIND_BG);
  if (!match) return undefined;
  return `border-${match[1]}-600`;
}

/**
 * A diagram node: a colored header above a light body. The primary node type
 * for node-and-arrow diagrams. Prefer the inline `headerColor`/`bodyColor`/
 * `borderColor` props with the COLORS palette; the Tailwind `className`/
 * `bodyClassName` props are a fallback that auto-derives the border.
 */
export default function BoxNode({
  id,
  title,
  children,
  headerColor,
  bodyColor,
  borderColor,
  minWidth,
  compact,
  className,
  bodyClassName,
}: BoxNodeProps) {
  const usesInlineColors = headerColor != null || bodyColor != null || borderColor != null;
  const resolvedBorder = borderColor ?? (usesInlineColors ? COLORS.primary : undefined);
  const derivedBorderClass = resolvedBorder ? undefined : deriveBorderClass(className);

  const containerStyle: React.CSSProperties = { minWidth };
  if (resolvedBorder) containerStyle.borderColor = resolvedBorder;

  const headerStyle: React.CSSProperties | undefined = headerColor
    ? { backgroundColor: headerColor }
    : undefined;
  const bodyStyle: React.CSSProperties | undefined = bodyColor
    ? { backgroundColor: bodyColor }
    : undefined;

  return (
    <div
      id={id}
      className={[
        'rounded-xl overflow-hidden shadow-lg border-2 border-solid',
        derivedBorderClass,
      ]
        .filter(Boolean)
        .join(' ')}
      style={containerStyle}
    >
      <div
        className={[
          compact ? 'p-2' : 'px-3 py-2',
          'text-center text-white text-xs font-bold',
          headerStyle ? '' : className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={headerStyle}
      >
        {title}
      </div>
      {children != null && (
        <div
          className={[compact ? 'p-2' : 'p-3', bodyStyle ? '' : bodyClassName]
            .filter(Boolean)
            .join(' ')}
          style={bodyStyle}
        >
          {children}
        </div>
      )}
    </div>
  );
}
