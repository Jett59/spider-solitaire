export interface RocketFlight {
  index: number
  prepareAt: number
  launchAt: number
  rollTime: number
  flightTime: number
  burstTime: number
}

/** Independent pile rhythms, grouped into volleys so the sky stays lively. */
export function createFireworksPlan(random = Math.random) {
  const pace = Array.from({ length: 8 }, () => .85 + random() * .3)
  const order: number[] = []
  for (let rank = 0; rank < 13; rank++) {
    const homes = Array.from({ length: 8 }, (_, home) => ({ home, priority: random() * pace[home] }))
      .sort((a, b) => a.priority - b.priority).map(item => item.home)
    while (homes.length) {
      const volley = order.slice(Math.floor(order.length / 3) * 3).map(index => index % 8)
      const next = Math.max(0, homes.findIndex(home => !volley.includes(home)))
      order.push(rank * 8 + homes.splice(next, 1)[0])
    }
  }
  const flights: RocketFlight[] = Array(104)
  const lastLaunch = Array(8).fill(-2)
  let launchAt = 1.6
  for (let offset = 0; offset < order.length;) {
    const count = order.length - offset === 5 ? 5 : 3
    const flightTime = 1.2 + random() * .55
    for (const index of order.slice(offset, offset + count)) {
      const home = index % 8
      const desiredRoll = (.85 + random() * .4) * pace[home]
      const prepareAt = index < 8 ? random() * .18
        : Math.max(lastLaunch[home] + .15, launchAt - desiredRoll - .2 - random() * .6)
      const rollTime = Math.min(desiredRoll, launchAt - prepareAt)
      flights[index] = { index, prepareAt, launchAt, rollTime, flightTime, burstTime: 2.7 + random() * .5 }
      lastLaunch[home] = launchAt
    }
    launchAt += flightTime
    offset += count
  }
  return { flights, duration: Math.max(...flights.map(rocket => rocket.launchAt + rocket.flightTime + rocket.burstTime)) }
}
