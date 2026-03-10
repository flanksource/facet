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
        <h2 className="text-lg font-semibold mb-2">Default Sizes</h2>
        <SpecificationTable title="System Requirements" specifications={specifications} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">fontSize=8pt, headerFontSize=10pt</h2>
        <SpecificationTable title="System Requirements" specifications={specifications} fontSize="8pt" headerFontSize="10pt" />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">fontSize=6pt, headerFontSize=8pt</h2>
        <SpecificationTable title="System Requirements" specifications={specifications} fontSize="6pt" headerFontSize="8pt" />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">fontSize=12pt, headerFontSize=14pt</h2>
        <SpecificationTable title="System Requirements" specifications={specifications} fontSize="12pt" headerFontSize="14pt" />
      </section>
    </div>
  );
}
