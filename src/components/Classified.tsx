import React, { createContext, useContext } from 'react';
import { permits } from '../../remark/facet-redact.mjs';

/** Permitted values per classifying attribute, as given by `--allow attr=values`. */
export interface RedactPolicy {
  allow: Record<string, string[]>;
}

declare global {
  /** The build's redaction policy, compiled in by the facet CLI's Vite config. */
  // eslint-disable-next-line no-var
  var __FACET_REDACT__: RedactPolicy | undefined;
}

const RedactPolicyContext = createContext<RedactPolicy | null>(null);

/** Overrides the build's policy, for Storybook, tests and embedding outside the facet CLI. */
export function RedactPolicyProvider({ policy, children }: { policy: RedactPolicy; children: React.ReactNode }) {
  return <RedactPolicyContext.Provider value={policy}>{children}</RedactPolicyContext.Provider>;
}

function buildPolicy(): RedactPolicy {
  // Replaced at build time by the facet CLI; absent elsewhere, which fails closed below.
  return typeof __FACET_REDACT__ === 'undefined' ? { allow: {} } : __FACET_REDACT__;
}

export interface ClassifiedProps {
  children?: React.ReactNode;
  /** Classifying attributes, e.g. `tier="Internal"`; every one must be permitted by `--allow`. */
  [attribute: string]: React.ReactNode | string | undefined;
}

/**
 * A region only some outputs may carry: kept when `--allow` permits every attribute
 * it declares, removed otherwise, and failing the render when an attribute has no
 * policy. The same rule as `<Classified>` in Markdown, applied at render time so it
 * also governs TSX content and props the Markdown plugin never sees.
 *
 * Removal from the rendered output, not the bundle: for TSX templates the text still
 * ships in the JavaScript. Markdown regions are removed before bundling.
 */
export default function Classified({ children, ...attributes }: ClassifiedProps) {
  const policy = useContext(RedactPolicyContext) ?? buildPolicy();
  const classification = Object.fromEntries(Object.entries(attributes).map(([name, value]) => {
    if (typeof value !== 'string') throw new Error(`<Classified> attribute ${name} must be a string, received ${typeof value}`);
    return [name, value];
  }));
  return permits(policy.allow, classification, 'Classified') ? <>{children}</> : null;
}
