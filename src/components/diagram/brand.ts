import type { NodeFonts, NodePalette } from './nodeStyles';

export interface BrandArtwork {
  light: string;
  dark: string;
  small?: { below: number; light: string; dark: string };
}

export interface BrandDefinition {
  id: string;
  name: string;
  defaultScheme: string;
  fonts: NodeFonts;
  schemes: Record<string, NodePalette>;
  marks: Record<string, BrandArtwork>;
}

export interface LoadBrandOptions {
  definition: BrandDefinition;
  baseUrl: string;
  /** Convert resolved artwork URLs to bundled or embedded assets. */
  resolveAsset?: (url: string) => string;
}

function requireText(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Brand ${field} must be a non-empty string`);
}

function resolveArtwork(art: BrandArtwork, options: LoadBrandOptions): BrandArtwork {
  requireText(art?.light, 'artwork.light');
  requireText(art?.dark, 'artwork.dark');
  const resolve = (src: string): string => {
    const url = new URL(src, options.baseUrl).href;
    const result = options.resolveAsset ? options.resolveAsset(url) : url;
    requireText(result, 'resolved artwork');
    return result;
  };
  const resolved = { light: resolve(art.light), dark: resolve(art.dark) };
  if (!art.small) return resolved;
  if (!Number.isFinite(art.small.below) || art.small.below <= 0) throw new Error('Brand artwork.small.below must be positive');
  return { ...resolved, small: { ...resolveArtwork(art.small, options), below: art.small.below } };
}

export function loadBrand(options: LoadBrandOptions): BrandDefinition {
  const { definition } = options;
  requireText(definition?.id, 'id');
  requireText(definition.name, 'name');
  requireText(definition.defaultScheme, 'defaultScheme');
  for (const font of ['heading', 'body', 'mono'] as const) requireText(definition.fonts?.[font], `fonts.${font}`);
  if (!definition.schemes || !Object.prototype.hasOwnProperty.call(definition.schemes, definition.defaultScheme)) throw new Error(`Brand ${definition.id}: missing default scheme ${definition.defaultScheme}`);
  for (const [name, scheme] of Object.entries(definition.schemes)) {
    for (const key of ['accent', 'tint', 'containerTint', 'border', 'surface', 'panel', 'panelBorder', 'text', 'muted', 'onAccent', 'dark', 'onDark'] as const) {
      requireText(scheme?.[key], `schemes.${name}.${key}`);
    }
  }
  if (!definition.marks || !Object.prototype.hasOwnProperty.call(definition.marks, 'symbol')) throw new Error(`Brand ${definition.id}: missing symbol artwork`);
  return { ...definition, marks: Object.fromEntries(Object.entries(definition.marks).map(([key, artwork]) => [key, resolveArtwork(artwork, options)])) };
}

export function brandScheme(brand: BrandDefinition, name = brand.defaultScheme): NodePalette {
  const scheme = brand.schemes[name];
  if (!Object.prototype.hasOwnProperty.call(brand.schemes, name)) throw new Error(`Brand ${brand.id}: missing scheme ${name}`);
  return scheme;
}
