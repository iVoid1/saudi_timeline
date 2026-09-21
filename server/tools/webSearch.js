import { webSearch } from '../services/search.js'

export const webSearchTool = {
  type: 'function',

  function: {
    name: 'web_search',

    description:
      'Search the public web for factual information. Use this when current, missing, uncertain, or additional factual information is needed.',

    parameters: {
      type: 'object',

      properties: {
        query: {
          type: 'string',

          description:
            'A concise and focused web search query.',
        },
      },

      required: ['query'],
    },
  },
}

export async function executeWebSearchTool(
  toolCall,
  signal
) {
  const fn = toolCall?.function

  if (fn?.name !== 'web_search') {
    return null
  }

  let args = fn.arguments

  // Ollama normally returns an object,
  // but support JSON strings too.
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args)
    } catch {
      args = {}
    }
  }

  const query =
    typeof args?.query === 'string'
      ? args.query.trim()
      : ''

  if (!query) {
    return null
  }

  const results = await webSearch(query, signal)

  return {
    query,
    results,
  }
}