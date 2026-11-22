export interface FlightPoint { x: number; y: number }
interface FlightLeg { from: FlightPoint; to: FlightPoint; bend: FlightPoint; start: number; duration: number; resting: boolean }
export interface ButterflyFlight { legs: FlightLeg[]; duration: number; phase: number }

/** Plan once so replay and scrubbing follow exactly the same wandering flight. */
export function createButterflyFlight(origin: FlightPoint, width: number, height: number, perches: FlightPoint[], random = Math.random): ButterflyFlight {
  const legs: FlightLeg[] = []
  let from = origin, time = 0
  function leg(to: FlightPoint, duration: number, resting = false) {
    const bend = resting ? to : {
      x: (from.x + to.x) / 2 + (random() - .5) * Math.min(width * .6, 400),
      y: (from.y + to.y) / 2 + (random() - .5) * Math.min(height * .4, 260),
    }
    legs.push({ from, to, bend, start: time, duration, resting })
    from = to; time += duration
  }
  for (let stop = 0; stop < 2; stop++) leg({ x: width * (.12 + random() * .76), y: height * (.22 + random() * .43) }, 1.6 + random() * 1.8)
  if (perches.length && random() < .4) {
    const perch = perches[Math.min(perches.length - 1, Math.floor(random() * perches.length))]
    leg(perch, 1.4 + random() * 1.2)
    leg(perch, 1.4 + random() * 2, true)
  }
  const side = Math.floor(random() * 3)
  leg(side === 0 ? { x: -180, y: height * random() } : side === 1 ? { x: width + 180, y: height * random() } : { x: width * random(), y: -180 }, 2.5 + random() * 2)
  return { legs, duration: time, phase: random() * Math.PI * 2 }
}

export function butterflyPose(flight: ButterflyFlight, age: number) {
  const leg = flight.legs.find(leg => age < leg.start + leg.duration) ?? flight.legs[flight.legs.length - 1]
  const t = Math.max(0, Math.min(1, (age - leg.start) / leg.duration))
  // Ease into a perch and accelerate away without a positional jump.
  const u = t * t * (3 - 2 * t), v = 1 - u
  const x = v * v * leg.from.x + 2 * v * u * leg.bend.x + u * u * leg.to.x
  const y = v * v * leg.from.y + 2 * v * u * leg.bend.y + u * u * leg.to.y
  const settling = leg.resting ? 1 : flight.legs.some(next => next.resting && next.start === leg.start + leg.duration) ? Math.max(0, (t - .7) / .3) : 0
  return { x, y, resting: leg.resting, settling,
    tilt: leg.resting ? 0 : Math.sin(age * 1.5 + flight.phase) * .2 + (leg.to.x - leg.from.x) / 2000,
    flap: (.16 + .84 * Math.abs(Math.cos(age * 9 + flight.phase))) * (1 - settling) + (.12 + .04 * Math.sin(age * 2 + flight.phase) ** 2) * settling }
}
