export interface TypeStep { pt: number; leading: number }
export const TEXT_SCALE: Record<'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl', TypeStep>;
export const ELEMENT_SCALE: Record<'body' | 'h1' | 'h2' | 'h3' | 'h4' | 'p', TypeStep>;
export function tailwindThemeBlock(): string;
export const theme: string;
