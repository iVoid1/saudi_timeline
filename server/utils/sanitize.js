import { config } from '../config.js'

export function cleanModel(model) {
  if (typeof model !== 'string' || !model.trim()) {
    return config.ollamaModel
  }

  return model.trim().slice(0, 100)
}

export function cleanMessages(messages) {
  if (!Array.isArray(messages)) {
    return []
  }

  return messages
    .slice(-50)
    .filter(
      (message) =>
        message &&
        ['user', 'assistant'].includes(message.role) &&
        typeof message.content === 'string'
    )
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 12000),
    }))
}

export function cleanOptions(options) {
  const clean = {
    temperature: 0.3,
    num_predict: 700,
    repeat_penalty: 1.15,
    repeat_last_n: 128,
    top_p: 0.9,
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
      1200
    )
  }

  return clean
}

export function cleanText(value, maxLength = 8000) {
  return typeof value === 'string'
    ? value.trim().slice(0, maxLength)
    : ''
}