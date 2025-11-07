import type { Meta, StoryObj } from '@storybook/react';
import QueryResponseChat from '../../components/QueryResponseChat';

const meta = {
  title: 'Components/QueryResponseChat',
  component: QueryResponseChat,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    compact: {
      control: 'boolean',
      description: 'Hide MCP tool execution details',
    },
  },
} satisfies Meta<typeof QueryResponseChat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithMCPTools: Story = {
  args: {
    userQuery: 'Why is the payment-service pod crashing?',
    mcpTools: [
      {
        tool: 'search_catalog',
        description: 'type=Kubernetes::Pod name=payment* health=unhealthy',
        result: 'Found 3 replicas, 2 in CrashLoopBackOff',
      },
      {
        tool: 'get_check_status',
        description: 'check_id=http-payment-api',
        result: 'HTTP check failing with 500 errors since 10:23 AM',
      },
    ],
    aiResponse: 'The payment-service pods are crashing due to resource constraints after the recent scale-up. I recommend scaling back to 3 replicas and increasing memory limits.',
    compact: false,
  },
};

export const Compact: Story = {
  args: {
    userQuery: 'Show me all unhealthy pods',
    mcpTools: [
      {
        tool: 'search_catalog',
        description: 'type=Kubernetes::Pod health=unhealthy',
      },
    ],
    aiResponse: 'Found 3 unhealthy pods:\n1. payment-service-7d4b9 (CrashLoopBackOff)\n2. auth-api-8c2f1 (ImagePullBackOff)\n3. worker-queue-5a8d2 (OOMKilled)',
    compact: true,
  },
};

export const Simple: Story = {
  args: {
    userQuery: 'What is the cluster status?',
    aiResponse: 'Your cluster has 12 nodes ready, 342 pods running, and 2 pending deployments. Overall health is 96%.',
    compact: false,
  },
};

export const MultiToolCall: Story = {
  args: {
    userQuery: 'Investigate the production outage',
    mcpTools: [
      {
        tool: 'search_catalog_changes',
        description: 'tag.env=production created_at>now-1h',
        result: '7 changes found',
      },
      {
        tool: 'search_health_checks',
        description: 'status=unhealthy',
        result: '5 checks failing',
      },
      {
        tool: 'get_related_configs',
        description: 'config_id=api-gateway',
        result: '12 dependent services identified',
      },
    ],
    aiResponse: 'Root cause: API Gateway timeout reduced from 30s to 5s at 10:45 AM. This caused cascading failures across 12 downstream services. Recommend immediate rollback of the gateway configuration.',
  },
};
