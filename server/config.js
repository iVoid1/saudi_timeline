import { sharedConfig } from '../shared/config.js'

export const config = {
  port: Number(process.env.PORT) || 3000,

  ollamaUrl:
    process.env.OLLAMA_URL ||
    'http://192.168.1.57:11434',

  ollamaModel:
    process.env.OLLAMA_MODEL ||
    sharedConfig.ollamaModel,

  searxngUrl:
    process.env.SEARXNG_URL ||
    'http://127.0.0.1:8080',
}