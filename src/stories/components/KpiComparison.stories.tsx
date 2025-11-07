import type { Meta, StoryObj } from '@storybook/react';
import KpiComparison from '../../components/KpiComparison';

const meta = {
  title: 'Components/KpiComparison',
  component: KpiComparison,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    format: {
      control: 'select',
      options: ['time', 'percentage', 'count', 'custom'],
      description: 'Format type for visualization',
    },
  },
} satisfies Meta<typeof KpiComparison>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Response Time',
    before: { value: 330, displayValue: '5m 30s', unit: 'seconds' },
    after: { value: 45, displayValue: '45s', unit: 'seconds' },
    improvement: 86.4,
    format: 'time',
    showSummary: true,
    showImprovement: true,
  },
};

export const PercentageFormat: Story = {
  args: {
    label: 'Test Coverage',
    before: { value: 65, displayValue: '65%', unit: '%' },
    after: { value: 92, displayValue: '92%', unit: '%' },
    improvement: 41.5,
    format: 'percentage',
    showSummary: true,
    showImprovement: true,
  },
};

export const CountFormat: Story = {
  args: {
    label: 'Active Checks',
    before: { value: 50, displayValue: '50' },
    after: { value: 142, displayValue: '142' },
    improvement: 184,
    format: 'count',
    showImprovement: true,
  },
};

export const NegativeImprovement: Story = {
  args: {
    label: 'Error Rate',
    before: { value: 2, displayValue: '2%', unit: '%' },
    after: { value: 5, displayValue: '5%', unit: '%' },
    improvement: -150,
    format: 'percentage',
    showSummary: true,
    showImprovement: true,
  },
};
