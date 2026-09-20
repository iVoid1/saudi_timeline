import { AI } from '../config/ai.js'

export class OllamaError extends Error {
  constructor(message, code = 'error') {
    super(message)
    this.code = code
  }
}

const api = (path) => AI.baseUrl.replace(/\/+$/, '') + path

export async function checkOllama(signal) {
  try {
    const res = await fetch(api('/api/tags'), { signal })
    if (!res.ok) return 'offline'
    const { models = [] } = await res.json()
    const wanted = AI.model.includes(':') ? AI.model : `${AI.model}:latest`
    return models.some((m) => m.name === wanted) ? 'online' : 'no-model'
  } catch {
    return 'offline'
  }
}

export async function streamChat({ messages, region, signal, onToken }) {
  let res
  try {
    res = await fetch(api('/api/chat'), {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI.model, stream: true,
        options: { temperature: AI.temperature },
        messages: [{ role: 'system', content: AI.systemPrompt(region) }, ...messages],
      }),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new OllamaError('تعذّر الوصول إلى Ollama.', 'offline')
  }

  if (!res.ok) {
    const detail = await res.json().then((d) => d.error).catch(() => '')
    if (res.status === 404 && /model/i.test(detail)) throw new OllamaError(`النموذج ${AI.model} غير مثبّت.`, 'no-model')
    throw new OllamaError(detail || `رفض Ollama الطلب (${res.status}).`, res.status === 404 ? 'offline' : 'error')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let received = false

  const handleLine = (line) => {
    if (!line.trim()) return
    let data
    try { data = JSON.parse(line) } catch { return }
    if (data.error) throw new OllamaError(data.error)
    const token = data.message?.content
    if (token) { received = true; onToken(token) }
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    lines.forEach(handleLine)
  }
  handleLine(buffer)
  if (!received) throw new OllamaError('لم تصل إجابة من النموذج.')
}

// يعيد صياغة نص الصفحة من الـ Base فقط. إذا Ollama تعطل يرجع النص الأصلي.
export async function rewriteContent({ text, regionName = '', eraLabel = '', signal }) {
  if (!text?.trim()) return text ?? ''
  try {
    const res = await fetch(api('/api/chat'), {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI.model,
        stream: false,
        options: { temperature: 0.85 },
        messages: [
          {
            role: 'system',
            content: [
              'أنت محرر محتوى لموقع تفاعلي عن المملكة العربية السعودية.',
              'أعد صياغة النص المرسل بصياغة عربية طبيعية ومتجددة.',
              'التزم حصراً بالمعلومات الموجودة في النص الأصلي ولا تضف أي حقيقة أو رقم أو اسم جديد.',
              'حافظ على المعنى والطول التقريبي. لا تقل: بالطبع، إليك، أو النص المعاد.',
              `المنطقة: ${regionName || 'غير محددة'}.`,
              eraLabel ? `القسم: ${eraLabel}.` : '',
              'أخرج النص النهائي فقط.',
            ].filter(Boolean).join('\n'),
          },
          { role: 'user', content: text },
        ],
      }),
    })
    if (!res.ok) return text
    const data = await res.json()
    return data.message?.content?.trim() || text
  } catch (error) {
    if (error.name === 'AbortError') throw error
    return text
  }
}
