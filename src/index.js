import { build } from './app.js'
import { validateEnv } from './config.js'

// Validate environment configuration on startup (fail fast)
const config = validateEnv()

const app = await build({ logger: true })

// --- Graceful shutdown handling ---
const closeGracefully = async (signal) => {
  console.log(`\nReceived ${signal}, closing server gracefully...`)

  try {
    await app.close()
    console.log('Server closed successfully')
    process.exit(0)
  } catch (err) {
    console.error('Error during shutdown:', err)
    process.exit(1)
  }
}

process.on('SIGTERM', () => closeGracefully('SIGTERM'))
process.on('SIGINT', () => closeGracefully('SIGINT'))

// Start server
app.listen({ port: config.port, host: config.host }).then(() => {
  console.log(`Server on http://${config.host}:${config.port}`)
}).catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
