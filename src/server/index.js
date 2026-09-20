import express from 'express'
import { rateLimit } from 'express-rate-limit'

const app = express()

const PORT = 3000
const OLLAMA = 'http://127.0.0.1:11434'
const MODEL = 'llama3.2'

app.set('trust proxy', 'loopback')

app.use(
  express.json({
    limit: '20kb',
  })
)


// ==================================================
// Rate limiting
// ==================================================

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,

  // لكل IP
  limit: 10,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error: 'طلبات كثيرة. حاول بعد قليل.',
  },
})


// ==================================================
// Health
// ==================================================

app.get('/api/health', async (req, res) => {
  try {
    const response = await fetch(
      `${OLLAMA}/api/tags`,
      {
        signal: AbortSignal.timeout(3000),
      }
    )

    if (!response.ok) {
      return res.status(503).json({
        ok: false,
        modelAvailable: false,
      })
    }

    const data = await response.json()

    const wanted = MODEL.includes(':')
      ? MODEL
      : `${MODEL}:latest`

    const modelAvailable =
      data.models?.some(
        (model) => model.name === wanted
      ) ?? false

    return res.json({
      ok: true,
      modelAvailable,
    })
  } catch {
    return res.status(503).json({
      ok: false,
      modelAvailable: false,
    })
  }
})


// ==================================================
// Chat
// ==================================================

app.post(
  '/api/chat',
  aiLimiter,

  async (req, res) => {
    try {
      const messages = req.body?.messages

      if (!Array.isArray(messages)) {
        return res.status(400).json({
          error: 'Invalid messages',
        })
      }

      const safeMessages = messages
        .slice(-50)

        .filter(
          (message) =>
            ['system', 'user', 'assistant'].includes(
              message?.role
            ) &&
            typeof message?.content === 'string'
        )

        .map((message) => ({
          role: message.role,

          content: message.content
            .trim()
            .slice(0, 4000),
        }))

        .filter(
          (message) =>
            message.content.length > 0
        )

      if (!safeMessages.length) {
        return res.status(400).json({
          error: 'Empty conversation',
        })
      }

      const ollamaResponse = await fetch(
        `${OLLAMA}/api/chat`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            model: MODEL,

            stream: true,

            options: {
              temperature: 0.6,
              num_predict: 500,
            },

            messages: safeMessages,
          }),
        }
      )

      if (
        !ollamaResponse.ok ||
        !ollamaResponse.body
      ) {
        const detail = await ollamaResponse
          .text()
          .catch(() => '')

        console.error(
          'Ollama:',
          ollamaResponse.status,
          detail
        )

        return res.status(502).json({
          error:
            'خدمة الذكاء الاصطناعي غير متاحة.',
        })
      }

      res.status(200)

      res.setHeader(
        'Content-Type',
        'application/x-ndjson; charset=utf-8'
      )

      res.setHeader(
        'Cache-Control',
        'no-cache, no-transform'
      )

      const reader =
        ollamaResponse.body.getReader()

      try {
        for (;;) {
          const { done, value } =
            await reader.read()

          if (done) break

          res.write(Buffer.from(value))
        }
      } finally {
        reader.releaseLock()
      }

      res.end()
    } catch (error) {
      console.error(error)

      if (!res.headersSent) {
        res.status(500).json({
          error: 'AI request failed',
        })
      } else {
        res.end()
      }
    }
  }
)


// ==================================================
// Rewrite
// ==================================================

app.post(
  '/api/rewrite',
  aiLimiter,

  async (req, res) => {
    try {
      const {
        text,
        regionName = '',
        eraLabel = '',
      } = req.body ?? {}

      if (
        typeof text !== 'string' ||
        !text.trim() ||
        text.length > 5000
      ) {
        return res.status(400).json({
          error: 'Invalid text',
        })
      }

      const safeRegion =
        typeof regionName === 'string'
          ? regionName.slice(0, 100)
          : ''

      const safeEra =
        typeof eraLabel === 'string'
          ? eraLabel.slice(0, 100)
          : ''

      const systemPrompt = [
        'أنت محرر محتوى لموقع تفاعلي عن المملكة العربية السعودية.',

        'أعد صياغة النص المرسل بصياغة عربية طبيعية ومتجددة.',

        'التزم حصراً بالمعلومات الموجودة في النص الأصلي.',

        'لا تضف أي حقيقة أو رقم أو اسم جديد.',

        'حافظ على المعنى والطول التقريبي.',

        'لا تقل: بالطبع، إليك، أو النص المعاد.',

        `المنطقة: ${
          safeRegion || 'غير محددة'
        }.`,

        safeEra
          ? `القسم: ${safeEra}.`
          : '',

        'أخرج النص النهائي فقط.',
      ]
        .filter(Boolean)
        .join('\n')

      const ollamaResponse = await fetch(
        `${OLLAMA}/api/chat`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            model: MODEL,

            stream: false,

            options: {
              temperature: 0.85,
              num_predict: 500,
            },

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
          }),
        }
      )

      if (!ollamaResponse.ok) {
        return res.status(502).json({
          error:
            'خدمة الذكاء الاصطناعي غير متاحة.',
        })
      }

      const data =
        await ollamaResponse.json()

      return res.json({
        text:
          data.message?.content?.trim() ||
          text,
      })
    } catch (error) {
      console.error(error)

      return res.status(500).json({
        error: 'Rewrite failed',
      })
    }
  }
)


app.listen(
  PORT,
  '127.0.0.1',

  () => {
    console.log(
      `API listening on http://127.0.0.1:${PORT}`
    )
  }
)