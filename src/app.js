import Fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'

// Sensitive headers that should never be logged
const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'x-api-key',
  'x-auth-token',
  'x-csrf-token',
  'x-session-token',
]

// Redact sensitive headers from logs
function redactSensitiveHeaders(headers) {
  const redacted = { ...headers }
  SENSITIVE_HEADERS.forEach(header => {
    if (redacted[header]) {
      redacted[header] = '[REDACTED]'
    }
  })
  return redacted
}

export async function build(opts = {}) {
  const app = Fastify({
    ...opts,
    // Use real client IPs when behind proxies/CDNs
    trustProxy: true,
    ajv: {
      customOptions: {
        // Strict validation (no silent fixes)
        removeAdditional: false,
        coerceTypes: false,
        allErrors: true,
      },
    },
    // Disable default request logging (we'll add custom)
    disableRequestLogging: opts.disableRequestLogging ?? true,
  })

  // --- Request logging hooks (with sensitive data redaction) ---
  app.addHook('onRequest', async (request, reply) => {
    request.startTime = Date.now()
  })

  app.addHook('onResponse', async (request, reply) => {
    const responseTime = Date.now() - request.startTime

    request.log.info({
      req: {
        method: request.method,
        url: request.url,
        headers: redactSensitiveHeaders(request.headers),
        remoteAddress: request.ip,
      },
      res: {
        statusCode: reply.statusCode,
      },
      responseTime,
    }, 'request completed')
  })

  // --- Global rate limiting (env overridable) ---
  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX || 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    // Log rate limit hits
    onExceeded: (req) => {
      req.log.warn({
        ip: req.ip,
        url: req.url,
      }, 'rate limit exceeded')
    },
  })

  // --- CORS policy (explicit origins from env) ---
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : []

  await app.register(cors, {
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    methods: ['GET', 'POST'],  // Only allow safe methods
    allowedHeaders: ['content-type', 'authorization'],
    credentials: true,
    maxAge: 86400,  // 24 hours
  })

  // --- Security headers (Helmet) ---
  await app.register(helmet, {
    // Reasonable defaults; adjust CSP as your app grows
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    frameguard: { action: 'deny' },               // X-Frame-Options: DENY
    hidePoweredBy: true,                           // remove X-Powered-By
    noSniff: true,                                 // X-Content-Type-Options: nosniff
    hsts: { maxAge: 15552000, includeSubDomains: true }, // Strict-Transport-Security
    // Note: X-XSS-Protection is deprecated in modern browsers; some versions
    // of @fastify/helmet may not set it. We'll keep tests flexible if needed.
  })

  // --- Custom error handler (no stack traces in production) ---
  app.setErrorHandler((error, request, reply) => {
    const isProd = process.env.NODE_ENV === 'production'

    // Log error with structured logging (redact sensitive headers)
    request.log.error({
      err: error,
      req: {
        method: request.method,
        url: request.url,
        headers: redactSensitiveHeaders(request.headers),
      },
    }, 'Request error')

    // Validation errors: keep as 400, structured response
    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      })
    }

    // Generic errors: hide details in production
    const statusCode = error.statusCode || 500
    const errorName = error.name === 'FastifyError' ? error.message : (statusCode === 500 ? 'Internal Server Error' : error.name)

    reply.status(statusCode).send({
      statusCode,
      error: statusCode === 500 ? 'Internal Server Error' : errorName,
      message: isProd && statusCode === 500 ? 'An internal server error occurred' : error.message,
    })
  })

  // --- Health checks and probes ---
  let isShuttingDown = false

  // Main health endpoint (readiness)
  app.get('/health', async (request, reply) => {
    if (isShuttingDown) {
      return reply.status(503).send({
        ok: false,
        status: 'shutting down',
        timestamp: new Date().toISOString(),
      })
    }

    return {
      ok: true,
      timestamp: new Date().toISOString(),
    }
  })

  // Liveness probe (always returns 200 unless process is dead)
  app.get('/health/live', async () => ({
    alive: true,
  }))

  // Readiness probe (checks if server is ready to accept traffic)
  app.get('/health/ready', async (request, reply) => {
    if (isShuttingDown) {
      return reply.status(503).send({
        ready: false,
        reason: 'shutting down',
      })
    }

    return {
      ready: true,
    }
  })

  // Mark as shutting down when close is called
  app.addHook('onClose', async () => {
    isShuttingDown = true
  })

  // Test route for error handling (only in non-production)
  if (process.env.NODE_ENV !== 'production') {
    app.get('/error-test', async () => {
      throw new Error('Test error')
    })
  }

  // Strictly validated echo route — expects { message: string }
  const echoSchema = {
    body: {
      type: 'object',
      required: ['message'],
      additionalProperties: false,
      properties: {
        message: { type: 'string', minLength: 1, maxLength: 1000 },
      },
    },
  }
  app.post('/echo', { schema: echoSchema }, async (req) => {
    return { echo: req.body.message }
  })

  return app
}
