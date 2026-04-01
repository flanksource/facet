import type { Meta, StoryObj } from '@storybook/react';
import { Status } from '../../components/Status';

const meta = {
  title: 'Components/Status',
  component: Status,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['healthy', 'unhealthy', 'degraded', 'warning', 'unknown', 'suspended', 'missing'],
    },
    hideText: { control: 'boolean' },
  },
} satisfies Meta<typeof Status>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Healthy: Story = {
  args: { status: 'healthy' },
};

export const Unhealthy: Story = {
  args: { status: 'unhealthy' },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="space-y-3">
      <Status status="healthy" />
      <Status status="unhealthy" />
      <Status status="degraded" />
      <Status status="warning" />
      <Status status="unknown" />
      <Status status="suspended" />
      <Status status="missing" />
    </div>
  ),
};

export const WithCustomText: Story = {
  args: {
    status: 'healthy',
    statusText: 'All systems operational',
  },
};

export const IconOnly: Story = {
  args: {
    status: 'unhealthy',
    hideText: true,
  },
};

export const BooleanGoodBad: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm text-gray-500">good=true:</span>
        <Status good={true} statusText="Passing" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm text-gray-500">good=false:</span>
        <Status good={false} statusText="Failing" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm text-gray-500">mixed=true:</span>
        <Status mixed={true} statusText="Partial" />
      </div>
    </div>
  ),
};
