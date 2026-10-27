import type { ReactNode } from 'react';
import { CONTAINER_CLASSES, DEFAULT_NODE_PALETTE, type ContainerStyle, type NodeFonts, type NodePalette } from './nodeStyles';

export interface ContainerNodeProps {
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
  minWidth?: string;
  className?: string;
}

export default function ContainerNode({
  id, variant = 'zone', title, icon, description, tag, footer, children,
  palette = DEFAULT_NODE_PALETTE, fonts, minWidth, className,
}: ContainerNodeProps) {
  if (!Object.prototype.hasOwnProperty.call(CONTAINER_CLASSES, variant)) throw new Error(`Unknown container style: ${variant}`);
  const header = variant === 'header';
  const tinted = ['zone', 'region', 'panel', 'lane', 'card-group'].includes(variant);
  const panel = variant === 'panel' || variant === 'lane';
  return (
    <div id={id} data-container-style={variant}
      className={['relative text-xs', CONTAINER_CLASSES[variant], className].filter(Boolean).join(' ')}
      style={{ minWidth, borderColor: panel ? palette.panelBorder : variant === 'frame' ? palette.muted : palette.border, backgroundColor: panel ? palette.panel : tinted ? palette.containerTint : header ? palette.surface : 'transparent', color: palette.text, fontFamily: fonts?.body }}>
      {tag != null && <span className="absolute -top-2 left-2 rounded-sm border px-1 text-[9px] leading-4"
        style={{ borderColor: palette.border, backgroundColor: palette.surface, color: palette.accent, fontFamily: fonts?.mono }}>{tag}</span>}
      {(title != null || icon != null || description != null) && (
        <div className={header ? 'rounded-t-md px-3 py-2' : 'px-3 pt-3'}
          style={{ backgroundColor: header ? palette.accent : undefined, color: header ? palette.onAccent : palette.accent }}>
          <div className="flex items-center gap-2 font-semibold" style={{ fontFamily: fonts?.heading }}>{icon}{title}</div>
          {description != null && <div className="mt-1 text-[10px]" style={{ color: header ? palette.onAccent : palette.muted }}>{description}</div>}
        </div>
      )}
      <div className={variant === 'lane' ? 'flex flex-row items-start gap-3 p-3' : 'flex flex-col gap-3 p-3'}>{children}</div>
      {footer != null && <div className="mx-3 border-t py-2 text-[10px]" style={{ borderColor: palette.border, color: palette.muted, fontFamily: fonts?.mono }}>{footer}</div>}
    </div>
  );
}
