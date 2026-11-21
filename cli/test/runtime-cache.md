---
cwd: .
timeout: 10m
---

# Shared runtime cache verification

| Name | Command | Exit Code | CEL Validation |
| --- | --- | --- | --- |
| Cache tests, cross-project render, lint and build | gavel fixtures cli/test/runtime-cache.fixture.yaml | 0 | exitCode == 0 |
