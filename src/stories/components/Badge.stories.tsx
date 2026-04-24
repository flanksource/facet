import type { Meta, StoryObj } from '@storybook/react';
import Badge from '../../components/Badge';
import { IoCheckmarkCircle, IoCloseCircle, IoWarning, IoInformationCircle, IoStar, IoGitBranch, IoDownload } from 'react-icons/io5';

const meta = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['status', 'metric', 'custom', 'outlined', 'label'],
      description: 'Visual variant of the badge',
    },
    status: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
      description: 'Semantic status (for status/outlined variants)',
    },
    size: {
      control: 'select',
      options: ['xxs', 'xs', 'sm', 'md', 'lg'],
      description: 'Size of the badge',
    },
    shape: {
      control: 'select',
      options: ['pill', 'rounded', 'square'],
      description: 'Border radius shape',
    },
    label: {
      control: 'text',
      description: 'Label text (left section)',
    },
    value: {
      control: 'text',
      description: 'Value text (right section)',
    },
    color: {
      control: 'color',
      description: 'Custom background color',
    },
    textColor: {
      control: 'color',
      description: 'Custom text color',
    },
    borderColor: {
      control: 'color',
      description: 'Custom border color',
    },
    href: {
      control: 'text',
      description: 'URL for clickable badge',
    },
    wrap: {
      control: 'boolean',
      description: 'Allow badge content to wrap',
    },
    labelClassName: {
      control: 'text',
      description: 'Additional classes for the label section',
    },
    valueClassName: {
      control: 'text',
      description: 'Additional classes for the value section',
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default badge with all controls available
 */
export const Default: Story = {
  args: {
    variant: 'metric',
    label: 'version',
    value: '1.2.3',
    size: 'md',
    shape: 'pill',
  },
};

/**
 * All four visual variants side-by-side
 */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge variant="status" status="success" label="Build" value="passing" />
      <Badge variant="metric" label="Stars" value="1.2k" />
      <Badge variant="custom" color="#7c3aed" textColor="#fff" label="v1.2.3" />
      <Badge variant="outlined" status="info" label="Beta" />
    </div>
  ),
};

/**
 * All badge size options
 */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Badge size="xxs" label="Extra Extra Small" value="v1.0" />
        <span className="text-gray-500">Extra Extra Small (xxs)</span>
      </div>
      <div className="flex items-center gap-4">
        <Badge size="xs" label="Extra Small" value="v1.0" />
        <span className="text-gray-500">Extra Small (xs)</span>
      </div>
      <div className="flex items-center gap-4">
        <Badge size="sm" label="Small" value="v1.0" />
        <span className="text-gray-500">Small (sm)</span>
      </div>
      <div className="flex items-center gap-4">
        <Badge size="md" label="Medium" value="v1.0" />
        <span className="text-gray-500">Medium (md) - Default</span>
      </div>
      <div className="flex items-center gap-4">
        <Badge size="lg" label="Large" value="v1.0" />
        <span className="text-gray-500">Large (lg)</span>
      </div>
    </div>
  ),
};

/**
 * All three shape options
 */
export const Shapes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge shape="pill" label="Pill" value="rounded-full" />
      <Badge shape="rounded" label="Rounded" value="rounded-md" />
      <Badge shape="square" label="Square" value="rounded-none" />
    </div>
  ),
};

/**
 * All four semantic status states
 */
export const StatusStates: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4">
        <Badge variant="status" status="success" label="Build" value="passing" icon={IoCheckmarkCircle} />
        <Badge variant="status" status="error" label="Tests" value="2 failed" icon={IoCloseCircle} />
        <Badge variant="status" status="warning" label="Coverage" value="68%" icon={IoWarning} />
        <Badge variant="status" status="info" label="Docs" value="available" icon={IoInformationCircle} />
      </div>
      <div className="text-sm text-gray-600 mt-2">Status badges with icons</div>
    </div>
  ),
};

/**
 * All element combinations
 */
export const ElementCombinations: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Badge icon={IoStar} />
        <span className="text-sm text-gray-500">Icon only</span>
      </div>
      <div className="flex items-center gap-3">
        <Badge label="version" value="1.2.3" />
        <span className="text-sm text-gray-500">Label + Value</span>
      </div>
      <div className="flex items-center gap-3">
        <Badge icon={IoGitBranch} label="main" />
        <span className="text-sm text-gray-500">Icon + Label</span>
      </div>
      <div className="flex items-center gap-3">
        <Badge icon={IoDownload} label="downloads" value="1.2M" />
        <span className="text-sm text-gray-500">Icon + Label + Value</span>
      </div>
    </div>
  ),
};

/**
 * Linkable badges with href
 */
export const InteractiveBadges: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4">
        <Badge
          variant="status"
          status="info"
          label="Documentation"
          href="https://docs.flanksource.com"
          target="_blank"
        />
        <Badge
          variant="outlined"
          status="success"
          label="Live Demo"
          href="#demo"
        />
        <Badge
          variant="metric"
          icon={IoGitBranch}
          label="Repository"
          href="https://github.com/flanksource"
          target="_blank"
        />
      </div>
      <div className="text-sm text-gray-600 mt-2">
        Hover over badges to see hover effect. Click to navigate.
      </div>
    </div>
  ),
};

/**
 * Custom color combinations
 */
export const CustomColors: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge variant="custom" color="#7c3aed" textColor="#fff" label="Purple" />
      <Badge variant="custom" color="#ec4899" textColor="#fff" label="Pink" />
      <Badge variant="custom" color="#10b981" textColor="#fff" label="Green" />
      <Badge variant="custom" color="#f59e0b" textColor="#fff" label="Amber" />
      <Badge variant="custom" color="#6366f1" textColor="#fff" label="Indigo" />
    </div>
  ),
};

/**
 * Outlined variant with different status colors
 */
export const OutlinedVariant: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge variant="outlined" status="success" label="Active" />
      <Badge variant="outlined" status="error" label="Disabled" />
      <Badge variant="outlined" status="warning" label="Pending" />
      <Badge variant="outlined" status="info" label="Beta" />
    </div>
  ),
};

export const CustomOutlinedColors: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge variant="outlined" label="Kubernetes" borderColor="#326ce5" textColor="#326ce5" size="xs" />
      <Badge variant="outlined" label="Helm" borderColor="#0f1689" textColor="#0f1689" size="xs" />
      <Badge variant="outlined" label="Flux" borderColor="#5468ff" textColor="#5468ff" size="xs" />
      <Badge variant="outlined" label="ArgoCD" borderColor="#ef7b4d" textColor="#ef7b4d" size="xs" />
    </div>
  ),
};

export const LabelVariant: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 bg-slate-50 p-4 rounded-lg">
      <Badge
        variant="label"
        label="container"
        value="incident-commander"
        color="#dbeafe"
        textColor="#1d4ed8"
        size="xs"
        className="bg-white"
        labelClassName="uppercase tracking-[0.03em]"
        valueClassName="font-mono text-slate-800"
      />
      <Badge
        variant="label"
        label="namespace"
        value="mc"
        color="#dcfce7"
        textColor="#15803d"
        size="xs"
        className="bg-white"
        labelClassName="uppercase tracking-[0.03em]"
        valueClassName="font-semibold text-slate-800"
      />
      <Badge
        variant="label"
        label="strategy"
        value="rolling"
        color="#ede9fe"
        textColor="#6d28d9"
        size="xs"
        className="bg-white"
        labelClassName="uppercase tracking-[0.03em]"
        valueClassName="font-medium text-slate-800"
      />
    </div>
  ),
};

export const DenseMetadataWrap: Story = {
  render: () => (
    <div className="max-w-[420px] rounded-lg border border-gray-200 bg-slate-50 p-4">
      <div className="flex flex-wrap gap-2">
        {[
          ['container', 'flanksource/incident-commander'],
          ['image', 'flanksource/incident-commander:v1.4.200-build.12'],
          ['from', 'sha256:42e5e2378f81f1b8d0355ab5b12a47f3'],
          ['to', 'sha256:8cd15af2d1364a5cb4f8df25e7c6291e'],
        ].map(([label, value]) => (
          <Badge
            key={label}
            variant="label"
            label={label}
            value={value}
            color={label === 'to' ? '#dcfce7' : '#dbeafe'}
            textColor={label === 'to' ? '#15803d' : '#1d4ed8'}
            size="xs"
            wrap
            className="bg-white max-w-[180px]"
            labelClassName="uppercase tracking-[0.03em]"
            valueClassName="font-mono"
          />
        ))}
      </div>
      <p className="text-sm text-gray-600 mt-3">
        Use <code>wrap</code> when metadata needs to stay badge-shaped but long values cannot remain single-line.
      </p>
    </div>
  ),
};

export const BadgeBestPractices: Story = {
  render: () => (
    <div className="max-w-[640px] rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-sm font-semibold text-slate-800 mb-3">Information architecture guidance</h4>
      <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
        <li>Use badges for state and compact metadata, not for long explanations.</li>
        <li>Keep label vocabulary stable so repeated badges are easy to scan across pages.</li>
        <li>Use color semantically. Save stronger colors for state, risk, or priority.</li>
        <li>Prefer 4 to 8 badges for a summary band; let them wrap before turning everything into a table.</li>
        <li>Use tables when users need to compare the same fields across many rows.</li>
      </ul>
    </div>
  ),
};

/**
 * Real-world usage examples
 */
export const RealWorldExamples: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {/* Version badges */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-gray-700">Version & Release Badges</h4>
        <div className="flex flex-wrap gap-2">
          <Badge label="version" value="1.2.3" size="sm" />
          <Badge label="latest" value="v2.0.0" variant="custom" color="#10b981" textColor="#fff" size="sm" />
          <Badge label="beta" variant="outlined" status="warning" size="sm" />
        </div>
      </div>

      {/* Build status */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-gray-700">Build & CI Status</h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant="status" status="success" icon={IoCheckmarkCircle} label="build" value="passing" />
          <Badge variant="status" status="error" icon={IoCloseCircle} label="tests" value="2 failed" />
          <Badge variant="status" status="success" icon={IoCheckmarkCircle} label="coverage" value="92%" />
        </div>
      </div>

      {/* Metrics & Stats */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-gray-700">Metrics & Statistics</h4>
        <div className="flex flex-wrap gap-2">
          <Badge icon={IoStar} label="stars" value="1.2k" />
          <Badge icon={IoDownload} label="downloads" value="5.4M" />
          <Badge icon={IoGitBranch} label="forks" value="234" />
        </div>
      </div>

      {/* Environment badges */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-gray-700">Environment Indicators</h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant="status" status="success" label="Production" />
          <Badge variant="status" status="warning" label="Staging" />
          <Badge variant="status" status="info" label="Development" />
        </div>
      </div>

      {/* License badges */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-gray-700">License & Legal</h4>
        <div className="flex flex-wrap gap-2">
          <Badge label="license" value="MIT" variant="outlined" status="info" />
          <Badge label="license" value="Apache 2.0" variant="outlined" status="info" />
          <Badge label="license" value="GPL-3.0" variant="outlined" status="info" />
        </div>
      </div>
    </div>
  ),
};

/**
 * Different icon sources (any React icon component works)
 */
export const WithDifferentIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge icon={IoCheckmarkCircle} label="Success" variant="status" status="success" />
      <Badge icon={IoStar} label="Featured" variant="status" status="info" />
      <Badge icon={IoWarning} label="Warning" variant="status" status="warning" />
      <Badge icon={IoGitBranch} label="Branch" value="main" />
      <Badge icon={IoDownload} label="Downloads" value="1.2M" />
    </div>
  ),
};
