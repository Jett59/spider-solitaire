import { Vector3 } from 'three'

export interface WebOptions { radius: number; spokes: number; rings: number; tattered?: boolean }
export interface SilkThread {
  id: string
  points: Vector3[]
  kind: 'spoke' | 'ring'
  coverage: number
  owner?: string
  fray?: number
}
export interface FootAnchor { point: Vector3; threadId: string }

export function normaliseWebOptions(options: WebOptions): WebOptions {
  return {
    tattered: options.tattered ?? false,
    radius: Math.max(3, Math.min(12, options.radius)),
    spokes: Math.max(8, Math.min(40, Math.round(options.spokes))),
    rings: Math.max(4, Math.min(20, Math.round(options.rings))),
  }
}

/** Shared silk topology: rendering, footholds and maintenance all use these paths. */
export class WebSurface {
  readonly options: WebOptions
  readonly threads: SilkThread[] = []
  time = 0
  private pulses: { x: number; y: number; strength: number; start: number }[] = []
  completedRepairs = 0
  damageRounds = 0
  private occupants = new Map<string, Set<string>>()

  constructor(options: WebOptions) {
    this.options = normaliseWebOptions(options)
    const { radius, spokes, rings } = this.options
    const point = (angle: number, r: number) => new Vector3(Math.sin(angle) * r, Math.cos(angle) * r, 0)
    for (let spoke = 0; spoke < spokes; spoke++) {
      const a = spoke / spokes * Math.PI * 2
      const b = (spoke + 1) / spokes * Math.PI * 2
      this.threads.push({
        id: `spoke-${spoke}`, kind: 'spoke', coverage: 1,
        points: Array.from({ length: 25 }, (_, i) => point(a, radius * i / 24)),
      })
      for (let ring = 1; ring <= rings; ring++) {
        const r = radius * ring / (rings + 1)
        this.threads.push({
          id: `ring-${ring}-${spoke}`, kind: 'ring', coverage: 1,
          points: Array.from({ length: 9 }, (_, i) => {
            const fraction = i / 8
            return point(a + (b - a) * fraction, r * (1 - 0.07 * Math.sin(Math.PI * fraction)))
          }),
        })
      }
    }
    if (this.options.tattered) {
      // Whole missing sectors interspersed with ragged surviving silk.
      const torn = this.threads.filter((thread, index) => thread.kind === 'ring' && (index % 7 < 2 || index % 13 === 0))
      const count = Math.min(24, torn.length)
      for (let index = 0; index < count; index++) {
        const thread = torn[Math.floor(index * torn.length / count)]
        thread.coverage = 0
        thread.fray = index % 3 === 0 ? 0 : 0.55 + (index % 4) * 0.13
      }
    }
  }

  get damageCount() { return this.threads.filter(thread => thread.coverage < 0.999).length }

  claimDamage(spiderId: string, position: Vector3) {
    const thread = this.threads.filter(thread => thread.coverage < 0.999 && !thread.owner)
      .sort((a, b) => a.points[0].distanceToSquared(position) - b.points[0].distanceToSquared(position))[0]
    if (thread) thread.owner = spiderId
    return thread
  }

  shakeLoose(random: () => number = Math.random) {
    const occupied = new Set([...this.occupants.values()].flatMap(set => [...set]))
    const candidates = this.threads.filter(thread => thread.kind === 'ring' && !thread.owner && !occupied.has(thread.id) && thread.coverage === 1)
    // Fisher–Yates selection: a few fresh breaks per landing, with no new objects.
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    const broken = candidates.slice(0, Math.min(5, Math.max(2, Math.round(this.options.spokes / 5))))
    broken.forEach(thread => { thread.coverage = 0; thread.fray = 0.65 + random() * 0.35 })
    this.damageRounds++
    return broken.map(thread => thread.id)
  }

  tick(delta: number) {
    this.time += delta
    this.pulses = this.pulses.filter(pulse => this.time - pulse.start < 2.5)
  }

  disturb(point: Vector3, strength = 0.12) {
    this.pulses.push({ x: point.x, y: point.y, strength, start: this.time })
    if (this.pulses.length > 24) this.pulses.shift()
  }

  height(x: number, y: number) {
    const edge = Math.max(0, 1 - (x * x + y * y) / this.options.radius ** 2)
    let z = -0.045 * edge
    for (const pulse of this.pulses) {
      const age = this.time - pulse.start
      const distance = Math.hypot(x - pulse.x, y - pulse.y)
      z -= pulse.strength * Math.sin(age * 9) * Math.exp(-age * 2.6 - distance * distance / 3) * edge
    }
    return z
  }

  nearestFoot(point: Vector3, hip?: Vector3, reach = Infinity): FootAnchor {
    let best: FootAnchor | undefined
    let distance = Infinity
    for (const thread of this.threads) {
      if (thread.coverage < 0.999 || thread.owner) continue
      for (let i = 1; i < thread.points.length; i++) {
        const a = thread.points[i - 1]
        const b = thread.points[i]
        const ab = b.clone().sub(a)
        const ratio = Math.max(0, Math.min(1, point.clone().sub(a).dot(ab) / ab.lengthSq()))
        const candidate = a.clone().addScaledVector(ab, ratio)
        if (hip && candidate.distanceTo(hip) > reach) continue
        const d = candidate.distanceToSquared(point)
        if (d < distance) { distance = d; best = { point: candidate, threadId: thread.id } }
      }
    }
    if (!best) throw new Error('No reachable silk foothold')
    return best
  }

  occupy(spiderId: string, anchors: FootAnchor[]) {
    this.occupants.set(spiderId, new Set(anchors.map(anchor => anchor.threadId)))
  }

  release(spiderId: string) {
    this.occupants.delete(spiderId)
    this.threads.forEach(thread => { if (thread.owner === spiderId) delete thread.owner })
  }

  claimWork(spiderId: string, position: Vector3, maxDistance = Infinity, canReach: (thread: SilkThread) => boolean = () => true): SilkThread | undefined {
    const occupied = new Set([...this.occupants.values()].flatMap(set => [...set]))
    const candidates = this.threads.filter(thread => thread.kind === 'ring' && !thread.owner && !occupied.has(thread.id)
      && thread.points[4].length() < this.options.radius * 0.7 && thread.points[4].distanceTo(position) <= maxDistance && canReach(thread))
    // Repair existing gaps first; otherwise trim a complete thread near the spider.
    candidates.sort((a, b) => a.coverage - b.coverage ||
      a.points[4].distanceToSquared(position) - b.points[4].distanceToSquared(position))
    const thread = candidates[0]
    if (thread) thread.owner = spiderId
    return thread
  }
}
