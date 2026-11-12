import React, { createContext, useContext } from 'react';
import type { DocumentDefaults } from './Document';

export interface ThemeSlotProps {
  title?: string;
  options: Record<string, unknown>;
  children?: React.ReactNode;
}

export interface FacetTheme {
  id: string;
  extends?: FacetTheme;
  defaults?: DocumentDefaults;
  className?: string;
  pageClassName?: string;
  slots?: Partial<Record<'cover' | 'header' | 'footer' | 'page', React.ComponentType<ThemeSlotProps>>>;
}

export const facetTheme: FacetTheme = { id: 'facet' };

export function resolveTheme(theme: FacetTheme): FacetTheme {
  const seen = new Set<FacetTheme>();
  const chain: FacetTheme[] = [];
  for (let current: FacetTheme | undefined = theme; current; current = current.extends) {
    if (seen.has(current)) throw new Error(`Theme inheritance cycle at ${current.id}`);
    if (!/^[a-z][a-z0-9-]*$/.test(current.id)) throw new Error(`Invalid theme ID: ${current.id}`);
    seen.add(current);
    chain.unshift(current);
  }
  return chain.reduce<FacetTheme>((parent, child) => ({ ...parent, ...child,
    defaults: { ...parent.defaults, ...child.defaults, margins: { ...parent.defaults?.margins, ...child.defaults?.margins } },
    slots: { ...parent.slots, ...child.slots },
  }), facetTheme);
}

const ThemeContext = createContext({ theme: facetTheme, options: {} as Record<string, unknown>, overrides: {} as { header?: boolean; footer?: boolean } });

export function ThemeProvider({ theme, options = {}, overrides = {}, children }: { theme: FacetTheme; options?: Record<string, unknown>; overrides?: { header?: boolean; footer?: boolean }; children: React.ReactNode }) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new Error('Theme options must be an object');
  return <ThemeContext.Provider value={{ theme: resolveTheme(theme), options, overrides }}>{children}</ThemeContext.Provider>;
}

export function useFacetTheme() { return useContext(ThemeContext); }
