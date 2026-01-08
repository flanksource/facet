import type { Meta, StoryObj } from '@storybook/react';
import LogoGrid from '../../components/LogoGrid';

const meta = {
  title: 'Components/LogoGrid',
  component: LogoGrid,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof LogoGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Integrations',
    logos: [
      { name: 'Prometheus' },
      { name: 'Datadog' },
      { name: 'ServiceNow' },
      { name: 'CloudWatch' },
      { name: 'Azure Monitor' },
      { name: 'GCP Cloud Logging' },
      { name: 'Flux' },
      { name: 'ArgoCD' },
      { name: 'PagerDuty' },
      { name: 'Slack' },
      { name: 'Trivy' },
      { name: 'Kubernetes' },
    ],
    viewAllUrl: '/integrations',
  },
};

export const WithCustomIcons: Story = {
  args: {
    title: 'Platform Integrations',
    logos: [
      { name: 'Kubernetes', icon: 'K8S' },
      { name: 'Helm', icon: 'Helm' },
      { name: 'Terraform', icon: 'Terraform' },
      { name: 'Prometheus', icon: 'Prometheus' },
      { name: 'Flux', icon: 'Flux' },
      { name: 'ArgoCD', icon: 'Argo' },
    ],
    viewAllUrl: '#',
  },
};

export const Compact: Story = {
  args: {
    variant: 'compact',
    logos: [
      { name: 'Kubernetes' },
      { name: 'Prometheus' },
      { name: 'Flux' },
      { name: 'ArgoCD' },
      { name: 'Helm' },
    ],
  },
};

export const Minimal: Story = {
  args: {
    title: 'Monitoring Tools',
    logos: [
      { name: 'Prometheus' },
      { name: 'Datadog' },
      { name: 'CloudWatch' },
      { name: 'Azure Monitor' },
    ],
  },
};

export const WithTitles: Story = {
  args: {
    title: 'Featured Integrations',
    logos: [
      { name: 'Kubernetes', title: 'Container Orchestration' },
      { name: 'Prometheus', title: 'Metrics & Monitoring' },
      { name: 'Flux', title: 'GitOps' },
      { name: 'Slack', title: 'Notifications' },
      { name: 'ServiceNow', title: 'ITSM' },
      { name: 'PagerDuty', title: 'Incident Management' },
    ],
    viewAllUrl: '/integrations',
  },
};

export const Table: Story = {
  args: {
    variant: 'table',
    title: 'Integration Capabilities',
    logos: [
      { name: 'Prometheus', health: true, configuration: false, change: false, playbooks: true },
      { name: 'Kubernetes', health: true, configuration: true, change: true, playbooks: true },
      { name: 'Datadog', health: true, configuration: true, change: true, playbooks: true },
      { name: 'Flux', health: false, configuration: true, change: true, playbooks: true },
    ],
  },
};
