import type { Meta, StoryObj } from '@storybook/react';
import ProjectSummaryCard from '../../components/ProjectSummaryCard';
import { IoRocketOutline } from 'react-icons/io5';

const sampleSecurity = {
  scorecard: {
    score: 8.5,
    checks: [
      { name: 'Code-Review', score: 10 },
      { name: 'Maintained', score: 10 },
      { name: 'Vulnerabilities', score: 8 },
      { name: 'Dependency-Update-Tool', score: 0 },
      { name: 'Branch-Protection', score: 9 },
    ],
  },
  github: {
    totalCount: 5,
    severity: {
      critical: 1,
      high: 2,
      medium: 1,
      low: 1,
    },
    trend: {
      deltaBySeverity: {
        critical: 0,
        high: -1,
        medium: 0,
        low: -1,
      },
    },
  },
};

const meta = {
  title: 'Components/ProjectSummaryCard',
  component: ProjectSummaryCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ProjectSummaryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: IoRocketOutline,
    name: 'Mission Control',
    description: 'Kubernetes-native infrastructure management and observability platform',
    security: sampleSecurity,
    githubUrl: 'https://github.com/flanksource/mission-control',
  },
};

export const HighScore: Story = {
  args: {
    name: 'Config DB',
    description: 'Configuration management database with change tracking',
    security: {
      scorecard: {
        score: 9.2,
        checks: Array(10).fill({ score: 9 }),
      },
      github: {
        totalCount: 0,
        severity: { critical: 0, high: 0, medium: 0, low: 0 },
      },
    },
    githubUrl: 'https://github.com/flanksource/config-db',
  },
};

export const LowScore: Story = {
  args: {
    name: 'Legacy Project',
    description: 'Older project with security concerns',
    security: {
      scorecard: {
        score: 4.5,
        checks: Array(8).fill({ score: 5 }),
      },
      github: {
        totalCount: 15,
        severity: { critical: 5, high: 6, medium: 3, low: 1 },
      },
    },
    githubUrl: 'https://github.com/example/legacy',
  },
};
