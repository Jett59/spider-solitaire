import test from 'node:test'
import assert from 'node:assert/strict'
import { stackSpacing } from '../src/stackLayout.ts'

test('long iPad columns compress into the available table height',()=>{
  const {face,back}=stackSpacing(480,110,16,4)
  assert.ok(face>=22)
  assert.ok(110+15*face+4*back<=480)
})
test('exceptional stacks keep ranks readable and scroll within the table',()=>{
  assert.equal(stackSpacing(250,100,35,4).face,22)
  assert.equal(stackSpacing(600,100,4,2).face,36)
  assert.ok(Number.isFinite(stackSpacing(100,100,0,0).face))
})
