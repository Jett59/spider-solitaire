import { isRun, moveCards, moveProblem, stockSize, type Game } from './gameRules.ts'

export type Solvability = 'solvable' | 'unsolvable' | 'unknown'
// Columns are interchangeable once the stock is empty. Canonicalisation removes
// empty-column shuffling and reversible cycles without dropping real moves.
export function positionKey(game: Game): string {
  const columns = game.stacks.map(s => s.join(','))
  // The current engine draws hidden cards on reveal, in column order.
  if (!game.stacks.some(stack => stack.includes('?'))) columns.sort()
  return `${game.completeRuns.length};${game.remainingCards.join(',')};${columns.join('|')}`
}
export function searchEndgame(game: Game, limit = 60000): Solvability {
  if (game.completeRuns.length === 8) return 'solvable'
  if (stockSize(game) !== 0) return 'unknown'
  const pending = [game]
  const seen = new Set([positionKey(game)])
  while (pending.length) {
    const current = pending.pop()!
    for (let from = 0; from < current.stacks.length; from++) {
      for (let depth = 1; depth <= current.stacks[from].length; depth++) {
        if (!isRun(current.stacks[from].slice(0, depth))) break
        for (let to = 0; to < current.stacks.length; to++) {
          if (moveProblem(current, from, depth, to)) continue
          const next = moveCards(current, from, depth, to)
          if (next.completeRuns.length === 8) return 'solvable'
          const key = positionKey(next)
          if (seen.has(key)) continue
          // Exhausting a search budget is not proof of defeat.
          if (seen.size >= limit) return 'unknown'
          seen.add(key)
          pending.push(next)
        }
      }
    }
  }
  return 'unsolvable'
}
