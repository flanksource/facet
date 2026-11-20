import type { ReactNode } from "react";

export const ROLES = {
  new: { label: "new", header: "#1d4ed8", body: "#eff6ff", border: "#3b82f6" },
  existing: { label: "existing", header: "#047857", body: "#ecfdf5", border: "#10b981" },
  external: { label: "external", header: "#475569", body: "#f8fafc", border: "#94a3b8" },
  security: { label: "security", header: "#be123c", body: "#fff1f2", border: "#fb7185" },
  store: { label: "store", header: "#6d28d9", body: "#f5f3ff", border: "#a78bfa" },
  action: { label: "action", header: "#c2410c", body: "#fff7ed", border: "#fb923c" },
  cloud: { label: "cloud", header: "#b45309", body: "#fffbeb", border: "#fbbf24" },
  muted: { label: "muted", header: "#64748b", body: "#f1f5f9", border: "#cbd5e1" },
} as const;
type Role = keyof typeof ROLES;
export const ROLE_KEYS = Object.keys(ROLES) as Role[];
export const R = ROLES.new;
export const INK = "#0f172a";
export const MUTED = "#64748b";

export function Swatch({ name, note, children, height = 92 }: { name: string; note?: string; children: ReactNode; height?: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-center rounded-md border border-slate-100 bg-slate-50/60 px-2" style={{ height }}>{children}</div>
      <code className="text-[7.5pt] font-semibold text-slate-800">{name}</code>
      {note && <div className="text-[7.125pt] leading-tight text-slate-500">{note}</div>}
    </div>
  );
}

export function Sheet({ columns, children, intro }: { columns: number; children: ReactNode; intro: string }) {
  return (
    <div className="w-[543pt] space-y-3">
      <p className="text-[8.625pt] leading-snug text-slate-600">{intro}</p>
      <div className="grid gap-x-3 gap-y-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{children}</div>
    </div>
  );
}

export const Title = ({ children, color = INK }: { children: ReactNode; color?: string }) => <div className="text-[8.25pt] font-semibold leading-tight" style={{ color }}>{children}</div>;
export const Detail = ({ children }: { children: ReactNode }) => <div className="text-[6.75pt] leading-tight" style={{ color: MUTED }}>{children}</div>;
export const Chip = ({ children, color = R.header }: { children: ReactNode; color?: string }) => <span className="whitespace-nowrap rounded border bg-white px-1 text-[6pt] font-semibold" style={{ borderColor: color, color }}>{children}</span>;

