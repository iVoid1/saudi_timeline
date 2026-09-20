import { AI } from '../config/ai.js'

export class OllamaError extends Error {
  constructor(message, code = 'error') {
    super(message)
    this.code = code
  }
}

const api = (path) =>
<<<<<<< HEAD
  `${AI.baseUrl.replace(/\/+$/, '')}${path}`
=======
  AI.baseUrl.replace(/\/+$/, '') + path
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8


export async function checkOllama(signal) {
  try {
<<<<<<< HEAD
    const res = await fetch(api('/health'), {
      signal,
    })
=======
    const res = await fetch(api('/health'), { signal })
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8

    if (!res.ok) return 'offline'

    const data = await res.json()

<<<<<<< HEAD
    return data.ok ? 'online' : 'offline'
=======
    if (!data.ok) return 'offline'
    if (!data.modelAvailable) return 'no-model'

    return 'online'
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8
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
<<<<<<< HEAD
        model: AI.model,

        options: AI.options,

=======
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8
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
<<<<<<< HEAD
    let detail = ''

    try {
      const data = await res.json()
      detail = data.error ?? ''
    } catch {
      // ignore
    }

    if (res.status === 429) {
      throw new OllamaError(
        'طلبات كثيرة. حاول بعد قليل.',
=======
    const detail = await res
      .json()
      .then((data) => data.error)
      .catch(() => '')

    if (res.status === 429) {
      throw new OllamaError(
        'طلبات كثيرة. انتظر قليلًا وحاول مرة أخرى.',
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8
        'rate-limit'
      )
    }

    throw new OllamaError(
<<<<<<< HEAD
      detail || `فشل الطلب (${res.status}).`
=======
      detail || `فشل الطلب (${res.status}).`,
      'error'
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8
    )
  }

  if (!res.body) {
<<<<<<< HEAD
    throw new OllamaError(
      'المتصفح لا يدعم Streaming لهذا الطلب.'
    )
=======
    throw new OllamaError('لم تصل إجابة من النموذج.')
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''
  let fullText = ''

  const processLine = (line) => {
    line = line.trim()

    if (!line) return

<<<<<<< HEAD
=======
  const handleLine = (line) => {
    if (!line.trim()) return

>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8
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
<<<<<<< HEAD
      fullText += token
      onToken?.(token)
    }
  }

  while (true) {
    const { value, done } = await reader.read()
=======
      received = true
      onToken(token)
    }
  }

  for (;;) {
    const { done, value } = await reader.read()
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8

    if (done) break

    buffer += decoder.decode(value, {
      stream: true,
    })

<<<<<<< HEAD
    let newlineIndex

    while (
      (newlineIndex = buffer.indexOf('\n')) !== -1
    ) {
      const line = buffer.slice(0, newlineIndex)

      buffer = buffer.slice(newlineIndex + 1)

      processLine(line)
=======
    const lines = buffer.split('\n')

    buffer = lines.pop() ?? ''

    for (const line of lines) {
      handleLine(line)
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8
    }
  }

  buffer += decoder.decode()

<<<<<<< HEAD
  if (buffer.trim()) {
    processLine(buffer)
  }

  if (!fullText.trim()) {
    throw new OllamaError(
      'النموذج لم يرجع أي نص.'
    )
  }

  return fullText
=======
  handleLine(buffer)

  if (!received) {
    throw new OllamaError(
      'لم تصل إجابة من النموذج.'
    )
  }
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8
}


export async function rewriteContent({
  text,
  regionName = '',
  eraLabel = '',
  signal,
}) {
<<<<<<< HEAD
  if (!text?.trim()) return text ?? ''
=======
  if (!text?.trim()) {
    return text ?? ''
  }
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8

  try {
    const res = await fetch(api('/rewrite'), {
      method: 'POST',
      signal,

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
<<<<<<< HEAD
        model: AI.model,

        options: AI.rewriteOptions,

=======
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8
        text,
        regionName,
        eraLabel,
      }),
    })

<<<<<<< HEAD
    if (!res.ok) return text
=======
    if (!res.ok) {
      return text
    }
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8

    const data = await res.json()

    return data.text?.trim() || text
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }

    return text
  }
}