import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from '../../components/Avatar';

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
    },
    circular: { control: 'boolean' },
    showName: { control: 'boolean' },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithInitials: Story = {
  args: {
    user: { name: 'John Doe', email: 'john@example.com' },
    size: 'md',
  },
};

export const WithImage: Story = {
  args: {
    user: { name: 'Jane Smith', avatar: 'https://i.pravatar.cc/150?u=jane' },
    size: 'md',
  },
};

export const WithName: Story = {
  args: {
    user: { name: 'Alice Johnson' },
    size: 'md',
    showName: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar user={{ name: 'AB' }} size="xs" />
      <Avatar user={{ name: 'AB' }} size="sm" />
      <Avatar user={{ name: 'AB' }} size="md" />
      <Avatar user={{ name: 'AB' }} size="lg" />
    </div>
  ),
};

export const SquareVariant: Story = {
  args: {
    user: { name: 'Square Avatar' },
    size: 'lg',
    circular: false,
  },
};

export const FallbackIcon: Story = {
  args: {
    user: { name: '' },
    size: 'md',
  },
};
