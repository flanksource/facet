import type { Meta, StoryObj } from '@storybook/react';
import SeverityStatCard from '../../components/SeverityStatCard';

const meta = {
  title: 'Components/SeverityStatCard',
  component: SeverityStatCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['red', 'orange', 'yellow', 'blue', 'green', 'gray'],
      description: 'Severity color theme',
    },
    downIsGood: {
      control: 'boolean',
      description: 'Whether a downward trend is positive (for errors, vulnerabilities)',
    },
  },
} satisfies Meta<typeof SeverityStatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Critical: Story = {
  args: {
    color: 'red',
    value: 8,
    label: 'Critical',
    trend: {
      added: 3,
      closed: 1,
      delta: 2,
    },
    downIsGood: true,
  },
};

export const High: Story = {
  args: {
    color: 'orange',
    value: 15,
    label: 'High',
    trend: {
      added: 2,
      closed: 5,
      delta: -3,
    },
    downIsGood: true,
  },
};

export const Medium: Story = {
  args: {
    color: 'yellow',
    value: 22,
    label: 'Medium',
  },
};

export const Low: Story = {
  args: {
    color: 'blue',
    value: 5,
    label: 'Low',
  },
};

export const NoTrend: Story = {
  args: {
    color: 'red',
    value: 12,
    label: 'Critical (No Trend)',
  },
};

export const AllSeverities: Story = {
  name: 'All Severity Levels',
  render: () => (
    <div className="flex gap-4">
      <SeverityStatCard color="red" value={8} label="Critical" />
      <SeverityStatCard color="orange" value={15} label="High" />
      <SeverityStatCard color="yellow" value={22} label="Medium" />
      <SeverityStatCard color="blue" value={5} label="Low" />
    </div>
  ),
};
