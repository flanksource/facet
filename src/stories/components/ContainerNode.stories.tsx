import type { Meta, StoryObj } from '@storybook/react';
import { BoxNode, ContainerNode, CONTAINER_STYLES } from '../../components/diagram';

const meta = {
  title: 'Diagram/ContainerNode', component: ContainerNode, tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: { variant: { control: 'select', options: CONTAINER_STYLES } },
  args: { title: 'Control plane', variant: 'zone', minWidth: '220px', children: <BoxNode variant="outlined" title="Run API" /> },
} satisfies Meta<typeof ContainerNode>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Vocabulary: Story = {
  render: args => <div className="grid grid-cols-3 gap-8">
    {CONTAINER_STYLES.map(variant => <div key={variant}>
      <p className="mb-2 text-xs">container/{variant}</p><ContainerNode {...args} variant={variant} />
    </div>)}
  </div>,
};
export const Nested: Story = {
  render: args => <ContainerNode {...args} title="Region" variant="region" tag="Cloud account">
    <ContainerNode title="Private network" variant="boundary"><BoxNode title="Worker" variant="card" /></ContainerNode>
  </ContainerNode>,
};
