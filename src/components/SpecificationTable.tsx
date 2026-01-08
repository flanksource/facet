import clsx from 'clsx';

interface Specification {
  category: string;
  value: string | string[];
}

interface SpecificationTableProps {
  title?: string;
  specifications: Specification[];
  className?: string;
}

/**
 * SpecificationTable Component (DS-18, DS-20)
 *
 * Pre-formatted table for technical specifications.
 * Groups technical details (versions, ports, protocols) in dedicated section.
 *
 * DS-18: Group technical details
 * DS-20: Must include deployment models, platforms, auth methods, data residency
 *
 * Usage:
 * <SpecificationTable
 *   title="System Requirements"
 *   specifications={[
 *     { category: "Kubernetes", value: "1.24+" },
 *     { category: "PostgreSQL", value: "13+" },
 *     { category: "Memory", value: "4GB minimum" },
 *     { category: "Deployment Models", value: ["SaaS", "Self-hosted", "Hybrid"] },
 *     { category: "Authentication", value: ["SSO", "SAML", "OIDC"] }
 *   ]}
 * />
 */
export default function SpecificationTable({
  title,
  specifications,
  className,
}: SpecificationTableProps) {
  const formatValue = (value: string | string[]) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value;
  };

  return (
    <section className={clsx("my-6", className)}>
      {title && <h3 className="mb-4">{title}</h3>}
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Requirement</th>
          </tr>
        </thead>
        <tbody>
          {specifications.map((spec, index) => (
            <tr key={index}>
              <td>{spec.category}</td>
              <td>{formatValue(spec.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
