// @live
import { Arrow, BrandBox, BrandContainer, Diagram, loadBrand } from '@flanksource/facet';
import definition from './brand.json';

const brand = loadBrand({ definition, baseUrl: 'https://example.com/brand/brand.json' });

export default function SingleBrand() {
  return <div data-example-diagram style={{ display: 'inline-block', padding: 32, backgroundColor: brand.schemes[brand.defaultScheme].surface }}>
    <Diagram>{id => <BrandContainer brand={brand} title="Control plane" variant="zone">
      <div className="flex items-center gap-16 py-4">
        <BrandBox brand={brand} id={id('api')} title="Run API" variant="header" description="Validates requests" minWidth="180px" shadow="shadow-none" />
        <BrandBox brand={brand} id={id('worker')} title="Worker" variant="accent" description="Executes approved work" minWidth="180px" shadow="shadow-none" />
      </div>
      <Arrow variant="secondary" from={id('api')} to={id('worker')} path="straight" startAnchor="right" endAnchor="left" />
    </BrandContainer>}</Diagram>
  </div>;
}
