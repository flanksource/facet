import type { Meta, StoryObj } from '@storybook/react';
import CompactTable from '../../components/CompactTable';

const meta = {
  title: 'Components/CompactTable',
  component: CompactTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['compact', 'inline', 'reference'],
      description: 'Table layout variant',
    },
  },
} satisfies Meta<typeof CompactTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Compact: Story = {
  args: {
    variant: 'compact',
    title: 'System Requirements',
    data: [
      { label: 'Kubernetes', value: '1.24+' },
      { label: 'Memory', value: '4GB minimum' },
      { label: 'CPU', value: '2 cores minimum' },
      { label: 'Storage', value: '20GB SSD' },
    ],
  },
};

export const Inline: Story = {
  args: {
    variant: 'inline',
    title: 'Quick Stats',
    data: [
      { label: 'Version', value: '2.0.0' },
      { label: 'Release', value: 'Jan 2025' },
      { label: 'License', value: 'Apache 2.0' },
    ],
  },
};

export const Reference: Story = {
  args: {
    variant: 'reference',
    title: 'MCP Tools',
    columns: ['Tool Name', 'Purpose', 'Example Query'],
    data: [
      ['search_catalog', 'Find config items', 'Show all unhealthy pods'],
      ['get_config', 'Get item details', 'Describe deployment nginx'],
      ['run_health_check', 'Execute check', 'Run http-check-api'],
      ['search_health_checks', 'Find checks', 'List all failing checks'],
    ],
  },
};

export const WithArrayValues: Story = {
  args: {
    variant: 'compact',
    title: 'Supported Platforms',
    data: [
      { label: 'Cloud Providers', value: ['AWS', 'Azure', 'GCP'] },
      { label: 'Kubernetes', value: ['EKS', 'AKS', 'GKE', 'OpenShift'] },
      { label: 'Monitoring', value: ['Prometheus', 'Datadog', 'New Relic'] },
    ],
  },
};
