import test from 'node:test'
import assert from 'node:assert/strict'
import { butterflyPairs, PAINT_INTERVAL, PAINT_FLIGHT, PAINT_DURATION } from '../src/animation/cardFinalePlan.ts'
import { createBurst, sparkPosition } from '../src/animation/fireworkBurst.ts'

test('butterflies consume every card exactly once, including all eight final Aces', () => {
  const cards = butterflyPairs.flatMap(pair => pair.cards)
  assert.equal(cards.length, 104)
  assert.deepEqual([...cards].sort((a,b) => a-b), Array.from({length:104}, (_,i) => i))
  for (let home=0; home<8; home++) assert.equal(cards.filter(card => card%8===home).length,13)
  assert.deepEqual(butterflyPairs.slice(-4).flatMap(pair=>pair.cards), [96,97,98,99,100,101,102,103])
})
test('painting stops after the last of 104 cards completes its flight', () => {
  assert.equal(PAINT_DURATION,103*PAINT_INTERVAL+PAINT_FLIGHT)
  assert.ok(PAINT_DURATION>104*PAINT_INTERVAL)
})
test('burst sparks spread, fall and expire with varied lifetimes', () => {
  let seed=7
  const sparks=createBurst(250,()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32})
  assert.equal(sparks.length,180)
  assert.ok(new Set(sparks.map(s=>s.life)).size>100)
  for(const spark of sparks) {
    assert.ok(spark.life<=2.9)
    const point=sparkPosition(spark,2.5)
    assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y))
    assert.ok(point.y>sparkPosition(spark,1).y)
  }
})
