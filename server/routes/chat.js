import express from 'express'
import { rateLimit } from 'express-rate-limit'

import { ollamaChat } from '../services/ollama.js'
import { webSearch } from '../services/search.js'
import {
  webSearchTool,
  executeWebSearchTool,
} from '../tools/webSearch.js'
import { buildChatPrompt } from '../prompts/chat.js'
import {
  cleanModel,
  cleanMessages,
  cleanOptions,
} from '../utils/sanitize.js'

const router = express.Router()

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
})

function getToolCalls(message) {
  return Array.isArray(message?.tool_calls)
    ? message.tool_calls
    : []
}

function getLastUserMessage(messages) {
  return [...messages]
    .reverse()
    .find((message) => message.role === 'user')
}

router.post('/', limiter, async (req, res) => {
  const model = cleanModel(req.body?.model)
  const messages = cleanMessages(req.body?.messages)
  const options = cleanOptions(req.body?.options)

  const region =
    req.body?.region &&
    typeof req.body.region === 'object'
      ? req.body.region
      : null

  const searchEnabled =
    req.body?.searchEnabled === true

  if (!messages.length) {
    return res.status(400).json({
      error: 'No messages provided.',
    })
  }

  const controller = new AbortController()

  res.on('close', () => {
    if (!res.writableEnded) {
      controller.abort()
    }
  })

  try {
    const conversation = [
      {
        role: 'system',
        content: buildChatPrompt({
          region,
          searchEnabled,
        }),
      },
      ...messages,
    ]

    let usedSearch = false

    /*
      Give the model up to two chances to request tools.
    */
    for (let round = 0; round < 2; round++) {
      const response = await ollamaChat({
        model,
        messages: conversation,
        tools: [webSearchTool],
        options,
        stream: false,
        signal: controller.signal,
      })

      const data = await response.json()
      const assistant = data.message

      if (!assistant) {
        throw new Error(
          'Ollama returned no message.'
        )
      }

      const toolCalls = getToolCalls(assistant)

      /*
        No tool requested.
      */
      if (!toolCalls.length) {
        /*
          The user explicitly pressed Search,
          so force one search if the model
          didn't request one itself.
        */
        if (searchEnabled && !usedSearch) {
          const lastUser =
            getLastUserMessage(messages)

          if (lastUser?.content) {
            const query = lastUser.content

            const results = await webSearch(
              query,
              controller.signal
            )

            usedSearch = true

            conversation.push({
              role: 'assistant',
              content: '',
              tool_calls: [
                {
                  function: {
                    name: 'web_search',
                    arguments: {
                      query,
                    },
                  },
                },
              ],
            })

            conversation.push({
              role: 'tool',
              tool_name: 'web_search',
              content: JSON.stringify({
                query,
                results,
              }),
            })

            continue
          }
        }

        break
      }

      /*
        Preserve the assistant tool request
        in the conversation.
      */
      conversation.push(assistant)

      let executedTool = false

      for (const toolCall of toolCalls) {
        const result = await executeWebSearchTool(
          toolCall,
          controller.signal
        )

        if (!result) {
          continue
        }

        usedSearch = true
        executedTool = true

        conversation.push({
          role: 'tool',
          tool_name: 'web_search',
          content: JSON.stringify(result),
        })
      }

      if (!executedTool) {
        break
      }
    }

    /*
      Final response.

      No tools here deliberately:
      tool decisions have already happened,
      and now we want normal streamed text.
    */
    const finalResponse = await ollamaChat({
      model,
      messages: conversation,
      tools: [],
      options,
      stream: true,
      signal: controller.signal,
    })

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

    res.flushHeaders?.()

    const reader =
      finalResponse.body.getReader()

    try {
      while (true) {
        const { value, done } =
          await reader.read()

        if (done) {
          break
        }

        /*
          Important:
          check the response, not req.destroyed.
        */
        if (res.destroyed) {
          await reader.cancel()
          break
        }

        res.write(Buffer.from(value))
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(
          'Streaming error:',
          error
        )
      }
    } finally {
      try {
        reader.releaseLock()
      } catch {
        // ignore
      }

      if (
        !res.writableEnded &&
        !res.destroyed
      ) {
        res.end()
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return
    }

    console.error('Chat error:', error)

    if (!res.headersSent) {
      res.status(500).json({
        error:
          error.message ||
          'Chat failed.',
      })

      return
    }

    if (!res.writableEnded) {
      res.end()
    }
  }
})

export default router