# Security Policy

LumenStack AI is a portfolio-grade architecture intelligence app that accepts repository URLs and ZIP uploads. Security work focuses on safe demo behavior, clear reporting, and defensible defaults.

## Supported Version

The `main` branch is the supported version of this project.

## Current Security Posture

- Response headers are hardened in the Express app.
- ZIP uploads are constrained through server-side upload handling.
- GitHub webhook intake can be protected with `GITHUB_WEBHOOK_SECRET`.
- The app can run without live AI credentials through fallback summaries.
- `npm run security:audit` checks key security expectations.

## Reporting A Vulnerability

Please do not open a public issue for sensitive security reports.

Send a concise report to:

```text
agarwalujala3@gmail.com
```

Include:

- Affected route, file, or workflow.
- Steps to reproduce.
- Expected impact.
- Any safe proof-of-concept details.
- Recommended mitigation if known.

## Out Of Scope

- Social engineering.
- Denial-of-service testing against the live Render deployment.
- Automated scanning that creates excessive traffic.
- Reports requiring access to private credentials or non-public infrastructure.

## Validation

Before security-related changes are merged, run:

```bash
npm run security:audit
npm run smoke
```
