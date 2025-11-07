import type { Meta, StoryObj } from '@storybook/react';
import ScoreGauge from '../../components/ScoreGauge';

const meta = {
  title: 'Components/ScoreGauge',
  component: ScoreGauge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    score: {
      control: { type: 'range', min: 0, max: 10, step: 0.5 },
      description: 'Score value (0-10 scale)',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Gauge size',
    },
  },
} satisfies Meta<typeof ScoreGauge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    score: 8.5,
    label: 'Security Score',
    size: 'md',
  },
};

export const LowScore: Story = {
  args: {
    score: 3.2,
    label: 'Low Score (Red)',
    size: 'md',
  },
};

export const MediumScore: Story = {
  args: {
    score: 5.5,
    label: 'Medium Score (Yellow)',
    size: 'md',
  },
};

export const HighScore: Story = {
  args: {
    score: 9.1,
    label: 'High Score (Green)',
    size: 'md',
  },
};

export const SmallSize: Story = {
  args: {
    score: 7.5,
    label: 'Small Gauge',
    size: 'sm',
  },
};

export const LargeSize: Story = {
  args: {
    score: 8.8,
    label: 'Large Gauge',
    size: 'lg',
  },
};

export const AllScores: Story = {
  name: 'All Score Ranges',
  render: () => (
    <div className="flex gap-8 items-center">
      <ScoreGauge score={2.5} label="Critical" />
      <ScoreGauge score={5.0} label="Warning" />
      <ScoreGauge score={8.5} label="Good" />
      <ScoreGauge score={10.0} label="Perfect" />
    </div>
  ),
};
