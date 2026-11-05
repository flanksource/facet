import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { EditableText, editableText, type DataAttributes } from './editable';

const PAPER = { ink: '#172f49', rule: '#cbd5e1', white: '#ffffff' } as const;

export const DIAGRAM_ROLES = ['existing', 'new', 'future', 'neutral'] as const;
export type DiagramRole = (typeof DIAGRAM_ROLES)[number];

export interface RoleTone { label: string; header: string; body: string; border: string; text: string; dashed: boolean }

export const ROLE_TONES: Record<DiagramRole, RoleTone> = {
  existing: { label: 'Existing estate', header: '#475569', body: '#f1f5f9', border: '#94a3b8', text: PAPER.ink, dashed: false },
  new: { label: 'Mission Control · new', header: '#1d4ed8', body: '#eff6ff', border: '#3b82f6', text: PAPER.ink, dashed: false },
  future: { label: 'Future phase', header: '#b45309', body: '#fff7ed', border: '#d97706', text: '#7c2d12', dashed: true },
  neutral: { label: 'Neutral', header: PAPER.ink, body: PAPER.white, border: PAPER.rule, text: PAPER.ink, dashed: false },
};

type RoleIcon = ComponentType<{ className?: string; style?: CSSProperties }>;

function toneOf(role: DiagramRole): RoleTone {
  if (!Object.prototype.hasOwnProperty.call(ROLE_TONES, role)) throw new Error(`Unknown diagram role "${role}". Expected one of ${DIAGRAM_ROLES.join(', ')}.`);
  return ROLE_TONES[role];
}

const MARKER_STYLE: CSSProperties = {
  display: 'inline-flex', flexShrink: 0, alignItems: 'center', justifyContent: 'center', width: '4.2mm', height: '4.2mm',
  borderRadius: 999, background: PAPER.ink, color: PAPER.white, fontSize: '6.5pt', fontWeight: 700, lineHeight: 1,
};

/** Numbered badge that ties a node to a legend entry. */
export function Marker({ n }: { n: number }) {
  return <span style={MARKER_STYLE}>{n}</span>;
}

export interface ZoneProps extends DataAttributes {
  id?: string;
  label: ReactNode;
  role?: DiagramRole;
  marker?: number;
  icon?: RoleIcon;
  fill?: string;
  className?: string;
  children?: ReactNode;
}

export interface TileProps extends DataAttributes {
  id?: string;
  title: ReactNode;
  detail?: ReactNode;
  role?: DiagramRole;
  marker?: number;
  icon?: RoleIcon;
  className?: string;
}

/** A containment boundary: account, network, cluster, namespace or capability layer. */
export function Zone({ id, label, role = 'neutral', marker, icon: Icon, fill, className = '', children, ...dataAttributes }: ZoneProps) {
  const t = toneOf(role);
  return (
    <div {...dataAttributes} id={id} data-editable-container="role" data-role={role} className={`relative rounded-[1.2mm] border-[0.35mm] p-[2mm] ${className}`} style={{ borderColor: t.border, borderStyle: t.dashed ? 'dashed' : 'solid', backgroundColor: fill ?? t.body }}>
      <div className="mb-[2mm] flex items-center gap-[1.2mm] text-[7pt] font-bold leading-[1.3]" style={{ color: t.header }}>
        {marker !== undefined && <Marker n={marker} />}
        {Icon && <Icon className="h-[5mm] w-[5mm] shrink-0" />}
        <EditableText prop="label">{label}</EditableText>
      </div>
      {children}
    </div>
  );
}

/** A component box: coloured title strip over a white body. */
export function Tile({ id, title, detail, role = 'new', marker, icon: Icon, className = '', ...dataAttributes }: TileProps) {
  const t = toneOf(role);
  return (
    <div {...dataAttributes} id={id} data-editable-box="role" data-role={role} className={`flex flex-col overflow-hidden rounded-[1mm] border-[0.35mm] bg-white ${className}`} style={{ borderColor: t.border, borderStyle: t.dashed ? 'dashed' : 'solid' }}>
      <div className={`flex items-center gap-[1.2mm] px-[1.8mm] py-[1mm] text-[7.2pt] font-bold leading-[1.2] text-white ${detail ? '' : 'flex-1'}`} style={{ backgroundColor: t.header }}>
        {marker !== undefined && <Marker n={marker} />}
        {Icon && (
          <span className="flex shrink-0 items-center justify-center rounded-[0.6mm] p-[0.5mm]" style={{ backgroundColor: PAPER.white, color: t.header }}>
            <Icon className="h-[4.5mm] w-[4.5mm]" />
          </span>
        )}
        <span {...editableText('title', title)}>{title}</span>
      </div>
      {detail && <div {...editableText('detail', detail)} className="px-[1.8mm] py-[1.2mm] text-[6.6pt] leading-[1.35]" style={{ color: t.text }}>{detail}</div>}
    </div>
  );
}
