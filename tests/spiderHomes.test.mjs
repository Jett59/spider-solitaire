import test from 'node:test'
import assert from 'node:assert/strict'
import { threatenedHome, spiderHomes } from '../src/spider/spiderHomes.ts'
const run = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 'sJ', 'sQ']
test('only the next empty home is threatened, with rising urgency', () => {
  assert.equal(threatenedHome([run.slice(0, 8)], 0), null)
  assert.deepEqual(threatenedHome([run.slice(0, 9)], 2), { index: 2, panic: false })
  assert.deepEqual(threatenedHome([run], 2), { index: 2, panic: true })
  assert.deepEqual(threatenedHome([run], 1), { index: 1, panic: true })
  assert.equal(threatenedHome([run], 8), null)
  assert.equal(threatenedHome([['s1', 'h2', 's3']], 0), null)
})
test('all eight residents have stable distinct names and all three personalities', () => {
  assert.equal(spiderHomes.length, 8)
  assert.equal(new Set(spiderHomes.map(s => s.name)).size, 8)
  assert.deepEqual(new Set(spiderHomes.map(s => s.mood)), new Set(['grumpy', 'calm', 'curious']))
})
