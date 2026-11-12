export interface FacetRedactOptions {
  /** Delimiting element name, default `Classified`. */
  element?: string;
  /** Permitted values per classifying attribute. */
  allow?: Record<string, string[]>;
}

/** True when every attribute's value is permitted; throws when an attribute has no policy (fail closed). */
export function permits(allow: Record<string, string[]>, attributes: Record<string, string>, element: string): boolean;

export default function facetRedact(options?: FacetRedactOptions): (tree: { children: unknown[] }) => void;
