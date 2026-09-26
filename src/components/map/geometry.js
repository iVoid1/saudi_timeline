import { geoPath, geoTransform } from 'd3-geo'

export const COUNTRY_VIEW = [0, 0, 1000, 820]

// Keep the original level-1 projection and coordinate order unchanged.
export const project = ([lon, lat]) => [
  (lon - 34.3) * 0.913 * 48.5,
  (32.5 - lat) * 48.5,
]

export const toPath = (coords) => coords.map(project)
  .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`)
  .join(' ') + ' Z'

// Only ADM2 rings need the existing winding correction. Never apply to REGIONS.
export function fixFeatureWinding(feature) {
  const { geometry } = feature
  const reverse = (polygon) => polygon.map((ring) => [...ring].reverse())
  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    return {
      ...feature,
      geometry: {
        ...geometry,
        coordinates: geometry.type === 'Polygon'
          ? reverse(geometry.coordinates)
          : geometry.coordinates.map(reverse),
      },
    }
  }
  return feature
}

// Both levels share a coordinate space, so a viewBox zoom cannot jump projections.
export const mapPath = geoPath(geoTransform({
  point(lon, lat) { this.stream.point(...project([lon, lat])) },
}))

export function projectedPolygons(feature) {
  const { type, coordinates } = feature.geometry
  const polygons = type === 'Polygon' ? [coordinates] : coordinates
  return polygons.map((polygon) => polygon.map((ring) => ring.map(project)))
}

export function boundsOf(points) {
  return [
    [Math.min(...points.map(([x]) => x)), Math.min(...points.map(([, y]) => y))],
    [Math.max(...points.map(([x]) => x)), Math.max(...points.map(([, y]) => y))],
  ]
}

export function fitViewBox(bounds, aspect = 1000 / 820) {
  const [[x0, y0], [x1, y1]] = bounds
  let width = Math.max(x1 - x0, 1) / 0.78
  let height = Math.max(y1 - y0, 1) / 0.78
  if (width / height < aspect) width = height * aspect
  else height = width / aspect
  return [(x0 + x1 - width) / 2, (y0 + y1 - height) / 2, width, height]
}

export function screenPoint([x, y], box, width, height) {
  const scale = Math.min(width / box[2], height / box[3])
  return [
    (x - box[0]) * scale + (width - box[2] * scale) / 2,
    (y - box[1]) * scale + (height - box[3] * scale) / 2,
  ]
}

function ringArea(ring) {
  return Math.abs(ring.reduce((area, [x, y], i) => {
    const next = ring[(i + 1) % ring.length]
    return area + x * next[1] - next[0] * y
  }, 0)) / 2
}

function insideRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function insidePolygon(point, polygon) {
  return insideRing(point, polygon[0]) && !polygon.slice(1).some((ring) => insideRing(point, ring))
}

function edgeDistance(point, polygon) {
  let distance = Infinity
  for (const ring of polygon) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]
      const b = ring[(i + 1) % ring.length]
      const dx = b[0] - a[0], dy = b[1] - a[1]
      const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)))
      distance = Math.min(distance, Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy))
    }
  }
  return insidePolygon(point, polygon) ? distance : -distance
}

// Find an interior point on the largest landmass, respecting holes and islands.
// A centroid alone can fall offshore or in a neighbouring governorate.
export function interiorAnchor(polygons) {
  const polygon = [...polygons].sort((a, b) => ringArea(b[0]) - ringArea(a[0]))[0]
  const [[x0, y0], [x1, y1]] = boundsOf(polygon[0])
  let best = polygon[0][0], distance = 0
  let left = x0, top = y0, width = x1 - x0, height = y1 - y0
  for (let pass = 0; pass < 4; pass++) {
    const steps = pass ? 5 : 16
    for (let x = 0; x <= steps; x++) {
      for (let y = 0; y <= steps; y++) {
        const point = [left + width * x / steps, top + height * y / steps]
        const candidate = edgeDistance(point, polygon)
        if (candidate > distance) { best = point; distance = candidate }
      }
    }
    width /= steps / 2
    height /= steps / 2
    left = best[0] - width / 2
    top = best[1] - height / 2
  }
  return best
}

export function boxesOverlap(a, b, gap = 3) {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + gap
    && Math.abs(a.y - b.y) < (a.height + b.height) / 2 + gap
}

// Work in displayed pixels, not zoomed SVG units. Place constrained labels first,
// then search outward for the nearest free slot. Never enlarge text on selection.
export function layoutLabels(items, width, height, measure) {
  const fontSize = width < 420 ? 12 : 14
  const placed = []
  const labels = items.map((item) => ({
    ...item, fontSize,
    width: Math.min(width - 12, measure(item.name, fontSize) + 12),
    height: fontSize + 14,
  })).sort((a, b) => a.area - b.area || a.id.localeCompare(b.id))

  for (const label of labels) {
    const [ax, ay] = label.anchor
    const clamp = (x, y) => ({
      ...label,
      x: Math.max(label.width / 2 + 4, Math.min(width - label.width / 2 - 4, x)),
      y: Math.max(label.height / 2 + 4, Math.min(height - label.height / 2 - 4, y)),
    })
    let best = null
    // Grid candidates include all free space, even when several anchors coincide.
    const candidates = [clamp(ax, ay)]
    for (let y = label.height / 2 + 4; y <= height - label.height / 2 - 4; y += 6) {
      for (let x = label.width / 2 + 4; x <= width - label.width / 2 - 4; x += 8) {
        candidates.push(clamp(x, y))
      }
    }
    for (const candidate of candidates) {
      if (placed.some((other) => boxesOverlap(candidate, other))) continue
      const score = Math.hypot(candidate.x - ax, candidate.y - ay)
      if (!best || score < best.score) best = { ...candidate, score }
    }
    // The native place selector remains available on exceptionally cramped views.
    if (!best) continue
    best.moved = best.score > 8
    placed.push(best)
  }
  return placed
}
