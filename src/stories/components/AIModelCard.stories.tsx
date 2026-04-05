import type { Meta, StoryObj } from '@storybook/react';
import AIModelCard from '../../components/AIModelCard';
import { SiOpenai } from 'react-icons/si';
import { IoSparkles } from 'react-icons/io5';

const meta = {
  title: 'Components/AIModelCard',
  component: AIModelCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['card', 'compact', 'bordered'],
    },
  },
} satisfies Meta<typeof AIModelCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'GPT-4o',
    model: 'gpt-4o-2024-08-06',
    tokensUsed: 1_254_300,
    cost: 3.42,
  },
};

export const WithIcon: Story = {
  args: {
    name: 'GPT-4o',
    model: 'gpt-4o-2024-08-06',
    tokensUsed: 1_254_300,
    cost: 3.42,
    icon: SiOpenai,
  },
};

export const Bordered: Story = {
  args: {
    name: 'Claude 3.5 Sonnet',
    model: 'claude-3-5-sonnet-20241022',
    tokensUsed: 842_000,
    cost: 1.87,
    icon: IoSparkles,
    variant: 'bordered',
  },
};

export const Compact: Story = {
  args: {
    name: 'GPT-4o Mini',
    model: 'gpt-4o-mini',
    tokensUsed: 52_300,
    cost: 0.0042,
    variant: 'compact',
  },
};

export const LowUsage: Story = {
  args: {
    name: 'Embedding Model',
    model: 'text-embedding-3-small',
    tokensUsed: 450,
    cost: 0.0001,
    variant: 'bordered',
  },
};

export const MultipleCards: StoryObj = {
  render: () => (
    <div className="flex gap-4">
      <AIModelCard
        name="GPT-4o"
        model="gpt-4o-2024-08-06"
        tokensUsed={1_254_300}
        cost={3.42}
        icon={SiOpenai}
        variant="bordered"
      />
      <AIModelCard
        name="Claude 3.5 Sonnet"
        model="claude-3-5-sonnet-20241022"
        tokensUsed={842_000}
        cost={1.87}
        icon={IoSparkles}
        variant="bordered"
      />
      <AIModelCard
        name="GPT-4o Mini"
        model="gpt-4o-mini"
        tokensUsed={5_230_000}
        cost={0.52}
        icon={SiOpenai}
        variant="bordered"
      />
    </div>
  ),
};
