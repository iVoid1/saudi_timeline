import { useLayoutEffect, useRef, useState } from 'react'
import { COUNTRY_VIEW } from './geometry.js'

const initial = { box: COUNTRY_VIEW, detailId: null, opacity: 0, moving: false }
const ease = (t) => t * t * (3 - 2 * t)

export default function useMapCamera(regionId, targetBox, reducedMotion) {
  const [camera, setCamera] = useState(initial)
  const current = useRef(initial)

  useLayoutEffect(() => {
    let frame
    const from = current.current
    const publish = (next) => { current.current = next; setCamera(next) }
    const finish = () => publish({ box: targetBox, detailId: regionId, opacity: regionId ? 1 : 0, moving: false })
    if (reducedMotion) { finish(); return }

    const sameBox = from.box.every((value, i) => Math.abs(value - targetBox[i]) < 0.01)
    if (sameBox && from.detailId === regionId && !from.moving) return

    // Fade out the old detail before moving; reveal new ADM2 only after arrival.
    const fadeOut = from.opacity ? 140 : 0
    const travel = sameBox ? 0 : 600
    const fadeIn = regionId ? 160 : 0
    const start = performance.now()
    publish({ ...from, moving: true })
    const tick = (now) => {
      const elapsed = now - start
      if (elapsed < fadeOut) {
        publish({ ...from, opacity: from.opacity * (1 - elapsed / fadeOut), moving: true })
      } else if (elapsed < fadeOut + travel) {
        const t = ease((elapsed - fadeOut) / travel)
        publish({ box: from.box.map((value, i) => value + (targetBox[i] - value) * t), detailId: null, opacity: 0, moving: true })
      } else if (elapsed < fadeOut + travel + fadeIn) {
        publish({ box: targetBox, detailId: regionId, opacity: (elapsed - fadeOut - travel) / fadeIn, moving: true })
      } else { finish(); return }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [regionId, targetBox, reducedMotion])

  return camera
}
