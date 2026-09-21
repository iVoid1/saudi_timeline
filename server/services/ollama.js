// server/services/ollama.js

import { config } from '../config.js'

async function readError(response) {
  try {
    const data = await response.json()

    if (data?.error) {
      return data.error
    }
  } catch {
    // ignore
  }

  return `Ollama HTTP ${response.status}`
}

export async function ollamaChat({
  model,
  messages,
  tools,
  options,
  stream = false,
  signal,
}) {
  const body = {
    model,
    messages,
    stream,
    options,
  }

  if (Array.isArray(tools) && tools.length) {
    body.tools = tools
  }

  const response = await fetch(
    `${config.ollamaUrl}/api/chat`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify(body),
      signal,
    }
  )

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  return response
}

export async function getOllamaModels(signal) {
  const response = await fetch(
    `${config.ollamaUrl}/api/tags`,
    { signal }
  )

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  const data = await response.json()

  return Array.isArray(data.models)
    ? data.models
    : []
}

export async function isOllamaOnline() {
  try {
    await getOllamaModels(
      AbortSignal.timeout(4000)
    )

    return true
  } catch {
    return false
  }
}