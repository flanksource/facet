import type { Meta, StoryObj } from '@storybook/react';
import ValueProposition from '../../components/ValueProposition';
import StatCard from '../../components/StatCard';
import { IoSpeedometerOutline, IoTrendingDownOutline } from 'react-icons/io5';

const meta = {
  title: 'Components/ValueProposition',
  component: ValueProposition,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ValueProposition>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tagline: 'Single Source of Truth for Cloud & Kubernetes Infrastructure',
    description: 'Teams reduce MTTR by 85% and increase deployment frequency 3x with Mission Control\'s unified catalog, health monitoring, and automated incident response.',
  },
};

export const WithMetrics: Story = {
  args: {
    tagline: 'AI-Native Infrastructure Management',
    description: 'Mission Control provides AI agents with structured infrastructure data through the Model Context Protocol, eliminating token waste and improving accuracy.',
  },
  render: (args) => (
    <ValueProposition {...args}>
      <div style={{ display: 'flex', gap: '16px', marginTop: '24px', justifyContent: 'center' }}>
        <StatCard value="50x" label="Token Reduction" icon={IoTrendingDownOutline} variant="card" />
        <StatCard value="10x" label="Faster Queries" icon={IoSpeedometerOutline} variant="card" />
        <StatCard value="99.9%" label="Accuracy" variant="card" />
      </div>
    </ValueProposition>
  ),
};

export const Short: Story = {
  args: {
    tagline: 'Infrastructure as a Service Catalog',
    description: 'Automated discovery and monitoring for cloud and Kubernetes infrastructure.',
  },
};
