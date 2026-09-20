import { useEffect, useRef, useState } from 'react'
import { REGIONS } from '../data/regions.js'
import { ERAS, getRegionContent } from '../data/regionsContent.js'
import { rewriteContent } from '../services/ollama.js'

export default function RegionStory({ regionId }) {
  const [activeEra, setActiveEra] = useState(ERAS[0].key)
  const stationRefs = useRef({})
  const [dynamicText, setDynamicText] = useState({})
  const [dynamicTagline, setDynamicTagline] = useState('')

  const region = REGIONS.find((r) => r.id === regionId)
  const content = getRegionContent(regionId)

  useEffect(() => {
    setActiveEra(ERAS[0].key)
    setDynamicText({})
    setDynamicTagline('')
  }, [regionId])

  /* النص الأصلي هو الـ Base؛ Ollama يغيّر الصياغة فقط. */
  useEffect(() => {
    if (!region || !content) return
    const controller = new AbortController()

    if (content.tagline) {
      rewriteContent({ text: content.tagline, regionName: region.name, signal: controller.signal })
        .then((value) => !controller.signal.aborted && setDynamicTagline(value))
        .catch(() => {})
    }

    ERAS.forEach((era) => {
      const base = content.eras[era.key]?.text
      if (!base) return
      rewriteContent({ text: base, regionName: region.name, eraLabel: era.label, signal: controller.signal })
        .then((value) => {
          if (!controller.signal.aborted) setDynamicText((current) => ({ ...current, [era.key]: value }))
        })
        .catch(() => {})
    })

    return () => controller.abort()
  }, [regionId])

  useEffect(() => {
    const nodes = Object.values(stationRefs.current).filter(Boolean)
    if (!nodes.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveEra(visible.target.dataset.era)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0.01, 0.5] }
    )
    nodes.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [regionId])

  if (!region) return null

  const goTo = (key) => stationRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <article className="story" key={regionId}>
      <header className="story__head">
        <span className="story__swatch" style={{ background: region.color }} aria-hidden="true" />
        <h2 className="story__name">{region.name}</h2>
        <span className="story__name-en">{region.nameEn}</span>
        {content.tagline && <p className="story__tagline">{dynamicTagline || content.tagline}</p>}
        <a className="story__back" href="#map">اختر منطقة أخرى</a>
      </header>

      {content.facts.length > 0 && (
        <dl className="facts">
          {content.facts.map((fact, i) => (
            <div className="facts__item" key={i}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="timeline">
        <nav className="timeline__rail" aria-label="محطات الخط الزمني">
          {ERAS.map((era, i) => (
            <button
              key={era.key}
              type="button"
              className={`rail__step${activeEra === era.key ? ' is-active' : ''}`}
              onClick={() => goTo(era.key)}
            >
              <span className="rail__dot">{i + 1}</span>
              <span className="rail__label">{era.label}</span>
            </button>
          ))}
        </nav>

        <div className="timeline__stations">
          {ERAS.map((era, i) => {
            const { text, highlights, image } = content.eras[era.key]
            const hasContent = text || highlights.length || image
            return (
              <section
                key={era.key}
                data-era={era.key}
                ref={(el) => (stationRefs.current[era.key] = el)}
                className={`station${activeEra === era.key ? ' is-active' : ''}`}
              >
                <div className="station__meta">
                  <span className="station__index">{i + 1}</span>
                  <h3>{era.label}</h3>
                  <p>{era.hint}</p>
                </div>

                <div className="station__body">
                  {image && <img className="station__image" src={image} alt={`${region.name} — ${era.label}`} loading="lazy" />}
                  {text && <p className="station__text">{dynamicText[era.key] || text}</p>}
                  {highlights.length > 0 && (
                    <ul className="station__list">
                      {highlights.map((h, k) => (
                        <li key={k}>{h}</li>
                      ))}
                    </ul>
                  )}
                  {!hasContent && (
                    <p className="station__empty">
                      هذه الخانة تنتظر نصّك: <code>regionsContent.{regionId}.eras.{era.key}.text</code>
                    </p>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </article>
  )
}
