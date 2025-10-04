import { build } from './app.js'

const app = await build({ logger: true })

app.listen({ port: 3000, host: '127.0.0.1' }).then(() => {
  console.log('Server on http://127.0.0.1:3000')
})
