import type { Meta, StoryObj } from '@storybook/react';
import TerminalOutput from '../../components/TerminalOutput';

const meta = {
  title: 'Components/TerminalOutput',
  component: TerminalOutput,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TerminalOutput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: `kubectl get pods`,
  },
};

export const SingleLine: Story = {
  args: {
    children: 'mc query "SELECT * FROM config_items LIMIT 5"',
  },
};

export const WithError: Story = {
  args: {
    children: `flux reconcile kustomization apps`,
  },
};

export const LongOutput: Story = {
  args: {
    children: `npm install`,
  },
};
