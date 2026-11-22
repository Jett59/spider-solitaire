import { Vector3 } from 'three'
import { WebSurface } from '../web/webSurface.ts'

/** Irregular silk pinned to a rectangular slot; the renderer and feet share it. */
export function createHomeWebSurface(index: number, aspect: number) {
  const surface = new WebSurface({ radius: 4, spokes: 16, rings: 6 })
  const centre = new Vector3(Math.sin(index * 2.3 + 1) * .24, Math.cos(index * 1.7) * .2, 0)
  const height = 4 * aspect
  for (const thread of surface.threads) {
    for (const point of thread.points) {
      const radius = Math.hypot(point.x, point.y)
      let angle = Math.atan2(point.x, point.y)
      // The four diagonal spokes stay exactly on the four slot corners.
      const corner = Math.abs(Math.abs(Math.sin(angle)) - Math.abs(Math.cos(angle))) < 1e-8
      if (!corner) angle += Math.sin(angle * 3 + index * 1.8) * .055
      const sx = Math.sin(angle)
      const sy = Math.cos(angle)
      const edge = 1 / Math.max(Math.abs(sx), Math.abs(sy))
      const fraction = radius / 4
      const uneven = fraction + Math.sin(fraction * Math.PI) * Math.sin(angle * 3.1 + index) * .027
      point.set(
        centre.x * (1 - uneven) + sx * edge * 4 * uneven,
        centre.y * (1 - uneven) + sy * edge * height * uneven,
        0,
      )
    }
  }
  // A fixed irregular sag is combined with the existing springy footstep response.
  const springHeight = surface.height.bind(surface)
  surface.height = (x, y) => {
    const pinned = Math.max(0, 1 - (x / 4) ** 2) * Math.max(0, 1 - (y / height) ** 2)
    return pinned * (-.13 + .025 * Math.sin(x * 1.8 + y + index) + springHeight(x, y))
  }
  return surface
}
