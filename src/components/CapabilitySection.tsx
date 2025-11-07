import React from 'react';

interface Feature {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface CapabilitySectionProps {
  outcome: string;
  features: Feature[];
  icon?: React.ReactNode;
}

/**
 * CapabilitySection Component (DS-5, DS-17)
 *
 * @deprecated Use Section component with variant="hero" and BulletList children instead:
 * <Section variant="hero" title="Reduce MTTR by 85%">
 *   <BulletList items={[
 *     { term: "Link alerts to changes", description: "..." },
 *     { term: "Trace deployment history", description: "..." }
 *   ]} />
 * </Section>
 *
 * Displays a capability section leading with customer outcome, followed by features.
 * Enforces outcome-first structure and bold lead-in formatting.
 *
 * DS-5: Lead with outcomes, not features
 * DS-17: Use bold lead-in text followed by description
 *
 * Usage:
 * <CapabilitySection
 *   outcome="Reduce MTTR by 85% Through Automated Change Correlation"
 *   features={[
 *     {
 *       title: "Link alerts to changes",
 *       description: "Automatic correlation with CloudTrail, Git, and Kubernetes events"
 *     },
 *     {
 *       title: "Trace deployment history",
 *       description: "Show what deployed each resource and how to change it"
 *     }
 *   ]}
 * />
 */
export default function CapabilitySection({
  outcome,
  features,
  icon
}: CapabilitySectionProps) {
  return (
    <section className="capability-section">
      <h3>
        {icon && <span className="capability-icon">{icon}</span>}
        {outcome}
      </h3>
      <ul className="capability-features">
        {features.map((feature, index) => (
          <li key={index}>
            {feature.icon && <span className="feature-icon">{feature.icon}</span>}
            <strong>{feature.title}</strong> - {feature.description}
          </li>
        ))}
      </ul>
    </section>
  );
}
