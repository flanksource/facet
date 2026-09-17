import type { Meta, StoryObj } from '@storybook/react';
import { Arrow, BoxNode, COLORS, DiagreDiagram } from '../../components/diagram';

const meta = {
  title: 'Diagram/DiagreDiagram',
  component: DiagreDiagram,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    direction: 'LR',
    gapX: { min: 40, max: 120 },
    gapY: { min: 32, max: 72 },
    className: '',
    colors: COLORS,
    children: () => null,
  },
  argTypes: {
    children: { control: false },
    direction: { control: 'select', options: ['LR', 'TB'] },
    gapX: { control: 'object' },
    gapY: { control: 'object' },
    colors: { control: 'object' },
    className: { control: 'text' },
  },
  render: (args) => (
    <DiagreDiagram {...args}>
      {(id) => <>
        <BoxNode id={id('input')} title="Input" headerColor={COLORS.primary} minWidth="120px" />
        <BoxNode id={id('process')} title="Process" headerColor={COLORS.accent} minWidth="120px" ports={[{ id: id('process-api'), position: 'left-middle', label: 'API' }]} />
        <BoxNode id={id('output')} title="Output" headerColor={COLORS.outputBorder} minWidth="120px" />
        <Arrow from={id('input')} to={id('process-api')} path="straight" labelPosition="top" labels={{ middle: 'request' }} />
        <Arrow from={id('process')} to={id('output')} path="straight" labelPosition="bottom" labels={{ middle: 'result' }} />
      </>}
    </DiagreDiagram>
  ),
} satisfies Meta<typeof DiagreDiagram>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Controlled: Story = {};

export const TopToBottom: Story = {
  args: { direction: 'TB' },
};
