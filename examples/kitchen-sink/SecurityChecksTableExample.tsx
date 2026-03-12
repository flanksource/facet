import { SecurityChecksTable } from '@facet';

const checks = [
  {
    name: 'Code-Review',
    score: 10,
    reason: 'All commits require code review',
    details: ['Info: Branch protection enabled', 'Info: CODEOWNERS file present'],
    documentation: { url: 'https://github.com/ossf/scorecard/blob/main/docs/checks.md#code-review' },
  },
  {
    name: 'Maintained',
    score: 10,
    reason: 'Project is actively maintained with recent commits',
    details: ['Info: 47 commits in last 90 days'],
  },
  {
    name: 'Vulnerabilities',
    score: 8,
    reason: '2 vulnerabilities found',
    details: ['Warn: 1 medium severity vulnerability in dependencies'],
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

export default function SecurityChecksTableExample() {
  return (
    <div className="space-y-10 p-6">
      <h1 className="text-2xl font-bold">SecurityChecksTable Examples</h1>

      <section>
        <h2 className="text-lg font-semibold mb-2">Default (sm)</h2>
        <SecurityChecksTable checks={checks} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">size=xs</h2>
        <SecurityChecksTable checks={checks} size="xs" />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">size=base</h2>
        <SecurityChecksTable checks={checks} size="base" />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">size=md</h2>
        <SecurityChecksTable checks={checks} size="md" />
      </section>
    </div>
  );
}
