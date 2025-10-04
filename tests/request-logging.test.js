import { test, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../src/app.js'
import { Writable } from 'stream'

let app
let logMessages = []

beforeAll(async () => {
  // Capture log output using a writable stream
  const logStream = new Writable({
    write(chunk, encoding, callback) {
      try {
        const log = JSON.parse(chunk.toString())
        logMessages.push(log)
      } catch (e) {
        // Ignore non-JSON logs
      }
      callback()
    }
  })

  app = await build({
    logger: {
      level: 'info',
      stream: logStream,
    },
    disableRequestLogging: false
  })
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

test('request logging captures basic request info', async () => {
  logMessages = []

  await app.inject({
    method: 'GET',
    url: '/health'
  })

  const requestLog = logMessages.find(log => log.msg && log.msg.includes('request completed'))
  expect(requestLog).toBeDefined()
  expect(requestLog.req).toBeDefined()
  expect(requestLog.req.method).toBe('GET')
  expect(requestLog.req.url).toBe('/health')
})

test('request logging does not leak authorization headers', async () => {
  logMessages = []

  await app.inject({
    method: 'GET',
    url: '/health',
    headers: {
      'authorization': 'Bearer secret-token-12345',
      'x-api-key': 'my-secret-api-key'
    }
  })

  const allLogs = JSON.stringify(logMessages)
  expect(allLogs).not.toContain('secret-token-12345')
  expect(allLogs).not.toContain('my-secret-api-key')
})

test('rate limit hits are logged', async () => {
  logMessages = []

  // Exhaust rate limit
  for (let i = 0; i < 12; i++) {
    await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-forwarded-for': '5.6.7.8' }
    })
  }

  const rateLimitLog = logMessages.find(log =>
    log.level === 40 && log.msg && log.msg.includes('rate limit')
  )
  expect(rateLimitLog).toBeDefined()
})

test('validation errors are logged', async () => {
  logMessages = []

  await app.inject({
    method: 'POST',
    url: '/echo',
    payload: { invalid: 'data' }
  })

  const validationLog = logMessages.find(log =>
    log.level === 50 && log.err && log.err.validation
  )
  expect(validationLog).toBeDefined()
})

test('request logging includes response status and time', async () => {
  logMessages = []

  await app.inject({
    method: 'GET',
    url: '/health'
  })

  const requestLog = logMessages.find(log => log.msg && log.msg.includes('request completed'))
  expect(requestLog).toBeDefined()
  expect(requestLog.res).toBeDefined()
  expect(requestLog.res.statusCode).toBe(200)
  expect(requestLog.responseTime).toBeGreaterThanOrEqual(0)
})
