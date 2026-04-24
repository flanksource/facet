const warnedKeys = new Set<string>();

/**
 * Safely look up a size variant in a class-name map. Returns the fallback when
 * `size` is missing, undefined, or otherwise not a key in `map`. Warns once per
 * `(componentName, size)` pair so typos surface without crashing SSR.
 *
 * Replaces the error-prone `sizeMap[size].container` pattern that throws when
 * `size` isn't a known key.
 */
export function resolveSizeVariant<T>(
  size: unknown,
  map: Record<string, T>,
  fallback: T,
  componentName?: string,
): T {
  if (typeof size === 'string' && Object.prototype.hasOwnProperty.call(map, size)) {
    return map[size];
  }

  const key = `${componentName ?? 'component'}:${String(size)}`;
  if (!warnedKeys.has(key) && size != null) {
    warnedKeys.add(key);
    const valid = Object.keys(map).join(', ');
    console.warn(
      `[facet] ${componentName ?? 'Component'}: unknown size "${String(size)}", falling back to default. Valid sizes: ${valid}`,
    );
  }

  return fallback;
}
