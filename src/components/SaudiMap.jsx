import { useMemo, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'

import { REGIONS, COUNTRY_OUTLINE } from '../data/regions.js'

import {
  getGovernoratesForRegion,
  getGovernorateArabicName,
} from '../data/geo/adminMap.js'

import adm2Data from '../data/geo/saudi-adm2.json'

// ==========================================
// الخريطة الأصلية
// ==========================================

const VIEW_W = 1000
const VIEW_H = 820

const LON0 = 34.3
const LAT0 = 32.5
const SCALE = 48.5
const LAT_FACTOR = 0.913

const project = ([lon, lat]) => [
  (lon - LON0) * LAT_FACTOR * SCALE,
  (LAT0 - lat) * SCALE,
]

const toPath = (coords) =>
  coords
    .map(project)
    .map(
      ([x, y], i) =>
        `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    )
    .join(' ') + ' Z'

function regionToFeature(region) {
  return {
    type: 'Feature',
    properties: {
      id: region.id,
      name: region.name,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [
        region.coords.map(([lon, lat]) => [lon, lat]),
      ],
    },
  }
}

function fixFeatureWinding(feature) {
  const geometry = feature.geometry

  if (geometry.type === 'Polygon') {
    return {
      ...feature,
      geometry: {
        ...geometry,
        coordinates: geometry.coordinates.map(
          (ring) => [...ring].reverse()
        ),
      },
    }
  }

  if (geometry.type === 'MultiPolygon') {
    return {
      ...feature,
      geometry: {
        ...geometry,
        coordinates: geometry.coordinates.map(
          (polygon) =>
            polygon.map(
              (ring) => [...ring].reverse()
            )
        ),
      },
    }
  }

  return feature
}

const GOVERNORATE_COLORS = [
  '#7FA58E',
  '#D2B98D',
  '#9BB7A4',
  '#C8A982',
  '#729A84',
  '#D8C59D',
  '#8FAF9A',
  '#BDA77F',
  '#6F967F',
  '#CDB68F',
  '#A3BDAA',
  '#BFA47D',
  '#86A994',
  '#D5BE94',
  '#769E88',
]

function centroid(coords) {
  let x = 0
  let y = 0

  for (const point of coords) {
    x += point[0]
    y += point[1]
  }

  return [
    x / coords.length,
    y / coords.length,
  ]
}

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

const NO_LABEL = new Set([
  'bahah',
  'jazan',
])

// ==========================================
// Component
// ==========================================

export default function SaudiMap({
  selectedId,
  onSelect,

  selectedGovernorate,
  onGovernorateSelect,

  onBackToCountry,
}) {
  const [hoveredId, setHovered] =
    useState(null)

  const [activeRegionId, setActiveRegionId] =
    useState(null)


  // ========================================
  // المملكة - نفس نظامك القديم
  // ========================================

  const shapes = useMemo(
    () =>
      REGIONS.map((region) => ({
        ...region,

        d: toPath(region.coords),

        label: project(
          LABEL_AT[region.id] ??
            region.labelAt ??
            centroid(region.coords)
        ),
      })),
    []
  )

  const outline = useMemo(
    () => toPath(COUNTRY_OUTLINE),
    []
  )

  // ========================================
  // المنطقة المختارة
  // ========================================

  const activeRegion = useMemo(
    () =>
      REGIONS.find(
        (region) =>
          region.id === activeRegionId
      ),
    [activeRegionId]
  )

  const governorates = useMemo(
    () =>
      activeRegionId
        ? getGovernoratesForRegion(
            adm2Data,
            activeRegionId
          ).map(fixFeatureWinding)
        : [],
    [activeRegionId]
  )

  // ========================================
  // d3 يستخدم فقط داخل المنطقة
  // ========================================

  const regionFeature = useMemo(() => {
    if (!activeRegion) return null

    return regionToFeature(activeRegion)
  }, [activeRegion])

  const governorateProjection = useMemo(() => {
    if (!governorates.length) return null

    const governoratesCollection = {
      type: 'FeatureCollection',
      features: governorates,
    }

    return geoMercator().fitExtent(
      [
        [80, 80],
        [VIEW_W - 80, VIEW_H - 80],
      ],
      governoratesCollection
    )
  }, [governorates])

  const governoratePath = useMemo(
    () =>
      governorateProjection
        ? geoPath(governorateProjection)
        : null,
    [governorateProjection]
  )

  // ========================================
  // Actions
  // ========================================

  function openRegion(id) {
    onSelect?.(id)

    setActiveRegionId(id)

    onGovernorateSelect?.(null)

    setHovered(null)
  }

  function goBack() {
    setActiveRegionId(null)

    onGovernorateSelect?.(null)

    onBackToCountry?.()

    setHovered(null)
  }

  // ========================================
  // LEVEL 1
  // المملكة
  // ========================================

  if (!activeRegionId) {
    const active =
      hoveredId ?? selectedId

    const activeName =
      REGIONS.find(
        (region) =>
          region.id === active
      )?.name

    return (
      <div className="map-frame">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="map-svg"
          role="group"
          aria-label="خريطة مناطق المملكة العربية السعودية"
        >
          <defs>
            <filter
              id="pick"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feDropShadow
                dx="0"
                dy="5"
                stdDeviation="7"
                floodOpacity="0.25"
              />
            </filter>
          </defs>

          <g className="regions">
            {shapes.map((region) => {
              const isSelected =
                selectedId === region.id

              const isHovered =
                hoveredId === region.id

              const isDim =
                active &&
                active !== region.id

              return (
                <path
                  key={region.id}
                  d={region.d}
                  fill={region.color}
                  className={[
                    'region',
                    isSelected &&
                      'is-selected',
                    isHovered &&
                      'is-hovered',
                    isDim &&
                      'is-dim',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  filter={
                    isSelected ||
                    isHovered
                      ? 'url(#pick)'
                      : undefined
                  }
                  tabIndex={0}
                  role="button"
                  aria-label={region.name}
                  onMouseEnter={() =>
                    setHovered(region.id)
                  }
                  onMouseLeave={() =>
                    setHovered(null)
                  }
                  onFocus={() =>
                    setHovered(region.id)
                  }
                  onBlur={() =>
                    setHovered(null)
                  }
                  onClick={() =>
                    openRegion(region.id)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                        'Enter' ||
                      event.key === ' '
                    ) {
                      event.preventDefault()

                      openRegion(
                        region.id
                      )
                    }
                  }}
                />
              )
            })}
          </g>

          <g
            className="region-labels"
            aria-hidden="true"
          >
            {shapes
              .filter(
                (region) =>
                  !NO_LABEL.has(
                    region.id
                  )
              )
              .map((region) => (
                <text
                  key={region.id}
                  x={region.label[0]}
                  y={region.label[1]}
                  className={
                    selectedId ===
                    region.id
                      ? 'is-selected'
                      : undefined
                  }
                >
                  {region.name}
                </text>
              ))}
          </g>

          <path
            d={outline}
            className="country-outline"
          />
        </svg>

        <p
          className="map-caption"
          aria-live="polite"
        >
          {activeName ??
            'مرّر على الخريطة، واضغط على منطقة لتفتح حكايتها'}
        </p>
      </div>
    )
  }

  // ========================================
  // LEVEL 2
  // محافظات المنطقة
  // ========================================

  return (
    <div className="map-frame map-region-view">

      <div className="map-drill-header">
        <button
          type="button"
          className="map-back-button"
          onClick={goBack}
        >
          ← رجوع للمملكة
        </button>

        <div className="map-breadcrumb">
          <button
            type="button"
            onClick={goBack}
          >
            المملكة
          </button>

          <span>‹</span>

          <strong>
            {activeRegion?.name}
          </strong>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="map-svg governorates-map"
        role="group"
        aria-label={`محافظات ${activeRegion?.name}`}
      >
        <defs>
          <filter
            id="govPick"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feDropShadow
              dx="0"
              dy="6"
              stdDeviation="8"
              floodOpacity="0.28"
            />
          </filter>
        </defs>

        <g className="governorates">
          {governorates.map((feature, index) => {
            const id = feature.properties.shapeID

            const name =
              getGovernorateArabicName(feature)

            const isHovered =
              hoveredId === id

            const isSelected =
              selectedGovernorate?.id === id

            const isDim =
              selectedGovernorate &&
              !isSelected

            const center =
              governoratePath.centroid(feature)

            return (
              <g key={id}>
                <path
  d={governoratePath(feature)}
  style={{
    fill:
      GOVERNORATE_COLORS[
        index % GOVERNORATE_COLORS.length
      ],

    opacity:
      isSelected
        ? 1
        : isHovered
          ? 1
          : isDim
            ? 0.38
            : 0.92,

    filter:
      isSelected
        ? 'brightness(1.12) saturate(1.3) drop-shadow(0 7px 8px rgba(35, 65, 50, 0.25))'
        : isHovered
          ? 'brightness(1.1) saturate(1.15) drop-shadow(0 5px 6px rgba(35, 65, 50, 0.20))'
          : isDim
            ? 'saturate(0.55)'
            : 'drop-shadow(0 1px 1px rgba(35, 65, 50, 0.08))',

    stroke:
      isSelected
        ? '#fffdf5'
        : isHovered
          ? '#fffaf0'
          : '#fff9eb',

    strokeWidth:
      isSelected
        ? 5
        : isHovered
          ? 3.8
          : 2.5,

    cursor: 'pointer',

    transition:
      'opacity 180ms ease, filter 180ms ease, stroke-width 180ms ease',
  }}

  className={[
    'governorate',
    isHovered && 'is-hovered',
    isSelected && 'is-selected',
    isDim && 'is-dim',
  ]
    .filter(Boolean)
    .join(' ')}

  tabIndex={0}
  role="button"
  aria-label={name}

  onMouseEnter={() => setHovered(id)}
  onMouseLeave={() => setHovered(null)}

  onFocus={() => setHovered(id)}
  onBlur={() => setHovered(null)}

  onClick={() =>
    onGovernorateSelect?.({
      id,
      name,
      regionId: activeRegionId,
      regionName: activeRegion?.name,
    })
  }

  onKeyDown={(event) => {
    if (
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault()
      onGovernorateSelect?.({
        id,
        name,
        regionId: activeRegionId,
        regionName: activeRegion?.name,
      })
    }
  }}
/>

                <text
  x={center[0]}
  y={center[1]}
  className={[
    'governorate-name',
    isHovered && 'is-hovered',
    isSelected && 'is-selected',
    isDim && 'is-dim',
  ]
    .filter(Boolean)
    .join(' ')}
  pointerEvents="none"
  textAnchor="middle"
  dominantBaseline="middle"
>
  {name}
</text>
              </g>
            )
          })}
        </g>
      </svg>

    <div className="governorate-caption-wrap">
      <div
          className={[
            'governorate-caption',
            selectedGovernorate && 'is-active',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-live="polite"
        >
          {hoveredId
            ? getGovernorateArabicName(
                governorates.find(
                  (feature) =>
                    feature.properties.shapeID ===
                    hoveredId
                )
              )
            : selectedGovernorate?.name ??
              `اختر محافظة من ${activeRegion?.name}`}
        </div>
      </div>
    </div>
  )
}