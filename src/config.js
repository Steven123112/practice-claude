/**
 * Environment configuration validation
 * Fails fast on startup if required env vars are missing or invalid
 */

const VALID_NODE_ENVS = ['development', 'production', 'test']

export function validateEnv(env = process.env) {
  const errors = []

  // Required: NODE_ENV
  if (!env.NODE_ENV) {
    errors.push('NODE_ENV is required')
  } else if (!VALID_NODE_ENVS.includes(env.NODE_ENV)) {
    errors.push(`NODE_ENV must be one of: ${VALID_NODE_ENVS.join(', ')}`)
  }

  // Optional: PORT (default 3000)
  const port = env.PORT ? Number(env.PORT) : 3000
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push('PORT must be a valid port number (1-65535)')
  }

  // Optional: HOST (default 127.0.0.1)
  const host = env.HOST || '127.0.0.1'

  // Optional: Rate limit settings
  const rateLimitMax = env.RATE_LIMIT_MAX ? Number(env.RATE_LIMIT_MAX) : 10
  if (isNaN(rateLimitMax) || rateLimitMax < 1) {
    errors.push('RATE_LIMIT_MAX must be a positive number')
  }

  const rateLimitWindow = env.RATE_LIMIT_WINDOW || '1 minute'

  // Optional: CORS allowed origins (comma-separated)
  const corsOrigins = env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').map(s => s.trim()) : []

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`)
  }

  return {
    nodeEnv: env.NODE_ENV,
    port,
    host,
    rateLimitMax,
    rateLimitWindow,
    corsOrigins,
  }
}
