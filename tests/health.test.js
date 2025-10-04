import { test, expect } from 'vitest'
const res = await (await fetch('http://localhost:3000/health')).json()
test('GET /health returns ok:true', () => {
  expect(res.ok).toBe(true)
})
