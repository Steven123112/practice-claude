import { test, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../src/app.js'

let app
beforeAll(async () => { app = await build(); await app.ready() })
afterAll(async () => { await app.close() })

test('POST /echo with extra fields is rejected (400)', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/echo',
    payload: { name: 'Alice', admin: true } // extra field
  })
  expect(res.statusCode).toBe(400)
})
