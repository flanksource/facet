import type { Meta, StoryObj } from '@storybook/react';
import { Shield } from '../../components/Shield/Shield';
import { IoCheckmarkCircle, IoWarning, IoStar } from 'react-icons/io5';

const meta = {
  title: 'Components/Shield',
  component: Shield,
  tags: ['autodocs'],
  argTypes: {
    theme: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'high', 'error', 'info'],
    },
    size: {
      control: 'select',
      options: ['h-3', 'h-4', 'h-5', 'h-6'],
    },
  },
} satisfies Meta<typeof Shield>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'build',
    value: 'passing',
    theme: 'success',
  },
};

export const ValueOnly: Story = {
  args: {
    value: 'v1.2.3',
    theme: 'primary',
  },
};

export const Themes: Story = {
  args: { value: 'passing' },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Shield label="build" value="passing" theme="success" />
      <Shield label="tests" value="2 failed" theme="error" />
      <Shield label="coverage" value="68%" theme="warning" />
      <Shield label="severity" value="high" theme="high" />
      <Shield label="version" value="1.0.0" theme="primary" />
      <Shield label="status" value="beta" theme="info" />
      <Shield label="stage" value="archived" theme="secondary" />
    </div>
  ),
};

export const Sizes: Story = {
  args: { value: '1.0.0' },
  render: () => (
    <div className="flex flex-col gap-3">
      {(['h-3', 'h-4', 'h-5', 'h-6'] as const).map((size) => (
        <div key={size} className="flex items-center gap-4">
          <span className="w-12 text-sm text-gray-500">{size}:</span>
          <Shield label="version" value="1.0.0" size={size} />
        </div>
      ))}
    </div>
  ),
};

export const WithIcons: Story = {
  args: { value: 'passing' },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Shield label="status" value="passing" theme="success" icon={<IoCheckmarkCircle />} />
      <Shield label="alerts" value="3" theme="warning" icon={<IoWarning />} />
      <Shield value="featured" theme="info" icon={<IoStar />} />
    </div>
  ),
};

export const AsLink: Story = {
  args: {
    label: 'docs',
    value: 'available',
    theme: 'info',
    href: '#',
    ariaLabel: 'View documentation',
  },
};
