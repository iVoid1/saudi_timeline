import { config } from '../config.js'

export async function webSearch(query, signal) {
  if (typeof query !== 'string' || !query.trim()) {
    return []
  }

  const cleanQuery = query.trim().slice(0, 500)

  const url = new URL('/search', config.searxngUrl)

  url.searchParams.set('q', cleanQuery)
  url.searchParams.set('format', 'json')
  url.searchParams.set('language', 'ar')
  url.searchParams.set('safesearch', '1')

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SaudiTimeline/1.0',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Search HTTP ${response.status}`)
  }

  const data = await response.json()

  return (Array.isArray(data.results) ? data.results : [])
    .slice(0, 6)
    .map((result) => ({
      title:
        typeof result.title === 'string'
          ? result.title.slice(0, 300)
          : '',

      url:
        typeof result.url === 'string'
          ? result.url.slice(0, 2000)
          : '',

      content:
        typeof result.content === 'string'
          ? result.content.slice(0, 1200)
          : '',
    }))
    .filter((result) => result.title || result.content)
}