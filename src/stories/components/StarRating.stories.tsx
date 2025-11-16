import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { StarRating } from '../../components/StarRating';

const meta: Meta<typeof StarRating> = {
  title: 'Components/StarRating',
  component: StarRating,
  tags: ['autodocs'],
  argTypes: {
    mode: {
      control: 'select',
      options: ['display', 'interactive'],
      description: 'Display mode (read-only) or interactive mode (clickable)',
    },
    value: {
      control: { type: 'range', min: 1, max: 5, step: 1 },
      description: 'Star rating value (1-5)',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the stars',
    },
    showLabel: {
      control: 'boolean',
      description: 'Show rating label (Poor, Fair, Good, etc.)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof StarRating>;

export const DisplayMode: Story = {
  args: {
    mode: 'display',
    value: 4,
    size: 'md',
    showLabel: false,
  },
};

export const WithLabel: Story = {
  args: {
    mode: 'display',
    value: 3,
    size: 'md',
    showLabel: true,
  },
};

export const AllRatings: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm">1 star:</span>
        <StarRating value={1} showLabel />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm">2 stars:</span>
        <StarRating value={2} showLabel />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm">3 stars:</span>
        <StarRating value={3} showLabel />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm">4 stars:</span>
        <StarRating value={4} showLabel />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm">5 stars:</span>
        <StarRating value={5} showLabel />
      </div>
    </div>
  ),
};

export const SizeVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm">Small:</span>
        <StarRating value={4} size="sm" showLabel />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm">Medium:</span>
        <StarRating value={4} size="md" showLabel />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm">Large:</span>
        <StarRating value={4} size="lg" showLabel />
      </div>
    </div>
  ),
};

export const Interactive: Story = {
  render: () => {
    const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Click on a star to change the rating</p>
        <StarRating mode="interactive" value={rating} onChange={setRating} showLabel />
        <p className="text-sm text-gray-500">Current rating: {rating}</p>
      </div>
    );
  },
};
