import { butterflyPairs, butterflyY, butterflyDuration, PAINT_INTERVAL, PAINT_FLIGHT, PAINT_DURATION } from './cardFinalePlan'
import { createBurst, createBurstRenderer } from './fireworkBurst'
import { createFireworksPlan } from './fireworksPlan'
import { cardArtwork } from './cardArtwork'
import { rocketCard, FIREWORK_CARDS, clamp, smooth, type Finale, type Point } from './timeline'
import type { GameSound } from '../gameAudio'

export function finaleShow(canvas: HTMLCanvasElement, kind: Finale, cue: (key: string, sound: GameSound, duration?: number) => void, homes: Point[]) {
  const width = innerWidth, height = innerHeight, ratio = Math.min(devicePixelRatio, 1.5)
  canvas.width = width * ratio; canvas.height = height * ratio
  const ctx = canvas.getContext('2d')!
  ctx.scale(ratio, ratio)
  const sources: Point[] = homes.length ? homes : Array.from({ length: 8 }, (_, i) => ({ x: width * (.1 + i * .1), y: height * .8, width: 50, height: 70 }))
  const source = (i: number) => { const home = sources[i % sources.length]; return { x: home.x + home.width / 2, y: home.y + home.height / 2, width: home.width } }
  const rocketImages = Array.from({ length: FIREWORK_CARDS }, (_, index) =>
    cardArtwork(rocketCard(index, sources[index % sources.length].card?.[0] ?? 's')))
  // Replace the stationary King faces with the remaining cards during the show.
  const piles = Array.from(document.querySelectorAll<HTMLElement>('.completion-slot__run'))
  const visibility = piles.map(pile => pile.style.visibility)
  piles.forEach(pile => { pile.style.visibility = 'hidden' })
  const fireworks = createFireworksPlan()
  const bursts = Array.from({ length: 104 }, (_, i) => createBurst(i * 47))
  const drawBurst = createBurstRenderer()
  let previousStamp = -1
  return {
    duration: kind === 'fireworks' ? fireworks.duration : kind === 'butterflies' ? butterflyDuration(height) : PAINT_DURATION,
    frame(time: number) {
      cue('win', 'win')
      if (kind !== 'painting') ctx.clearRect(0, 0, width, height)
      if (kind === 'fireworks') {
        sources.forEach((home, slot) => {
          let rank = 0
          while (rank < 13 && time >= fireworks.flights[rank * 8 + slot].prepareAt + .12) rank++
          if (rank < 13) ctx.drawImage(rocketImages[rank * 8 + slot], home.x, home.y, home.width, home.height)
        })
        // All eight homes roll a card together; launches take turns across the table.
        for (let burst = 0; burst < FIREWORK_CARDS; burst++) {
          const rocket = fireworks.flights[burst]
          const { rollTime, flightTime, burstTime } = rocket
          const preparationAge = time - rocket.prepareAt
          const age = time - rocket.launchAt + rollTime
          const lifetime = rollTime + flightTime + burstTime
          if (preparationAge < 0 || age > lifetime) continue
          const origin = source(burst)
          const flickX = origin.x + (burst % 2 ? 1 : -1) * Math.min(24, origin.width * .4)
          const flickY = origin.y - Math.min(65, origin.y * .2)
          const x = width * (.12 + ((burst * .381) % .76))
          const y = Math.max(35, Math.min(flickY - 100, height * (.12 + ((burst * .217) % .28))))
          const morph = smooth((preparationAge - .35) / (rollTime - .35))
          if (age < rollTime + flightTime) {
            const flight = clamp((age - rollTime) / flightTime)
            const ascent = flight * flight
            const flick = smooth(preparationAge / .55)
            const launchX = origin.x + (flickX - origin.x) * flick
            const launchY = origin.y + (flickY - origin.y) * flick
            const px = launchX + (x - flickX) * ascent
            const py = launchY + (y - flickY) * ascent
            const heading = Math.atan2(x - flickX, flickY - y)
            if (age >= rollTime) {
              cue(`rocket-${burst}`, 'rocket', flightTime)
              ctx.save()
              ctx.globalCompositeOperation = 'lighter'
              ctx.strokeStyle = '#ffd892'; ctx.shadowColor = '#ff9b42'; ctx.shadowBlur = 9
              ctx.lineWidth = 2
              const tail = Math.max(0, flight - .13) ** 2
              ctx.beginPath()
              ctx.moveTo(flickX + (x - flickX) * tail, flickY + (y - flickY) * tail)
              ctx.lineTo(px, py); ctx.stroke()
              ctx.restore()
            }
            ctx.save(); ctx.translate(px, py)
            ctx.rotate((burst % 2 ? 1 : -1) * Math.sin(flick * Math.PI) * .5 * (1 - morph) + heading * morph)
            // Curl the right edge across the printed face, leaving a shaded
            // paper tube. Only after rolling does it shorten into the rocket body.
            const handoff = smooth((morph - .72) / .28)
            const cardHeight = origin.width * 1.4 * (1 - handoff) + 19 * handoff
            const flatWidth = origin.width * (1 - morph)
            const left = -flatWidth / 2
            ctx.globalAlpha = 1 - handoff
            if (flatWidth > .1) {
              const picture = rocketImages[burst]
              ctx.drawImage(picture, 0, 0, picture.width * (1 - morph), picture.height,
                left, -cardHeight / 2, flatWidth, cardHeight)
            }
            if (morph > 0 && handoff < 1) {
              const tubeWidth = 4 + 9 * morph
              const edge = left + flatWidth
              const curl = ctx.createLinearGradient(edge - tubeWidth, 0, edge + 2, 0)
              curl.addColorStop(0, '#a8987e')
              curl.addColorStop(.35, '#fff9e9')
              curl.addColorStop(.75, '#e8dcc6')
              curl.addColorStop(1, '#8e7e67')
              ctx.fillStyle = curl
              ctx.beginPath(); ctx.roundRect(edge - tubeWidth, -cardHeight / 2, tubeWidth, cardHeight, tubeWidth / 2); ctx.fill()
              ctx.strokeStyle = '#9b8a70'; ctx.lineWidth = 1
              ctx.beginPath(); ctx.ellipse(edge - tubeWidth / 2, -cardHeight / 2 + 3, tubeWidth / 2, 3, 0, 0, Math.PI * 2); ctx.stroke()
            }
            ctx.globalAlpha = handoff
            ctx.fillStyle = '#fff2d9'
            ctx.beginPath(); ctx.roundRect(-4.5, -9, 9, 19, 3); ctx.fill()
            ctx.fillStyle = `hsl(${burst * 47} 85% 65%)`
            ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(0, -16); ctx.lineTo(5, -7); ctx.closePath(); ctx.fill()
            for (const side of [-1, 1]) {
              ctx.beginPath(); ctx.moveTo(side * 4, 3); ctx.lineTo(side * 10, 13); ctx.lineTo(side * 4, 10); ctx.closePath(); ctx.fill()
            }
            if (age >= rollTime) {
              ctx.fillStyle = '#ffcb62'
              ctx.beginPath(); ctx.moveTo(-3, 10); ctx.lineTo(0, 19 + Math.sin(age * 95) * 5); ctx.lineTo(3, 10); ctx.closePath(); ctx.fill()
            }
            ctx.restore()
          } else {
            cue(`burst-${burst}`, 'firework')
            const t = age - rollTime - flightTime
            drawBurst(ctx, bursts[burst], x, y, t, burstTime)
          }
        }
      } else if (kind === 'butterflies') {
        const departed = new Set(butterflyPairs.filter(pair => time >= pair.start).flatMap(pair => pair.cards))
        sources.forEach((home, slot) => {
          let rank = 0
          while (rank < 13 && departed.has(rank * 8 + slot)) rank++
          if (rank < 13) ctx.drawImage(rocketImages[rank * 8 + slot], home.x, home.y, home.width, home.height)
        })
        butterflyPairs.forEach((pair, index) => {
          const age = time - pair.start
          if (age < 0) return
          const origins = pair.cards.map(card => source(card))
          const opening = smooth(age / .8)
          const centerX = (origins[0].x + origins[1].x) / 2 + Math.sin(age * 1.3 + index) * age * 18
          const centerY = butterflyY((origins[0].y + origins[1].y) / 2, age)
          if (index % 4 === 0) cue(`flutter-${index}-${Math.floor(age)}`, 'flutter')
          pair.cards.forEach((card, wing) => {
            const origin = origins[wing], side = wing ? 1 : -1
            const cardWidth = origin.width * (1 - opening) + Math.min(origin.width, 38) * opening
            const flap = 1 - opening + opening * (.15 + .85 * Math.abs(Math.cos(age * 9 + index)))
            const px = origin.x + (centerX - origin.x) * opening
            const py = origin.y + (centerY - origin.y) * opening
            ctx.save(); ctx.translate(px, py)
            ctx.rotate(Math.sin(age * 1.5 + index) * .2)
            ctx.scale(flap, 1)
            const wingX = -cardWidth / 2 * (1 - opening) + (side < 0 ? -cardWidth : 0) * opening
            ctx.drawImage(rocketImages[card], wingX, -cardWidth * .7, cardWidth, cardWidth * 1.4)
            ctx.restore()
          })
        })
      } else {
        // Each physical card paints its own trail, at its captured stack size.
        const stamp = Math.floor(time * 24)
        if (stamp < previousStamp) { ctx.clearRect(0, 0, width, height); previousStamp = -1 }
        for (let nextStamp = previousStamp + 1; nextStamp <= stamp; nextStamp++) {
          const sampleTime = nextStamp / 24
          previousStamp = nextStamp
          sources.forEach((home, slot) => {
            let rank = 0
            while (rank < 13 && sampleTime >= (rank * 8 + slot) * PAINT_INTERVAL) rank++
            ctx.clearRect(home.x, home.y, home.width, home.height)
            if (rank < 13) ctx.drawImage(rocketImages[rank * 8 + slot], home.x, home.y, home.width, home.height)
          })
          for (let card = 0; card < 104; card++) {
            const age = sampleTime - card * PAINT_INTERVAL
            if (age < 0 || age > PAINT_FLIGHT) continue
            const home = sources[card % sources.length], origin = source(card)
            const travelWidth = Math.max(1, width - home.width)
            const rawX = origin.x - home.width / 2 + age * (card % 2 ? -1 : 1) * (150 + card % 7 * 23)
            const folded = ((rawX % (travelWidth * 2)) + travelWidth * 2) % (travelWidth * 2)
            const x = (folded > travelWidth ? travelWidth * 2 - folded : folded) + home.width / 2
            const y = origin.y - Math.abs(Math.sin(age * (1.4 + card % 5 * .1))) * Math.min(origin.y - home.height / 2, height * .65)
            ctx.drawImage(rocketImages[card], x - home.width / 2, y - home.height / 2, home.width, home.height)
          }
          cue(`paint-${Math.floor(time * 3)}`, 'paint')
        }
      }
    },
    dispose() { ctx.clearRect(0, 0, width, height); piles.forEach((pile, index) => { pile.style.visibility = visibility[index] }) },
  }
}
