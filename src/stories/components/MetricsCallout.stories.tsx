import type { Meta, StoryObj } from '@storybook/react';
import MetricsCallout from '../../components/MetricsCallout';

const meta = {
  title: 'Components/MetricsCallout',
  component: MetricsCallout,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MetricsCallout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeMetrics: Story = {
  args: {
    metrics: [
      { value: '85%', label: 'Reduction in MTTR' },
      { value: '70%', label: 'Less Alert Noise' },
      { value: '<1 Hour', label: 'Time to Value' },
    ],
  },
};

export const FourMetrics: Story = {
  args: {
    metrics: [
      { value: '50x', label: 'Token Reduction' },
      { value: '10x', label: 'Faster Queries' },
      { value: '99.9%', label: 'Uptime' },
      { value: '24/7', label: 'Monitoring' },
    ],
  },
};

export const FiveMetrics: Story = {
  args: {
    metrics: [
      { value: '85%', label: 'MTTR Reduction' },
      { value: '3x', label: 'Deployment Frequency' },
      { value: '45,234', label: 'Config Items Tracked' },
      { value: '12 minutes', label: 'Average Resolution Time' },
      { value: '99.99%', label: 'Platform Availability' },
    ],
  },
};

export const TimeMetrics: Story = {
  args: {
    metrics: [
      { value: '<5 minutes', label: 'Incident Detection' },
      { value: '15 seconds', label: 'Query Response' },
      { value: '2 hours', label: 'Setup Time' },
    ],
  },
};

export const LargeNumbers: Story = {
  args: {
    metrics: [
      { value: '1,250,000', label: 'Events Processed Daily' },
      { value: '45,234', label: 'Config Items' },
      { value: '12,500', label: 'Active Checks' },
    ],
  },
};

export const SecondaryVariant: Story = {
  args: {
    variant: 'secondary',
    metrics: [
      { value: '85%', label: 'Reduction in MTTR' },
      { value: '70%', label: 'Less Alert Noise' },
      { value: '<1 Hour', label: 'Time to Value' },
    ],
  },
};

export const WithIcons: Story = {
  args: {
    metrics: [
      { value: '85%', label: 'Uptime', icon: '⚡' },
      { value: '50x', label: 'Performance', icon: '🚀' },
      { value: '<1min', label: 'Response Time', icon: '⏱️' },
    ],
  },
};

export const SecondaryWithIcons: Story = {
  args: {
    variant: 'secondary',
    metrics: [
      { value: '99.9%', label: 'Reliability', icon: '✓' },
      { value: '24/7', label: 'Support', icon: '🛡️' },
      { value: '1000+', label: 'Customers', icon: '👥' },
    ],
  },
};
