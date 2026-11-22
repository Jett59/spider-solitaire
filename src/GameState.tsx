import { useState, type ReactNode } from 'react'
import { GameContext } from './gameContext'
import { emptyGame, newGame, moveCards, dealCards, moveProblem, dealProblem, stockSize } from './gameRules'
import { rememberTurn, undoTurn, type GameHistory } from './gameHistory'
export type { Card } from './gameRules'

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<GameHistory>(() => ({ game: emptyGame(), past: [] }))
  const { game } = history
  function move(from: number, depth: number, to: number) {
    const problem = moveProblem(game, from, depth, to)
    if (!problem) setHistory(current => rememberTurn(current, moveCards(current.game, from, depth, to)))
    return problem
  }
  function deal() {
    const problem = dealProblem(game)
    if (!problem) setHistory(current => rememberTurn(current, dealCards(current.game)))
    return problem
  }
  return <GameContext.Provider value={{ ...game, deckSize: stockSize(game), move, deal,
    canUndo: history.past.length > 0, undo: () => setHistory(undoTurn),
    start: suits => setHistory({ game: newGame(suits), past: [] }), end: () => setHistory({ game: emptyGame(), past: [] }) }}>
    {children}
  </GameContext.Provider>
}
