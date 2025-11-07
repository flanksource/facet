import type { Meta, StoryObj } from '@storybook/react';
import TwoColumnSection from '../../components/TwoColumnSection';
import CapabilitySection from '../../components/CapabilitySection';
import BulletList from '../../components/BulletList';

const meta = {
  title: 'Components/TwoColumnSection',
  component: TwoColumnSection,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TwoColumnSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCapabilitySections: Story = {
  args: {
    leftContent: (
      <CapabilitySection
        outcome="Reduce MTTR by 85%"
        features={[
          { title: 'Link alerts to changes', description: 'Automatic correlation' },
          { title: 'Trace history', description: 'Full deployment timeline' },
        ]}
      />
    ),
    rightContent: (
      <CapabilitySection
        outcome="Deploy 3x Faster"
        features={[
          { title: 'Pre-deployment checks', description: 'Validate before deploy' },
          { title: 'Auto rollback', description: 'Safety on failures' },
        ]}
      />
    ),
  },
};

export const WithBulletLists: Story = {
  args: {
    leftContent: (
      <div>
        <h3>Core Features</h3>
        <BulletList
          items={[
            { term: 'Catalog', description: 'Unified config database' },
            { term: 'Health Checks', description: 'Synthetic monitoring' },
            { term: 'Incidents', description: 'Automated response' },
          ]}
        />
      </div>
    ),
    rightContent: (
      <div>
        <h3>Integrations</h3>
        <BulletList
          items={[
            { term: 'Kubernetes', description: 'Native integration' },
            { term: 'Cloud Providers', description: 'AWS, Azure, GCP' },
            { term: 'Monitoring', description: 'Prometheus, Datadog' },
          ]}
        />
      </div>
    ),
  },
};

export const MixedContent: Story = {
  args: {
    leftContent: (
      <div>
        <h3>Why Mission Control?</h3>
        <p>
          Mission Control provides teams with complete infrastructure visibility,
          automated incident response, and AI-powered troubleshooting.
        </p>
      </div>
    ),
    rightContent: (
      <CapabilitySection
        outcome="Key Benefits"
        features={[
          { title: 'Faster MTTR', description: '85% reduction on average' },
          { title: 'Less noise', description: '70% fewer false alerts' },
          { title: 'Quick setup', description: 'Production-ready in hours' },
        ]}
      />
    ),
  },
};
