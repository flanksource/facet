import type { Meta, StoryObj } from '@storybook/react';
import ComparisonTable from '../../components/ComparisonTable';

const meta = {
  title: 'Components/ComparisonTable',
  component: ComparisonTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ComparisonTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    prosTitle: 'Pros',
    consTitle: 'Cons',
    pros: [
      'Automated infrastructure discovery',
      'Real-time health monitoring',
      'GitOps integration',
      'Multi-cloud support',
    ],
    cons: [
      'Requires Kubernetes cluster',
      'Learning curve for advanced features',
      'Resource overhead for large deployments',
    ],
  },
};

export const AdvantagesDisadvantages: Story = {
  args: {
    prosTitle: 'Advantages',
    consTitle: 'Disadvantages',
    pros: [
      'Centralized configuration management',
      'Automated compliance checks',
      'Extensive integration ecosystem',
    ],
    cons: [
      'Initial setup complexity',
      'Requires operational knowledge',
    ],
  },
};

export const UnbalancedComparison: Story = {
  args: {
    pros: [
      'Fast deployment',
      'Easy to use',
      'Low cost',
      'Great documentation',
      'Active community',
    ],
    cons: [
      'Limited customization',
    ],
  },
};
