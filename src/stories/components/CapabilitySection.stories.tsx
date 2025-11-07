import type { Meta, StoryObj } from '@storybook/react';
import CapabilitySection from '../../components/CapabilitySection';
import { IoCheckmarkCircleOutline } from 'react-icons/io5';

const meta = {
  title: 'Components/CapabilitySection',
  component: CapabilitySection,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CapabilitySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    outcome: 'Reduce MTTR by 85% Through Automated Change Correlation',
    features: [
      {
        title: 'Link alerts to changes',
        description: 'Automatic correlation with CloudTrail, Git, and Kubernetes events',
      },
      {
        title: 'Trace deployment history',
        description: 'Show what deployed each resource and how to change it',
      },
      {
        title: 'Identify blast radius',
        description: 'See all services and infrastructure affected by a change',
      },
    ],
  },
};

export const WithIcon: Story = {
  args: {
    outcome: 'Eliminate Alert Fatigue with Smart Filtering',
    icon: <IoCheckmarkCircleOutline size={24} color="#10b981" />,
    features: [
      {
        title: 'Silence duplicates',
        description: 'Automatically group related alerts from multiple sources',
      },
      {
        title: 'Context-aware routing',
        description: 'Route alerts based on configuration ownership and topology',
      },
    ],
  },
};

export const ShortList: Story = {
  args: {
    outcome: 'Deploy Faster with Automated Validations',
    features: [
      {
        title: 'Pre-deployment checks',
        description: 'Validate configurations before applying changes',
      },
      {
        title: 'Rollback automation',
        description: 'Automatic rollback on health check failures',
      },
    ],
  },
};

export const LongList: Story = {
  args: {
    outcome: 'Complete Infrastructure Visibility in One Place',
    features: [
      {
        title: 'Multi-cloud discovery',
        description: 'Automatic scanning of AWS, Azure, and GCP resources',
      },
      {
        title: 'Kubernetes integration',
        description: 'Real-time sync of cluster state and configuration',
      },
      {
        title: 'Dependency mapping',
        description: 'Visualize relationships between services and infrastructure',
      },
      {
        title: 'Change history',
        description: 'Track all modifications with who, what, when, and why',
      },
      {
        title: 'Cost attribution',
        description: 'Link cloud costs to teams and applications',
      },
    ],
  },
};
