import { test, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../src/app.js'

let app

beforeAll(async () => {
  // Set CORS_ORIGINS for testing
  process.env.CORS_ORIGINS = 'https://example.com,https://app.example.com'

  app = await build({ logger: false })
  await app.ready()
})

afterAll(async () => {
  await app.close()
  delete process.env.CORS_ORIGINS
})

test('CORS allows requests from whitelisted origins', async () => {
  const response = await app.inject({
    method: 'OPTIONS',
    url: '/health',
    headers: {
      origin: 'https://example.com',
      'access-control-request-method': 'GET',
    }
  })

  expect(response.statusCode).toBe(204)
  expect(response.headers['access-control-allow-origin']).toBe('https://example.com')
  expect(response.headers['access-control-allow-methods']).toContain('GET')
})

test('CORS allows multiple whitelisted origins', async () => {
  const response = await app.inject({
    method: 'OPTIONS',
    url: '/health',
    headers: {
      origin: 'https://app.example.com',
      'access-control-request-method': 'POST',
    }
  })

  expect(response.statusCode).toBe(204)
  expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com')
})

test('CORS blocks requests from non-whitelisted origins', async () => {
  const response = await app.inject({
    method: 'OPTIONS',
    url: '/health',
    headers: {
      origin: 'https://malicious.com',
      'access-control-request-method': 'GET',
    }
  })

  // Should not include CORS headers for non-whitelisted origin
  expect(response.headers['access-control-allow-origin']).toBeUndefined()
})

test('CORS allows specific methods only', async () => {
  const response = await app.inject({
    method: 'OPTIONS',
    url: '/health',
    headers: {
      origin: 'https://example.com',
      'access-control-request-method': 'GET',
    }
  })

  const allowedMethods = response.headers['access-control-allow-methods']
  expect(allowedMethods).toBeDefined()
  // Should allow GET and POST for our API
  expect(allowedMethods).toContain('GET')
  expect(allowedMethods).toContain('POST')
  // Should not allow dangerous methods
  expect(allowedMethods).not.toContain('DELETE')
  expect(allowedMethods).not.toContain('PUT')
})

test('CORS allows specific headers', async () => {
  const response = await app.inject({
    method: 'OPTIONS',
    url: '/health',
    headers: {
      origin: 'https://example.com',
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'content-type',
    }
  })

  expect(response.headers['access-control-allow-headers']).toBeDefined()
  expect(response.headers['access-control-allow-headers']).toContain('content-type')
})

test('CORS sets credentials flag when configured', async () => {
  const response = await app.inject({
    method: 'OPTIONS',
    url: '/health',
    headers: {
      origin: 'https://example.com',
      'access-control-request-method': 'GET',
    }
  })

  expect(response.headers['access-control-allow-credentials']).toBe('true')
})

test('actual GET request includes CORS headers for whitelisted origin', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/health',
    headers: {
      origin: 'https://example.com',
    }
  })

  expect(response.statusCode).toBe(200)
  expect(response.headers['access-control-allow-origin']).toBe('https://example.com')
})
