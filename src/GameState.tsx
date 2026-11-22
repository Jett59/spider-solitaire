import { useState, type ReactNode } from 'react'
import { GameContext } from './gameContext'
import { emptyGame, newGame, moveCards, dealCards, moveProblem, dealProblem, stockSize, type Game } from './gameRules'
export type { Card } from './gameRules'

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<Game>(emptyGame)
  function move(from: number, depth: number, to: number) {
    const problem = moveProblem(game, from, depth, to)
    if (!problem) setGame(moveCards(game, from, depth, to))
    return problem
  }
  function deal() {
    const problem = dealProblem(game)
    if (!problem) setGame(dealCards(game))
    return problem
  }
  return <GameContext.Provider value={{ ...game, deckSize: stockSize(game), move, deal,
    start: suits => setGame(newGame(suits)), end: () => setGame(emptyGame()) }}>
    {children}
  </GameContext.Provider>
}
