import type { Meta, StoryObj } from '@storybook/react';
import { BrandBox, BrandContainer, BOX_STYLES, loadBrand } from '../../components/diagram';
import definition from '../../../examples/brand-diagrams/brand.json';

const brand = loadBrand({ definition, baseUrl: 'https://example.com/brand/brand.json' });
const meta = {
  title: 'Diagram/BrandNodes', component: BrandBox, tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: { variant: { control: 'select', options: BOX_STYLES }, scheme: { control: 'select', options: Object.keys(brand.schemes) } },
  args: { brand, description: 'A JSON-driven brand node', minWidth: '180px' },
} satisfies Meta<typeof BrandBox>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Header: Story = { args: { variant: 'header' } };
export const Container: Story = {
  render: args => <BrandContainer brand={brand} title="Private network" variant="boundary" tag="Trust boundary">
    <BrandBox {...args} variant="accent" /><BrandBox {...args} variant="card" title="Worker" />
  </BrandContainer>,
};
