import type { Meta, StoryObj } from '@storybook/react';
import MetricHeader from '../../components/MetricHeader';

const meta = {
  title: 'Components/MetricHeader',
  component: MetricHeader,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['gauge', 'comparison'],
      description: 'Display variant: gauge for scores, comparison for before/after',
    },
  },
} satisfies Meta<typeof MetricHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GaugeDefault: Story = {
  args: {
    variant: 'gauge',
    title: 'Security Score',
    subtitle: 'OpenSSF Scorecard',
    score: 8.5,
    maxScore: 10,
    size: 'md',
  },
};

export const GaugeSmall: Story = {
  args: {
    variant: 'gauge',
    title: 'Compliance Score',
    score: 7,
    maxScore: 10,
    size: 'sm',
  },
};

export const GaugeLarge: Story = {
  args: {
    variant: 'gauge',
    title: 'Overall Health',
    subtitle: 'System Status',
    score: 9.2,
    maxScore: 10,
    size: 'lg',
  },
};

export const ComparisonDefault: Story = {
  args: {
    variant: 'comparison',
    title: 'Response Time Improvement',
    subtitle: 'After optimization',
    before: { value: 500, unit: 'ms' },
    after: { value: 45, unit: 'ms' },
    showBars: true,
  },
};

export const ComparisonWithImprovement: Story = {
  args: {
    variant: 'comparison',
    title: 'Build Time',
    before: { value: 120, unit: 'seconds' },
    after: { value: 30, unit: 'seconds' },
    showBars: true,
  },
};

export const ComparisonRegression: Story = {
  name: 'Comparison (Regression)',
  args: {
    variant: 'comparison',
    title: 'Memory Usage',
    subtitle: 'Increased after deployment',
    before: { value: 2, unit: 'GB' },
    after: { value: 4.5, unit: 'GB' },
    showBars: true,
  },
};
