export const compactData = [
  { label: 'Kubernetes', value: '1.24+' },
  { label: 'Memory', value: '4GB minimum' },
  { label: 'CPU', value: '2 cores minimum' },
  { label: 'Storage', value: '20GB SSD' },
];

export const infrastructureData = [
  { label: 'Kubernetes', value: '1.24+' },
  { label: 'Memory', value: '4GB minimum' },
  { label: 'CPU', value: '2 cores' },
  { label: 'Storage', value: '20GB SSD' },
];

export const releaseData = [
  { label: 'Version', value: '2.0.0' },
  { label: 'Date', value: 'March 2026' },
  { label: 'License', value: 'Apache 2.0' },
];

export const referenceData = [
  ['search_catalog', 'Find config items', 'Show all unhealthy pods'],
  ['get_config', 'Get item details', 'Describe deployment nginx'],
  ['run_health_check', 'Execute check', 'Run http-check-api'],
];

export const specifications = [
  { category: 'Kubernetes', value: '1.24+' },
  { category: 'PostgreSQL', value: '13+' },
  { category: 'Memory', value: '4GB minimum' },
  { category: 'Deployment Models', value: ['SaaS', 'Self-hosted', 'Hybrid'] },
];

export const securityChecks = [
  { name: 'Code-Review', score: 10, reason: 'All commits require review', details: ['Info: Branch protection enabled'] },
  { name: 'Vulnerabilities', score: 8, reason: '2 vulnerabilities found', details: ['Warn: 1 medium severity'] },
  { name: 'Dependency-Update-Tool', score: 0, reason: 'No tool detected', details: ['Warn: Consider Dependabot'] },
  { name: 'Signed-Releases', score: 5, reason: 'Releases partially signed', details: [] as string[] },
];

export const logos = [
  { name: 'Prometheus', health: true, configuration: false, change: false, playbooks: true },
  { name: 'Kubernetes', health: true, configuration: true, change: true, playbooks: true },
  { name: 'Datadog', health: true, configuration: true, change: true, playbooks: true },
  { name: 'Flux', health: false, configuration: true, change: true, playbooks: true },
];

export const heatmapData = [
  { date: '2026-03-01', successful: 3, failed: 0, count: 3 },
  { date: '2026-03-02', successful: 2, failed: 1, count: 3 },
  { date: '2026-03-03', successful: 0, failed: 0, count: 0 },
  { date: '2026-03-04', successful: 4, failed: 0, count: 4 },
  { date: '2026-03-05', successful: 1, failed: 2, count: 3 },
  { date: '2026-03-06', successful: 5, failed: 0, count: 5 },
  { date: '2026-03-07', successful: 3, failed: 0, count: 3 },
  { date: '2026-03-08', successful: 2, failed: 0, count: 2 },
  { date: '2026-03-10', successful: 1, failed: 0, count: 1 },
  { date: '2026-03-12', successful: 0, failed: 3, count: 3 },
  { date: '2026-03-15', successful: 6, failed: 0, count: 6 },
  { date: '2026-03-20', successful: 4, failed: 1, count: 5 },
  { date: '2026-03-25', successful: 2, failed: 0, count: 2 },
  { date: '2026-03-28', successful: 3, failed: 0, count: 3 },
  { date: '2026-03-30', successful: 1, failed: 0, count: 1 },
];

export const matrixColumns = ['Admin', 'Editor', 'Viewer', 'Auditor', 'Operator'];

export const matrixRows = [
  { label: 'Production DB', cells: ['direct', 'group', null, 'group', 'direct'] },
  { label: 'Staging K8s', cells: ['direct', 'direct', 'group', null, 'direct'] },
  { label: 'CI/CD Pipeline', cells: [null, 'direct', null, 'group', 'direct'] },
  { label: 'Monitoring', cells: ['group', 'group', 'direct', 'direct', null] },
  { label: 'Secrets Vault', cells: ['direct', null, null, 'group', null] },
];

export const dynamicColumns = [
  { name: 'service', type: 'string' as const },
  { name: 'status', type: 'status' as const },
  { name: 'health', type: 'health' as const },
  { name: 'cpu', type: 'gauge' as const, gauge: { thresholds: [{ percent: 70, color: '#eab308' }, { percent: 90, color: '#dc2626' }] } },
  { name: 'memory', type: 'bytes' as const },
  { name: 'uptime', type: 'duration' as const },
];

export const dynamicRows = [
  { service: 'api-gateway', status: 'running', health: 'healthy', cpu: 45, memory: 536870912, uptime: 86400000000000 },
  { service: 'auth-service', status: 'running', health: 'healthy', cpu: 23, memory: 268435456, uptime: 172800000000000 },
  { service: 'worker-pool', status: 'degraded', health: 'warning', cpu: 88, memory: 1073741824, uptime: 3600000000000 },
  { service: 'cache-redis', status: 'running', health: 'healthy', cpu: 12, memory: 134217728, uptime: 604800000000000 },
  { service: 'db-primary', status: 'failed', health: 'unhealthy', cpu: 95, memory: 2147483648, uptime: 300000000000 },
];

export const bulletItems = [
  { term: 'Kubernetes', description: 'Container orchestration platform' },
  { term: 'Prometheus', description: 'Monitoring and alerting toolkit' },
  { term: 'Flux', description: 'GitOps continuous delivery' },
  { term: 'PostgreSQL', description: 'Relational database system' },
];

export const changeLog = [
  { date: '2026-03-30T14:22:00Z', type: 'ScaleUp', severity: 'info', summary: 'Scaled deployment nginx from 2 to 4 replicas', source: 'flux', count: 1 },
  { date: '2026-03-30T11:05:00Z', type: 'ConfigUpdate', severity: 'medium', summary: 'Updated resource limits on api-gateway deployment', source: 'kubectl', count: 1 },
  { date: '2026-03-29T22:30:00Z', type: 'CertRotation', severity: 'low', summary: 'Rotated TLS certificate for ingress wildcard.example.com', source: 'cert-manager', count: 1 },
  { date: '2026-03-29T18:12:00Z', type: 'ImageUpdate', severity: 'info', summary: 'Updated image flanksource/canary-checker:v1.2.3 → v1.2.4', source: 'flux', count: 3 },
  { date: '2026-03-29T09:45:00Z', type: 'SecretChange', severity: 'high', summary: 'Modified secret database-credentials in production namespace', source: 'kubectl', createdBy: 'admin@example.com', count: 1 },
  { date: '2026-03-28T16:00:00Z', type: 'RolloutRestart', severity: 'medium', summary: 'Restarted rollout for worker-pool deployment', source: 'kubectl', count: 1 },
  { date: '2026-03-28T10:30:00Z', type: 'HelmUpgrade', severity: 'info', summary: 'Upgraded mission-control chart from 0.1.25 to 0.1.27', source: 'flux', count: 1 },
  { date: '2026-03-27T08:15:00Z', type: 'NodeDrain', severity: 'critical', summary: 'Node ip-10-0-1-42 drained for maintenance, 12 pods evicted', source: 'system', count: 1 },
];

export const vulnerabilityData = {
  dependabot: [],
  codeScanning: [],
  secretScanning: [],
  totalCount: 47,
  severity: { critical: 3, high: 12, medium: 21, low: 11 },
  trend: {
    recentlyAdded: 5, recentlyClosed: 8,
    recentlyClosedDependabot: 4, recentlyClosedCodeScanning: 4, totalClosed: 8,
    addedBySeverity: { critical: 1, high: 2, medium: 1, low: 1 },
    closedBySeverity: { critical: 2, high: 3, medium: 2, low: 1 },
    deltaBySeverity: { critical: -1, high: -1, medium: -1, low: 0 },
  },
};

export const alertsData = [
  { severity: 'critical', name: 'Pod CrashLoopBackOff', source: 'Kubernetes', firstSeen: '2026-03-30T08:15:00Z', count: 12, references: [{ name: 'runbook', url: '#' }] },
  { severity: 'high', name: 'Certificate Expiring', source: 'cert-manager', firstSeen: '2026-03-29T14:00:00Z', count: 1, references: [] },
  { severity: 'medium', name: 'High Memory Usage', source: 'Prometheus', firstSeen: '2026-03-28T22:30:00Z', count: 45, references: [{ name: 'dashboard', url: '#' }] },
  { severity: 'low', name: 'Deprecated API Version', source: 'kube-apiserver', firstSeen: '2026-03-15T10:00:00Z', count: 3, references: [] },
];

export const taskSummary = {
  title: 'Sprint Tasks',
  tasks: [
    { name: 'Implement health checks', status: 'completed' as const, assignee: 'Alice' },
    { name: 'Configure scraper', status: 'in-progress' as const, assignee: 'Bob' },
    { name: 'Set up notifications', status: 'pending' as const, assignee: 'Charlie' },
    { name: 'Write documentation', status: 'pending' as const, assignee: 'Alice' },
  ],
};

export const codeExample = `apiVersion: canaries.flanksource.com/v1
kind: Canary
metadata:
  name: http-check
spec:
  http:
    - name: API Health
      url: https://api.example.com/health
      responseCodes: [200]
      maxSSLExpiry: 30`;
