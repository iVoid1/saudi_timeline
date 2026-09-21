import express from 'express'
import { rateLimit } from 'express-rate-limit'

import { ollamaChat } from '../services/ollama.js'
import { buildRewritePrompt } from '../prompts/rewrite.js'
import { cleanModel, cleanText } from '../utils/sanitize.js'

const router = express.Router()

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/', limiter, async (req, res) => {
  const model = cleanModel(req.body?.model)

  const text = cleanText(req.body?.text, 8000)
  const regionName = cleanText(req.body?.regionName, 100)
  const eraLabel = cleanText(req.body?.eraLabel, 100)

  if (!text) {
    return res.status(400).json({
      error: 'No text provided.',
    })
  }

  const systemPrompt = buildRewritePrompt({
    regionName,
    eraLabel,
  })

  try {
    const response = await ollamaChat({
      model,

      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: text,
        },
      ],

      options: {
        temperature: 0.2,
        num_predict: 400,
        repeat_penalty: 1.15,
        repeat_last_n: 128,
        top_p: 0.85,
      },

      stream: false,
    })

    const data = await response.json()

    const rewritten = data.message?.content?.trim()

    res.json({
      text: rewritten || text,
    })
  } catch (error) {
    console.error('Rewrite error:', error)

    res.status(500).json({
      error: error.message || 'Rewrite failed.',
    })
  }
})

export default router