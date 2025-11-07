import type { Meta, StoryObj } from '@storybook/react';
import ProgressBar from '../../components/ProgressBar';

const meta = {
  title: 'Components/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'danger', 'info', 'gray'],
      description: 'Color variant for the progress bar',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the progress bar',
    },
    percentage: {
      control: { type: 'range', min: 0, max: 100, step: 5 },
      description: 'Progress percentage (0-100)',
    },
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Task Completion',
    percentage: 75,
  },
};

export const AllVariants: Story = {
  name: 'All Color Variants',
  render: () => (
    <div className="space-y-3 w-96">
      <ProgressBar title="Primary" percentage={75} variant="primary" />
      <ProgressBar title="Success" percentage={85} variant="success" />
      <ProgressBar title="Warning" percentage={60} variant="warning" />
      <ProgressBar title="Danger" percentage={95} variant="danger" />
      <ProgressBar title="Info" percentage={50} variant="info" />
      <ProgressBar title="Gray" percentage={40} variant="gray" />
    </div>
  ),
};

export const WithSubtitle: Story = {
  args: {
    title: 'Security Score',
    subtitle: 'OpenSSF Scorecard',
    percentage: 88,
    variant: 'success',
    size: 'md',
  },
};

export const WithDisplayValue: Story = {
  args: {
    title: 'Before',
    percentage: 60,
    displayValue: '120ms',
    variant: 'danger',
  },
};

export const SmallSize: Story = {
  args: {
    title: 'CPU Usage',
    percentage: 45,
    size: 'sm',
    variant: 'info',
  },
};

export const LargeSize: Story = {
  args: {
    title: 'Deployment Progress',
    percentage: 92,
    size: 'lg',
    variant: 'success',
  },
};

export const WithChildren: Story = {
  name: 'With Improvement Indicator',
  args: {
    title: 'After',
    percentage: 80,
    displayValue: '45ms',
    variant: 'success',
    children: <span className="text-sm text-green-500">↑ 62%</span>,
  },
};
