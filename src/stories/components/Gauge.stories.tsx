import type { Meta, StoryObj } from '@storybook/react';
import { Gauge } from '../../components/Gauge';

const meta = {
  title: 'Components/Gauge',
  component: Gauge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Current value',
    },
    minValue: {
      control: { type: 'number' },
      description: 'Minimum value',
    },
    maxValue: {
      control: { type: 'number' },
      description: 'Maximum value',
    },
    units: {
      control: 'text',
      description: 'Units to display',
    },
    width: {
      control: 'text',
      description: 'Width of the gauge',
    },
    arcColor: {
      control: 'color',
      description: 'Color of the filled arc',
    },
    arcBgColor: {
      control: 'color',
      description: 'Background color of the arc',
    },
  },
} satisfies Meta<typeof Gauge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 75,
    minValue: 0,
    maxValue: 100,
    units: '%',
  },
};

export const Temperature: Story = {
  args: {
    value: 23,
    minValue: -10,
    maxValue: 50,
    units: '°C',
    arcColor: '#ef4444',
  },
};

export const Speed: Story = {
  args: {
    value: 120,
    minValue: 0,
    maxValue: 200,
    units: ' km/h',
    arcColor: '#3b82f6',
  },
};

export const SmallWidth: Story = {
  args: {
    value: 50,
    minValue: 0,
    maxValue: 100,
    units: '%',
    width: '8em',
  },
};

export const LargeWidth: Story = {
  args: {
    value: 80,
    minValue: 0,
    maxValue: 100,
    units: '%',
    width: '16em',
  },
};

export const WithCustomLabel: Story = {
  args: {
    value: 85,
    minValue: 0,
    maxValue: 100,
    label: <div className="text-center font-bold text-green-600">Excellent!</div>,
  },
};

export const MultipleGauges: Story = {
  name: 'Multiple Gauges',
  args: {
    value: 50,
    minValue: 0,
    maxValue: 100,
  },
  render: () => (
    <div className="flex gap-4 items-end">
      <Gauge value={25} minValue={0} maxValue={100} units="%" arcColor="#ef4444" width="10em" />
      <Gauge value={50} minValue={0} maxValue={100} units="%" arcColor="#eab308" width="10em" />
      <Gauge value={75} minValue={0} maxValue={100} units="%" arcColor="#22c55e" width="10em" />
    </div>
  ),
};
