// @live
import { Arrow, BrandBox, BrandContainer, Diagram, loadBrand } from '@flanksource/facet';
import primary from './brand.json';
import partnerDefinition from './partner/brand.json';

const brand = loadBrand({ definition: primary, baseUrl: 'https://example.com/brand/brand.json' });
const partner = loadBrand({ definition: partnerDefinition, baseUrl: 'https://example.com/partner/brand.json' });

export default function MixedBrands() {
  return <div data-example-diagram style={{ display: 'inline-block', padding: 32, backgroundColor: brand.schemes[brand.defaultScheme].surface }}>
    <Diagram>{id => <BrandContainer brand={brand} title="Region" variant="region" tag="Cloud account">
      <BrandContainer brand={brand} title="Private network" variant="boundary">
        <div className="flex items-center gap-16 py-4">
          <BrandBox brand={brand} id={id('source')} title="Control plane" variant="header" minWidth="180px" shadow="shadow-none" />
          <BrandBox brand={partner} id={id('target')} title="Partner runtime" variant="stacked" minWidth="180px" shadow="shadow-none" />
        </div>
      </BrandContainer>
      <Arrow variant="secondary" from={id('source')} to={id('target')} path="straight" startAnchor="right" endAnchor="left" />
    </BrandContainer>}</Diagram>
  </div>;
}
