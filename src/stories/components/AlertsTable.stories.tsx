import type { Meta, StoryObj } from '@storybook/react';
import AlertsTable from '../../components/AlertsTable';
import type { Alert } from '../../types/security';

const sampleAlerts: Alert[] = [
  {
    type: 'code-scanning',
    severity: 'critical',
    title: 'SQL Injection vulnerability',
    location: 'src/api/users.ts:42',
    references: [{ label: 'CWE-89', url: '#' }],
  },
  {
    type: 'secret-scanning',
    severity: 'high',
    title: 'AWS Access Key exposed',
    location: 'config/secrets.yml:15',
    references: [{ label: 'Details', url: '#' }],
  },
  {
    type: 'dependency',
    severity: 'medium',
    title: 'Vulnerable package: lodash@4.17.0',
    location: 'package.json',
    references: [{ label: 'CVE-2020-8203', url: '#' }],
  },
  {
    type: 'code-scanning',
    severity: 'low',
    title: 'Unused variable detected',
    location: 'src/utils/helpers.ts:128',
  },
];

const meta = {
  title: 'Components/AlertsTable',
  component: AlertsTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AlertsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    alerts: sampleAlerts,
  },
};

export const CriticalOnly: Story = {
  args: {
    alerts: sampleAlerts.filter(a => a.severity === 'critical'),
  },
};

export const Mixed: Story = {
  args: {
    alerts: [
      ...sampleAlerts,
      {
        type: 'code-scanning',
        severity: 'high',
        title: 'Cross-site scripting (XSS) vulnerability',
        location: 'src/components/Form.tsx:89',
      },
    ],
  },
};
