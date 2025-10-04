import { test, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../src/app.js'

let app

beforeAll(async () => {
  app = await build()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

test('allows requests under rate limit', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/health'
  })
  expect(response.statusCode).toBe(200)
  const body = response.json()
  expect(body.ok).toBe(true)
  expect(body.timestamp).toBeDefined()
})

test('blocks requests exceeding rate limit', async () => {
  const requests = []
  // Make 11 requests (limit is 10 per minute)
  for (let i = 0; i < 11; i++) {
    requests.push(app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-forwarded-for': '192.168.1.100' }
    }))
  }

  const responses = await Promise.all(requests)
  const blockedResponses = responses.filter(r => r.statusCode === 429)

  expect(blockedResponses.length).toBeGreaterThan(0)
})

test('rate limit includes appropriate headers', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/health',
    headers: { 'x-forwarded-for': '192.168.1.200' }
  })

  expect(response.headers['x-ratelimit-limit']).toBeDefined()
  expect(response.headers['x-ratelimit-remaining']).toBeDefined()
})
