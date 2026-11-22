import test from 'node:test'
import assert from 'node:assert/strict'
import { Vector3 } from 'three'
import { WebSurface } from '../src/web/webSurface.ts'
import { SpiderAgent } from '../src/spider/spiderAgent.ts'

test('web configuration determines topology and feet project onto actual silk', () => {
  for (const options of [{radius:3,spokes:8,rings:4},{radius:5,spokes:18,rings:10},{radius:8,spokes:32,rings:16}]) {
    const web = new WebSurface(options)
    assert.equal(web.threads.length, options.spokes * (options.rings + 1))
    const foot = web.nearestFoot(new Vector3(.7,.4,0))
    const thread = web.threads.find(thread => thread.id === foot.threadId)
    assert.ok(thread)
    assert.ok(foot.point.distanceTo(new Vector3(.7,.4,0)) < .5)
    web.disturb(new Vector3(), .6)
    web.tick(.15)
    assert.ok(web.height(0,0) < -.2)
    assert.ok(Math.abs(web.height(options.radius,0)) < 1e-10)
  }
})

test('occupied silk cannot be cut and work reservations are exclusive', () => {
  const web = new WebSurface({radius:5,spokes:18,rings:10})
  const first = web.threads.find(thread => thread.kind === 'ring')
  web.occupy('feet', [{point:first.points[4],threadId:first.id}])
  const work = web.claimWork('worker', first.points[4])
  assert.notEqual(work.id, first.id)
  assert.notEqual(web.claimWork('second', work.points[4]).id, work.id)
  web.release('worker')
  assert.equal(work.owner, undefined)
})

test('caretaker walks, trims and repairs without accumulating threads', () => {
  const web = new WebSurface({radius:5,spokes:18,rings:10})
  const spider = new SpiderAgent('one', web, .42)
  const count = web.threads.length
  const seen = new Set()
  let moved = 0, missing = false, repaired = false
  const gaps = new Set()
  for(let frame=0;frame<6000;frame++) {
    web.tick(.05)
    spider.update('Auto', 'Curious')
    seen.add(spider.activity)
    moved = Math.max(moved, spider.position.length())
    for (const thread of web.threads) {
      if(thread.coverage === 0) { missing=true;gaps.add(thread.id) }
      if(thread.coverage === 1 && gaps.has(thread.id)) repaired=true
      assert.ok(thread.coverage >= 0 && thread.coverage <= 1)
    }
    for(const foot of spider.feet) {
      assert.equal(web.threads.find(thread=>thread.id===foot.anchor.threadId).coverage,1)
    }
  }
  assert.ok(moved > 1)
  assert.ok(seen.has('Trimming silk'), [...seen].join(','))
  assert.ok(seen.has('Spinning silk'), [...seen].join(','))
  assert.ok(missing && repaired)
  assert.equal(web.threads.length,count)
  spider.dispose()
  assert.ok(web.threads.every(thread=>!thread.owner))
})

test('sparse and large webs keep roaming agents on the surface', () => {
  for(const options of [{radius:3,spokes:8,rings:4},{radius:8,spokes:32,rings:16}]) {
    const web=new WebSurface(options)
    const agent=new SpiderAgent('test',web,.42)
    for(let i=0;i<500;i++){
      web.tick(.05);agent.update('Walk','Grumpy')
      assert.ok(agent.position.length()<options.radius)
      for(let leg=0;leg<8;leg++) {
        const p=agent.footPoint(leg)
        assert.ok(Number.isFinite(p.z))
        assert.ok(p.z>=web.height(p.x,p.y))
      }
    }
  }
})

test('two caretakers share silk safely and interrupted work releases its reservation', () => {
  const web = new WebSurface({radius:5,spokes:18,rings:10})
  const first = new SpiderAgent('first', web, .42, [-.4,0])
  const second = new SpiderAgent('second', web, .42, [.4,0])
  let interrupted = false
  for(let frame=0;frame<1800;frame++){
    web.tick(.05)
    first.update('Auto','Curious')
    second.update('Auto','Calm')
    if(first.work && !interrupted) {
      const thread=first.work
      first.update('Idle','Curious')
      assert.equal(thread.owner,undefined)
      assert.ok(thread.coverage===0 || thread.coverage===1)
      interrupted=true
    }
    if(first.work && second.work) assert.notEqual(first.work.id,second.work.id)
    for(const agent of [first,second]) for(const foot of agent.feet) {
      assert.equal(web.threads.find(thread=>thread.id===foot.anchor.threadId).coverage,1)
    }
  }
  assert.ok(interrupted)
  first.dispose();second.dispose()
  assert.ok(web.threads.every(thread=>thread.owner===undefined))
})

test('tending scuttles quickly, brakes on arrival, stays still to work and darts off again', () => {
  const web = new WebSurface({radius:5,spokes:18,rings:10})
  const spider = new SpiderAgent('scuttler',web,.42)
  const firstRunSpeeds = []
  let firstWork = 0, spinFinished = 0, departure = 0, previousActivity = ''
  for(let frame=0;frame<1200;frame++) {
    const before = spider.position.clone()
    web.tick(1/60)
    spider.update('Auto','Curious')
    const speed = spider.position.distanceTo(before)*60
    if(!firstWork && spider.activity==='Exploring') firstRunSpeeds.push(speed)
    if(spider.activity.includes('silk')) {
      if(!firstWork) firstWork=web.time
      assert.ok(speed<1e-8,'Maintenance must be deliberate and stationary')
    }
    if(previousActivity==='Spinning silk' && spider.activity==='Resting' && !spinFinished) spinFinished=web.time
    if(spinFinished && speed>0.05 && !departure) departure=web.time
    previousActivity=spider.activity
  }
  const peak=Math.max(...firstRunSpeeds)
  const approach=firstRunSpeeds.slice(-10).reduce((sum,speed)=>sum+speed,0)/10
  assert.ok(firstWork<5,'First run should be a short dart')
  assert.ok(peak>0.9,'Scuttle should be substantially faster than the previous stroll')
  assert.ok(approach<peak*.3,'Slow down before starting maintenance')
  assert.ok(departure>spinFinished && departure-spinFinished<1,'Dart away shortly after repairing')
})

test('tattered web is repaired fully, celebrated at centre, damaged on landing, then repaired again', () => {
  const web = new WebSurface({radius:3,spokes:8,rings:4,tattered:true})
  const spider = new SpiderAgent('story',web,.42)
  const initialDamage = web.damageCount
  assert.ok(initialDamage>=6)
  assert.ok(web.threads.some(thread=>thread.fray>0))
  assert.ok(web.threads.filter(thread=>thread.kind==='spoke').every(thread=>thread.coverage===1))
  let celebrated=false, frowned=false, repairedAgain=false, repairsAtLanding=0
  for(let frame=0;frame<16000;frame++) {
    web.tick(.05)
    spider.update('Auto','Curious')
    if(spider.isCelebrating) {
      assert.ok(spider.position.length()<.02,'Celebrate only in the centre')
      if(spider.celebrationTime<1.7) assert.equal(web.damageCount,0,'Finish all repairs before jumping')
      celebrated=true
    }
    if(spider.isFrowning) {
      assert.ok(web.damageCount>0,'Frown after noticing fresh damage')
      frowned=true
      repairsAtLanding=web.completedRepairs
    }
    if(frowned && web.completedRepairs>repairsAtLanding) {repairedAgain=true;break}
  }
  assert.ok(celebrated && frowned && repairedAgain)
  assert.ok(web.completedRepairs>initialDamage)
  assert.equal(web.damageRounds,1)
})

test('landing damage is random, bounded, and never cuts occupied silk or anchor spokes', () => {
  const web = new WebSurface({radius:5,spokes:18,rings:10})
  const ring=web.threads.find(thread=>thread.kind==='ring')
  web.occupy('feet',[{point:ring.points[0],threadId:ring.id}])
  const first=web.shakeLoose(()=>.1)
  assert.ok(first.length>=2 && first.length<=5)
  assert.ok(!first.includes(ring.id))
  assert.ok(web.threads.filter(thread=>thread.kind==='spoke').every(thread=>thread.coverage===1))
  web.threads.forEach(thread=>{thread.coverage=1;thread.fray=0})
  const second=web.shakeLoose(()=>.8)
  assert.notDeepEqual(first,second)
  assert.equal(web.damageCount,second.length)
})

test('adjacent repairs take a direct route, with the centre reserved for completion', () => {
  const web = new WebSurface({radius:3,spokes:8,rings:4,tattered:true})
  web.threads.forEach(thread=>{thread.coverage=1;thread.fray=0})
  const first=web.threads.find(thread=>thread.id==='ring-3-0')
  const second=web.threads.find(thread=>thread.id==='ring-3-1')
  first.coverage=0
  second.coverage=0
  const start=first.points[0].clone().multiplyScalar(.96)
  const spider=new SpiderAgent('direct',web,.42,[start.x,start.y])
  let travelledBetweenJobs=false,returnedHome=false
  for(let frame=0;frame<2000 && !spider.isCelebrating;frame++) {
    web.tick(.05)
    spider.update('Auto','Curious')
    if(web.completedRepairs===1 && spider.isMoving) {
      travelledBetweenJobs=true
      assert.ok(spider.position.length()>1.2,'Do not detour through the centre between nearby repairs')
      assert.notEqual(spider.activity,'Heading home')
    }
    if(spider.activity==='Heading home') {
      returnedHome=true
      assert.equal(web.damageCount,0)
    }
  }
  assert.ok(travelledBetweenJobs && returnedHome && spider.isCelebrating)
  assert.ok(spider.position.length()<.02)
})

test('a web touch redirects its resident to investigate and then releases it', () => {
  const web = new WebSurface({ radius: 4, spokes: 16, rings: 6 })
  const spider = new SpiderAgent('visitor', web, .65)
  const target = new Vector3(1, 1, 0)
  spider.investigate(target)
  assert.equal(spider.activity, 'Exploring')
  let closest = Infinity
  for (let frame = 0; frame < 100; frame++) {
    web.tick(.05); spider.update('Auto', 'Curious')
    closest = Math.min(closest, spider.position.distanceTo(target))
  }
  assert.ok(closest < .15)
  spider.investigate(new Vector3(-1, 0, 0))
  for (let frame = 0; frame < 100; frame++) { web.tick(.05); spider.update('Auto', 'Curious') }
  assert.ok(spider.position.x < 0)
  spider.dispose()
})
