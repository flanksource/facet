import type { ComponentType, ReactNode } from 'react';

export const NIGHT = {
  bg: '#0b1023', grid: 'rgba(148,163,184,0.07)', rail: '#6366f1', railEnd: '#a855f7',
  text: '#f8fafc', muted: '#94a3b8', card: '#151b33', edge: '#2a3354',
  green: '#4ade80', purple: '#a78bfa', orange: '#fb923c',
};

export function Frame({ label, color, children }: { label: string; color: string; children: ReactNode }) {
  return (
    <div className="relative w-full rounded-md border border-dashed px-3 pb-2.5 pt-4" style={{ borderColor: color }}>
      <span className="absolute -top-2 left-2 px-1 font-mono text-[6.75pt] font-semibold uppercase tracking-[0.14em]" style={{ backgroundColor: NIGHT.bg, color }}>{label}</span>
      {children}
    </div>
  );
}

export function SquareTile({ icon: Glyph, color, label }: { icon: ComponentType<{ className?: string }>; color: string; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="flex h-10 w-10 items-center justify-center" style={{ backgroundColor: color, color: NIGHT.bg }}><Glyph className="h-5 w-5" /></span>
      {label && <span className="font-mono text-[6.75pt] uppercase tracking-[0.08em]" style={{ color: NIGHT.muted }}>{label}</span>}
    </div>
  );
}
