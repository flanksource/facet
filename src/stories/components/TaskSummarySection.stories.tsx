import type { Meta, StoryObj } from '@storybook/react';
import TaskSummarySection from '../../components/TaskSummarySection';
import type { TaskSummary } from '../../types/billing';

const sampleTasks: TaskSummary[] = [
  {
    theme: 'Kubernetes',
    status: 'Completed',
    description: 'Migrate all workloads to GKE Autopilot',
    commits: { count: 24, additions: 1200, deletions: 800 },
    achievements: ['Zero-downtime migration', 'Reduced compute costs by 30%'],
  },
  {
    theme: 'CICD',
    status: 'In Progress',
    description: 'Implement GitOps workflow with Flux',
    commits: { count: 12, additions: 450 },
    notes: 'Blocked on staging cluster access',
  },
  {
    theme: 'Security',
    status: 'Not Started',
    description: 'Enable workload identity across all namespaces',
  },
  {
    theme: 'Terraform',
    status: 'Blocked',
    description: 'Refactor state management to use workspaces',
    notes: 'Waiting for team approval on state migration plan',
  },
];

const meta = {
  title: 'Components/TaskSummarySection',
  component: TaskSummarySection,
  tags: ['autodocs'],
} satisfies Meta<typeof TaskSummarySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { tasks: sampleTasks },
};

export const AllStatuses: Story = {
  args: {
    tasks: [
      { theme: 'Kubernetes', status: 'Completed', description: 'Completed task' },
      { theme: 'CICD', status: 'In Progress', description: 'In progress task' },
      { theme: 'Security', status: 'Not Started', description: 'Not started task' },
      { theme: 'Terraform', status: 'Blocked', description: 'Blocked task' },
      { theme: 'AWS', status: 'On Hold', description: 'On hold task' },
      { theme: 'Custom', status: 'Cancelled', description: 'Cancelled task' },
      { theme: 'Grafana', status: 'Planned', description: 'Planned task' },
      { theme: 'Bazel', status: 'Started', description: 'Started task' },
    ],
  },
};

export const WithAchievements: Story = {
  args: {
    tasks: [{
      theme: 'Cost Management',
      status: 'Completed',
      description: 'Optimize cloud spending across all accounts',
      commits: { count: 8, additions: 320, deletions: 150 },
      achievements: [
        'Reduced monthly spend by $12,000',
        'Implemented automated scaling policies',
        'Set up cost alerting and budgets',
      ],
    }],
  },
};
