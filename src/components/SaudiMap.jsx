import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { REGIONS, COUNTRY_OUTLINE } from '../data/regions.js'
import { getGovernoratesForRegion, getGovernorateArabicName } from '../data/geo/adminMap.js'
import adm2Data from '../data/geo/saudi-adm2.json'
import {
  COUNTRY_VIEW, project, toPath, fixFeatureWinding, mapPath,
  projectedPolygons, boundsOf, fitViewBox, screenPoint, interiorAnchor, layoutLabels,
} from './map/geometry.js'
import useMapCamera from './map/useMapCamera.js'
import '../styles/map.css'

const COLORS = ['#7FA58E', '#D2B98D', '#9BB7A4', '#C8A982', '#729A84', '#D8C59D', '#8FAF9A', '#BDA77F', '#6F967F', '#CDB68F', '#A3BDAA', '#BFA47D', '#86A994', '#D5BE94', '#769E88']
const LABEL_AT = {
  eastern: [49.6, 23.4], riyadh: [45.7, 23], makkah: [41.2, 21.2],
  madinah: [39.9, 25.2], tabuk: [37.9, 28.1], northern: [41.6, 30.2],
  najran: [45.9, 18.5], asir: [42.8, 18.5], hail: [41.9, 28],
}
const regions = REGIONS.map((region) => {
  const polygon = region.coords.map(project)
  const bounds = boundsOf(polygon)
  return {
    ...region, d: toPath(region.coords), bounds,
    anchor: LABEL_AT[region.id] || region.labelAt
      ? project(LABEL_AT[region.id] ?? region.labelAt)
      : interiorAnchor([[polygon]]),
    area: (bounds[1][0] - bounds[0][0]) * (bounds[1][1] - bounds[0][1]),
  }
})
const outline = toPath(COUNTRY_OUTLINE)
const detailCache = new Map()

function getRegionMap(id) {
  if (!id) return null
  if (detailCache.has(id)) return detailCache.get(id)
  const region = regions.find((item) => item.id === id)
  if (!region) return null
  const shapes = getGovernoratesForRegion(adm2Data, id).map(fixFeatureWinding).map((feature, index) => ({
    id: feature.properties.shapeID,
    name: getGovernorateArabicName(feature),
    color: COLORS[index % COLORS.length],
    d: mapPath(feature),
    anchor: interiorAnchor(projectedPolygons(feature)),
    area: mapPath.area(feature),
    bounds: mapPath.bounds(feature),
  }))
  // Level 1 is deliberately simplified. Include actual ADM2 bounds so coastlines
  // and islands cannot be clipped when the detail replaces the selected region.
  const bounds = boundsOf([region.bounds, ...shapes.map((shape) => shape.bounds)].flat())
  const data = { region, shapes, bounds }
  detailCache.set(id, data)
  return data
}

function useViewport(ref) {
  const [viewport, setViewport] = useState({ width: 640, height: 525, font: 'Tajawal, sans-serif', revision: 0 })
  useLayoutEffect(() => {
    const element = ref.current
    let active = true
    const measure = () => {
      if (!active) return
      const { width, height } = element.getBoundingClientRect()
      if (!width || !height) return
      setViewport((previous) => ({ width, height, font: getComputedStyle(element).fontFamily, revision: previous.revision + 1 }))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    document.fonts?.ready.then(measure)
    document.fonts?.addEventListener('loadingdone', measure)
    return () => { active = false; observer.disconnect(); document.fonts?.removeEventListener('loadingdone', measure) }
  }, [ref])
  return viewport
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return reduced
}

export default function SaudiMap({ selectedId, onSelect, selectedGovernorate, onGovernorateSelect, onBackToCountry }) {
  const [hoveredId, setHovered] = useState(null)
  const stageRef = useRef(null)
  const targetRefs = useRef(new Map())
  const focusAfterTransition = useRef(null)
  const backRef = useRef(null)
  const viewport = useViewport(stageRef)
  const reducedMotion = useReducedMotion()
  const selectedMap = useMemo(() => getRegionMap(selectedId), [selectedId])
  const targetBox = useMemo(() => selectedMap
    ? fitViewBox(selectedMap.bounds, viewport.width / viewport.height)
    : COUNTRY_VIEW, [selectedMap, viewport.width, viewport.height])
  const camera = useMapCamera(selectedMap?.region.id ?? null, targetBox, reducedMotion)
  const displayedMap = useMemo(() => getRegionMap(camera.detailId), [camera.detailId])
  const ready = !camera.moving && camera.detailId === (selectedMap?.region.id ?? null)
  const items = selectedMap ? selectedMap.shapes : regions
  const activeId = selectedGovernorate?.id ?? selectedId

  const labels = useMemo(() => {
    const context = document.createElement('canvas').getContext('2d')
    const measure = (text, size) => {
      if (!context) return text.length * size
      context.font = `700 ${size}px ${viewport.font}`
      return context.measureText(text).width
    }
    return layoutLabels(items.map((item) => ({ ...item,
      anchor: screenPoint(item.anchor, targetBox, viewport.width, viewport.height),
    })), viewport.width, viewport.height, measure)
  }, [items, targetBox, viewport])

  useEffect(() => { setHovered(null) }, [selectedId])
  useEffect(() => {
    if (!ready || !focusAfterTransition.current) return
    const id = focusAfterTransition.current
    focusAfterTransition.current = null
    const target = id === 'detail' ? backRef.current : targetRefs.current.get(id)
    target?.focus({ preventScroll: true })
  }, [ready])

  function select(item, keyboard = false) {
    if (!ready) return
    setHovered(null)
    if (selectedMap) {
      onGovernorateSelect({ id: item.id, name: item.name, regionId: selectedId, regionName: selectedMap.region.name })
    } else {
      if (keyboard) focusAfterTransition.current = 'detail'
      onSelect(item.id)
    }
  }

  function back() {
    setHovered(null)
    if (selectedGovernorate) {
      onGovernorateSelect(null)
    } else if (selectedId) {
      focusAfterTransition.current = selectedId
      onBackToCountry()
    }
  }

  function onKeyDown(event, item) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      select(item, true)
      return
    }
    const directions = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }
    let next
    if (event.key === 'Home') next = items[0]
    else if (event.key === 'End') next = items.at(-1)
    else if (directions[event.key]) {
      const [dx, dy] = directions[event.key]
      next = items.filter((candidate) => candidate.id !== item.id).map((candidate) => {
        const x = candidate.anchor[0] - item.anchor[0], y = candidate.anchor[1] - item.anchor[1]
        return { candidate, forward: x * dx + y * dy, distance: Math.hypot(x, y) + Math.abs(x * dy - y * dx) }
      }).filter(({ forward }) => forward > 0).sort((a, b) => a.distance - b.distance)[0]?.candidate
    } else return
    event.preventDefault()
    if (next) targetRefs.current.get(next.id)?.focus({ preventScroll: true })
  }

  function shape(item, detail) {
    const interactive = ready && Boolean(selectedMap) === detail
    return <path
      key={item.id}
      ref={(node) => { if (node) targetRefs.current.set(item.id, node); else targetRefs.current.delete(item.id) }}
      d={item.d} fill={item.color}
      className={`map-shape ${detail ? 'governorate' : 'region'}${activeId === item.id ? ' is-selected' : ''}${hoveredId === item.id ? ' is-hovered' : ''}`}
      tabIndex={interactive ? 0 : -1} role="button" aria-label={item.name}
      aria-pressed={activeId === item.id} aria-disabled={!interactive}
      onPointerEnter={(event) => { if (event.pointerType !== 'touch') setHovered(item.id) }}
      onPointerLeave={() => setHovered(null)}
      onFocus={() => setHovered(item.id)} onBlur={() => setHovered(null)}
      onClick={() => select(item)} onKeyDown={(event) => onKeyDown(event, item)}
    />
  }

  const currentName = selectedGovernorate?.name ?? selectedMap?.region.name ?? 'المملكة العربية السعودية'
  const hoveredName = items.find((item) => item.id === hoveredId)?.name

  return <div className={`map-frame${selectedMap ? ' map-region-view' : ''}`}
    onKeyDown={(event) => { if (event.key === 'Escape' && selectedId) { event.preventDefault(); back() } }}>
    <div className="map-drill-header">
      <nav className="map-breadcrumb" aria-label="المكان الحالي">
        <button type="button" onClick={onBackToCountry} aria-current={!selectedId ? 'location' : undefined}>المملكة</button>
        {selectedMap && <><span aria-hidden="true">‹</span>
          <button type="button" onClick={() => onGovernorateSelect(null)} aria-current={!selectedGovernorate ? 'location' : undefined}>{selectedMap.region.name}</button>
        </>}
        {selectedGovernorate && <><span aria-hidden="true">‹</span><strong aria-current="location">{selectedGovernorate.name}</strong></>}
      </nav>
      {selectedId && <button ref={backRef} type="button" className="map-back-button" onClick={back}>
        {selectedGovernorate ? `العودة إلى ${selectedMap?.region.name}` : 'العودة إلى المملكة'}
      </button>}
    </div>
    <div className="map-stage" ref={stageRef} aria-busy={!ready}>
      <svg viewBox={camera.box.join(' ')} className="map-svg" role="group"
        aria-label={selectedMap ? `محافظات ${selectedMap.region.name}` : 'خريطة مناطق المملكة العربية السعودية'}>
        <g opacity={1 - camera.opacity} aria-hidden={Boolean(selectedMap) || !ready}
          className={ready && !selectedMap ? undefined : 'map-layer--inactive'}>
          {regions.map((item) => shape(item, false))}
          <path d={outline} className="country-outline" />
        </g>
        {displayedMap && <g opacity={camera.opacity} aria-hidden={!ready}
          className={ready ? undefined : 'map-layer--inactive'}>
          {displayedMap.shapes.map((item) => shape(item, true))}
        </g>}
      </svg>
      <svg className={`map-labels${ready ? '' : ' map-labels--hidden'}`} viewBox={`0 0 ${viewport.width} ${viewport.height}`} aria-hidden="true">
        {labels.filter((label) => label.moved).map((label) => <g key={label.id} className="map-leader">
          <line x1={label.anchor[0]} y1={label.anchor[1]} x2={label.x} y2={label.y} />
          <circle cx={label.anchor[0]} cy={label.anchor[1]} r="2" />
        </g>)}
        {labels.map((label) => <g key={label.id}
          className={`map-label${label.moved ? ' is-displaced' : ''}${activeId === label.id ? ' is-selected' : ''}${hoveredId === label.id ? ' is-hovered' : ''}`}
          onClick={() => select(label)}
          onPointerEnter={(event) => { if (event.pointerType !== 'touch') setHovered(label.id) }}
          onPointerLeave={() => setHovered(null)}>
          <rect x={label.x - label.width / 2} y={label.y - label.height / 2} width={label.width} height={label.height} rx="5" />
          <text x={label.x} y={label.y} fontSize={label.fontSize}>{label.name}</text>
        </g>)}
      </svg>
    </div>
    <p className="map-caption" aria-live="polite" aria-atomic="true">{hoveredName ?? currentName}</p>
    {selectedMap && (selectedMap.shapes.length ? <label className="map-place-select">
      <span>المحافظة</span>
      <select value={selectedGovernorate?.id ?? ''} onChange={(event) => {
        const item = selectedMap.shapes.find((candidate) => candidate.id === event.target.value)
        if (item) onGovernorateSelect({ id: item.id, name: item.name, regionId: selectedId, regionName: selectedMap.region.name })
        else onGovernorateSelect(null)
      }}>
        <option value="">المنطقة كلها</option>
        {selectedMap.shapes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label> : <p className="map-caption">لا تتوفر تفاصيل المحافظات لهذه المنطقة.</p>)}
  </div>
}
