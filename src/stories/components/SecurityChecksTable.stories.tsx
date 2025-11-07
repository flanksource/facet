import type { Meta, StoryObj } from '@storybook/react';
import SecurityChecksTable from '../../components/SecurityChecksTable';

const sampleChecks = [
  {
    name: 'Code-Review',
    score: 10,
    reason: 'All commits require code review before merge',
    details: ['Info: Branch protection enabled', 'Info: CODEOWNERS file present'],
    documentation: { url: 'https://github.com/ossf/scorecard/blob/main/docs/checks.md#code-review' },
  },
  {
    name: 'Maintained',
    score: 10,
    reason: 'Project is actively maintained with recent commits',
    details: ['Info: 47 commits in last 90 days', 'Info: 3 active contributors'],
  },
  {
    name: 'Vulnerabilities',
    score: 8,
    reason: '2 vulnerabilities found',
    details: ['Warn: 1 medium severity vulnerability in dependencies', 'Info: 1 low severity issue'],
  },
  {
    name: 'Dependency-Update-Tool',
    score: 0,
    reason: 'No dependency update tool detected',
    details: ['Warn: Consider using Dependabot or Renovate'],
  },
  {
    name: 'Signed-Releases',
    score: 5,
    reason: 'Releases are not signed',
    details: ['Warn: No cryptographic signatures found on releases'],
  },
];

const meta = {
  title: 'Components/SecurityChecksTable',
  component: SecurityChecksTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SecurityChecksTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    checks: sampleChecks,
  },
};

export const AllPassing: Story = {
  args: {
    checks: sampleChecks.filter(c => c.score >= 8),
  },
};

export const MixedScores: Story = {
  args: {
    checks: [
      ...sampleChecks,
      {
        name: 'Fuzzing',
        score: 0,
        reason: 'Project is not fuzzed',
        details: ['Info: No fuzzing infrastructure detected'],
      },
      {
        name: 'SAST',
        score: 10,
        reason: 'SAST tool detected and run on commits',
        details: ['Info: CodeQL workflow found', 'Info: Analysis runs on all PRs'],
      },
    ],
  },
};
