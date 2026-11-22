import test from 'node:test'
import assert from 'node:assert/strict'
import { createHomeWebSurface } from '../src/spider/homeWebSurface.ts'
import { SpiderAgent } from '../src/spider/spiderAgent.ts'

test('home webs reach every slot corner and keep anchors pinned as silk moves', () => {
  for (const aspect of [.85, 1.4]) {
    for (let index = 0; index < 8; index++) {
      const surface = createHomeWebSurface(index, aspect)
      const ends = surface.threads.filter(t => t.kind === 'spoke').map(t => t.points.at(-1))
      for (const x of [-4, 4]) for (const y of [-4 * aspect, 4 * aspect]) {
        assert.ok(ends.some(p => Math.hypot(p.x - x, p.y - y) < 1e-8))
        assert.ok(Math.abs(surface.height(x, y)) < 1e-8)
      }
      surface.disturb(surface.threads[0].points[0], .7)
      surface.tick(.3)
      for (const p of ends) assert.ok(Math.abs(surface.height(p.x, p.y)) < 1e-8)
    }
  }
})
test('irregular silk is repeatable and differs between homes', () => {
  const points = i => createHomeWebSurface(i, 1.2).threads.map(t => t.points.map(p => p.toArray()))
  assert.deepEqual(points(0), points(0))
  assert.notDeepEqual(points(0), points(1))
})
test('caretakers and alarmed spiders can walk on the irregular rectangular silk', () => {
  for (const [index, aspect, urgency] of [[0, .85, 1], [3, 1.4, 2.3]]) {
    const surface = createHomeWebSurface(index, aspect)
    const agent = new SpiderAgent('resident', surface, .96, [0, 0], index)
    const start = agent.position.clone()
    for (let i = 0; i < 720; i++) {
      surface.tick(1 / 60)
      agent.update(urgency > 1 ? 'Walk' : 'Auto', 'Curious', urgency)
      assert.ok(Number.isFinite(agent.position.x))
      for (const foot of agent.feet) {
        assert.ok(surface.threads.some(thread => thread.id === foot.anchor.threadId))
      }
    }
    assert.ok(agent.position.distanceTo(start) > .1)
    agent.dispose()
  }
})
