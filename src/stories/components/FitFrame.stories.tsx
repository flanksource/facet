import type { Meta, StoryObj } from '@storybook/react';
import { Arrow, BoxNode, COLORS, Diagram, FitFrame } from '../../components/diagram';

const meta = {
  title: 'Diagram/FitFrame',
  component: FitFrame,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    children: null,
    layoutWidth: 1280,
    maxHeight: undefined,
  },
  argTypes: {
    children: { control: false },
    className: { control: 'text' },
    layoutWidth: { control: 'number' },
    maxHeight: { control: 'text' },
    style: { control: 'object' },
  },
  render: (args) => (
    <FitFrame {...args}>
      <Diagram>
        {(id) => <>
          <div className="flex items-center justify-between py-24 px-24">
            <BoxNode id={id('source')} title="Source" headerColor={COLORS.primary} />
            <BoxNode id={id('target')} title="Target" headerColor={COLORS.outputBorder} />
          </div>
          <Arrow from={id('source')} to={id('target')} path="straight" labelPosition="top" labels={{ middle: 'Scaled arrow' }} />
        </>}
      </Diagram>
    </FitFrame>
  ),
} satisfies Meta<typeof FitFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FitsFrameWidth: Story = {};

export const HalfScale: Story = {
  decorators: [(Story) => <div style={{ width: 640 }}><Story /></div>],
};

export const CappedByHeight: Story = {
  args: { maxHeight: '40mm' },
};
