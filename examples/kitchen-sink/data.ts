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
