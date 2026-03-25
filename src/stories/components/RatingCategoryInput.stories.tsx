import type { Meta, StoryObj } from '@storybook/react';
import RatingCategoryInput from '../../components/RatingCategoryInput';

const meta = {
  title: 'Components/RatingCategoryInput',
  component: RatingCategoryInput,
  tags: ['autodocs'],
} satisfies Meta<typeof RatingCategoryInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    rating: {
      category: 'Technical Feasibility',
      rating: 4,
      notes: 'Strong technical fit with existing infrastructure',
    },
  },
};

export const WithoutNotes: Story = {
  args: {
    rating: {
      category: 'Security',
      rating: 5,
    },
  },
};

export const AllCategories: Story = {
  args: { rating: { category: 'Security', rating: 3 } },
  render: () => (
    <div className="space-y-3 max-w-lg">
      <RatingCategoryInput rating={{ category: 'Technical Feasibility', rating: 4, notes: 'Well-suited for our stack' }} />
      <RatingCategoryInput rating={{ category: 'User Experience', rating: 3, notes: 'Decent UI, some rough edges' }} />
      <RatingCategoryInput rating={{ category: 'Performance & Scalability', rating: 5 }} />
      <RatingCategoryInput rating={{ category: 'Integration Complexity', rating: 2, notes: 'Requires significant custom work' }} />
      <RatingCategoryInput rating={{ category: 'Security', rating: 4 }} />
    </div>
  ),
};
