import { Quaternion, Vector3 } from 'three'

export const WEB_Z = -0.9
export const FOOT_Z = WEB_Z + 0.012 + 0.045
export const UPPER_LEG_LENGTH = 1.05
export const LOWER_LEG_LENGTH = 1.25
export const GAIT_DURATION = 4
export const spiderMoods = ['Walk', 'Idle', 'Wave', 'Celebrate'] as const
export type SpiderMood = typeof spiderMoods[number]

export const legs = [-1, 1].flatMap(side => [0, 1, 2, 3].map(index => ({
  name: `Leg${side < 0 ? 'L' : 'R'}${index}`,
  side,
  index,
  angle: side * [35, 72, 108, 145][index] * Math.PI / 180,
  hip: new Vector3(side * 0.57, 0.56 - index * 0.36, 0),
  // Alternate adjacent legs and mirror the pattern on the opposite side.
  phase: (index + (side > 0 ? 1 : 0)) % 2 * 0.5,
})))
export type SpiderLeg = typeof legs[number]

/** A pinned web: strongest deflection at its centre, zero at the anchors. */
export function webBendWeight(x: number, y: number) {
  return Math.max(0, 1 - (x * x + y * y) / 2.6 ** 2)
}

export function celebration(time: number) {
  const t = ((time % GAIT_DURATION) + GAIT_DURATION) % GAIT_DURATION
  const airborne = t > 0.5 && t < 1.7
  const flight = Math.max(0, Math.min(1, (t - 0.5) / 1.2))
  const arc = 4 * flight * (1 - flight)
  const impactTime = Math.max(0, t - 1.7)
  const settle = Math.max(0, 1 - impactTime / 2.3) ** 2
  const bend = t < 0.5
    ? 0.1 * Math.sin(t / 0.5 * Math.PI) ** 2
    : 0.85 * Math.sin(impactTime * Math.PI / 0.6) * Math.exp(-1.8 * impactTime) * settle
  return { height: airborne ? 1.15 * arc : 0, tuck: airborne ? 0.32 * Math.sin(Math.PI * flight) : 0, bend }
}

export function webDeflection(mood: SpiderMood, time: number) {
  return mood === 'Celebrate' ? celebration(time).bend : 0
}

export function bodyPosition(mood: SpiderMood, time: number) {
  const phase = time / GAIT_DURATION * Math.PI * 2
  const jump = celebration(time)
  return new Vector3(
    mood === 'Walk' ? 0.065 * Math.sin(phase * 2) : 0,
    mood === 'Walk' ? 0.42 * Math.sin(phase) : 0,
    mood === 'Celebrate' ? jump.height - jump.bend * 0.65 : 0.018 * Math.sin(phase * 2),
  )
}

/** Feet remain fixed on radial silk during stance; only swing feet leave it. */
export function footPosition(leg: SpiderLeg, mood: SpiderMood, time: number) {
  let radius = 1.98
  let lift = 0
  if (mood === 'Walk') {
    const cycle = ((time / 2 + leg.phase) % 2 + 2) % 2
    const step = Math.floor(cycle)
    const phase = cycle - step
    const start = step === 0 ? 1.82 : 2.14
    const end = step === 0 ? 2.14 : 1.82
    // 65% planted / 35% swing. The opposite group is planted during swing.
    const swing = Math.max(0, (phase - 0.65) / 0.35)
    const eased = swing * swing * (3 - 2 * swing)
    radius = start + (end - start) * eased
    lift = 0.3 * Math.sin(Math.PI * swing) ** 2
  } else if (mood === 'Celebrate') {
    const jump = celebration(time)
    radius -= jump.tuck
    lift = jump.height + jump.tuck
  } else if (mood === 'Wave' && leg.side > 0 && leg.index === 0) {
    lift = 0.45 * (1 - Math.cos(time * Math.PI))
    radius += 0.12 * Math.sin(time * Math.PI * 2)
  }
  const x = Math.sin(leg.angle) * radius
  const y = Math.cos(leg.angle) * radius
  return new Vector3(x, y, FOOT_Z + lift - webDeflection(mood, time) * webBendWeight(x, y))
}

/** Two rigid links, solved analytically; knee bends away from the web. */
export function solveLeg(leg: SpiderLeg, body: Vector3, foot: Vector3) {
  const hip = leg.hip.clone().add(body)
  const direction = foot.clone().sub(hip)
  const distance = direction.length()
  if (distance > UPPER_LEG_LENGTH + LOWER_LEG_LENGTH || distance < Math.abs(UPPER_LEG_LENGTH - LOWER_LEG_LENGTH)) {
    throw new Error(`Unreachable foot target for ${leg.name}`)
  }
  direction.normalize()
  const bend = new Vector3(leg.side * 0.45, 0, 1)
  bend.addScaledVector(direction, -bend.dot(direction)).normalize()
  const along = (UPPER_LEG_LENGTH ** 2 - LOWER_LEG_LENGTH ** 2 + distance ** 2) / (2 * distance)
  const height = Math.sqrt(Math.max(0, UPPER_LEG_LENGTH ** 2 - along ** 2))
  const knee = hip.clone().addScaledVector(direction, along).addScaledVector(bend, height)
  const up = new Vector3(0, 1, 0)
  const upper = new Quaternion().setFromUnitVectors(up, knee.clone().sub(hip).normalize())
  const lowerWorld = new Quaternion().setFromUnitVectors(up, foot.clone().sub(knee).normalize())
  const lower = upper.clone().invert().multiply(lowerWorld)
  return { upper, lower, knee }
}
