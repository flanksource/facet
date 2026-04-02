# Mission Control Overview

Mission Control is an **Internal Developer Platform** for Kubernetes that provides unified visibility into infrastructure health, configuration drift, and security posture.

## Key Features

- **Health Checks** — Canary-based monitoring with 30+ check types
- **Config Scraping** — Automated discovery across Kubernetes, AWS, Azure, GCP
- **Playbooks** — Automated remediation with approval workflows
- **Notifications** — Smart alerting with deduplication and routing

## System Requirements

| Component | Requirement |
|-----------|-------------|
| Kubernetes | 1.24+ |
| PostgreSQL | 13+ |
| Memory | 4GB minimum |
| Storage | 20GB SSD |

## Getting Started

```yaml
apiVersion: canaries.flanksource.com/v1
kind: Canary
metadata:
  name: http-check
spec:
  http:
    - name: API Health
      url: https://api.example.com/health
      responseCodes: [200]
```

> **Note:** Mission Control supports both SaaS and self-hosted deployment models.

## Architecture

The platform consists of three core components:

1. **Mission Control Server** — Central API and UI
2. **Canary Checker** — Distributed health check executor
3. **Config DB** — Configuration item database with change tracking
