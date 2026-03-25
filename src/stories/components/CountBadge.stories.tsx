import type { Meta, StoryObj } from '@storybook/react';
import { CountBadge } from '../../components/CountBadge';

const meta = {
  title: 'Components/CountBadge',
  component: CountBadge,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md'],
    },
    colorClass: { control: 'text' },
    roundedClass: { control: 'text' },
  },
} satisfies Meta<typeof CountBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 5 },
};

export const ValueLengths: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <CountBadge value={3} />
      <CountBadge value={42} />
      <CountBadge value={128} />
      <CountBadge value={1024} />
    </div>
  ),
};

export const CustomColors: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <CountBadge value={7} colorClass="bg-blue-100 text-blue-800" />
      <CountBadge value={7} colorClass="bg-red-100 text-red-800" />
      <CountBadge value={7} colorClass="bg-green-100 text-green-800" />
      <CountBadge value={7} colorClass="bg-yellow-100 text-yellow-800" />
    </div>
  ),
};
