import type { Meta, StoryObj } from '@storybook/react';
import BulletList from '../../components/BulletList';

const meta = {
  title: 'Components/BulletList',
  component: BulletList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'border-left', 'gradient'],
      description: 'Style variant for the bullet list',
    },
    columns: {
      control: { type: 'number', min: 1, max: 4 },
      description: 'Number of columns (for border-left variant)',
    },
  },
} satisfies Meta<typeof BulletList>;

export default meta;
type Story = StoryObj<typeof meta>;

// ========== Default Variant Stories ==========

export const Default: Story = {
  args: {
    variant: 'default',
    items: [
      {
        term: 'Automatic discovery',
        description: 'Agentless scraping across AWS, Azure, GCP, Kubernetes',
      },
      {
        term: 'Real-time updates',
        description: '5-minute freshness with event-driven change detection',
      },
      {
        term: 'Full topology',
        description: 'Dependencies, relationships, and change history',
      },
    ],
  },
};

export const DefaultShort: Story = {
  name: 'Default - Short',
  args: {
    variant: 'default',
    items: [
      {
        term: 'Fast',
        description: 'Sub-millisecond query performance',
      },
      {
        term: 'Secure',
        description: 'Enterprise-grade security controls',
      },
    ],
  },
};

export const DefaultLong: Story = {
  name: 'Default - Long',
  args: {
    variant: 'default',
    items: [
      {
        term: 'Catalog',
        description: 'Unified configuration database across all infrastructure',
      },
      {
        term: 'Health Checks',
        description: 'Synthetic monitoring for all critical services and dependencies',
      },
      {
        term: 'Incidents',
        description: 'Automated incident management with context-aware responders',
      },
      {
        term: 'Playbooks',
        description: 'Runbook automation for common operational tasks',
      },
      {
        term: 'MCP Integration',
        description: 'AI agent integration via Model Context Protocol',
      },
    ],
  },
};

export const DefaultTwoColumns: Story = {
  name: 'Default - Two Columns',
  args: {
    variant: 'default',
    columns: 2,
    items: [
      {
        term: 'Catalog',
        description: 'Unified configuration database across all infrastructure',
      },
      {
        term: 'Health Checks',
        description: 'Synthetic monitoring for all critical services and dependencies',
      },
      {
        term: 'Incidents',
        description: 'Automated incident management with context-aware responders',
      },
      {
        term: 'Playbooks',
        description: 'Runbook automation for common operational tasks',
      },
      {
        term: 'MCP Integration',
        description: 'AI agent integration via Model Context Protocol',
      },
      {
        term: 'GitOps',
        description: 'Declarative configuration management using Git',
      },
    ],
  },
};

// ========== Border-Left Variant Stories ==========

export const BorderLeftSingleColumn: Story = {
  name: 'Border-Left - Single Column',
  args: {
    variant: 'border-left',
    columns: 1,
    items: [
      {
        term: 'Playbooks',
        description: 'Event-driven automation engine for Day 2 operations. Executes remediation workflows based on infrastructure events and health checks.',
        color: 'blue',
      },
      {
        term: 'Unified Catalog',
        description: 'Graph database storing infrastructure state and change history from 30+ sources. Provides real-time correlation across cloud, Kubernetes, and DevOps tools.',
        color: 'yellow',
      },
      {
        term: 'Health Checks (Canary Checker)',
        description: 'Synthetic monitoring with 35+ check types (HTTP, DNS, SQL, LDAP). Results stored in CRD status fields for GitOps observability.',
        color: 'green',
      },
    ],
  },
};

export const BorderLeftTwoColumns: Story = {
  name: 'Border-Left - Two Columns',
  args: {
    variant: 'border-left',
    columns: 2,
    items: [
      {
        term: 'Playbooks',
        description: 'Event-driven automation engine for Day 2 operations. Executes remediation workflows based on infrastructure events and health checks.',
        color: 'blue',
      },
      {
        term: 'PostgreSQL',
        description: 'Primary datastore with time-series and graph extensions. Handles 100K+ config items with millisecond query latency.',
        color: 'blue',
      },
      {
        term: 'Unified Catalog',
        description: 'Graph database storing infrastructure state and change history from 30+ sources. Provides real-time correlation across cloud, Kubernetes, and DevOps tools.',
        color: 'yellow',
      },
      {
        term: 'PostgREST',
        description: 'Auto-generated REST API from database schema. Zero-code API layer with automatic OpenAPI documentation.',
        color: 'cyan',
      },
      {
        term: 'Health Checks (Canary Checker)',
        description: 'Synthetic monitoring with 35+ check types (HTTP, DNS, SQL, LDAP). Results stored in CRD status fields for GitOps observability.',
        color: 'green',
      },
      {
        term: 'Kubernetes CRDs',
        description: 'Kubernetes-native operator for declarative configuration. Enables GitOps workflows using standard Kubernetes patterns.',
        color: 'orange',
      },
      {
        term: 'MCP Server',
        description: 'Model Context Protocol interface for AI/IDE integration. Provides structured, secure access to infrastructure data with sub-second query performance.',
        color: 'purple',
      },
      {
        term: 'ORY Kratos',
        description: 'Identity and authentication service with SSO support. Provides secure, scalable auth with OIDC, SAML, and social login integration.',
        color: 'pink',
      },
      {
        term: 'Real-Time RAG',
        description: 'Caching layer optimizing infrastructure graph queries and token usage. Pre-indexes relationships and metrics for efficient AI consumption.',
        color: 'indigo',
      },
      {
        term: 'Casbin + PostgreSQL RLS',
        description: 'AWS-like ABAC model with PostgreSQL row-level security. Fine-grained permissions using CEL expressions for complex authorization rules.',
        color: 'red',
      },
    ],
  },
};

export const BorderLeftMixedColors: Story = {
  name: 'Border-Left - Mixed Colors',
  args: {
    variant: 'border-left',
    columns: 1,
    items: [
      {
        term: 'Blue Component',
        description: 'This component uses blue accent color for visual hierarchy.',
        color: 'blue',
      },
      {
        term: 'Green Component',
        description: 'This component uses green accent color to indicate success or health.',
        color: 'green',
      },
      {
        term: 'Red Component',
        description: 'This component uses red accent color to indicate security or alerts.',
        color: 'red',
      },
      {
        term: 'Purple Component',
        description: 'This component uses purple accent color for automation features.',
        color: 'purple',
      },
    ],
  },
};

// ========== Gradient Variant Stories ==========

export const GradientSimple: Story = {
  name: 'Gradient - Simple',
  args: {
    variant: 'gradient',
    items: [
      {
        term: 'Unified Catalog',
        description: 'Graph database correlating infrastructure state and changes from 30+ sources in real-time.',
        color: 'yellow',
        icon: '◉',
      },
      {
        term: 'PostgreSQL',
        description: 'Time-series and graph-enabled datastore handling 100K+ config items with millisecond queries.',
        color: 'blue',
        icon: '◉',
      },
      {
        term: 'PostgREST',
        description: 'Auto-generated REST API from database schema with zero-code OpenAPI documentation.',
        color: 'cyan',
        icon: '◉',
      },
    ],
  },
};

export const GradientWithGroups: Story = {
  name: 'Gradient - With Groups',
  args: {
    variant: 'gradient',
    groups: [
      {
        title: 'Data & Processing Layer',
        items: [
          {
            term: 'Unified Catalog',
            description: 'Graph database correlating infrastructure state and changes from 30+ sources in real-time.',
            color: 'yellow',
            icon: '◉',
          },
          {
            term: 'PostgreSQL',
            description: 'Time-series and graph-enabled datastore handling 100K+ config items with millisecond queries.',
            color: 'blue',
            icon: '◉',
          },
          {
            term: 'PostgREST',
            description: 'Auto-generated REST API from database schema with zero-code OpenAPI documentation.',
            color: 'cyan',
            icon: '◉',
          },
        ],
      },
      {
        title: 'Automation & Operations',
        items: [
          {
            term: 'Playbooks',
            description: 'Event-driven automation engine executing remediation workflows for Day 2 operations.',
            color: 'purple',
            icon: '◉',
          },
          {
            term: 'Health Checks',
            description: 'Synthetic monitoring with 35+ check types storing results in CRD status fields.',
            color: 'green',
            icon: '◉',
          },
          {
            term: 'Kubernetes CRDs',
            description: 'Native operators enabling GitOps workflows through declarative configuration.',
            color: 'orange',
            icon: '◉',
          },
        ],
      },
      {
        title: 'AI & Security Layer',
        items: [
          {
            term: 'MCP Server',
            description: 'Model Context Protocol interface providing sub-second structured data access for AI/IDEs.',
            color: 'indigo',
            icon: '◉',
          },
          {
            term: 'Real-Time RAG',
            description: 'Caching layer pre-indexing infrastructure graphs to optimize AI token usage.',
            color: 'violet',
            icon: '◉',
          },
          {
            term: 'ORY Kratos',
            description: 'Enterprise SSO with OIDC, SAML, and social login integration.',
            color: 'pink',
            icon: '◉',
          },
          {
            term: 'Casbin + RLS',
            description: 'AWS-like ABAC with PostgreSQL row-level security using CEL expressions.',
            color: 'red',
            icon: '◉',
          },
        ],
      },
    ],
  },
};

export const GradientCustomIcons: Story = {
  name: 'Gradient - Custom Icons',
  args: {
    variant: 'gradient',
    items: [
      {
        term: 'Cloud Providers',
        description: 'Integration with AWS, Azure, and GCP for unified cloud management.',
        color: 'blue',
        icon: '☁️',
      },
      {
        term: 'Kubernetes',
        description: 'Native Kubernetes operator with CRD support for GitOps workflows.',
        color: 'cyan',
        icon: '☸',
      },
      {
        term: 'Security',
        description: 'Enterprise-grade security with RBAC, ABAC, and row-level security.',
        color: 'red',
        icon: '🔒',
      },
      {
        term: 'Monitoring',
        description: 'Comprehensive health checks and synthetic monitoring capabilities.',
        color: 'green',
        icon: '📊',
      },
    ],
  },
};

export const GradientAllColors: Story = {
  name: 'Gradient - All Colors',
  args: {
    variant: 'gradient',
    items: [
      {
        term: 'Blue',
        description: 'Example component with blue gradient styling.',
        color: 'blue',
        icon: '◉',
      },
      {
        term: 'Yellow',
        description: 'Example component with yellow gradient styling.',
        color: 'yellow',
        icon: '◉',
      },
      {
        term: 'Green',
        description: 'Example component with green gradient styling.',
        color: 'green',
        icon: '◉',
      },
      {
        term: 'Purple',
        description: 'Example component with purple gradient styling.',
        color: 'purple',
        icon: '◉',
      },
      {
        term: 'Indigo',
        description: 'Example component with indigo gradient styling.',
        color: 'indigo',
        icon: '◉',
      },
      {
        term: 'Cyan',
        description: 'Example component with cyan gradient styling.',
        color: 'cyan',
        icon: '◉',
      },
      {
        term: 'Orange',
        description: 'Example component with orange gradient styling.',
        color: 'orange',
        icon: '◉',
      },
      {
        term: 'Pink',
        description: 'Example component with pink gradient styling.',
        color: 'pink',
        icon: '◉',
      },
      {
        term: 'Red',
        description: 'Example component with red gradient styling.',
        color: 'red',
        icon: '◉',
      },
      {
        term: 'Violet',
        description: 'Example component with violet gradient styling.',
        color: 'violet',
        icon: '◉',
      },
    ],
  },
};
