import { useContext, createContext } from 'react'
import type { Game } from './gameRules'

export interface GameStateContext extends Game {
  canUndo: boolean
  undo: () => void
  deckSize: number
  move: (from: number, depth: number, to: number) => string | null
  deal: () => string | null
  start: (suits: number) => void
  end: () => void
}
export const GameContext = createContext<GameStateContext | null>(null)
export function useGameState() {
  const game = useContext(GameContext)
  if (!game) throw new Error('GameStateProvider is required')
  return game
}
