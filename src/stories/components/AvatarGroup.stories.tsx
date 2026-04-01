import type { Meta, StoryObj } from '@storybook/react';
import { AvatarGroup } from '../../components/AvatarGroup';

const sampleUsers = [
  { name: 'Alice Johnson', avatar: 'https://i.pravatar.cc/150?u=alice' },
  { name: 'Bob Smith', avatar: 'https://i.pravatar.cc/150?u=bob' },
  { name: 'Carol White', avatar: 'https://i.pravatar.cc/150?u=carol' },
  { name: 'David Brown' },
  { name: 'Eve Davis' },
  { name: 'Frank Miller' },
  { name: 'Grace Lee' },
];

const meta = {
  title: 'Components/AvatarGroup',
  component: AvatarGroup,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
    },
    maxCount: { control: { type: 'number', min: 1, max: 10 } },
  },
} satisfies Meta<typeof AvatarGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    users: sampleUsers.slice(0, 4),
    size: 'md',
  },
};

export const WithMaxCount: Story = {
  args: {
    users: sampleUsers,
    maxCount: 3,
    size: 'md',
  },
};

export const Sizes: Story = {
  args: { users: [] },
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="w-16 text-sm text-gray-500">xs:</span>
        <AvatarGroup users={sampleUsers.slice(0, 4)} size="xs" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-16 text-sm text-gray-500">sm:</span>
        <AvatarGroup users={sampleUsers.slice(0, 4)} size="sm" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-16 text-sm text-gray-500">md:</span>
        <AvatarGroup users={sampleUsers.slice(0, 4)} size="md" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-16 text-sm text-gray-500">lg:</span>
        <AvatarGroup users={sampleUsers.slice(0, 4)} size="lg" />
      </div>
    </div>
  ),
};
