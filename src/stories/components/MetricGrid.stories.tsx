import type { Meta, StoryObj } from '@storybook/react';
import MetricGrid from '../../components/MetricGrid';
import { IoSpeedometerOutline, IoCheckmarkCircleOutline, IoCloudOutline } from 'react-icons/io5';

const meta = {
  title: 'Components/MetricGrid',
  component: MetricGrid,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    columns: {
      control: 'select',
      options: [2, 3, 4],
      description: 'Number of columns in grid',
    },
  },
} satisfies Meta<typeof MetricGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoColumns: Story = {
  args: {
    columns: 2,
    metrics: [
      { value: '99.9%', label: 'Uptime', icon: IoCheckmarkCircleOutline, valueColor: 'green' },
      { value: '45ms', label: 'Response Time', icon: IoSpeedometerOutline, valueColor: 'blue' },
      { value: '2000+', label: 'Integrations', icon: IoCloudOutline, valueColor: 'blue' },
      { value: '24/7', label: 'Support', valueColor: 'gray' },
    ],
  },
};

export const ThreeColumns: Story = {
  args: {
    columns: 3,
    metrics: [
      { value: '100%', label: 'Coverage', valueColor: 'green' },
      { value: '50x', label: 'Faster', valueColor: 'blue' },
      { value: '0', label: 'Downtime', valueColor: 'green' },
      { value: '1M+', label: 'Resources', valueColor: 'blue' },
      { value: '500+', label: 'Customers', valueColor: 'gray' },
      { value: '10ms', label: 'Query Time', valueColor: 'blue' },
    ],
  },
};

export const FourColumns: Story = {
  args: {
    columns: 4,
    metrics: [
      { value: '8.5', label: 'Security Score', valueColor: 'green' },
      { value: '142', label: 'Active Checks', valueColor: 'blue' },
      { value: '99.8%', label: 'Availability', valueColor: 'green' },
      { value: '25ms', label: 'Latency', valueColor: 'blue' },
    ],
  },
};
