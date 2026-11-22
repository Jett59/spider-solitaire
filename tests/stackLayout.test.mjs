import test from 'node:test'
import assert from 'node:assert/strict'
import { fitTable } from '../src/stackLayout.ts'

test('homes move below the viewport before cards shrink', () => {
  const layout = fitTable(600, 150, 12, 230)
  assert.equal(layout.scale, 1)
  assert.ok(layout.hiddenHomes > 0)
  assert.ok(layout.hiddenHomes < 230)
})
test('a stack taller than the screen scales as a whole after homes leave', () => {
  const layout = fitTable(480, 150, 15, 230)
  assert.equal(layout.hiddenHomes, 230)
  assert.ok(layout.scale < 1)
  const naturalHeight = 150 + 14 * (150 / 1.42 * .34)
  assert.ok(Math.abs(naturalHeight * layout.scale - 480) < .001)
})
test('short stacks keep full size and all homes visible', () => {
  assert.deepEqual(fitTable(900, 150, 6, 230), { scale: 1, hiddenHomes: 0, height: 830 })
})
test('exceptional stacks retain a readable size and scroll', () => {
  assert.equal(fitTable(200, 150, 50, 230).scale, .6)
})

test('tall screens cap spare felt while leaving room for growing stacks', () => {
  const short = fitTable(1600, 150, 6, 230)
  const long = fitTable(1600, 150, 18, 230)
  assert.equal(short.height, 830)
  assert.ok(long.height > short.height)
  assert.ok(long.height < 1600)
  assert.equal(long.scale, 1)
  assert.equal(long.hiddenHomes, 0)
})
test('limited screens still use all their available height', () => {
  assert.equal(fitTable(480, 150, 15, 230).height, 480)
})
