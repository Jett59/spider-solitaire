export const BATTLE_DURATION = 7.8
export const THROW_START = 1.6
export const THROW_INTERVAL = .25
export const THROW_FLIGHT = .55
export const FLEE_START = 5.6
export type Finale = 'fireworks' | 'butterflies' | 'painting'
export type Show = 'battle' | 'spiders' | Finale
export const chooseFinale = (random = Math.random): Finale => (['fireworks', 'butterflies', 'painting'] as const)[Math.min(2, Math.floor(random() * 3))]
export const clamp = (n: number, low = 0, high = 1) => Math.max(low, Math.min(high, n))
export const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t) }
export function battlePhase(time: number) {
  return time < .75 ? 'gather' : time < THROW_START ? 'lift' : time < FLEE_START ? 'defend' : time < 7 ? 'flee' : 'settle'
}
export function projectileProgress(time: number, index: number) {
  return clamp((time - THROW_START - index * THROW_INTERVAL) / THROW_FLIGHT)
}
export interface Point { x: number; y: number; width: number; height: number; card?: import('../gameRules').Card }
export interface Battle {
  slot: number
  cards: import('../gameRules').Card[]
  origins: Point[]
  home: Point
  gather?: { x: number; y: number }
}

/** The spider’s mouth points along local -Y; yaw turns it toward a world vector. */
export function facingYaw(dx: number, dy: number): number {
  return Math.atan2(dx, -dy)
}

/** Recoil pulses only on contact; accumulated hits weaken the later defense. */
export function attackState(time: number) {
  const elapsed = time - THROW_START - THROW_FLIGHT
  const hits = Math.max(0, Math.min(13, Math.floor(elapsed / THROW_INTERVAL) + 1))
  const sinceHit = elapsed - (hits - 1) * THROW_INTERVAL
  const recoil = hits ? Math.max(0, 1 - sinceHit / .2) : 0
  return { hits, recoil, damage: hits / 13,
    phase: time >= FLEE_START ? 'retreat' : hits < 4 ? 'defiant' : hits < 9 ? 'battered' : 'overwhelmed' }
}

/** Run across the table and clear the viewport with room for the outstretched legs. */
export function escapeDestination(x: number, y: number, width: number, size: number) {
  const side = x <= 0 ? 1 : -1
  return { x: side * (width / 2 + size * 5), y: y + 45 }
}

export function escapeProgress(time: number) {
  const t = clamp((time - FLEE_START - .18) / 1.15)
  // Accelerate into the run; never ease to a halt while still visible.
  return t * t
}

export const FIREWORK_CARDS = 104
/** Gather above the completed column, never above the Ace's previous column. */
export function battleGatherPoint(battle: Battle) {
  const king = battle.origins.at(-1)!
  return battle.gather ?? { x: king.x + king.width / 2, y: king.y + king.height / 2 }
}

export function rocketCard(index: number, suit = 's'): import('../gameRules').Card {
  const ranks = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1']
  return (suit + ranks[Math.floor(index / 8)]) as import('../gameRules').Card
}

/** A bounded scuttle with short hops, settling before the final escape. */
export function defenseMotion(time: number) {
  const t = Math.max(0, time - THROW_START)
  const envelope = smooth(t / .22) * (1 - smooth((time - (FLEE_START - .45)) / .45))
  const hop = Math.max(0, Math.sin((t - THROW_FLIGHT + .13) * Math.PI / (THROW_INTERVAL * 3))) ** 2
  return {
    x: Math.sin(t * 8.4) * envelope,
    y: Math.sin(t * 5.7) * .55 * envelope,
    hop: hop * envelope,
  }
}
