import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { REGIONS } from '../data/regions.js'
import { AI } from '../config/ai.js'

import {
  COUNTRY,
  ERAS,
  getRegionContent,
} from '../data/regionsContent.js'

import {
  generatePlaceStory,
} from '../services/ollama.js'

function normalizeStory(
  story,
  fallback
) {
  return {
    tagline:
      story?.tagline ||
      fallback?.tagline ||
      '',

    facts:
      Array.isArray(story?.facts)
        ? story.facts.filter(
            (fact) =>
              fact?.label ||
              fact?.value
          )
        : fallback?.facts ?? [],

    eras: Object.fromEntries(
      ERAS.map(({ key }) => {
        const generated =
          story?.eras?.[key] ?? {}

        const base =
          fallback?.eras?.[key] ?? {}

        return [
          key,
          {
            text:
              generated.text ||
              base.text ||
              '',

            highlights:
              Array.isArray(
                generated.highlights
              )
                ? generated.highlights
                    .filter(Boolean)
                : base.highlights ?? [],

            image:
              base.image ?? '',
          },
        ]
      })
    ),
  }
}

export default function PlaceStory({
  regionId,
  governorate,
  onBack,
}) {
  const [
    activeEra,
    setActiveEra,
  ] = useState(ERAS[0].key)

  const [
    generatedContent,
    setGeneratedContent,
  ] = useState(null)

  const [
    loading,
    setLoading,
  ] = useState(false)

  const stationRefs = useRef({})

  const region =
    REGIONS.find(
      (item) =>
        item.id === regionId
    ) ?? null

  const regionContent =
    useMemo(
      () =>
        getRegionContent(region?.id),

      [region]
    )

  /*
    المحافظة تأخذ المنطقة كمرجع عام فقط.

    لا ندّعي أن معلومات المنطقة
    كلها تخص المحافظة.
  */
  const baseContent =
    useMemo(() => {
      if (!region || !governorate) {
        return regionContent
      }

      return {
        tagline:
          `${governorate.name} إحدى محافظات ${region.name}.`,

        facts: [
          {
            label: 'المحافظة',
            value:
              governorate.name,
          },

          {
            label: 'المنطقة',
            value:
              region.name,
          },
        ],

        /*
          لا ننسخ تاريخ المنطقة
          للمحافظة كأنه تاريخها.

          نرسله فقط كـ parentContext
          لاحقًا.
        */
        eras: Object.fromEntries(
          ERAS.map(({ key }) => [
            key,
            {
              text: '',
              highlights: [],
              image: '',
            },
          ])
        ),

        parentContext: {
          region:
            region.name,

          regionReference:
            regionContent,
        },
      }
    }, [
      region,
      governorate,
      regionContent,
    ])

  const place =
    useMemo(() => {
      if (!region) {
        return COUNTRY
      }

      if (governorate) {
        return {
          id:
            governorate.id,

          name:
            governorate.name,

          type:
            'governorate',

          regionId:
            region.id,

          regionName:
            region.name,
        }
      }

      return {
        id: region.id,
        name: region.name,
        nameEn: region.nameEn,

        type: 'region',

        regionId:
          region.id,

        regionName:
          region.name,
      }
    }, [
      region,
      governorate,
    ])

  /*
    عند تغيير المكان:
    - نظهر الـbase فورًا
    - AI يبدأ في الخلفية
    - ثم نستبدله بالمحتوى المولد
  */
  useEffect(() => {
    setActiveEra(
      ERAS[0].key
    )

    setGeneratedContent(null)

    if (place.type === 'country' || !AI.enabled) {
      setLoading(false)
      return
    }

    const controller =
      new AbortController()

    setLoading(true)

    generatePlaceStory({
      place,
      baseContent,
      signal:
        controller.signal,
    })
      .then((story) => {
        if (
          !controller.signal.aborted
        ) {
          setGeneratedContent(
            story
          )
        }
      })
      .catch((error) => {
        if (
          error.name !==
          'AbortError'
        ) {
          console.error(
            'Place story:',
            error
          )
        }
      })
      .finally(() => {
        if (
          !controller.signal.aborted
        ) {
          setLoading(false)
        }
      })

    return () =>
      controller.abort()
  }, [
    place,
    baseContent,
  ])

  const content =
    useMemo(
      () =>
        normalizeStory(
          generatedContent,
          baseContent
        ),

      [
        generatedContent,
        baseContent,
      ]
    )

  useEffect(() => {
    const nodes =
      Object.values(
        stationRefs.current
      ).filter(Boolean)

    if (!nodes.length) {
      return
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const visible =
            entries
              .filter(
                (entry) =>
                  entry.isIntersecting
              )
              .sort(
                (a, b) =>
                  b.intersectionRatio -
                  a.intersectionRatio
              )[0]

          if (visible) {
            setActiveEra(
              visible.target
                .dataset.era
            )
          }
        },

        {
          rootMargin:
            '-45% 0px -45% 0px',

          threshold: [
            0.01,
            0.5,
          ],
        }
      )

    nodes.forEach(
      (element) =>
        observer.observe(element)
    )

    return () =>
      observer.disconnect()
  }, [
    place?.id,
    generatedContent,
  ])

  const goTo = (key) =>
    stationRefs.current[
      key
    ]?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
    })

  return (
    <article
      className="story"
      key={`${place.type}-${place.id}`}
    >
      <header className="story__head">
        <span
          className="story__swatch"
          style={{
            background:
              (region ?? COUNTRY).color,
          }}
          aria-hidden="true"
        />

        {governorate && (
          <span className="story__name-en">
            {region.name}
          </span>
        )}

        <h2 className="story__name">
          {place.name}
        </h2>

        {!governorate &&
          place.nameEn && (
            <span className="story__name-en">
              {place.nameEn}
            </span>
          )}

        {content.tagline && (
          <p className="story__tagline">
            {content.tagline}
          </p>
        )}

        {loading && (
          <span
            className="story__loading"
            aria-live="polite"
          >
            يبحث ويعيد بناء الحكاية…
          </span>
        )}

        <a
          className="story__back"
          href="#map"
          onClick={onBack}
        >
          {governorate
            ? `ارجع إلى ${region.name}`
            : region ? 'العودة إلى المملكة' : 'استكشف المناطق'}
        </a>
      </header>

      {content.facts.length >
        0 && (
        <dl className="facts">
          {content.facts.map(
            (fact, index) => (
              <div
                className="facts__item"
                key={`${fact.label}-${index}`}
              >
                <dt>
                  {fact.label}
                </dt>

                <dd>
                  {fact.value}
                </dd>
              </div>
            )
          )}
        </dl>
      )}

      <div className="timeline">
        <nav
          className="timeline__rail"
          aria-label="محطات الخط الزمني"
        >
          {ERAS.map(
            (era, index) => (
              <button
                key={era.key}
                type="button"

                className={`rail__step${
                  activeEra ===
                  era.key
                    ? ' is-active'
                    : ''
                }`}

                onClick={() =>
                  goTo(era.key)
                }
              >
                <span className="rail__dot">
                  {index + 1}
                </span>

                <span className="rail__label">
                  {era.label}
                </span>
              </button>
            )
          )}
        </nav>

        <div className="timeline__stations">
          {ERAS.map(
            (era, index) => {
              const section =
                content.eras[
                  era.key
                ]

              const text =
                section?.text ?? ''

              const highlights =
                section?.highlights ??
                []

              const image =
                section?.image ?? ''

              const hasContent =
                text ||
                highlights.length ||
                image

              return (
                <section
                  key={era.key}

                  data-era={
                    era.key
                  }

                  ref={(element) => {
                    stationRefs.current[
                      era.key
                    ] = element
                  }}

                  className={`station${
                    activeEra ===
                    era.key
                      ? ' is-active'
                      : ''
                  }`}
                >
                  <div className="station__meta">
                    <span className="station__index">
                      {index + 1}
                    </span>

                    <h3>
                      {era.label}
                    </h3>

                    <p>
                      {era.hint}
                    </p>
                  </div>

                  <div className="station__body">
                    {image && (
                      <img
                        className="station__image"
                        src={image}
                        alt={`${place.name} — ${era.label}`}
                        loading="lazy"
                      />
                    )}

                    {text && (
                      <p className="station__text">
                        {text}
                      </p>
                    )}

                    {highlights.length >
                      0 && (
                      <ul className="station__list">
                        {highlights.map(
                          (
                            highlight,
                            highlightIndex
                          ) => (
                            <li
                              key={
                                highlightIndex
                              }
                            >
                              {
                                highlight
                              }
                            </li>
                          )
                        )}
                      </ul>
                    )}

                    {!hasContent &&
                      loading && (
                        <p className="station__empty">
                          يجمع معلومات
                          عن{' '}
                          {place.name}…
                        </p>
                      )}

                    {!hasContent &&
                      !loading && (
                        <p className="station__empty">
                          لا توجد معلومات
                          موثوقة كافية
                          لهذه المحطة.
                        </p>
                      )}
                  </div>
                </section>
              )
            }
          )}
        </div>
      </div>
    </article>
  )
}