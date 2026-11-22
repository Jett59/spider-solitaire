import test from 'node:test'
import assert from 'node:assert/strict'
import { sharedWebPlan } from '../src/animation/sharedWebPlan.ts'

test('all surviving spiders weave one connected web from shared junctions', () => {
  for (const residents of [1, 3, 8]) {
    let seed=17
    const {nodes,routes}=sharedWebPlan(residents,()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32})
    assert.equal(routes.length,residents)
    const graph=new Map()
    for(const route of routes) {
      assert.equal(route[0],0)
      assert.ok(route.every(id=>id>=0&&id<nodes.length))
      for(let i=1;i<route.length;i++) {
        assert.notEqual(route[i],route[i-1])
        for(const [a,b] of [[route[i-1],route[i]],[route[i],route[i-1]]]) {
          if(!graph.has(a))graph.set(a,new Set())
          graph.get(a).add(b)
        }
      }
    }
    const visited=new Set([0]), queue=[0]
    for(const node of queue) for(const neighbor of graph.get(node)??[]) if(!visited.has(neighbor)){visited.add(neighbor);queue.push(neighbor)}
    assert.equal(visited.size,graph.size)
    assert.ok(nodes.every(node=>Math.hypot(node.x,node.y)<=1.001))
  }
})
