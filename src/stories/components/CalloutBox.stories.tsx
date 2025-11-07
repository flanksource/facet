import type { Meta, StoryObj } from '@storybook/react';
import CalloutBox from '../../components/CalloutBox';

const meta = {
  title: 'Components/CalloutBox',
  component: CalloutBox,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'warning', 'success', 'default'],
      description: 'Visual variant of the callout',
    },
  },
} satisfies Meta<typeof CalloutBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    title: 'Note',
    children: 'This is a standard callout box with default styling.',
  },
};

export const Info: Story = {
  args: {
    variant: 'info',
    title: 'Information',
    children: 'Mission Control supports automatic discovery of Kubernetes resources and cloud infrastructure.',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Warning',
    children: 'High resource usage detected. Consider scaling your infrastructure.',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Success',
    children: 'All health checks passed successfully. Your system is operating normally.',
  },
};

export const WithoutTitle: Story = {
  args: {
    variant: 'info',
    children: 'Callout content without a title.',
  },
};
