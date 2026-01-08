import type { Meta, StoryObj } from '@storybook/react';
import StatCard from '../../components/StatCard';
import { IoSpeedometerOutline, IoTrendingDownOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';

const meta = {
  title: 'Components/StatCard',
  component: StatCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['card', 'badge', 'hero', 'bordered', 'icon-heavy', 'left-aligned', 'metric'],
      description: 'Visual variant of the stat card',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the card/badge (only applies to card and badge variants)',
    },
    compareVariant: {
      control: 'select',
      options: ['trendline', 'up-down', 'before-after', 'before-after-progress'],
      description: 'Comparison style when compareFrom is provided',
    },
    color: {
      control: 'select',
      options: ['blue', 'green', 'purple', 'orange', 'red', 'gray'],
      description: 'Color theme for the stat card',
    },
    iconColor: {
      control: 'color',
      description: 'Color of the icon',
    },
    valueColor: {
      control: 'color',
      description: 'Color of the value text',
    },
  },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Card: Story = {
  args: {
    value: '50x',
    label: 'Token Reduction',
    icon: IoTrendingDownOutline,
    variant: 'card',
  },
};

export const Badge: Story = {
  args: {
    value: '99.9%',
    label: 'Uptime',
    icon: IoCheckmarkCircleOutline,
    variant: 'badge',
  },
};

export const Hero: Story = {
  args: {
    value: '10x',
    label: 'Faster Queries',
    variant: 'hero',
    sublabel: 'Compared to kubectl',
  },
};

export const Metric: Story = {
  args: {
    value: '150',
    label: 'Total Credits',
    variant: 'metric',
    color: 'blue',
    sublabel: 'credits remaining',
  },
};

export const MetricWithIcon: Story = {
  args: {
    value: '150',
    label: 'Total Credits',
    icon: IoCheckmarkCircleOutline,
    variant: 'metric',
    color: 'blue',
    sublabel: 'credits remaining',
  },
};

export const Bordered: Story = {
  args: {
    value: '2000+',
    label: 'Integrations',
    icon: IoSpeedometerOutline,
    variant: 'bordered',
  },
};

export const IconHeavy: Story = {
  args: {
    value: '95%',
    label: 'Alert Accuracy',
    icon: IoCheckmarkCircleOutline,
    variant: 'icon-heavy',
  },
};

export const LeftAligned: Story = {
  args: {
    value: '24/7',
    label: 'Monitoring',
    icon: IoSpeedometerOutline,
    variant: 'left-aligned',
  },
};

export const WithCustomColors: Story = {
  args: {
    value: '100%',
    label: 'Security',
    icon: IoCheckmarkCircleOutline,
    variant: 'card',
    iconColor: '#10b981',
    valueColor: '#10b981',
  },
};

// Comparison Variants
export const CompareWithTrendline: Story = {
  args: {
    value: 150,
    compareFrom: 100,
    compareVariant: 'trendline',
    label: 'Active Users',
    variant: 'card',
  },
};

export const CompareWithUpDown: Story = {
  args: {
    value: 45,
    compareFrom: 60,
    compareVariant: 'up-down',
    label: 'Response Time',
    variant: 'metric',
    color: 'blue',
    sublabel: 'milliseconds',
  },
};

export const CompareWithBeforeAfter: Story = {
  args: {
    value: '10ms',
    compareFrom: '500ms',
    compareVariant: 'before-after',
    label: 'Query Time',
    variant: 'card',
  },
};

export const CompareWithProgressBars: Story = {
  args: {
    value: 30,
    compareFrom: 75,
    compareVariant: 'before-after-progress',
    label: 'Build Time',
    variant: 'metric',
    color: 'green',
    sublabel: 'seconds',
  },
};

// Conditional Styling
export const ConditionalRedGreen: Story = {
  args: {
    value: -62,
    label: 'Account Balance',
    variant: 'metric',
    color: 'orange',
    conditionalStyles: ['red-green'],
    sublabel: 'credits',
  },
};

export const ConditionalGreenRed: Story = {
  args: {
    value: 3,
    label: 'Critical Errors',
    variant: 'metric',
    color: 'gray',
    conditionalStyles: ['green-red'],
    sublabel: 'found',
  },
};

export const ConditionalCustomThreshold: Story = {
  args: {
    value: 95,
    label: 'CPU Usage',
    variant: 'metric',
    color: 'blue',
    conditionalStyles: [
      {
        condition: (v) => v.value > 90,
        classes: 'text-red-600 font-extrabold',
      },
      {
        condition: (v) => v.value > 70,
        classes: 'text-orange-600',
      },
    ],
    sublabel: 'percent',
  },
};

// Color Theming
export const MetricWithColors: Story = {
  name: 'Color Theming',
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <StatCard value={100} label="Blue Theme" variant="metric" color="blue" />
      <StatCard value={200} label="Green Theme" variant="metric" color="green" />
      <StatCard value={300} label="Purple Theme" variant="metric" color="purple" />
      <StatCard value={400} label="Orange Theme" variant="metric" color="orange" />
      <StatCard value={-50} label="Red Theme" variant="metric" color="red" />
      <StatCard value={600} label="Gray Theme" variant="metric" color="gray" />
    </div>
  ),
};

// Size Variants - Card
export const CardSizes: Story = {
  name: 'Card Sizes',
  render: () => (
    <div className="flex items-center gap-4">
      <StatCard
        value="50x"
        label="Small Card"
        icon={IoTrendingDownOutline}
        variant="card"
        size="sm"
      />
      <StatCard
        value="50x"
        label="Medium Card"
        icon={IoTrendingDownOutline}
        variant="card"
        size="md"
      />
      <StatCard
        value="50x"
        label="Large Card"
        icon={IoTrendingDownOutline}
        variant="card"
        size="lg"
      />
    </div>
  ),
};

// Size Variants - Badge
export const BadgeSizes: Story = {
  name: 'Badge Sizes',
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <StatCard
        value={42}
        label="Small Badge"
        icon={IoCheckmarkCircleOutline}
        variant="badge"
        size="sm"
        color="blue"
      />
      <StatCard
        value={42}
        label="Medium Badge"
        icon={IoCheckmarkCircleOutline}
        variant="badge"
        size="md"
        color="green"
      />
      <StatCard
        value={42}
        label="Large Badge"
        icon={IoCheckmarkCircleOutline}
        variant="badge"
        size="lg"
        color="purple"
      />
    </div>
  ),
};
