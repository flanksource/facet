import type { Meta, StoryObj } from '@storybook/react';
import FeatureLayout from '../../components/FeatureLayout';
import QueryResponseTerminal from '../../components/QueryResponseTerminal';
import { IoSpeedometerOutline, IoTrendingDownOutline, IoTimeOutline, IoShieldCheckmarkOutline, IoLockClosedOutline } from 'react-icons/io5';

const meta = {
  title: 'Components/FeatureLayout',
  component: FeatureLayout,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    direction: {
      control: 'select',
      options: ['left-right', 'right-left'],
      description: 'Layout direction',
    },
  },
} satisfies Meta<typeof FeatureLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LeftRight: Story = {
  args: {
    title: 'Why Mission Control MCP Outperforms kubectl',
    description: 'Mission Control provides AI agents with structured catalog data instead of raw YAML, reducing tokens by 50x and improving accuracy.',
    bullets: [
      {
        term: 'No cluster access needed',
        description: 'AI agents query the catalog API without kubectl credentials',
      },
      {
        term: 'Always current',
        description: 'Real-time sync ensures agents see live state',
      },
      {
        term: 'Relationship-aware',
        description: 'Dependencies and topology included automatically',
      },
    ],
    stats: [
      {
        value: '50x',
        label: 'Token Reduction',
        icon: IoTrendingDownOutline,
      },
      {
        value: '10x',
        label: 'Faster Queries',
        icon: IoSpeedometerOutline,
      },
    ],
    span: 6,
    direction: 'left-right',
  },
  render: (args) => (
    <FeatureLayout {...args}>
      <QueryResponseTerminal
        userQuery="Show me all unhealthy pods in production"
        mcpTools={[
          {
            tool: 'search_catalog',
            description: 'type=Kubernetes::Pod health=unhealthy',
          },
        ]}
        aiResponse="Found 3 unhealthy pods in production:\n1. payment-service-7d4b9 (CrashLoopBackOff)\n2. auth-api-8c2f1 (ImagePullBackOff)\n3. worker-queue-5a8d2 (OOMKilled)"
      />
    </FeatureLayout>
  ),
};

export const RightLeft: Story = {
  args: {
    ...LeftRight.args,
    direction: 'right-left',
  },
  render: LeftRight.render,
};

export const Minimal: Story = {
  args: {
    title: 'Simplified Example',
    description: 'A simpler feature layout with fewer elements',
    bullets: [
      {
        term: 'Fast',
        description: 'Sub-millisecond queries',
      },
      {
        term: 'Accurate',
        description: 'Live data guaranteed',
      },
    ],
    stats: [
      {
        value: '99.9%',
        label: 'Uptime',
      },
    ],
    span: 6,
    direction: 'left-right',
  },
  render: (args) => (
    <FeatureLayout {...args}>
      <div style={{ padding: '20px', background: '#f3f4f6', borderRadius: '8px' }}>
        <p>Content area</p>
      </div>
    </FeatureLayout>
  ),
};

export const WithCustomIcons: Story = {
  args: {
    title: 'Custom Icons and Colors',
    description: 'Bullet points can have custom icons and colors for visual emphasis',
    bullets: [
      {
        term: 'Fast Performance',
        description: 'Sub-second response times',
        icon: IoTimeOutline,
        color: '#3b82f6',
      },
      {
        term: 'Secure by Default',
        description: 'Built-in authentication and authorization',
        icon: IoShieldCheckmarkOutline,
        color: '#10b981',
      },
      {
        term: 'Zero-Trust Architecture',
        description: 'Time-bound credentials and complete audit trails',
        icon: IoLockClosedOutline,
        color: '#f59e0b',
      },
    ],
    stats: [
      {
        value: '<100ms',
        label: 'Response Time',
        icon: IoTimeOutline,
      },
      {
        value: '100%',
        label: 'Audit Coverage',
        icon: IoShieldCheckmarkOutline,
      },
    ],
    span: 6,
    direction: 'left-right',
  },
  render: (args) => (
    <FeatureLayout {...args}>
      <div style={{ padding: '20px', background: '#f3f4f6', borderRadius: '8px', minHeight: '200px' }}>
        <p style={{ margin: 0, color: '#6b7280' }}>Feature demonstration area</p>
      </div>
    </FeatureLayout>
  ),
};
