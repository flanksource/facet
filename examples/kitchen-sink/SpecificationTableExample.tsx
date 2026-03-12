import { SpecificationTable } from '@facet';

const specifications = [
  { category: 'Kubernetes', value: '1.24+' },
  { category: 'PostgreSQL', value: '13+' },
  { category: 'Memory', value: '4GB minimum' },
  { category: 'Deployment Models', value: ['SaaS', 'Self-hosted', 'Hybrid'] },
  { category: 'Authentication', value: ['SSO', 'SAML', 'OIDC'] },
];

export default function SpecificationTableExample() {
  return (
    <div className="space-y-10 p-6">
      <h1 className="text-2xl font-bold">SpecificationTable Examples</h1>

      <section>
        <h2 className="text-lg font-semibold mb-2">Default (sm)</h2>
        <SpecificationTable title="System Requirements" specifications={specifications} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">size=xs</h2>
        <SpecificationTable title="System Requirements" specifications={specifications} size="xs" />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">size=base</h2>
        <SpecificationTable title="System Requirements" specifications={specifications} size="base" />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">size=md</h2>
        <SpecificationTable title="System Requirements" specifications={specifications} size="md" />
      </section>
    </div>
  );
}
