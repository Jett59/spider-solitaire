import test from 'node:test'
import assert from 'node:assert/strict'
import { rememberTurn, undoTurn } from '../src/gameHistory.ts'
import { newGame, moveCards, dealCards } from '../src/gameRules.ts'

test('undo restores a completed run, revealed card, and hidden-card pool exactly', () => {
  const run = ['s2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 'sJ', 'sQ', 'sK']
  const game = { started: true, stacks: [['s1', '?'], [...run, '?']], remainingCards: ['h2', 'h3'], completeRuns: [] }
  const history = { game, past: [] }
  const moved = rememberTurn(history, moveCards(game, 0, 1, 1))
  assert.equal(moved.game.completeRuns.length, 1)
  assert.deepEqual(moved.game.completeRunColumns, [1])
  assert.deepEqual(moved.game.stacks, [['h2'], ['h3']])
  assert.deepEqual(undoTurn(moved), history)
})
test('undo deals in reverse order and replay the same cards', () => {
  const initial = { game: newGame(1), past: [] }
  const once = rememberTurn(initial, dealCards(initial.game))
  const twice = rememberTurn(once, dealCards(once.game))
  assert.deepEqual(undoTurn(twice), once)
  const restored = undoTurn(undoTurn(twice))
  assert.deepEqual(restored, initial)
  assert.deepEqual(dealCards(restored.game), once.game)
  assert.equal(undoTurn(initial), initial)
})
test('invalid actions do not replace the last undoable turn', () => {
  const initial = { game: newGame(1), past: [] }
  const dealt = rememberTurn(initial, dealCards(initial.game))
  const invalid = rememberTurn(dealt, moveCards(dealt.game, 0, 0, 1))
  assert.equal(invalid, dealt)
  assert.deepEqual(undoTurn(invalid), initial)
})
