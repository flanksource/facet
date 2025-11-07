import type { Meta, StoryObj } from '@storybook/react';
import SpecificationTable from '../../components/SpecificationTable';

const meta = {
  title: 'Components/SpecificationTable',
  component: SpecificationTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SpecificationTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SystemRequirements: Story = {
  args: {
    title: 'System Requirements',
    specifications: [
      { category: 'Kubernetes', value: '1.24+' },
      { category: 'PostgreSQL', value: '13+' },
      { category: 'Memory', value: '4GB minimum' },
      { category: 'CPU', value: '2 cores minimum' },
      { category: 'Storage', value: '20GB SSD' },
    ],
  },
};

export const DeploymentSpecs: Story = {
  args: {
    title: 'Deployment Specifications',
    specifications: [
      { category: 'Deployment Models', value: ['SaaS', 'Self-hosted', 'Hybrid'] },
      { category: 'Platforms', value: ['AWS', 'Azure', 'GCP', 'On-premises'] },
      { category: 'Authentication', value: ['SSO', 'SAML', 'OIDC', 'Basic Auth'] },
      { category: 'Data Residency', value: ['US', 'EU', 'APAC', 'On-premises'] },
      { category: 'Compliance', value: ['SOC 2', 'GDPR', 'HIPAA'] },
    ],
  },
};

export const TechnicalDetails: Story = {
  args: {
    title: 'Technical Specifications',
    specifications: [
      { category: 'API Versions', value: 'v1, v2' },
      { category: 'Protocols', value: ['HTTPS', 'gRPC', 'WebSocket'] },
      { category: 'Ports', value: ['443', '8080', '9090'] },
      { category: 'Data Formats', value: ['JSON', 'YAML', 'Protobuf'] },
      { category: 'Max Query Size', value: '100MB' },
    ],
  },
};

export const IntegrationVersions: Story = {
  args: {
    title: 'Supported Versions',
    specifications: [
      { category: 'Kubernetes', value: '1.24 - 1.31' },
      { category: 'Helm', value: '3.0+' },
      { category: 'Prometheus', value: '2.30+' },
      { category: 'Grafana', value: '8.0+' },
      { category: 'Flux', value: '2.0+' },
      { category: 'ArgoCD', value: '2.5+' },
    ],
  },
};

export const NoTitle: Story = {
  args: {
    specifications: [
      { category: 'Version', value: '2.0.0' },
      { category: 'Release Date', value: 'January 2025' },
      { category: 'License', value: 'Apache 2.0' },
    ],
  },
};
