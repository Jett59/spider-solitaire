export interface WebPoint { x: number; y: number }
export interface WebStep { node: number; weave: boolean }
export const WEB_SPOKES = 20
export const WEB_RINGS = 18
const nodeId = (ring: number, spoke: number) => ring === 0 ? 0 : 1 + (ring - 1) * WEB_SPOKES + (spoke + WEB_SPOKES) % WEB_SPOKES

/** Each sector has one caretaker. Return journeys use silk already laid. */
export function sharedWebPlan(residents: number, random = Math.random) {
  const nodes: WebPoint[] = [{ x: 0, y: 0 }]
  const spokes = Array.from({ length: WEB_SPOKES }, (_, spoke) => ({
    angle: spoke / WEB_SPOKES * Math.PI * 2 + (random() - .5) * .09,
    radius: .9 + random() * .1,
  }))
  for (let ring = 1; ring <= WEB_RINGS; ring++) for (let spoke = 0; spoke < WEB_SPOKES; spoke++) {
    const { angle, radius: edge } = spokes[spoke]
    const radius = edge * (ring / WEB_RINGS) ** .88 + (random() - .5) * .009
    nodes.push({ x: Math.sin(angle) * radius, y: Math.cos(angle) * radius })
  }
  const routes = Array.from({ length: residents }, (_, owner) => {
    const first = Math.ceil(owner * WEB_SPOKES / residents)
    const end = Math.ceil((owner + 1) * WEB_SPOKES / residents)
    const edges: [number, number][] = []
    for (let spoke = first; spoke < end; spoke++) for (let ring = 1; ring <= WEB_RINGS; ring++) {
      edges.push([nodeId(ring - 1, spoke), nodeId(ring, spoke)])
      edges.push([nodeId(ring, spoke), nodeId(ring, spoke + 1)])
    }
    const visited = new Set<number>()
    const start = nodeId(WEB_RINGS, first)
    const route: WebStep[] = [{ node: start, weave: false }]
    function weaveFrom(node: number) {
      edges.forEach(([a, b], edge) => {
        if (visited.has(edge) || (a !== node && b !== node)) return
        visited.add(edge)
        const next = a === node ? b : a
        route.push({ node: next, weave: true })
        weaveFrom(next)
        route.push({ node, weave: false })
      })
    }
    weaveFrom(start)
    // Celebrate inside the sector they helped build, rather than lining up on its rim.
    const partySpoke = first + Math.floor(random() * (end - first))
    for (let spoke = first + 1; spoke <= partySpoke; spoke++) route.push({ node: nodeId(WEB_RINGS, spoke), weave: false })
    const partyRing = 6 + Math.floor(random() * (WEB_RINGS - 7))
    for (let ring = WEB_RINGS - 1; ring >= partyRing; ring--) route.push({ node: nodeId(ring, partySpoke), weave: false })
    return route
  })
  return { nodes, routes }
}

/** Climb over a neighbour with enough clearance for legs, without blocking work. */
export function passingHeights(positions: (WebPoint & { size: number })[]) {
  const heights: number[] = []
  positions.forEach((point, index) => {
    let height = 0
    for (let other = 0; other < index; other++) {
      const neighbour = positions[other]
      const clearance = (point.size + neighbour.size) * 3.2
      const distance = Math.hypot(point.x - neighbour.x, point.y - neighbour.y)
      if (distance < clearance) height = Math.max(height, heights[other] + Math.sqrt(clearance ** 2 - distance ** 2))
    }
    heights.push(height)
  })
  return heights
}
