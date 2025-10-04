import { test, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../src/app.js'

let app

beforeAll(async () => {
  // Production-like environment
  app = await build({ logger: false })
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

test('validation errors return 400 with structured response', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/echo',
    payload: { message: 123 }
  })

  expect(response.statusCode).toBe(400)
  const body = response.json()
  expect(body.error).toBeDefined()
  expect(body.message).toBeDefined()
  // No stack trace exposed
  expect(body.stack).toBeUndefined()
})

test('generic errors return 500 without stack trace in production', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/error-test'
  })

  expect(response.statusCode).toBe(500)
  const body = response.json()
  expect(body.error).toBe('Internal Server Error')
  expect(body.message).toBeDefined()
  // No stack trace or sensitive info exposed
  expect(body.stack).toBeUndefined()
  expect(body.statusCode).toBe(500)
})

test('404 errors return structured response', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/nonexistent'
  })

  expect(response.statusCode).toBe(404)
  const body = response.json()
  expect(body.error).toBe('Not Found')
  expect(body.message).toBeDefined()
  expect(body.statusCode).toBe(404)
})

test('rate limit errors return 429 without stack trace', async () => {
  // Exhaust rate limit
  for (let i = 0; i < 12; i++) {
    await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-forwarded-for': '1.2.3.4' }
    })
  }

  const response = await app.inject({
    method: 'GET',
    url: '/health',
    headers: { 'x-forwarded-for': '1.2.3.4' }
  })

  expect(response.statusCode).toBe(429)
  const body = response.json()
  expect(body.error).toBeDefined()
  expect(body.stack).toBeUndefined()
})
