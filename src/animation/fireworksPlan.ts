export interface RocketFlight {
  index: number
  prepareAt: number
  launchAt: number
  rollTime: number
  flightTime: number
  burstTime: number
  targetX: number
  targetY: number
}

/** Each pile rolls and launches independently, so flights overlap in irregular waves. */
export function createFireworksPlan(random = Math.random) {
  const flights: RocketFlight[] = Array(104)
  for (let home = 0; home < 8; home++) {
    const pace = .75 + random() * .5
    let prepareAt = random() * .8
    for (let rank = 0; rank < 13; rank++) {
      const index = rank * 8 + home
      const rollTime = (.7 + random() * .45) * pace
      const launchAt = prepareAt + rollTime + random() * .25
      flights[index] = {
        index, prepareAt, launchAt, rollTime,
        flightTime: 1.25 + random() * .9,
        burstTime: 2.7 + random() * .5,
        targetX: .12 + random() * .76,
        targetY: .12 + random() * .28,
      }
      // Occasional pauses break up the rhythm without waiting for a rocket to land.
      prepareAt = launchAt + .12 + random() * .35 + (random() < .18 ? random() * .8 : 0)
    }
  }
  return { flights, duration: Math.max(...flights.map(rocket => rocket.launchAt + rocket.flightTime + rocket.burstTime)) }
}
