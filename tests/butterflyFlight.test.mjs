import test from 'node:test'
import assert from 'node:assert/strict'
import { createButterflyFlight, butterflyPose } from '../src/animation/butterflyFlight.ts'

test('random flights land exactly on real perches, rest, and all leave the screen', () => {
  let seed=29
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32}
  const perches=[{x:100,y:120},{x:550,y:240}]
  let landed=0
  const exits=new Set()
  for(let i=0;i<104;i++) {
    const flight=createButterflyFlight({x:300,y:700},600,800,perches,random)
    assert.deepEqual({x:butterflyPose(flight,0).x,y:butterflyPose(flight,0).y},{x:300,y:700})
    for(const leg of flight.legs.filter(leg=>leg.resting)) {
      landed++
      const pose=butterflyPose(flight,leg.start+leg.duration/2)
      assert.ok(perches.some(p=>p.x===pose.x&&p.y===pose.y))
      assert.ok(pose.resting)
      assert.ok(pose.flap<.2)
    }
    for(let j=1;j<flight.legs.length;j++) {
      const boundary=flight.legs[j].start
      const a=butterflyPose(flight,boundary-1e-5),b=butterflyPose(flight,boundary+1e-5)
      assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.01)
    }
    const end=butterflyPose(flight,flight.duration)
    assert.ok(end.x< -100||end.x>700||end.y< -100)
    exits.add(end.x<0?'left':end.x>600?'right':'top')
  }
  assert.ok(landed>10&&landed<80)
  assert.equal(exits.size,3)
})

test('without visible perches butterflies keep flying instead of resting in midair',()=>{
  const flight=createButterflyFlight({x:100,y:400},390,800,[],()=>.2)
  assert.ok(flight.legs.every(leg=>!leg.resting))
})
