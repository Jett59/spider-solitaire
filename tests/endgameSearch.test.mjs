import test from 'node:test'
import assert from 'node:assert/strict'
import { positionKey, searchEndgame } from '../src/endgameSearch.ts'
const run = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 'sJ', 'sQ', 'sK']
const game = stacks => ({ started: true, stacks, remainingCards: [], completeRuns: [] })
test('empty stock alone never means defeat: a winning continuation is found', () => {
  const state = game([['s1'], run.slice(1)])
  state.completeRuns = Array.from({ length: 7 }, () => run)
  assert.equal(searchEndgame(state), 'solvable')
})
test('closed reversible moves are exhausted before declaring defeat', () => {
  assert.equal(searchEndgame(game([['s5'], [], ['h5']])), 'unsolvable')
  assert.equal(searchEndgame(game(Array.from({ length: 10 }, () => ['sK']))), 'unsolvable')
})
test('search limits and undealt stock are inconclusive, never losses', () => {
  assert.equal(searchEndgame(game([['s1'], ['s2'], []]), 1), 'unknown')
  const state = game([['sK']]); state.remainingCards = ['s1']
  assert.equal(searchEndgame(state), 'unknown')
})
test('face-up column permutations share a key; hidden-card reveal ordering is preserved', () => {
  assert.equal(positionKey(game([['s1'], ['h3']])), positionKey(game([['h3'], ['s1']])))
  assert.notEqual(positionKey(game([['s1', '?'], ['h3']])), positionKey(game([['h3'], ['s1', '?']])))
})
test('a full 104-card game with empty stock and blocked exposed cards is a loss', () => {
  const deck = Array.from({length:8},()=>run).flat()
  const tops = [...Array(8).fill('sK'), 's1', 's1']
  for (const card of tops) deck.splice(deck.indexOf(card), 1)
  const state = game(tops.map((top,i)=>[top,...Array(i<4?10:9).fill('?')]))
  state.remainingCards = deck
  assert.equal(state.stacks.flat().length, 104)
  assert.equal(searchEndgame(state), 'unsolvable')
})
