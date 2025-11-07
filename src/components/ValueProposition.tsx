import React from 'react';

interface ValuePropositionProps {
  tagline: string;
  description: string;
  children?: React.ReactNode;
}

/**
 * ValueProposition Component (DS-1, DS-2)
 *
 * @deprecated Use Section component with variant="hero" instead:
 * <Section variant="hero" size="lg" title="..." description="...">
 *   <MetricsCallout metrics={[...]} />
 * </Section>
 *
 * Single-column hero section displaying product tagline and core value proposition.
 * Must appear above the fold, before any multi-column content.
 *
 * Usage:
 * <ValueProposition
 *   tagline="Single Source of Truth for Cloud & Kubernetes Infrastructure"
 *   description="Teams reduce MTTR by 85% and increase deployment frequency 3x..."
 * >
 *   <MetricsCallout metrics={[...]} />
 * </ValueProposition>
 */
export default function ValueProposition({
  tagline,
  description,
  children
}: ValuePropositionProps) {
  return (
    <section className="value-proposition">
      <h1 className="product-tagline">{tagline}</h1>
      <p className="value-description">{description}</p>
      {children}
    </section>
  );
}
