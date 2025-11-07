import type { Meta, StoryObj } from '@storybook/react';
import Section from '../../components/Section';
import StatCard from '../../components/StatCard';
import { IoRocketOutline } from 'react-icons/io5';

const meta = {
  title: 'Components/Section',
  component: Section,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['hero', 'card-grid', 'two-column', 'two-column-reverse', 'metric-grid', 'summary-grid', 'dashboard'],
      description: 'Section layout variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Typography and spacing size',
    },
  },
} satisfies Meta<typeof Section>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hero: Story = {
  args: {
    variant: 'hero',
    title: 'Platform Overview',
    subtitle: 'Mission Control Features',
    description: 'Comprehensive infrastructure management platform for modern cloud environments',
    icon: IoRocketOutline,
    children: <p>Section content goes here</p>,
  },
};

export const MetricGrid: Story = {
  args: {
    variant: 'metric-grid',
    columns: 3,
    title: 'Platform Metrics',
    description: 'Current system performance indicators',
    children: (
      <>
        <StatCard value="99.9%" label="Uptime" variant="metric" color="green" />
        <StatCard value="42" label="Services" variant="metric" color="blue" />
        <StatCard value="5ms" label="Latency" variant="metric" color="purple" />
      </>
    ),
  },
};

export const TwoColumn: Story = {
  args: {
    variant: 'two-column',
    layout: '9-3',
    title: 'Security Features',
    description: 'Advanced security scanning and compliance monitoring for your infrastructure',
    metric: <StatCard value="95%" label="Coverage" variant="metric" color="green" />,
    children: (
      <ul className="list-disc pl-5 text-sm">
        <li>Continuous vulnerability scanning</li>
        <li>Compliance monitoring</li>
        <li>Secret detection</li>
      </ul>
    ),
  },
};

export const Dashboard: Story = {
  args: {
    variant: 'dashboard',
    title: 'System Health',
    subtitle: 'Last 24 hours',
    description: 'All systems operating normally with no incidents reported',
    metric: <StatCard value="100%" label="Healthy" variant="hero" />,
  },
};
