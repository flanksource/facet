import type { Meta, StoryObj } from '@storybook/react';
import { Arrow, BoxNode, COLORS, Diagram } from '../../components/diagram';

const meta = {
  title: 'Diagram/Diagram',
  component: Diagram,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    className: '',
    colors: COLORS,
    children: () => null,
  },
  argTypes: {
    children: { control: false },
    colors: { control: 'object' },
    className: { control: 'text' },
  },
  render: (args) => (
    <Diagram {...args}>
      {(id) => <>
        <div className="flex items-center justify-center gap-28 py-14">
          <BoxNode id={id('source')} title="Source" headerColor={COLORS.primary} />
          <BoxNode id={id('target')} title="Target" headerColor={COLORS.outputBorder} />
        </div>
        <Arrow from={id('source')} to={id('target')} path="straight" labelPosition="top" labels={{ middle: 'Direct layout' }} />
      </>}
    </Diagram>
  ),
} satisfies Meta<typeof Diagram>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Controlled: Story = {};
