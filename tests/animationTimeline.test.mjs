import test from 'node:test'
import assert from 'node:assert/strict'
import { battlePhase, projectileProgress, chooseFinale, THROW_START, THROW_INTERVAL, THROW_FLIGHT, FLEE_START, BATTLE_DURATION } from '../src/animation/timeline.ts'
test('a completed run gathers, lifts, attacks, then sends the spider fleeing', () => {
  assert.equal(battlePhase(.3), 'gather')
  assert.equal(battlePhase(1), 'lift')
  assert.equal(battlePhase(3), 'defend')
  assert.equal(battlePhase(6), 'flee')
  assert.equal(battlePhase(7.5), 'settle')
  assert.ok(THROW_START + 12 * THROW_INTERVAL + THROW_FLIGHT < FLEE_START)
  assert.ok(BATTLE_DURATION > FLEE_START)
  for (let i = 0; i < 13; i++) {
    assert.equal(projectileProgress(THROW_START + i * THROW_INTERVAL - .01, i), 0)
    assert.equal(projectileProgress(FLEE_START, i), 1)
  }
})
test('every requested finale is selectable', () => {
  assert.equal(chooseFinale(() => 0), 'fireworks')
  assert.equal(chooseFinale(() => .5), 'butterflies')
  assert.equal(chooseFinale(() => .999), 'painting')
})

test('defending face and fangs point toward incoming cards from every direction', async () => {
  const { facingYaw } = await import('../src/animation/timeline.ts')
  for (const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0],[2,3],[-4,2]]) {
    const yaw = facingYaw(dx,dy), length = Math.hypot(dx,dy)
    assert.ok(Math.abs(Math.sin(yaw) - dx / length) < 1e-10)
    assert.ok(Math.abs(-Math.cos(yaw) - dy / length) < 1e-10)
  }
})

 test('attack damage accumulates through defense phases and recoil fades between hits', async () => {
  const { attackState } = await import('../src/animation/timeline.ts')
  assert.equal(attackState(1).hits, 0)
  assert.equal(attackState(2.16).phase, 'defiant')
  assert.equal(attackState(3.2).phase, 'battered')
  assert.equal(attackState(4.4).phase, 'overwhelmed')
  assert.equal(attackState(6).phase, 'retreat')
  assert.equal(attackState(6).damage, 1)
  assert.ok(attackState(2.16).recoil > attackState(2.34).recoil)
})

test('fleeing spiders clear the screen entirely before the cards settle', async () => {
  const { escapeDestination, escapeProgress } = await import('../src/animation/timeline.ts')
  for (const width of [375, 768, 1512, 2560]) {
    for (const fraction of [-.45, -.1, .1, .45]) {
      const size = 32
      const start = width * fraction
      const end = escapeDestination(start, -200, width, size)
      assert.ok(Math.abs(end.x) - size * 4 > width / 2)
      assert.ok(Math.sign(end.x) !== Math.sign(start))
      assert.equal(escapeProgress(FLEE_START), 0)
      assert.equal(escapeProgress(7), 1)
      assert.ok(escapeProgress(6.8) > escapeProgress(6.4))
    }
  }
})

test('gathering stays over the completed column when the Ace came from the left', async () => {
  const { battleGatherPoint } = await import('../src/animation/timeline.ts')
  const battle = { gather: { x: 650, y: 400 }, origins: [
    { x: 50, y: 200, width: 100, height: 140 },
    { x: 600, y: 300, width: 100, height: 140 },
  ] }
  assert.deepEqual(battleGatherPoint(battle), { x: 650, y: 400 })
  assert.equal(battleGatherPoint({ ...battle, gather: undefined }).x, 650)
})


test('randomized pile rhythms preserve rank order, simultaneous launches, and the final Ace ending', async () => {
  const { createFireworksPlan } = await import('../src/animation/fireworksPlan.ts')
  const { rocketCard } = await import('../src/animation/timeline.ts')
  for (let seed = 1; seed <= 20; seed++) {
    let state = seed
    const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32 }
    const { flights, duration } = createFireworksPlan(random)
    const volleys = new Map()
    assert.equal(flights.length, 104)
    for (const rocket of flights) {
      volleys.set(rocket.launchAt, (volleys.get(rocket.launchAt) ?? 0) + 1)
      assert.ok(rocket.prepareAt >= 0)
      assert.ok(rocket.prepareAt + rocket.rollTime <= rocket.launchAt + 1e-9)
    }
    for (const count of volleys.values()) assert.ok(count >= 3)
    assert.ok(new Set(flights.map(rocket => rocket.rollTime)).size > 8)
    for (let home = 0; home < 8; home++) {
      const pile = Array.from({ length: 13 }, (_, rank) => flights[rank * 8 + home])
      assert.ok(pile.every((rocket, rank) => rank === 0 || rocket.launchAt > pile[rank - 1].launchAt))
      assert.deepEqual(pile.map(rocket => rocketCard(rocket.index, 'h')),
        ['hK','hQ','hJ','h10','h9','h8','h7','h6','h5','h4','h3','h2','h1'])
    }
    const last = [...flights].sort((a,b) => b.launchAt - a.launchAt)[0]
    assert.equal(rocketCard(last.index), 's1')
    assert.equal(duration, Math.max(...flights.map(rocket => rocket.launchAt + rocket.flightTime + rocket.burstTime)))
  }
})

test('the defending spider scuttles and hops within its home, then settles to flee', async () => {
  const { defenseMotion, THROW_START, FLEE_START } = await import('../src/animation/timeline.ts')
  assert.deepEqual(defenseMotion(0), { x: 0, y: 0, hop: 0 })
  const samples = Array.from({ length: 60 }, (_, i) => defenseMotion(THROW_START + i * .05))
  assert.ok(samples.some(p => p.x > .7) && samples.some(p => p.x < -.7))
  assert.ok(samples.some(p => p.hop > .7))
  assert.ok(samples.every(p => Math.abs(p.x) <= 1 && Math.abs(p.y) <= .55 && p.hop <= 1))
  const end = defenseMotion(FLEE_START)
  assert.ok(Math.abs(end.x) + Math.abs(end.y) + end.hop < 1e-10)
})
