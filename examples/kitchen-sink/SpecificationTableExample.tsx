import { SpecificationTable } from '@facet';
import { specifications as baseSpecs } from './data';

const specifications = [
  ...baseSpecs,
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
