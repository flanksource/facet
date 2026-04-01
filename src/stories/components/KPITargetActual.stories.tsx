import type { Meta, StoryObj } from '@storybook/react';
import KPITargetActual from '../../components/KPITargetActual';

const meta = {
  title: 'Components/KPITargetActual',
  component: KPITargetActual,
  tags: ['autodocs'],
} satisfies Meta<typeof KPITargetActual>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ExceededTarget: Story = {
  args: {
    kpi: {
      metric: 'Deployment Frequency',
      target: { value: 10, type: 'count', unit: '/week' },
      actual: { value: 14, type: 'count', unit: '/week' },
    },
  },
};

export const BelowTarget: Story = {
  args: {
    kpi: {
      metric: 'Mean Time to Recovery',
      target: { value: 30, type: 'time', unit: 'min' },
      actual: { value: 45, type: 'time', unit: 'min' },
      percentageOfTarget: 67,
    },
  },
};

export const PercentageMetric: Story = {
  args: {
    kpi: {
      metric: 'Test Coverage',
      target: { value: 90, type: 'percentage', unit: '%' },
      actual: { value: 92, type: 'percentage', unit: '%', displayValue: '92%' },
    },
  },
};

export const AllVariants: Story = {
  args: { kpi: { metric: '', target: { value: 0, type: 'count' }, actual: { value: 0, type: 'count' } } },
  render: () => (
    <div className="grid grid-cols-2 gap-4 max-w-2xl">
      <KPITargetActual kpi={{
        metric: 'Uptime SLA',
        target: { value: 99.9, type: 'percentage', unit: '%' },
        actual: { value: 99.95, type: 'percentage', unit: '%' },
      }} />
      <KPITargetActual kpi={{
        metric: 'Response Time',
        target: { value: 200, type: 'time', unit: 'ms' },
        actual: { value: 350, type: 'time', unit: 'ms' },
        percentageOfTarget: 57,
      }} />
      <KPITargetActual kpi={{
        metric: 'Tickets Resolved',
        target: { value: 50, type: 'count' },
        actual: { value: 50, type: 'count' },
        percentageOfTarget: 100,
      }} />
      <KPITargetActual kpi={{
        metric: 'Cost Reduction',
        target: { value: 20, type: 'percentage', unit: '%' },
        actual: { value: 35, type: 'percentage', unit: '%' },
      }} />
    </div>
  ),
};
