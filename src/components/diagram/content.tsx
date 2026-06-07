import React from 'react';
import { COLORS } from './colors';

/** A single labeled pill inside a box body. */
export function NodePill({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] rounded px-2 py-1 text-center"
      style={{
        color: COLORS.muted,
        backgroundColor: COLORS.background,
        border: `1px solid ${COLORS.primary}`,
      }}
    >
      {children}
    </div>
  );
}

/** A titled group of pills with a section header. */
export function NodeSection({ title, items, id }: { title: string; items: string[]; id?: string }) {
  return (
    <div id={id} className="flex flex-col gap-1">
      <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: COLORS.muted }}>
        {title}
      </div>
      {items.map((item) => (
        <NodePill key={item}>{item}</NodePill>
      ))}
    </div>
  );
}

/** A thin horizontal line between NodeSections inside a single box. */
export function SectionDivider() {
  return <div className="w-full h-px" style={{ backgroundColor: COLORS.primary, opacity: 0.2 }} />;
}
