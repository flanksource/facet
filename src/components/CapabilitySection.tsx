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
    <section className="mb-[6mm]">
      <h3 className="flex items-center gap-[2mm]">
        {icon && <span className="inline-flex w-[5mm] h-[5mm]">{icon}</span>}
        {outcome}
      </h3>
      <ul className="m-[3mm_0_0_8mm] p-0 list-none">
        {features.map((feature, index) => (
          <li key={index} className="relative pl-[5mm] mb-[2mm] before:content-[''] before:absolute before:left-0 before:top-[0.35em] before:w-[3mm] before:h-[3mm] before:bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%203%203%27%3E%3Ccircle%20cx=%271.5%27%20cy=%271.5%27%20r=%271.2%27%20fill=%27none%27%20stroke=%27%233578e5%27%20stroke-width=%270.3%27/%3E%3C/svg%3E')] before:bg-contain before:bg-no-repeat before:bg-center">
            {feature.icon && <span className="inline-flex align-middle mr-[1mm] text-gray-400">{feature.icon}</span>}
            <strong>{feature.title}</strong> - {feature.description}
          </li>
        ))}
      </ul>
    </section>
  );
}
