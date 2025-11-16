import type { Meta, StoryObj } from '@storybook/react';
import { Steps } from '../../components/Steps';

const meta: Meta<typeof Steps> = {
  title: 'Components/Steps',
  component: Steps,
  tags: ['autodocs'],
  argTypes: {
    currentStep: {
      control: { type: 'number', min: 0 },
      description: 'Index of the current step (0-based)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Steps>;

const threeSteps = [
  { label: 'Planned', description: 'Planning phase' },
  { label: 'In Progress', description: 'Execution phase' },
  { label: 'Completed', description: 'Completion phase' },
];

export const FirstStep: Story = {
  args: {
    steps: threeSteps,
    currentStep: 0,
  },
};

export const SecondStep: Story = {
  args: {
    steps: threeSteps,
    currentStep: 1,
  },
};

export const LastStep: Story = {
  args: {
    steps: threeSteps,
    currentStep: 2,
  },
};

export const FiveSteps: Story = {
  args: {
    steps: [
      { label: 'Requirements', description: 'Gather requirements' },
      { label: 'Design', description: 'Create design' },
      { label: 'Development', description: 'Build the solution' },
      { label: 'Testing', description: 'Test the solution' },
      { label: 'Deployment', description: 'Deploy to production' },
    ],
    currentStep: 2,
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-600 mb-2">First step active:</p>
        <Steps steps={threeSteps} currentStep={0} />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">Second step active:</p>
        <Steps steps={threeSteps} currentStep={1} />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">All steps completed:</p>
        <Steps steps={threeSteps} currentStep={2} />
      </div>
    </div>
  ),
};
