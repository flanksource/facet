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
    <section className="mb-8">
      <h1 className="text-blue-600 font-bold text-2xl leading-8 mb-4">{tagline}</h1>
      <p className="text-gray-700 text-sm leading-4 mb-6">{description}</p>
      {children}
    </section>
  );
}
