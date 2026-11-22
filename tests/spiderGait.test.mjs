import test from 'node:test'
import assert from 'node:assert/strict'
import { Vector3 } from 'three'
import {
  legs, FOOT_Z, UPPER_LEG_LENGTH, LOWER_LEG_LENGTH, GAIT_DURATION,
  spiderMoods, bodyPosition, footPosition, solveLeg, webDeflection, webBendWeight, celebration,
} from '../src/spider/spiderGait.ts'

test('all poses are reachable, links retain length, and solved feet match silk targets', () => {
  for (const mood of spiderMoods) {
    for (let frame = 0; frame <= 240; frame++) {
      const time = frame / 60
      const body = bodyPosition(mood, time)
      for (const leg of legs) {
        const target = footPosition(leg, mood, time)
        const pose = solveLeg(leg, body, target)
        const hip = leg.hip.clone().add(body)
        const knee = new Vector3(0, UPPER_LEG_LENGTH, 0).applyQuaternion(pose.upper).add(hip)
        const foot = new Vector3(0, LOWER_LEG_LENGTH, 0)
          .applyQuaternion(pose.lower).applyQuaternion(pose.upper).add(knee)
        assert.ok(foot.distanceTo(target) < 1e-8, mood + leg.name)
        assert.ok(Math.abs(hip.distanceTo(knee) - UPPER_LEG_LENGTH) < 1e-8)
        assert.ok(Math.abs(knee.distanceTo(foot) - LOWER_LEG_LENGTH) < 1e-8)
        assert.ok(target.z >= FOOT_Z - webDeflection(mood, time) * webBendWeight(target.x, target.y) - 1e-8)
        assert.ok(Math.abs(target.x * Math.cos(leg.angle) - target.y * Math.sin(leg.angle)) < 1e-8)
      }
    }
  }
})

test('walking always has four supporting legs and stance feet do not skate', () => {
  for (let frame = 0; frame < 240; frame++) {
    const time = frame / 60
    let planted = 0
    for (const leg of legs) {
      const foot = footPosition(leg, 'Walk', time)
      const next = footPosition(leg, 'Walk', time + 1 / 60)
      if (Math.abs(foot.z - FOOT_Z) < 1e-8) {
        planted++
        if (Math.abs(next.z - FOOT_Z) < 1e-8) assert.ok(foot.distanceTo(next) < 1e-8)
      }
    }
    assert.ok(planted >= 4, 'Support lost at ' + time)
  }
})

test('walking lifts both alternating groups and every clip loops without a jump', () => {
  for (const leg of legs) {
    assert.ok(Array.from({length: 120}, (_, i) => footPosition(leg, 'Walk', i / 30).z)
      .some(z => z > FOOT_Z + .25))
    for (const mood of spiderMoods) {
      assert.ok(footPosition(leg, mood, 0).distanceTo(footPosition(leg, mood, GAIT_DURATION)) < 1e-8)
      assert.ok(bodyPosition(mood, 0).distanceTo(bodyPosition(mood, GAIT_DURATION)) < 1e-8)
    }
  }
})


test('celebration clears the silk, lands on the deformed web, and settles', () => {
  assert.ok(celebration(1.1).height > 1)
  for (const leg of legs) {
    assert.ok(footPosition(leg, 'Celebrate', 1.1).z > FOOT_Z + 1)
    for (const time of [0, .25, 1.7, 1.9, 2.2, 2.8, 3.5, 4]) {
      const foot = footPosition(leg, 'Celebrate', time)
      const surface = FOOT_Z - webDeflection('Celebrate', time) * webBendWeight(foot.x, foot.y)
      assert.ok(Math.abs(foot.z - surface) < 1e-8)
    }
  }
  assert.ok(webDeflection('Celebrate', 1.9) > .3)
  assert.equal(webBendWeight(2.6, 0), 0)
  assert.equal(webDeflection('Celebrate', 4), 0)
  assert.ok(bodyPosition('Walk', 1).distanceTo(bodyPosition('Walk', 3)) > .8)
})
