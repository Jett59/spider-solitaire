export type Card = `${'s' | 'h' | 'd' | 'c'}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'J' | 'Q' | 'K'}` | '?'
export interface Game {
  started: boolean
  // Exposed top card first. Hidden cards are drawn from the shuffled pool on reveal.
  stacks: Card[][]
  remainingCards: Card[]
  completeRuns: Card[][]
}
export const emptyGame = (): Game => ({ started: false, stacks: [], remainingCards: [], completeRuns: [] })
export const rank = (card: Card): number => card === '?' ? 0 : ({ J: 11, Q: 12, K: 13 }[card.slice(1)] ?? Number(card.slice(1)))
export const cardName = (card: Card): string => card === '?' ? 'Face-down card' : `${({ '1': 'Ace', J: 'Jack', Q: 'Queen', K: 'King' }[card.slice(1)] ?? card.slice(1))} of ${{ s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' }[card[0]]}`
export const stockSize = (game: Game) => game.remainingCards.length - game.stacks.flat().filter(card => card === '?').length
export function isRun(cards: Card[]): boolean {
  return cards.length > 0 && cards.every((card, i) => card !== '?' && (i === 0 || (card[0] === cards[i - 1][0] && rank(card) === rank(cards[i - 1]) + 1)))
}
export function selectionProblem(stacks: Card[][], column: number, depth: number): string | null {
  if (!Number.isInteger(depth) || depth < 1 || !stacks[column] || depth > stacks[column].length) return 'Choose a face-up card to move.'
  if (!isRun(stacks[column].slice(0, depth))) return 'These cards cannot move together. Choose a descending run of the same suit.'
  return null
}
export function moveProblem(game: Game, from: number, depth: number, to: number): string | null {
  const problem = selectionProblem(game.stacks, from, depth)
  if (problem) return problem
  if (!game.stacks[to] || from === to) return 'Choose a different column.'
  const target = game.stacks[to][0]
  if (target && (target === '?' || rank(target) !== rank(game.stacks[from][depth - 1]) + 1)) return 'Invalid move. The destination card must be exactly one rank higher, or the column must be empty.'
  return null
}
export function dealProblem(game: Game): string | null {
  if (stockSize(game) < 10) return 'There are no more cards to deal.'
  if (game.stacks.some(stack => stack.length === 0)) return 'Fill every empty column before dealing.'
  return null
}
function copyGame(game: Game): Game {
  return { ...game, stacks: game.stacks.map(stack => [...stack]), remainingCards: [...game.remainingCards], completeRuns: [...game.completeRuns] }
}
// Resolve all runs, including runs uncovered by another completion or a deal.
function settle(game: Game): Game {
  for (const stack of game.stacks) {
    while (true) {
      if (stack[0] === '?') stack[0] = game.remainingCards.shift()!
      if (stack.length < 13 || rank(stack[0]) !== 1 || !isRun(stack.slice(0, 13))) break
      game.completeRuns.push(stack.splice(0, 13))
    }
  }
  return game
}
export function moveCards(game: Game, from: number, depth: number, to: number): Game {
  if (moveProblem(game, from, depth, to)) return game
  const next = copyGame(game)
  next.stacks[to].unshift(...next.stacks[from].splice(0, depth))
  return settle(next)
}
export function dealCards(game: Game): Game {
  if (dealProblem(game)) return game
  const next = copyGame(game)
  for (const stack of next.stacks) stack.unshift(next.remainingCards.shift()!)
  return settle(next)
}
export function newGame(suits: number, random = Math.random): Game {
  if (![1, 2, 4].includes(suits)) throw new Error('Choose 1, 2 or 4 suits.')
  const cards: Card[] = []
  for (const suit of ['s', 'h', 'd', 'c'].slice(0, suits)) {
    for (const value of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K']) {
      for (let i = 0; i < 8 / suits; i++) cards.push(`${suit}${value}` as Card)
    }
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return { started: true, stacks: Array.from({ length: 10 }, (_, i) => [cards.shift()!, ...Array<Card>(i < 4 ? 5 : 4).fill('?')]), remainingCards: cards, completeRuns: [] }
}
export function longestRun(stacks: Card[][]): number {
  let longest = 0
  for (const stack of stacks) {
    let length = 0
    for (let i = 0; i < stack.length; i++) {
      if (stack[i] === '?') break
      length = i > 0 && isRun(stack.slice(i - 1, i + 1)) ? length + 1 : 1
      longest = Math.max(longest, length)
    }
  }
  return longest
}
