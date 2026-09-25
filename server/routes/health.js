import express from 'express'
import { getOllamaModels } from '../services/ollama.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const models = await getOllamaModels(
      AbortSignal.timeout(4000)
    )

    res.json({
      online: true,
      models: models.map((model) => model.name),
    })
  } catch {
    res.status(503).json({
      online: false,
    })
  }
})

export default router