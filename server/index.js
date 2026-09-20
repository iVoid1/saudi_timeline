import express from 'express'
import { rateLimit } from 'express-rate-limit'

const app = express()

const PORT = 3000

// Ollama يعمل على PC الـ RTX 5070
const OLLAMA = 'http://192.168.1.57:11434'

app.set('trust proxy', 'loopback')

app.use(
  express.json({
    limit: '32kb',
  })
)

// ======================================================
// Rate Limits
// ======================================================

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'طلبات كثيرة. حاول بعد قليل.',
  },
})

const rewriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'طلبات كثيرة. حاول بعد قليل.',
  },
})

// ======================================================
// Helpers
// ======================================================

function cleanModel(model) {
  if (typeof model !== 'string') {
    return null
  }

  const value = model.trim()

  if (!value) {
    return null
  }

  // أسماء نماذج Ollama العادية فقط
  if (!/^[a-zA-Z0-9._:/-]{1,100}$/.test(value)) {
    return null
  }

  return value
}

function cleanOptions(options) {
  const clean = {
    temperature: 0.2,
    num_predict: 350,
    repeat_penalty: 1.15,
    repeat_last_n: 128,
    top_p: 0.85,
  }

  if (!options || typeof options !== 'object') {
    return clean
  }

  if (
    typeof options.temperature === 'number' &&
    options.temperature >= 0 &&
    options.temperature <= 1
  ) {
    clean.temperature = options.temperature
  }

  if (Number.isInteger(options.num_predict)) {
    clean.num_predict = Math.min(
      Math.max(options.num_predict, 1),
      500
    )
  }

  return clean
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) {
    return null
  }

  const clean = messages
    .slice(-50)

    .filter(
      (message) =>
        message &&
        ['system', 'user', 'assistant'].includes(
          message.role
        ) &&
        typeof message.content === 'string'
    )

    .map((message) => ({
      role: message.role,

      content: message.content
        .trim()
        .slice(0, 5000),
    }))

    .filter((message) => message.content)

  return clean.length ? clean : null
}

async function readOllamaError(response) {
  try {
    const data = await response.json()

    return (
      data.error ||
      `Ollama error ${response.status}`
    )
  } catch {
    return `Ollama error ${response.status}`
  }
}

// ======================================================
// Health
// ======================================================

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
      })
    }

    return res.json({
      ok: true,
      ollama: OLLAMA,
    })
  } catch (error) {
    console.error(
      'Ollama health check failed:',
      error
    )

    return res.status(503).json({
      ok: false,
    })
  }
})

// ======================================================
// Chat - STREAMING
// ======================================================

app.post(
  '/api/chat',

  chatLimiter,

  async (req, res) => {
    const model = cleanModel(
      req.body?.model
    )

    const messages = cleanMessages(
      req.body?.messages
    )

    const options = cleanOptions(
      req.body?.options
    )

    if (!model) {
      return res.status(400).json({
        error: 'اسم النموذج غير صالح.',
      })
    }

    if (!messages) {
      return res.status(400).json({
        error: 'المحادثة غير صالحة.',
      })
    }

    let ollamaResponse

    try {
      ollamaResponse = await fetch(
        `${OLLAMA}/api/chat`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            model,
            messages,
            options,

            // Streaming من PC الـ5070
            stream: true,
          }),

          signal: AbortSignal.timeout(
            5 * 60 * 1000
          ),
        }
      )
    } catch (error) {
      console.error(
        'Ollama connection failed:',
        error
      )

      return res.status(503).json({
        error:
          'تعذّر الاتصال بمحرك الذكاء الاصطناعي على PC الـ5070.',
      })
    }

    if (!ollamaResponse.ok) {
      const error =
        await readOllamaError(
          ollamaResponse
        )

      console.error(
        `Ollama ${ollamaResponse.status}:`,
        error
      )

      return res
        .status(
          ollamaResponse.status === 404
            ? 404
            : 502
        )
        .json({
          error,
        })
    }

    if (!ollamaResponse.body) {
      return res.status(502).json({
        error: 'لم يبدأ تدفق النموذج.',
      })
    }

    // ==================================================
    // Streaming headers
    // ==================================================

    res.status(200)

    res.setHeader(
      'Content-Type',
      'application/x-ndjson; charset=utf-8'
    )

    res.setHeader(
      'Cache-Control',
      'no-cache, no-transform'
    )

    res.setHeader(
      'X-Accel-Buffering',
      'no'
    )

    res.flushHeaders()

    // ==================================================
    // Ollama -> Express -> Browser
    // ==================================================

    const reader =
      ollamaResponse.body.getReader()

    try {
      while (true) {
        const { value, done } = await reader.read()

        if (done) {
          break
        }

        // إذا المتصفح/العميل أغلق اتصال الرد فعليًا
        if (res.destroyed) {
          await reader.cancel()
          break
        }

        // بث رد Ollama مباشرة للمتصفح
        res.write(Buffer.from(value))
      }
    } catch (error) {
      console.error(
        'Streaming error:',
        error
      )
    } finally {
      try {
        reader.releaseLock()
      } catch {
        // ignore
      }

      if (!res.writableEnded && !res.destroyed) {
        res.end()
      }
    }
  }
)

// ======================================================
// Rewrite
// ======================================================

app.post(
  '/api/rewrite',

  rewriteLimiter,

  async (req, res) => {
    const model = cleanModel(
      req.body?.model
    )

    const options = cleanOptions(
      req.body?.options
    )

    const text = req.body?.text

    const regionName =
      typeof req.body?.regionName ===
      'string'
        ? req.body.regionName.slice(
            0,
            100
          )
        : ''

    const eraLabel =
      typeof req.body?.eraLabel ===
      'string'
        ? req.body.eraLabel.slice(
            0,
            100
          )
        : ''

    if (!model) {
      return res.status(400).json({
        error: 'اسم النموذج غير صالح.',
      })
    }

    if (
      typeof text !== 'string' ||
      !text.trim() ||
      text.length > 5000
    ) {
      return res.status(400).json({
        error: 'النص غير صالح.',
      })
    }

    const systemPrompt = [
      'مهمتك إعادة صياغة النص المقدم فقط.',
      'لا تجب عن النص ولا تكمله ولا تضف معلومات من عندك.',
      'لا تكرر الكلمات أو الجمل أو الأفكار.',
      'لا تضف أسماء أو مناصب أو تواريخ أو أرقام أو أحداث غير موجودة في النص.',
      'إذا كان النص قصيرًا، يجب أن يبقى الناتج قصيرًا.',
      'حافظ على جميع الحقائق الموجودة دون تغيير معناها.',
      'اكتب فقرة عربية طبيعية ومختصرة.',
      regionName ? `المنطقة: ${regionName}.` : '',
      eraLabel ? `القسم: ${eraLabel}.` : '',
      'أخرج النص المعاد صياغته فقط دون مقدمة أو تعليق.',
      'استخدم الللهجه المحلية اكثر الوقت مع دمج بعض الكلمات الفصحى',
      'استخدم أسلوب سرد قصصي جذاب مع الحفاظ على المعنى الأصلي.',
      'لا تجب الا على الاسئلة المتعلقة بالمملكة العربية السعودية.',
    ]
      .filter(Boolean)
      .join('\n')

    let ollamaResponse

    try {
      ollamaResponse = await fetch(
        `${OLLAMA}/api/chat`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            model,

            stream: false,

            options,

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

          signal: AbortSignal.timeout(
            2 * 60 * 1000
          ),
        }
      )
    } catch (error) {
      console.error(
        'Rewrite connection failed:',
        error
      )

      return res.status(503).json({
        error:
          'تعذّر الاتصال بمحرك الذكاء الاصطناعي على PC الـ5070.',
      })
    }

    if (!ollamaResponse.ok) {
      const error =
        await readOllamaError(
          ollamaResponse
        )

      console.error(
        `Ollama ${ollamaResponse.status}:`,
        error
      )

      return res
        .status(
          ollamaResponse.status === 404
            ? 404
            : 502
        )
        .json({
          error,
        })
    }

    try {
      const data =
        await ollamaResponse.json()

      return res.json({
        text:
          data.message?.content?.trim() ||
          text,
      })
    } catch {
      return res.status(502).json({
        error: 'رد النموذج غير صالح.',
      })
    }
  }
)

// ======================================================
// Start API
// ======================================================

app.listen(
  PORT,

  '127.0.0.1',

  () => {
    console.log(
      `API    → http://127.0.0.1:${PORT}`
    )

    console.log(
      `Ollama → ${OLLAMA}`
    )

    console.log(
      'AI processing → RTX 5070 PC'
    )
  }
)