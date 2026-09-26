import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { REGIONS } from '../src/data/regions.js'
import { COUNTRY, ERAS, getRegionContent } from '../src/data/regionsContent.js'
import { REGION_RANGES, getGovernoratesForRegion, getGovernorateArabicName } from '../src/data/geo/adminMap.js'
import {
  fixFeatureWinding, projectedPolygons, interiorAnchor, insidePolygon,
  mapPath, fitViewBox, screenPoint, layoutLabels, boxesOverlap,
} from '../src/components/map/geometry.js'

const data = JSON.parse(readFileSync(new URL('../src/data/geo/saudi-adm2.json', import.meta.url), 'utf8'))

test('all 13 region IDs map to the existing ADM2 dataset exactly once', () => {
  assert.deepEqual(Object.keys(REGION_RANGES).sort(), REGIONS.map(({ id }) => id).sort())
  const mapped = REGIONS.flatMap(({ id }) => getGovernoratesForRegion(data, id))
  assert.equal(mapped.length, data.features.length)
  assert.equal(new Set(mapped.map((feature) => feature.properties.shapeID)).size, data.features.length)
  assert.ok(mapped.every((feature) => data.features.includes(feature)))
  assert.ok(mapped.every((feature) => /[\u0600-\u06ff]/.test(getGovernorateArabicName(feature))))
  assert.deepEqual(getGovernoratesForRegion(data, 'missing'), [])
})

test('Jawf loads four governorates and Taif stays in Makkah', () => {
  assert.deepEqual(getGovernoratesForRegion(data, 'jawf').map(getGovernorateArabicName), ['سكاكا', 'القريات', 'طبرجل', 'دومة الجندل'])
  assert.ok(getGovernoratesForRegion(data, 'makkah').some((feature) => getGovernorateArabicName(feature) === 'الطائف'))
})

test('ADM2 winding correction copies every ring, including holes, without mutating sources', () => {
  const original = JSON.stringify(data)
  const regionsBefore = JSON.stringify(REGIONS)
  for (const feature of data.features) {
    const fixed = fixFeatureWinding(feature)
    const before = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
    const after = fixed.geometry.type === 'Polygon' ? [fixed.geometry.coordinates] : fixed.geometry.coordinates
    after.forEach((polygon, i) => polygon.forEach((ring, j) => {
      assert.deepEqual(ring, [...before[i][j]].reverse())
      assert.notEqual(ring, before[i][j])
    }))
  }
  assert.equal(JSON.stringify(data), original)
  assert.equal(JSON.stringify(REGIONS), regionsBefore)
})

test('all 147 governorate anchors sit on their polygons, not neighbouring land or sea', () => {
  for (const feature of data.features) {
    const polygons = projectedPolygons(fixFeatureWinding(feature))
    const anchor = interiorAnchor(polygons)
    assert.ok(polygons.some((polygon) => insidePolygon(anchor, polygon)), feature.properties.shapeName)
  }
})

test('region viewBoxes contain all governorates and labels fit at phone and desktop sizes', () => {
  for (const { id } of REGIONS) {
    const features = getGovernoratesForRegion(data, id).map(fixFeatureWinding)
    const bounds = mapPath.bounds({ type: 'FeatureCollection', features })
    const shapes = features.map((feature) => ({
      id: feature.properties.shapeID,
      name: getGovernorateArabicName(feature),
      anchor: interiorAnchor(projectedPolygons(feature)),
      area: mapPath.area(feature),
    }))
    for (const [width, height] of [[284, 340], [354, 340], [640, 525]]) {
      const box = fitViewBox(bounds, width / height)
      for (const point of bounds) {
        const [x, y] = screenPoint(point, box, width, height)
        assert.ok(x >= 0 && x <= width && y >= 0 && y <= height, id)
      }
      const labels = layoutLabels(shapes.map((shape) => ({ ...shape,
        anchor: screenPoint(shape.anchor, box, width, height),
      })), width, height, (text, size) => text.length * size * 0.65)
      assert.equal(labels.length, shapes.length, `${id}: labels missing at ${width}px`)
      labels.forEach((label, i) => {
        assert.ok(label.x - label.width / 2 >= 0 && label.x + label.width / 2 <= width)
        assert.ok(label.y - label.height / 2 >= 0 && label.y + label.height / 2 <= height)
        for (const other of labels.slice(i + 1)) assert.ok(!boxesOverlap(label, other), `${id}: overlapping labels`)
      })
    }
  }
})

test('the default Kingdom story provides every era and remains distinct from region content', () => {
  const content = getRegionContent(null)
  assert.deepEqual(content, getRegionContent(COUNTRY.id))
  assert.ok(content.tagline && content.facts.length)
  for (const { key } of ERAS) assert.ok(content.eras[key].text && content.eras[key].highlights.length)
  assert.notDeepEqual(content, getRegionContent('riyadh'))
})
