import type { Meta, StoryObj } from '@storybook/react';
import IntegrationGrid from '../../components/IntegrationGrid';

const meta = {
  title: 'Components/IntegrationGrid',
  component: IntegrationGrid,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof IntegrationGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Integrations',
    integrations: [
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
    integrations: [
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

export const Minimal: Story = {
  args: {
    title: 'Monitoring Tools',
    integrations: [
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
    integrations: [
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

export const MaximumLogos: Story = {
  args: {
    title: 'All Integrations',
    integrations: [
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
      { name: 'Helm' },
      { name: 'Terraform' },
      { name: 'AWS CloudTrail' },
    ],
    viewAllUrl: '/integrations',
  },
};
