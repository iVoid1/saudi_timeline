import express from 'express'

import { config } from './config.js'

import healthRouter from './routes/health.js'
import chatRouter from './routes/chat.js'
import rewriteRouter from './routes/rewrite.js'

const app = express()

app.set('trust proxy', 'loopback')

app.use(
  express.json({
    limit: '32kb',
  })
)

app.use('/api/health', healthRouter)
app.use('/api/chat', chatRouter)
app.use('/api/rewrite', rewriteRouter)

app.listen(
  config.port,
  '127.0.0.1',
  () => {
    console.log(
      `API listening on http://127.0.0.1:${config.port}`
    )

    console.log(
      `Ollama → ${config.ollamaUrl}`
    )

    console.log(
      `SearXNG → ${config.searxngUrl}`
    )
  }
)