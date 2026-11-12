export interface PageStylesRecipe {
  name: string;
  layer: string;
  base: string[];
  extends?: string[];
  entry: string;
  theme: string;
  runtimeDependencies: string[];
  transform?(css: string): string;
}
export function wrapFacetStylesInLayer(css: string): string;
export function transform(css: string): string;
export function createPageStyles(): PageStylesRecipe & { transform(css: string): string };
