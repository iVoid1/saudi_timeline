import { useEffect, useRef, useState } from 'react'
import { AI } from '../config/ai.js'
import {
  checkOllama,
  getSuggestedQuestions,
  streamChat,
} from '../services/ollama.js'

const STORAGE_KEY = 'saudi-timeline-chat-v1'

const MAX_MESSAGES = 50
const WARNING_AT = 48

const STATUS_LABEL = {
  checking: 'يتحقق…',
  online: 'متصل',
  offline: 'غير متصل',
  'no-model': 'النموذج غير مثبّت',
}

const Icon = {
  chat: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
    </svg>
  ),

  close: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),

  clear: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />
    </svg>
  ),

  send: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ),

  stop: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  ),

  search: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  ),
}

function loadMessages() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]'
    )

    return Array.isArray(saved)
      ? saved.slice(-MAX_MESSAGES)
      : []
  } catch {
    return []
  }
}

export default function OllamaChat({
  open,
  onOpenChange,
  region,
}) {
  const [messages, setMessages] = useState(loadMessages)

  const [input, setInput] = useState('')

  const [busy, setBusy] = useState(false)

  const [status, setStatus] = useState('checking')

  const [error, setError] = useState('')

  const [searchEnabled, setSearchEnabled] = useState(false)

  const [suggestedQuestions, setSuggestedQuestions] =
  useState([])

  const [suggestionsLoading, setSuggestionsLoading] =
  useState(false)

  const listRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          messages
            .filter((message) => message.content)
            .slice(-MAX_MESSAGES)
        )
      )
    } catch {
      // ignore
    }
  }, [messages])

  useEffect(() => {
    if (!open) {
      return
    }

    const controller = new AbortController()

    setStatus('checking')

    checkOllama(controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setStatus(result)
      }
    })

    inputRef.current?.focus()

    return () => controller.abort()
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const controller = new AbortController()

    setSuggestedQuestions([])
    setSuggestionsLoading(true)

    getSuggestedQuestions({
      region,
      signal: controller.signal,
    })
      .then((questions) => {
        if (!controller.signal.aborted) {
          setSuggestedQuestions(questions)
        }
      })
      .catch(() => {
        // الأسئلة اختيارية، الشات يستمر حتى لو فشل توليدها
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSuggestionsLoading(false)
        }
      })

    return () => controller.abort()
  }, [open, region?.id])

  useEffect(() => {
    if (!open) {
      return
    }

    const onKey = (event) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop =
        listRef.current.scrollHeight
    }
  }, [messages, error])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const appendToLast = (token) => {
    setMessages((current) => {
      const next = current.slice()

      const last = next[next.length - 1]

      if (!last || last.role !== 'assistant') {
        return current
      }

      next[next.length - 1] = {
        ...last,
        content: last.content + token,
      }

      return next
    })
  }

  const send = async (text = input) => {
    const content = text.trim()

    if (!content || busy) {
      return
    }

    /*
      بعد اكتمال 50 رسالة تبدأ ذاكرة جديدة تلقائياً.
    */

    const base =
      messages.length >= MAX_MESSAGES
        ? []
        : messages

    const history = [
      ...base,
      {
        role: 'user',
        content,
      },
    ]

    setMessages([
      ...history,
      {
        role: 'assistant',
        content: '',
      },
    ])

    setInput('')
    setError('')
    setBusy(true)

    const controller = new AbortController()

    abortRef.current = controller

    try {
      await streamChat({
        messages: history.slice(-MAX_MESSAGES),

        region,

        searchEnabled,

        signal: controller.signal,

        onToken: appendToLast,
      })

      setStatus('online')
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message)

        if (
          err.code === 'offline' ||
          err.code === 'no-model'
        ) {
          setStatus(err.code)
        }
      }
    } finally {
      setMessages((current) => {
        const last =
          current[current.length - 1]

        if (
          last?.role === 'assistant' &&
          !last.content
        ) {
          return current.slice(0, -1)
        }

        return current.slice(-MAX_MESSAGES)
      })

      setBusy(false)

      abortRef.current = null
    }
  }

  const stop = () => {
    abortRef.current?.abort()
  }

  const clear = () => {
    stop()

    setMessages([])
    setError('')

    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  const remaining =
    Math.max(
      0,
      MAX_MESSAGES - messages.length
    )

  const limitWarning =
    messages.length >= WARNING_AT
      ? remaining === 0
        ? 'وصلت لنهاية ذاكرة المحادثة؛ رسالتك القادمة ستبدأ محادثة جديدة.'
        : `باقي ${remaining} ${
            remaining === 1
              ? 'رسالة'
              : 'رسالتين'
          } قبل بدء محادثة جديدة.`
      : ''

  const notice =
    status === 'offline'
      ? 'تعذّر الوصول إلى Ollama.'
      : status === 'no-model'
        ? `النموذج ${AI.model} غير مثبّت.`
        : error

  return (
    <>
      {!open && (
        <button
          type="button"
          className="chat-launcher"
          onClick={() => onOpenChange(true)}
        >
          {Icon.chat}

          <span>{AI.title}</span>
        </button>
      )}

      <section
        className={`chat${open ? ' is-open' : ''}`}
        role="dialog"
        aria-label={AI.title}
        aria-hidden={!open}
      >
        <header className="chat__head">
          <div>
            <h2>{AI.title}</h2>

            <span
              className={`chat__status is-${status}`}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>

          <div className="chat__tools">
            <button
              type="button"
              onClick={clear}
              disabled={!messages.length}
              aria-label="مسح المحادثة"
              title="مسح المحادثة"
            >
              {Icon.clear}
            </button>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="إغلاق"
              title="إغلاق"
            >
              {Icon.close}
            </button>
          </div>
        </header>

        <p className="chat__context">
          السياق:{' '}
          <strong>
            {region?.name ?? 'المملكة كاملة'}
          </strong>
        </p>

        <div
          className="chat__list"
          ref={listRef}
          aria-live="polite"
        >
          <p className="msg msg--assistant">
            {AI.starter}
          </p>

          {messages.map((message, index) => {
  const pending =
    busy &&
    index === messages.length - 1 &&
    !message.content

  return (
    <p
      className={`msg msg--${message.role}`}
      key={index}
    >
      {pending ? (
        <span className="typing">
          <i />
          <i />
          <i />
        </span>
      ) : (
        message.content
      )}
    </p>
  )
})}

{!messages.length && suggestionsLoading && (
  <div className="chat__quick">
    <span className="typing">
      <i />
      <i />
      <i />
    </span>
  </div>
)}

{!messages.length &&
  !suggestionsLoading &&
  suggestedQuestions.length > 0 && (
    <div className="chat__quick">
      {suggestedQuestions.map((question) => (
        <button
          key={question}
          type="button"
          disabled={busy}
          onClick={() => send(question)}
        >
          {question}
        </button>
      ))}
    </div>
  )}

</div>

        {notice && (
          <p
            className="chat__notice"
            role="alert"
          >
            {notice}
          </p>
        )}

        {limitWarning && (
          <p className="chat__limit-warning">
            {limitWarning}
          </p>
        )}

        <div className="chat__modebar">
          <button
            type="button"
            className={`chat__search-toggle${
              searchEnabled
                ? ' is-active'
                : ''
            }`}
            aria-pressed={searchEnabled}
            onClick={() =>
              setSearchEnabled(
                (current) => !current
              )
            }
            disabled={busy}
            title={
              searchEnabled
                ? 'البحث في الإنترنت مفعّل'
                : 'تفعيل البحث في الإنترنت'
            }
          >
            {Icon.search}

            <span>بحث</span>
          </button>

          {searchEnabled && (
            <span className="chat__search-status">
              سيتم البحث في الإنترنت
            </span>
          )}
        </div>

        <form
          className="chat__form"
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            placeholder={
              searchEnabled
                ? 'ابحث واسأل…'
                : 'اكتب سؤالك…'
            }
            aria-label="رسالتك"
            onChange={(event) =>
              setInput(event.target.value)
            }
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault()

                send()
              }
            }}
          />

          {busy ? (
            <button
              type="button"
              className="chat__send"
              onClick={stop}
              aria-label="إيقاف"
            >
              {Icon.stop}
            </button>
          ) : (
            <button
              type="submit"
              className="chat__send"
              disabled={!input.trim()}
              aria-label="إرسال"
            >
              {Icon.send}
            </button>
          )}
        </form>

        <p className="chat__memory-note">
          ذاكرة المحادثة محدودة بآخر 50 رسالة
          وتُصفّر تلقائيًا عند بلوغ الحد.
        </p>
      </section>
    </>
  )
}