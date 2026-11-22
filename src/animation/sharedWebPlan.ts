export interface WebPoint { x: number; y: number }
export const WEB_SPOKES = 12
const nodeId = (ring: number, spoke: number) => 1 + (ring - 1) * WEB_SPOKES + (spoke + WEB_SPOKES) % WEB_SPOKES

/** All caretakers share these junctions; every route starts at the same hub. */
export function sharedWebPlan(residents: number, random = Math.random) {
  const nodes: WebPoint[] = [{ x: 0, y: 0 }]
  for (let ring = 1; ring <= 3; ring++) for (let spoke = 0; spoke < WEB_SPOKES; spoke++) {
    const angle = spoke / WEB_SPOKES * Math.PI * 2 + (random() - .5) * .06
    const radius = ring / 3 * (.92 + random() * .08)
    nodes.push({ x: Math.sin(angle) * radius, y: Math.cos(angle) * radius })
  }
  const routes = Array.from({ length: residents }, (_, index) => {
    let spoke = Math.floor(index / Math.max(1, residents) * WEB_SPOKES), ring = 3
    const route = [0, nodeId(1, spoke), nodeId(2, spoke), nodeId(3, spoke)]
    for (let step = 0; step < 12; step++) {
      if (random() < .6) spoke = (spoke + (random() < .5 ? -1 : 1) + WEB_SPOKES) % WEB_SPOKES
      else ring = ring === 1 ? 2 : ring === 3 ? 2 : random() < .5 ? 1 : 3
      route.push(nodeId(ring, spoke))
    }
    return route
  })
  return { nodes, routes }
}
