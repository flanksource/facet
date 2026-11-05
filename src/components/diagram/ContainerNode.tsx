import type { ReactNode } from 'react';
import { CONTAINER_CLASSES, DEFAULT_NODE_PALETTE, type ContainerStyle, type NodeFonts, type NodePalette } from './nodeStyles';
import { DENSITY_TOKENS, useDiagramStyle, type Density, type Orientation } from './style';
import { EditableText, editableText, type DataAttributes } from './editable';

export interface ContainerNodeProps extends DataAttributes {
  id?: string;
  variant?: ContainerStyle;
  title?: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  tag?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  palette?: NodePalette;
  fonts?: NodeFonts;
  /** Padding, gaps and type scale. Defaults to the DiagramStyleProvider density, else comfortable. */
  density?: Density;
  minWidth?: string;
  className?: string;
}

/** A lane is always a row and a column always a column; other groups follow the placement. */
function orientationOf(variant: ContainerStyle, placed: Orientation | undefined): Orientation {
  if (variant === 'lane') return 'row';
  if (variant === 'column') return 'column';
  return placed ?? 'column';
}

export default function ContainerNode({
  id, variant: variantProp, title, icon, description, tag, footer, children,
  palette: paletteProp, fonts: fontsProp, density: densityProp, minWidth, className,
  ...dataAttributes
}: ContainerNodeProps) {
  const style = useDiagramStyle();
  const variant = variantProp ?? style.shape?.container ?? 'zone';
  const palette = paletteProp ?? style.palette ?? DEFAULT_NODE_PALETTE;
  const fonts = fontsProp ?? style.fonts;
  const tokens = DENSITY_TOKENS[densityProp ?? style.density];
  if (!Object.prototype.hasOwnProperty.call(CONTAINER_CLASSES, variant)) throw new Error(`Unknown container style: ${variant}`);
  const header = variant === 'header';
  const tinted = ['zone', 'region', 'panel', 'lane', 'card-group'].includes(variant);
  const panel = variant === 'panel' || variant === 'lane';
  const orientation = orientationOf(variant, style.shape?.orientation);
  return (
    <div {...dataAttributes} id={id} data-editable-container="variant" data-container-style={variant} data-orientation={orientation}
      className={['relative', CONTAINER_CLASSES[variant], className].filter(Boolean).join(' ')}
      style={{ minWidth, fontSize: tokens.title, borderColor: panel ? palette.panelBorder : variant === 'frame' ? palette.muted : palette.border, backgroundColor: panel ? palette.panel : tinted ? palette.containerTint : header ? palette.surface : 'transparent', color: palette.text, fontFamily: fonts?.body }}>
      {tag != null && <span {...editableText('tag', tag)} className="absolute -top-2 left-2 rounded-sm border px-1 text-[9px] leading-4"
        style={{ borderColor: palette.border, backgroundColor: palette.surface, color: palette.accent, fontFamily: fonts?.mono }}>{tag}</span>}
      {(title != null || icon != null || description != null) && (
        <div className={header ? 'rounded-t-md' : undefined}
          style={{ padding: header ? tokens.header : `${tokens.body} ${tokens.body} 0`, backgroundColor: header ? palette.accent : undefined, color: header ? palette.onAccent : palette.accent }}>
          <div className="flex items-center gap-2 font-semibold" style={{ fontFamily: fonts?.heading }}>{icon}<EditableText prop="title">{title}</EditableText></div>
          {description != null && <div {...editableText('description', description)} className="mt-1" style={{ fontSize: tokens.detail, color: header ? palette.onAccent : palette.muted }}>{description}</div>}
        </div>
      )}
      <div className={orientation === 'row' ? 'flex flex-row items-start' : 'flex flex-col'} style={{ gap: tokens.gap, padding: tokens.body }}>{children}</div>
      {footer != null && <div {...editableText('footer', footer)} className="border-t" style={{ margin: `0 ${tokens.body}`, padding: tokens.footer, fontSize: tokens.detail, borderColor: palette.border, color: palette.muted, fontFamily: fonts?.mono }}>{footer}</div>}
    </div>
  );
}
