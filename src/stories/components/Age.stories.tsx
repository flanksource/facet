import type { Meta, StoryObj } from '@storybook/react';
import { Age } from '../../components/Age';

const meta = {
  title: 'Components/Age',
  component: Age,
  tags: ['autodocs'],
  argTypes: {
    suffix: {
      control: 'boolean',
      description: 'Show "ago" suffix for relative times',
    },
  },
} satisfies Meta<typeof Age>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RelativeFromNow: Story = {
  args: {
    from: new Date(Date.now() - 3600 * 1000),
    suffix: true,
  },
};

export const WithoutSuffix: Story = {
  args: {
    from: new Date(Date.now() - 3600 * 1000),
    suffix: false,
  },
};

export const DurationBetweenDates: Story = {
  args: {
    from: new Date('2024-01-01T10:00:00Z'),
    to: new Date('2024-01-01T14:30:00Z'),
    suffix: true,
  },
};

export const MillisecondDuration: Story = {
  args: {
    from: new Date('2024-01-01T10:00:00.000Z'),
    to: new Date('2024-01-01T10:00:00.500Z'),
  },
};

export const AllVariants: Story = {
  render: () => {
    const now = Date.now();
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-4">
          <span className="w-40 text-gray-500">5 minutes ago:</span>
          <Age from={new Date(now - 5 * 60 * 1000)} suffix />
        </div>
        <div className="flex items-center gap-4">
          <span className="w-40 text-gray-500">2 hours ago:</span>
          <Age from={new Date(now - 2 * 3600 * 1000)} suffix />
        </div>
        <div className="flex items-center gap-4">
          <span className="w-40 text-gray-500">3 days ago:</span>
          <Age from={new Date(now - 3 * 86400 * 1000)} suffix />
        </div>
        <div className="flex items-center gap-4">
          <span className="w-40 text-gray-500">Duration (4h):</span>
          <Age from={new Date('2024-01-01T10:00:00Z')} to={new Date('2024-01-01T14:00:00Z')} />
        </div>
        <div className="flex items-center gap-4">
          <span className="w-40 text-gray-500">Duration (500ms):</span>
          <Age from={new Date('2024-01-01T10:00:00.000Z')} to={new Date('2024-01-01T10:00:00.500Z')} />
        </div>
        <div className="flex items-center gap-4">
          <span className="w-40 text-gray-500">Empty (no from):</span>
          <Age />
          <span className="text-gray-400 italic">renders nothing</span>
        </div>
      </div>
    );
  },
};
