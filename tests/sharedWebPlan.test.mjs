import test from 'node:test'
import assert from 'node:assert/strict'
import { sharedWebPlan, passingHeights } from '../src/animation/sharedWebPlan.ts'

test('every radial and ring strand is woven exactly once for every survivor count', () => {
  for (let residents = 1; residents <= 8; residents++) {
    const {nodes,routes}=sharedWebPlan(residents,()=>.5)
    const strands=new Set(), junctions=new Set()
    const parks=new Set()
    for(const route of routes) {
      parks.add(route.at(-1).node)
      assert.equal(route[0].node,route.at(-1).node)
      for(let i=1;i<route.length;i++) {
        const a=route[i-1].node,b=route[i].node
        assert.notEqual(a,b)
        const key=[a,b].sort((a,b)=>a-b).join(':')
        if(route[i].weave) {
          assert.ok(!strands.has(key),`duplicate ${key}`)
          strands.add(key); junctions.add(a); junctions.add(b)
        } else assert.ok(strands.has(key),'travel uses an existing strand')
      }
    }
    assert.equal(parks.size,residents)
    assert.equal(strands.size,72)
    assert.equal(junctions.size,nodes.length)
  }
})

test('passing spiders have leg clearance even when several meet at a junction', () => {
  const positions=[{x:0,y:0,size:10},{x:15,y:0,size:10},{x:0,y:0,size:12}]
  const heights=passingHeights(positions)
  for(let i=0;i<positions.length;i++) for(let j=0;j<i;j++) {
    const a=positions[i],b=positions[j]
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y,heights[i]-heights[j])+1e-8 >= (a.size+b.size)*3.2)
  }
  assert.deepEqual(passingHeights([{x:0,y:0,size:10},{x:100,y:0,size:10}]),[0,0])
})
