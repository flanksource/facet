import type { Meta, StoryObj } from '@storybook/react';
import QueryResponseExample from '../../components/QueryResponseExample';

const meta = {
  title: 'Components/QueryResponseExample',
  component: QueryResponseExample,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['chat', 'terminal', 'both'],
      description: 'Display style for the example',
    },
    compact: {
      control: 'boolean',
      description: 'Hide MCP tool execution details',
    },
  },
} satisfies Meta<typeof QueryResponseExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ChatVariant: Story = {
  args: {
    title: 'Example: Pod Troubleshooting',
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
        result: 'HTTP check failing with 500 errors',
      },
    ],
    aiResponse: 'The payment-service pods are crashing due to resource constraints. Recommend scaling back to 3 replicas and increasing memory limits from 512Mi to 1Gi.',
    variant: 'chat',
    compact: false,
  },
};

export const TerminalVariant: Story = {
  args: {
    title: 'Example: Change Investigation',
    userQuery: 'What changes were made in the last hour?',
    mcpTools: [
      {
        tool: 'search_catalog_changes',
        description: 'created_at>now-1h',
        result: 'Found 7 changes across 4 services',
      },
    ],
    aiResponse: 'Recent changes:\n1. API Gateway: Route config updated (10:45 AM)\n2. Load Balancer: Health check path changed (10:52 AM)\n3. Cache service: Memory limit increased (11:03 AM)',
    variant: 'terminal',
    compact: false,
  },
};

export const BothVariants: Story = {
  args: {
    title: 'Example: Incident Response',
    userQuery: 'Investigate the production outage',
    mcpTools: [
      {
        tool: 'search_catalog_changes',
        description: 'tag.env=production created_at>now-1h severity>=medium',
      },
      {
        tool: 'search_health_checks',
        description: 'status=unhealthy',
      },
    ],
    aiResponse: 'Root cause identified: API Gateway timeout reduced from 30s to 5s, causing cascading failures. Recommend immediate rollback.',
    variant: 'both',
    compact: false,
  },
};

export const CompactMode: Story = {
  args: {
    title: 'Example: Quick Query',
    userQuery: 'List all failing health checks',
    mcpTools: [
      {
        tool: 'search_health_checks',
        description: 'status=unhealthy',
      },
    ],
    aiResponse: 'Found 5 failing checks:\n1. http-payment-api (Critical)\n2. database-connection (Critical)\n3. redis-ping (Warning)',
    variant: 'both',
    compact: true,
  },
};

export const NoMCPTools: Story = {
  args: {
    title: 'Example: Simple Query',
    userQuery: 'What is the cluster status?',
    aiResponse: 'Cluster health: 96% (Good)\nNodes: 12 ready\nPods: 342 running, 2 pending',
    variant: 'both',
  },
};
