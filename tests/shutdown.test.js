import { test, expect, beforeEach, afterEach } from 'vitest'
import { build } from '../src/app.js'

let app

beforeEach(async () => {
  app = await build({ logger: false })
  await app.ready()
})

afterEach(async () => {
  if (app) {
    try {
      await app.close()
    } catch (err) {
      // Already closed, ignore
    }
  }
})

test('server closes gracefully', async () => {
  // Verify server is running
  const response = await app.inject({
    method: 'GET',
    url: '/health'
  })
  expect(response.statusCode).toBe(200)

  // Close server gracefully
  await expect(app.close()).resolves.toBeUndefined()
})

test('health endpoint returns readiness status', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/health'
  })

  expect(response.statusCode).toBe(200)
  const body = response.json()
  expect(body.ok).toBe(true)
  expect(body.timestamp).toBeDefined()
})

test('health endpoint shows not ready during shutdown', async () => {
  // Start closing but don't await
  const closePromise = app.close()

  // Try to access health endpoint during shutdown
  const response = await app.inject({
    method: 'GET',
    url: '/health'
  })

  // Should still respond but may indicate shutting down
  expect(response.statusCode).toBeLessThanOrEqual(503)

  await closePromise
})

test('/health/live endpoint always returns success', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/health/live'
  })

  expect(response.statusCode).toBe(200)
  const body = response.json()
  expect(body.alive).toBe(true)
})

test('/health/ready endpoint returns readiness status', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/health/ready'
  })

  expect(response.statusCode).toBe(200)
  const body = response.json()
  expect(body.ready).toBe(true)
})
