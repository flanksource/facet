import React from 'react';
import { COLORS } from './colors';

/** Which edge a port docks to, and where along that edge it sits. */
export type PortPosition =
  | 'top-left' | 'top-middle' | 'top-right'
  | 'bottom-left' | 'bottom-middle' | 'bottom-right'
  | 'left-top' | 'left-middle' | 'left-bottom'
  | 'right-top' | 'right-middle' | 'right-bottom';

type PortEdge = 'top' | 'bottom' | 'left' | 'right';

/**
 * A chip docked onto the box border — an interaction point such as an endpoint,
 * a protocol or a stage marker. Give it an `id` and an arrow may terminate on
 * the port itself rather than on the box as a whole.
 */
export interface BoxNodePort {
  /** Arrow endpoint id. Arrows may target a port; inner sections stay off-limits. */
  id?: string;
  position: PortPosition;
  /**
   * Extent along the docked edge: a width on top/bottom, a height on left/right.
   * Percentages resolve against the box. Defaults to the chip's content size.
   */
  size?: string;
  /** Chip fill. White text renders on top. Defaults to the box's header color. */
  color?: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  /** Chip label. Ignored when `node` is set. */
  label?: React.ReactNode;
  /** Escape hatch: render this instead of the icon+label chip. */
  node?: React.ReactNode;
}

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
   * Tailwind shadow class for the box, e.g. "shadow-2xl" for a hub. Pass
   * "shadow-none" for print: a shadow makes Chromium emit a PDF soft mask, and
   * some PDF viewers flatten those to opaque grey blocks behind the box.
   */
  shadow?: string;
  /** Chips docked onto the box border. See {@link BoxNodePort}. */
  ports?: BoxNodePort[];
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

/** How far a chip overlaps the box border, matching the box's `border-2`. */
const BORDER_WIDTH = 2;

/** Where along its edge a port sits, from the two halves of its position. */
const ALIGNMENT: Record<string, 'start' | 'middle' | 'end'> = {
  left: 'start',
  top: 'start',
  middle: 'middle',
  right: 'end',
  bottom: 'end',
};

/**
 * The two margins that run along an edge. Auto margins distribute ports along
 * it, so several ports share one slot side by side instead of stacking, and a
 * lone centred port centres against the box rather than against its neighbours.
 * Neither ever collides with the docked-side margin, which is perpendicular.
 */
const ALONG_EDGE: Record<PortEdge, [keyof React.CSSProperties, keyof React.CSSProperties]> = {
  top: ['marginLeft', 'marginRight'],
  bottom: ['marginLeft', 'marginRight'],
  left: ['marginTop', 'marginBottom'],
  right: ['marginTop', 'marginBottom'],
};

const EDGES: Record<PortEdge, {
  aligns: string[];
  /** Grid cell of the edge's slot in the 3x3 wrapper. */
  slot: string;
  /**
   * The slot runs along its edge and packs ports against the box, so several
   * ports on one edge sit side by side; auto margins then place each one at its
   * own alignment.
   */
  axis: string;
  rounded: string;
  /** Pulls the chip onto the border on its docked side. */
  margin: 'marginTop' | 'marginBottom' | 'marginLeft' | 'marginRight';
  /** `size` is the extent along the edge, so which box it sets depends on it. */
  sizeProp: 'width' | 'height';
}> = {
  top: {
    aligns: ['left', 'middle', 'right'],
    slot: 'col-start-2 row-start-1',
    axis: 'flex flex-row items-end',
    rounded: 'rounded-t-md',
    margin: 'marginBottom',
    sizeProp: 'width',
  },
  bottom: {
    aligns: ['left', 'middle', 'right'],
    slot: 'col-start-2 row-start-3',
    axis: 'flex flex-row items-start',
    rounded: 'rounded-b-md',
    margin: 'marginTop',
    sizeProp: 'width',
  },
  left: {
    aligns: ['top', 'middle', 'bottom'],
    slot: 'col-start-1 row-start-2',
    axis: 'flex flex-col items-end',
    rounded: 'rounded-l-md',
    margin: 'marginRight',
    sizeProp: 'height',
  },
  right: {
    aligns: ['top', 'middle', 'bottom'],
    slot: 'col-start-3 row-start-2',
    axis: 'flex flex-col items-start',
    rounded: 'rounded-r-md',
    margin: 'marginLeft',
    sizeProp: 'height',
  },
};

const EDGE_ORDER: PortEdge[] = ['top', 'left', 'right', 'bottom'];

export interface PortPlacement {
  edge: PortEdge;
  /** Tailwind rounding, dropped on the docked side. */
  rounded: string;
  style: React.CSSProperties;
}

/**
 * Resolve a port's position into the flex alignment, border overlap and extent
 * that place its chip on the box edge.
 */
export function portPlacement(position: PortPosition, size?: string): PortPlacement {
  const [edge, align] = position.split('-') as [PortEdge, string];
  const spec = EDGES[edge];
  if (!spec || !spec.aligns.includes(align)) {
    throw new Error(
      `BoxNode: unknown port position "${position}". Expected one of ${EDGE_ORDER
        .flatMap((name) => EDGES[name].aligns.map((value) => `${name}-${value}`))
        .join(', ')}.`,
    );
  }
  const [start, end] = ALONG_EDGE[edge];
  const alignment = ALIGNMENT[align];
  return {
    edge,
    rounded: spec.rounded,
    style: {
      ...(alignment !== 'start' ? { [start]: 'auto' } : {}),
      ...(alignment !== 'end' ? { [end]: 'auto' } : {}),
      [spec.margin]: -BORDER_WIDTH,
      ...(size ? { [spec.sizeProp]: size } : {}),
    },
  };
}

function Port({ port, defaultColor }: { port: BoxNodePort; defaultColor: string }) {
  const { icon: Icon, label, node } = port;
  const placement = portPlacement(port.position, port.size);

  if (node != null) {
    return <div id={port.id} style={placement.style}>{node}</div>;
  }

  return (
    <div
      id={port.id}
      className={[
        'flex items-center gap-1.5 px-2 py-1 overflow-hidden',
        'text-[10px] font-bold text-white',
        placement.rounded,
      ].join(' ')}
      style={{ ...placement.style, backgroundColor: port.color ?? defaultColor }}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {label != null && <span className="truncate">{label}</span>}
    </div>
  );
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
  shadow = 'shadow-lg',
  ports,
  className,
  bodyClassName,
}: BoxNodeProps) {
  const usesInlineColors = headerColor != null || bodyColor != null || borderColor != null;
  const resolvedBorder = borderColor ?? (usesInlineColors ? COLORS.primary : undefined);
  const derivedBorderClass = resolvedBorder ? undefined : deriveBorderClass(className);
  const docked = ports?.length ? ports : undefined;

  const containerStyle: React.CSSProperties = { minWidth };
  if (resolvedBorder) containerStyle.borderColor = resolvedBorder;

  const headerStyle: React.CSSProperties | undefined = headerColor
    ? { backgroundColor: headerColor }
    : undefined;
  const bodyStyle: React.CSSProperties | undefined = bodyColor
    ? { backgroundColor: bodyColor }
    : undefined;

  const box = (
    <div
      id={id}
      className={[
        'rounded-xl overflow-hidden border-2 border-solid',
        shadow,
        derivedBorderClass,
        // The box is the grid's centre cell; ports occupy the surrounding slots.
        docked && 'col-start-2 row-start-2',
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

  if (!docked) return box;

  // Ports cannot live inside the box: its root is overflow-hidden so rounded-xl
  // can clip the header's square corners, which would clip an overhanging chip
  // too. They are siblings in a 3x3 grid instead, laid out in normal flow so
  // nothing depends on absolute positioning surviving the Diagram width freeze.
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: 'auto auto auto', gridTemplateRows: 'auto auto auto' }}
    >
      {EDGE_ORDER.map((edge) => {
        const onEdge = docked.filter((port) => portPlacement(port.position).edge === edge);
        if (!onEdge.length) return null;
        return (
          <div key={edge} className={`${EDGES[edge].slot} ${EDGES[edge].axis} z-10`}>
            {onEdge.map((port, index) => (
              <Port
                key={port.id ?? `${port.position}-${index}`}
                port={port}
                defaultColor={headerColor ?? COLORS.primary}
              />
            ))}
          </div>
        );
      })}
      {box}
    </div>
  );
}
