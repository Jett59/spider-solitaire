import test from 'node:test'
import assert from 'node:assert/strict'
import { nearestHomes, threatenedHomes, spiderHomes } from '../src/spider/spiderHomes.ts'
const run = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 'sJ', 'sQ']
const homes = Array.from({ length: 8 }, (_, i) => ({ x: i * 100, y: 300 }))
test('nearby homes get nervous and equal distances threaten both', () => {
  assert.deepEqual(threatenedHomes([run.slice(0, 8)], [{ x: 200, y: 0 }], homes, [0,1,2,3]), [])
  assert.deepEqual(threatenedHomes([run.slice(0, 9)], [{ x: 200, y: 0 }], homes, [0,1,2,3]), [{ index: 2, panic: false }])
  assert.deepEqual(threatenedHomes([run], [{ x: 250, y: 0 }], homes, [0,1,2,3]), [{ index: 2, panic: true }, { index: 3, panic: true }])
})
test('completed homes are skipped and each nearby stack can threaten its own spider', () => {
  assert.deepEqual(nearestHomes({ x: 200, y: 0 }, homes, [0,1,3,4]), [1,3])
  assert.deepEqual(nearestHomes({ x: 200, y: 0 }, homes, []), [])
  assert.deepEqual(threatenedHomes([run, run.slice(0,9)], [{ x: 0, y: 0 }, { x: 700, y: 0 }], homes, [0,7]), [{ index: 0, panic: true }, { index: 7, panic: false }])
})
test('distance respects wrapped homes and reserves a distinct target for simultaneous completions', () => {
  const wrapped = [{ x: 100, y: 300 }, { x: 100, y: 500 }, { x: 300, y: 300 }]
  assert.deepEqual(nearestHomes({ x: 100, y: 200 }, wrapped, [0,1,2]), [0])
  assert.deepEqual(nearestHomes({ x: 100, y: 200 }, wrapped, [1,2]), [2])
})
test('all eight residents have stable distinct names and all three personalities', () => {
  assert.equal(spiderHomes.length, 8)
  assert.equal(new Set(spiderHomes.map(s => s.name)).size, 8)
  assert.deepEqual(new Set(spiderHomes.map(s => s.mood)), new Set(['grumpy', 'calm', 'curious']))
})
