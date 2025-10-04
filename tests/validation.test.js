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

test('POST /echo validates required body', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/echo',
    payload: {}
  })

  expect(response.statusCode).toBe(400)
  const body = response.json()
  expect(body.message).toContain('message')
})

test('POST /echo accepts valid input', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/echo',
    payload: { message: 'hello' }
  })

  expect(response.statusCode).toBe(200)
  expect(response.json()).toEqual({ echo: 'hello' })
})

test('POST /echo rejects invalid type', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/echo',
    payload: { message: 123 }
  })

  expect(response.statusCode).toBe(400)
})

test('POST /echo enforces max length', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/echo',
    payload: { message: 'a'.repeat(1001) }
  })

  expect(response.statusCode).toBe(400)
})
