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
    type: 'dependabot',
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

export const LinkedAlerts: Story = {
  args: {
    alerts: [
      {
        type: 'dependabot',
        severity: 'critical',
        title: 'Vulnerable package: minimist@1.2.0',
        url: 'https://github.com/flanksource/mission-control/security/dependabot/1',
      },
      {
        type: 'code-scanning',
        severity: 'high',
        title: 'Bad redirect check',
        url: 'https://github.com/flanksource/mission-control/security/code-scanning/124',
        location: 'go/bad-redirect-check',
      },
      {
        type: 'code-scanning',
        severity: 'high',
        title: 'Bad redirect check',
        url: 'https://github.com/flanksource/mission-control/security/code-scanning/125',
        location: 'go/bad-redirect-check',
      },
      {
        type: 'secret-scanning',
        severity: 'high',
        title: 'Exposed GitHub token',
        url: 'https://github.com/flanksource/mission-control/security/secret-scanning/3',
      },
    ],
  },
};
