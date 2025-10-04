import Fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'
import helmet from '@fastify/helmet'

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

  // Health route
  app.get('/health', async () => ({ ok: true }))

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
