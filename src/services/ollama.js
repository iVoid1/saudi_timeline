import { AI } from '../config/ai.js'

export class OllamaError extends Error {
  constructor(message, code = 'error') {
    super(message)
    this.code = code
  }
}

const api = (path) =>
  AI.baseUrl.replace(/\/+$/, '') + path


export async function checkOllama(signal) {
  try {
    const res = await fetch(api('/health'), { signal })

    if (!res.ok) return 'offline'

    const data = await res.json()

    if (!data.ok) return 'offline'
    if (!data.modelAvailable) return 'no-model'

    return 'online'
  } catch {
    return 'offline'
  }
}


export async function streamChat({
  messages,
  region,
  signal,
  onToken,
}) {
  let res

  try {
    res = await fetch(api('/chat'), {
      method: 'POST',
      signal,

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: AI.systemPrompt(region),
          },
          ...messages,
        ],
      }),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error

    throw new OllamaError(
      'تعذّر الوصول إلى خدمة الذكاء الاصطناعي.',
      'offline'
    )
  }

  if (!res.ok) {
    const detail = await res
      .json()
      .then((data) => data.error)
      .catch(() => '')

    if (res.status === 429) {
      throw new OllamaError(
        'طلبات كثيرة. انتظر قليلًا وحاول مرة أخرى.',
        'rate-limit'
      )
    }

    throw new OllamaError(
      detail || `فشل الطلب (${res.status}).`,
      'error'
    )
  }

  if (!res.body) {
    throw new OllamaError('لم تصل إجابة من النموذج.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''
  let received = false

  const handleLine = (line) => {
    if (!line.trim()) return

    let data

    try {
      data = JSON.parse(line)
    } catch {
      return
    }

    if (data.error) {
      throw new OllamaError(data.error)
    }

    const token = data.message?.content

    if (token) {
      received = true
      onToken(token)
    }
  }

  for (;;) {
    const { done, value } = await reader.read()

    if (done) break

    buffer += decoder.decode(value, {
      stream: true,
    })

    const lines = buffer.split('\n')

    buffer = lines.pop() ?? ''

    for (const line of lines) {
      handleLine(line)
    }
  }

  buffer += decoder.decode()

  handleLine(buffer)

  if (!received) {
    throw new OllamaError(
      'لم تصل إجابة من النموذج.'
    )
  }
}


export async function rewriteContent({
  text,
  regionName = '',
  eraLabel = '',
  signal,
}) {
  if (!text?.trim()) {
    return text ?? ''
  }

  try {
    const res = await fetch(api('/rewrite'), {
      method: 'POST',
      signal,

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        text,
        regionName,
        eraLabel,
      }),
    })

    if (!res.ok) {
      return text
    }

    const data = await res.json()

    return data.text?.trim() || text
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }

    return text
  }
}