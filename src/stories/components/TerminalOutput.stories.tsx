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
    command: 'kubectl get pods',
    children: `NAME                     READY   STATUS    RESTARTS   AGE
mission-control-api-0    1/1     Running   0          2d
mission-control-ui-0     1/1     Running   0          2d`,
  },
};

export const SingleLine: Story = {
  args: {
    command: 'mc query "SELECT * FROM config_items LIMIT 5"',
    children: '5 results found in 45ms',
  },
};

export const WithError: Story = {
  args: {
    command: 'flux reconcile kustomization apps',
    children: `Error: context deadline exceeded
Failed to reconcile kustomization apps
Retry in 5 minutes`,
  },
};

export const LongOutput: Story = {
  args: {
    command: 'npm install',
    children: `added 94 packages, and audited 598 packages in 35s

234 packages are looking for funding
  run "npm fund" for details

2 moderate severity vulnerabilities

To address all issues, run:
  npm audit fix

Run "npm audit" for details.`,
  },
};
