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

test('GET /health returns ok:true', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/health'
  })
  expect(response.statusCode).toBe(200)
  expect(response.json().ok).toBe(true)
})
