import { AI } from '../config/ai.js'

const API_BASE = '/api'

async function readError(response) {
  try {
    const data = await response.json()

    if (data?.error) {
      return data.error
    }
  } catch {
    // ignore
  }

  return `HTTP ${response.status}`
}

export async function checkOllama(signal) {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      return 'offline'
    }

    const data = await response.json()

    if (!data.online) {
      return 'offline'
    }

    if (data.modelAvailable === false) {
      return 'no-model'
    }

    return 'online'
  } catch {
    return 'offline'
  }
}

export async function streamChat({
  messages,
  region,
  searchEnabled = false,
  signal,
  onToken,
}) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
    },

    body: JSON.stringify({
      model: AI.model,

      messages,

      region: region
        ? {
            id: region.id,
            name: region.name,
            nameEn: region.nameEn,
          }
        : null,

      searchEnabled,

      options: {
        temperature: 0.35,
        num_predict: 700,
      },
    }),

    signal,
  })

  if (!response.ok) {
    const message = await readError(response)

    const error = new Error(message)

    if (response.status === 503) {
      error.code = 'offline'
    }

    if (response.status === 404) {
      error.code = 'no-model'
    }

    throw error
  }

  if (!response.body) {
    throw new Error('لم يصل رد من الخادم.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''
  let receivedText = false

  while (true) {
    const { value, done } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, {
      stream: true,
    })

    const lines = buffer.split('\n')

    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()

      if (!trimmed) {
        continue
      }

      let data

      try {
        data = JSON.parse(trimmed)
      } catch {
        continue
      }

      if (data.error) {
        throw new Error(data.error)
      }

      const token = data.message?.content ?? data.content ?? ''

      if (token) {
        receivedText = true
        onToken(token)
      }
    }
  }

  if (buffer.trim()) {
    try {
      const data = JSON.parse(buffer)

      const token = data.message?.content ?? data.content ?? ''

      if (token) {
        receivedText = true
        onToken(token)
      }
    } catch {
      // ignore incomplete final line
    }
  }

  if (!receivedText) {
    throw new Error('النموذج لم يرجع أي نص.')
  }
}

export async function rewriteContent({
  text,
  regionName,
  eraLabel,
  signal,
}) {
  const response = await fetch(`${API_BASE}/rewrite`, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
    },

    body: JSON.stringify({
      model: AI.model,
      text,
      regionName,
      eraLabel,
    }),

    signal,
  })

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  const data = await response.json()

  return data.text || text
}

export async function getSuggestedQuestions({
  region,
  signal,
}) {
  const response = await fetch('/api/chat/suggestions', {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
    },

    body: JSON.stringify({
      model: AI.model,

      region: region
        ? {
            id: region.id,
            name: region.name,
            nameEn: region.nameEn,
          }
        : null,
    }),

    signal,
  })

  if (!response.ok) {
    let message = `HTTP ${response.status}`

    try {
      const data = await response.json()

      if (data?.error) {
        message = data.error
      }
    } catch {
      // ignore
    }

    throw new Error(message)
  }

  const data = await response.json()

  return Array.isArray(data.questions)
    ? data.questions
        .filter(
          (question) =>
            typeof question === 'string' &&
            question.trim()
        )
        .map((question) => question.trim())
    : []
}

export async function generatePlaceStory({
  place,
  baseContent,
  signal,
}) {
  const response = await fetch('/api/rewrite/place', {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
    },

    body: JSON.stringify({
      model: AI.model,
      place,
      baseContent,
    }),

    signal,
  })

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  return response.json()
}