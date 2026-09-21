import express from 'express'
import { rateLimit } from 'express-rate-limit'

import { ollamaChat } from '../services/ollama.js'
import { webSearch } from '../services/search.js'

import {
  buildRewritePrompt,
  buildPlaceStoryPrompt,
} from '../prompts/rewrite.js'

import {
  cleanModel,
  cleanText,
} from '../utils/sanitize.js'

const router = express.Router()

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
})

function cleanJson(text) {
  if (!text) return null

  let value = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  const first = value.indexOf('{')
  const last = value.lastIndexOf('}')

  if (first !== -1 && last !== -1) {
    value = value.slice(first, last + 1)
  }

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/*
  ==================================================
  Story generation
  ==================================================
*/

router.post(
  '/place',
  limiter,
  async (req, res) => {
    const model =
      cleanModel(req.body?.model)

    const rawPlace = req.body?.place

    const place = {
      id: cleanText(
        rawPlace?.id,
        200
      ),

      name: cleanText(
        rawPlace?.name,
        200
      ),

      type:
        rawPlace?.type === 'governorate'
          ? 'governorate'
          : 'region',

      regionId: cleanText(
        rawPlace?.regionId,
        100
      ),

      regionName: cleanText(
        rawPlace?.regionName,
        200
      ),
    }

    if (!place.name) {
      return res.status(400).json({
        error: 'No place provided.',
      })
    }

    /*
      البيانات المرجعية القادمة من الموقع.
    */
    const baseContent =
      req.body?.baseContent &&
      typeof req.body.baseContent === 'object'
        ? req.body.baseContent
        : {}

    const controller =
      new AbortController()

    res.on('close', () => {
      if (!res.writableEnded) {
        controller.abort()
      }
    })

    try {
      /*
        البحث التلقائي هنا متعمد أن يكون
        فقط عن المكان السعودي الحالي.
      */

      const queries =
        place.type === 'governorate'
          ? [
              `"${place.name}" "${place.regionName}" تاريخ السعودية`,
              `"${place.name}" محافظة تاريخ آثار تراث`,
            ]
          : [
              `"${place.name}" تاريخ السعودية`,
            ]

      const searchGroups =
        await Promise.allSettled(
          queries.map((query) =>
            webSearch(
              query,
              controller.signal
            )
          )
        )

      const results =
        searchGroups
          .flatMap((result) =>
            result.status === 'fulfilled'
              ? result.value
              : []
          )
          .slice(0, 8)

      const research =
        results.length
          ? results
              .map(
                (result, index) => `
SOURCE ${index + 1}
Title: ${result.title}
URL: ${result.url}
Excerpt: ${result.content}
`.trim()
              )
              .join('\n\n')
          : ''

      const systemPrompt =
        buildPlaceStoryPrompt({
          place,
          baseContent,
          research,
        })

      const response =
        await ollamaChat({
          model,

          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },

            {
              role: 'user',
              content:
                `Generate the story for ${place.name}.`,
            },
          ],

          options: {
            temperature: 0.55,
            num_predict: 1200,
            repeat_penalty: 1.12,
            top_p: 0.9,
          },

          stream: false,

          signal: controller.signal,
        })

      const data =
        await response.json()

      const story =
        cleanJson(
          data.message?.content
        )

      if (
        !story ||
        typeof story !== 'object' ||
        !story.eras
      ) {
        throw new Error(
          'Ollama returned invalid story JSON.'
        )
      }

      res.json(story)
    } catch (error) {
      if (error.name === 'AbortError') {
        return
      }

      console.error(
        'Place story error:',
        error
      )

      res.status(500).json({
        error:
          error.message ||
          'Place story generation failed.',
      })
    }
  }
)

/*
  ==================================================
  Old rewrite endpoint
  ==================================================
*/

router.post('/', limiter, async (req, res) => {
  const model =
    cleanModel(req.body?.model)

  const text =
    cleanText(
      req.body?.text,
      8000
    )

  const regionName =
    cleanText(
      req.body?.regionName,
      100
    )

  const eraLabel =
    cleanText(
      req.body?.eraLabel,
      100
    )

  if (!text) {
    return res.status(400).json({
      error: 'No text provided.',
    })
  }

  const systemPrompt =
    buildRewritePrompt({
      regionName,
      eraLabel,
    })

  try {
    const response =
      await ollamaChat({
        model,

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

        options: {
          temperature: 0.2,
          num_predict: 400,
          repeat_penalty: 1.15,
          repeat_last_n: 128,
          top_p: 0.85,
        },

        stream: false,
      })

    const data =
      await response.json()

    const rewritten =
      data.message?.content?.trim()

    res.json({
      text: rewritten || text,
    })
  } catch (error) {
    console.error(
      'Rewrite error:',
      error
    )

    res.status(500).json({
      error:
        error.message ||
        'Rewrite failed.',
    })
  }
})

export default router