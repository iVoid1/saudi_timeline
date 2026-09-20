import { useMemo, useState } from 'react'
import { REGIONS, COUNTRY_OUTLINE } from '../data/regions.js'

/* إسقاط بسيط (equirectangular) من إحداثيات جغرافية إلى إحداثيات الـ SVG */
const VIEW_W = 1000
const VIEW_H = 820
const LON0 = 34.3
const LAT0 = 32.5
const SCALE = 48.5
const LAT_FACTOR = 0.913 // ≈ cos(24°)

const project = ([lon, lat]) => [(lon - LON0) * LAT_FACTOR * SCALE, (LAT0 - lat) * SCALE]

const toPath = (coords) =>
  coords
    .map(project)
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ') + ' Z'

/* مواضع مخصّصة لبعض الأسماء حتى لا تقع خارج شكل المنطقة أو فوق نقطة مدينة */
const LABEL_AT = {
  eastern: [49.6, 23.4],
  riyadh: [45.7, 23.0],
  makkah: [41.2, 21.2],
  madinah: [39.9, 25.2],
  tabuk: [37.9, 28.1],
  northern: [41.6, 30.2],
  najran: [45.9, 18.5],
  asir: [42.8, 18.5],
  hail: [41.9, 28.0],
}

/* مناطق صغيرة ما يتسع لها اسم على الخريطة (تظهر في القائمة وعند المرور) */
const NO_LABEL = new Set(['bahah', 'jazan'])

const centroid = (pts) => [
  pts.reduce((s, p) => s + p[0], 0) / pts.length,
  pts.reduce((s, p) => s + p[1], 0) / pts.length,
]

export default function SaudiMap({ selectedId, onSelect }) {
  const [hoveredId, setHovered] = useState(null)

  const shapes = useMemo(
    () =>
      REGIONS.map((r) => ({
        ...r,
        d: toPath(r.coords),
        label: project(LABEL_AT[r.id] ?? r.labelAt ?? centroid(r.coords)),
      })),
    []
  )

  const outline = useMemo(() => toPath(COUNTRY_OUTLINE), [])
  const active = hoveredId ?? selectedId
  const activeName = REGIONS.find((r) => r.id === active)?.name

  return (
    <div className="map-frame">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="map-svg" role="group" aria-label="خريطة مناطق المملكة العربية السعودية">
        <defs>
          <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#4a3c22" floodOpacity="0.28" />
          </filter>
          <filter id="pick" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0c3a24" floodOpacity="0.45" />
          </filter>
        </defs>

        <g filter="url(#lift)">
          <path d={outline} fill="#dfd0ad" />
        </g>

        <g className="regions">
          {shapes.map((r) => {
            const isSelected = selectedId === r.id
            const isHovered = hoveredId === r.id
            const isDim = active && active !== r.id
            return (
              <path
                key={r.id}
                d={r.d}
                fill={r.color}
                className={['region', isSelected && 'is-selected', isHovered && 'is-hovered', isDim && 'is-dim']
                  .filter(Boolean)
                  .join(' ')}
                filter={isSelected || isHovered ? 'url(#pick)' : undefined}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={r.name}
                onMouseEnter={() => setHovered(r.id)}
                onMouseLeave={() => setHovered((h) => (h === r.id ? null : h))}
                onFocus={() => setHovered(r.id)}
                onBlur={() => setHovered((h) => (h === r.id ? null : h))}
                onClick={() => onSelect(r.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(r.id)
                  }
                }}
              />
            )
          })}
        </g>

        {/* المدن: نقاط فقط، بدون أسماء حتى لا تتداخل مع أسماء المناطق */}
        {/* <g className="cities" aria-hidden="true">
          {CITIES.map((c) => {
            const [x, y] = project(c.at)
            return <circle key={c.name} cx={x} cy={y} r={c.major ? 5 : 3.5} className={c.major ? 'city city--major' : 'city'} />
          })}
        </g> */}

        <g className="region-labels" aria-hidden="true">
          {shapes
            .filter((r) => !NO_LABEL.has(r.id))
            .map((r) => (
              <text key={r.id} x={r.label[0]} y={r.label[1]} className={selectedId === r.id ? 'is-selected' : undefined}>
                {r.name}
              </text>
            ))}
        </g>

        <path d={outline} className="country-outline" />
      </svg>

      <p className="map-caption" aria-live="polite">
        {activeName ?? 'مرّر على الخريطة، واضغط على منطقة لتفتح حكايتها'}
      </p>
    </div>
  )
}
