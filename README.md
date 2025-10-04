# Practice Claude API

[![CI](https://github.com/Steven123112/practice-claude/actions/workflows/ci.yml/badge.svg)](https://github.com/Steven123112/practice-claude/actions/workflows/ci.yml)

A minimal Fastify API with comprehensive security guardrails: input validation, rate limiting, Helmet, CORS whitelist, structured logging, and graceful shutdown.

## Features

- **Strict input validation** (AJV with no silent fixes)
- **Rate limiting** with configurable limits and IP-aware enforcement
- **Security headers** via Helmet (CSP, HSTS, frame protection)
- **CORS whitelist** from environment config
- **Structured logging** with sensitive header redaction
- **Graceful shutdown** and health probes for orchestrators
- **Environment validation** (fail-fast on startup)

## Prerequisites

- Node.js 20+ (managed via nvm recommended)

## Setup

```bash
# Install dependencies
npm install

# Copy environment template and configure
cp .env.example .env
# Edit .env to set NODE_ENV and other options
```

## Running Locally

```bash
# Development mode
npm run dev

# Server runs on http://127.0.0.1:3000 by default
```

## Running Tests

```bash
npm test
```

## Environment Variables

See `.env.example` for all configuration options. Required:

- `NODE_ENV` — must be `development`, `production`, or `test`

Optional (with defaults):

- `PORT` — server port (default: 3000)
- `HOST` — bind address (default: 127.0.0.1)
- `RATE_LIMIT_MAX` — max requests per window (default: 10)
- `RATE_LIMIT_WINDOW` — time window (default: 1 minute)
- `CORS_ORIGINS` — comma-separated allowed origins

## Security

See [SECURITY.md](SECURITY.md) for detailed security documentation.

## License

ISC
