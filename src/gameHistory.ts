import type { Game } from './gameRules.ts'

export interface GameHistory {
  game: Game
  past: Game[]
}
export function rememberTurn(history: GameHistory, next: Game): GameHistory {
  // Invalid actions return the same game and must not consume an undo step.
  return next === history.game ? history : { game: next, past: [...history.past, history.game] }
}
export function undoTurn(history: GameHistory): GameHistory {
  const previous = history.past.at(-1)
  return previous ? { game: previous, past: history.past.slice(0, -1) } : history
}
