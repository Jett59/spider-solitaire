import test from 'node:test'
import assert from 'node:assert/strict'
import { newGame, stockSize, moveProblem, selectionProblem, moveCards, dealCards, dealProblem, longestRun } from '../src/gameRules.ts'
const run = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 'sJ', 'sQ', 'sK']
const game = (stacks, remainingCards = []) => ({ started: true, stacks, remainingCards, completeRuns: [] })

test('all difficulties start with 104 cards and five deals', () => {
  for (const suits of [1, 2, 4]) {
    const state = newGame(suits)
    assert.equal(state.stacks.flat().length, 54)
    assert.equal(stockSize(state), 50)
    assert.equal(state.remainingCards.length + 10, 104)
    assert.equal(new Set([...state.remainingCards, ...state.stacks.map(s => s[0])].map(c => c[0])).size, suits)
  }
})
test('moves require exact adjacent rank but allow different destination suit', () => {
  const state = game([['s5'], ['h6'], ['s8'], []])
  assert.equal(moveProblem(state, 0, 1, 1), null)
  assert.ok(moveProblem(state, 0, 1, 2))
  assert.equal(moveProblem(state, 0, 1, 3), null)
  for (const depth of [0, -1, 2, 1.5]) assert.ok(moveProblem(state, 0, depth, 1))
  assert.ok(moveProblem(state, 0, 1, 0))
  assert.ok(selectionProblem([['?']], 0, 1))
  assert.ok(selectionProblem([['s1', 'h2']], 0, 2))
})
test('group moves reveal exactly one source card and do not mutate input', () => {
  const state = game([['s2', 's3', '?'], ['h4']], ['cK'])
  const next = moveCards(state, 0, 2, 1)
  assert.deepEqual(next.stacks, [['cK'], ['s2', 's3', 'h4']])
  assert.deepEqual(state.stacks, [['s2', 's3', '?'], ['h4']])
  assert.equal(next.remainingCards.length, 0)
})
test('completion removes a run and reveals the card underneath', () => {
  const next = moveCards(game([['s1'], [...run.slice(1), '?']], ['h7']), 0, 1, 1)
  assert.deepEqual(next.completeRuns, [run])
  assert.deepEqual(next.stacks, [[], ['h7']])
})
test('a deal consumes ten distinct cards and resolves multiple completed runs', () => {
  const state = game([run.slice(1), run.slice(1), ...Array.from({ length: 8 }, () => ['hK'])], ['s1', 's1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9'])
  const next = dealCards(state)
  assert.equal(next.remainingCards.length, 0)
  assert.equal(next.completeRuns.length, 2)
  assert.deepEqual(next.stacks.slice(2).map(s => s[0]), ['h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9'])
  assert.equal(state.remainingCards.length, 10)
})
test('dealing rejects empty columns and exhausted stock without changing state', () => {
  const state = game([[], ...Array.from({ length: 9 }, () => ['sK'])], Array(10).fill('h1'))
  assert.match(dealProblem(state), /empty/)
  assert.equal(dealCards(state), state)
  assert.match(dealProblem(game(Array.from({ length: 10 }, () => ['sK']))), /no more/)
})
test('spider nervousness uses only visible same-suit consecutive runs', () => {
  assert.equal(longestRun([run.slice(0, 11)]), 11)
  assert.equal(longestRun([['s1', 'h2', 's3', '?']]), 1)
})
test('eight completions produce a winning board', () => {
  const state = game([['s1'], run.slice(1)])
  state.completeRuns = Array.from({ length: 7 }, () => [...run])
  const next = moveCards(state, 0, 1, 1)
  assert.equal(next.completeRuns.length, 8)
  assert.ok(next.stacks.every(s => s.length === 0))
})
