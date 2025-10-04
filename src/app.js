import Fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'

export async function build(opts = {}) {
  const app = Fastify({
    ...opts,
    trustProxy: true,
    ajv: {
      customOptions: {
        removeAdditional: false,
        coerceTypes: false,
        allErrors: true,
      },
    },
  })

  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX || 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
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
