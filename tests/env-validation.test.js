import { test, expect } from 'vitest'
import { validateEnv } from '../src/config.js'

test('validateEnv succeeds with all required vars', () => {
  const env = {
    NODE_ENV: 'development',
    PORT: '3000',
    HOST: '127.0.0.1',
  }

  expect(() => validateEnv(env)).not.toThrow()
})

test('validateEnv fails when NODE_ENV is missing', () => {
  const env = {
    PORT: '3000',
    HOST: '127.0.0.1',
  }

  expect(() => validateEnv(env)).toThrow(/NODE_ENV/)
})

test('validateEnv fails when PORT is invalid', () => {
  const env = {
    NODE_ENV: 'development',
    PORT: 'invalid',
    HOST: '127.0.0.1',
  }

  expect(() => validateEnv(env)).toThrow(/PORT/)
})

test('validateEnv fails when PORT is out of range', () => {
  const env = {
    NODE_ENV: 'development',
    PORT: '70000',
    HOST: '127.0.0.1',
  }

  expect(() => validateEnv(env)).toThrow(/PORT/)
})

test('validateEnv accepts valid NODE_ENV values', () => {
  const validEnvs = ['development', 'production', 'test']

  validEnvs.forEach(nodeEnv => {
    const env = {
      NODE_ENV: nodeEnv,
      PORT: '3000',
      HOST: '127.0.0.1',
    }
    expect(() => validateEnv(env)).not.toThrow()
  })
})

test('validateEnv fails when NODE_ENV is invalid', () => {
  const env = {
    NODE_ENV: 'invalid',
    PORT: '3000',
    HOST: '127.0.0.1',
  }

  expect(() => validateEnv(env)).toThrow(/NODE_ENV/)
})

test('validateEnv uses defaults for optional vars', () => {
  const env = {
    NODE_ENV: 'development',
  }

  const config = validateEnv(env)
  expect(config.port).toBe(3000)
  expect(config.host).toBe('127.0.0.1')
})

test('validateEnv parses rate limit settings', () => {
  const env = {
    NODE_ENV: 'development',
    RATE_LIMIT_MAX: '100',
    RATE_LIMIT_WINDOW: '5 minutes',
  }

  const config = validateEnv(env)
  expect(config.rateLimitMax).toBe(100)
  expect(config.rateLimitWindow).toBe('5 minutes')
})
