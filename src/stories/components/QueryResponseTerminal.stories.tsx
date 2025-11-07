import type { Meta, StoryObj } from '@storybook/react';
import QueryResponseTerminal from '../../components/QueryResponseTerminal';

const meta = {
  title: 'Components/QueryResponseTerminal',
  component: QueryResponseTerminal,
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
} satisfies Meta<typeof QueryResponseTerminal>;

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
      {
        tool: 'search_catalog_changes',
        description: 'config_id=payment-service-deployment severity=critical',
        result: 'Deployment scaled from 3→5 replicas 12 minutes ago',
      },
    ],
    aiResponse: `The payment-service pods are crashing due to resource constraints after the recent scale-up:

1. **Root Cause**: Deployment scaled from 3 to 5 replicas 12 minutes ago
2. **Symptoms**: 2 pods in CrashLoopBackOff, HTTP health check failing
3. **Impact**: 500 errors on /health endpoint since 10:23 AM

**Recommended Actions**:
- Scale back to 3 replicas immediately
- Increase memory limits from 512Mi to 1Gi
- Review application memory usage patterns`,
    compact: false,
  },
};

export const Compact: Story = {
  args: {
    userQuery: 'List all failing health checks',
    mcpTools: [
      {
        tool: 'search_health_checks',
        description: 'status=unhealthy',
      },
    ],
    aiResponse: `Found 5 failing health checks:

1. http-payment-api (Critical)
2. dns-resolver (Warning)
3. database-connection (Critical)
4. redis-ping (Warning)
5. s3-bucket-access (Info)

Most urgent: Payment API and Database checks need immediate attention.`,
    compact: true,
  },
};

export const Simple: Story = {
  args: {
    userQuery: 'Show cluster overview',
    aiResponse: `Your Kubernetes cluster status:

**Nodes**: 12 ready, 0 not ready
**Namespaces**: 24 active
**Pods**: 342 running, 3 pending, 2 failed
**Deployments**: 89 healthy, 2 unhealthy

Overall health: 96% (Good)`,
    compact: false,
  },
};

export const MultilineQuery: Story = {
  args: {
    userQuery: 'What changes were made to production in the last hour that could have caused the current outage?',
    mcpTools: [
      {
        tool: 'search_catalog_changes',
        description: 'created_at>now-1h tag.env=production severity>=medium',
        result: 'Found 7 changes across 4 services',
      },
    ],
    aiResponse: `Identified 7 production changes in the last hour:

**High-Risk Changes** (likely causes):
1. ✗ API Gateway: Route configuration updated (10:45 AM)
   - Changed timeout from 30s → 5s
   - **Action**: Revert this change immediately

2. ✗ Load Balancer: Health check path changed (10:52 AM)
   - Changed from /health → /api/health
   - Backend services don't expose /api/health
   - **Action**: Revert to /health

**Lower-Risk Changes**:
3. ○ Cache service: Memory limit increased
4. ○ Logging service: Image updated
5. ○ Monitoring: Alert threshold adjusted

**Root Cause**: Likely the API Gateway timeout reduction combined with the invalid health check path.`,
  },
};
