# Security

This document summarizes the security guardrails implemented in this project.

## Input Validation

- **Strict schema validation** using Fastify's AJV integration
  - `removeAdditional: false` — reject unknown properties
  - `coerceTypes: false` — no silent type conversion
  - `allErrors: true` — report all validation failures
- Example: `/echo` endpoint requires `{ message: string }` with length constraints (1-1000 chars)

## Rate Limiting

- **Global rate limiting** via `@fastify/rate-limit`
  - Default: 10 requests per minute (configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW` env vars)
  - Returns rate limit headers (`X-RateLimit-*`)
  - Logs rate limit violations with IP and URL
- **Trust proxy mode enabled** to use real client IPs behind proxies/CDNs (prevents IP spoofing)

## Security Headers

- **Helmet** (`@fastify/helmet`) sets secure HTTP headers:
  - `Content-Security-Policy` — restrict resource loading to same-origin
  - `X-Frame-Options: DENY` — prevent clickjacking
  - `Strict-Transport-Security` — enforce HTTPS (15552000s = 180 days)
  - `X-Content-Type-Options: nosniff` — prevent MIME sniffing
  - `hidePoweredBy` — remove `X-Powered-By` header
  - `Cross-Origin-Opener-Policy: same-origin`

## CORS

- **Explicit origin whitelist** via `CORS_ORIGINS` env var (comma-separated)
- If not set, CORS is **disabled** (`origin: false`)
- Allowed methods: `GET`, `POST` only
- Credentials enabled for authenticated requests
- Max age: 86400s (24 hours)

## Error Handling

- **Custom error handler** that:
  - Logs errors with structured logging (Pino)
  - **Redacts sensitive headers** (`authorization`, `cookie`, `x-api-key`, etc.) from logs
  - Returns **generic error messages in production** (no stack traces or internal details)
  - Returns structured validation errors for client debugging (400 Bad Request)
  - Logs with request context (method, URL, redacted headers)

## Graceful Shutdown

- **Signal handlers** for `SIGTERM` and `SIGINT`
- Closes Fastify server gracefully before exiting
- Health probes return 503 during shutdown (`/health/ready`)

## Health Probes

- **Liveness probe**: `/health/live` — always returns 200 unless process is dead
- **Readiness probe**: `/health/ready` — returns 503 during shutdown
- **Combined health check**: `/health` — includes timestamp and shutdown status

## Environment Hygiene

- **No secrets in code** — all config via environment variables
- **Startup validation** (`validateEnv()`) fails fast if required vars are missing or invalid
- `.env.example` documents all config options
- `NODE_ENV` required (must be `development`, `production`, or `test`)

## Logging

- **Structured logging** (Pino) with request metadata
- **Sensitive header redaction** in all logs (authorization, cookies, API keys, etc.)
- Response time tracking for all requests

## Dependencies

- Keep dependencies updated via Dependabot (see `.github/dependabot.yml`)
- Use `npm ci` in CI/CD for reproducible builds
- Review security advisories: `npm audit`

## Reporting Security Issues

If you discover a security vulnerability, please email the maintainer directly rather than opening a public issue.
