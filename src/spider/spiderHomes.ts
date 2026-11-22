import { longestRun, type Card } from '../gameRules.ts'

export type HomeMood = 'grumpy' | 'calm' | 'curious'
export const spiderHomes: { name: string; mood: HomeMood; colour: string; marking: 'spots' | 'stripe' | 'chevron' }[] = [
  { name: 'Bram', mood: 'grumpy', colour: '#b18aed', marking: 'chevron' },
  { name: 'Moss', mood: 'calm', colour: '#7fbba9', marking: 'stripe' },
  { name: 'Pip', mood: 'curious', colour: '#e4ac6f', marking: 'spots' },
  { name: 'Nell', mood: 'calm', colour: '#8aaee1', marking: 'spots' },
  { name: 'Rufus', mood: 'grumpy', colour: '#d18a94', marking: 'stripe' },
  { name: 'Tilly', mood: 'curious', colour: '#d1a0db', marking: 'chevron' },
  { name: 'Otis', mood: 'calm', colour: '#b3ba81', marking: 'chevron' },
  { name: 'Zig', mood: 'curious', colour: '#91c5d9', marking: 'stripe' },
]

export function threatenedHome(stacks: Card[][], completed: number): { index: number; panic: boolean } | null {
  const length = longestRun(stacks)
  return completed < 8 && length >= 9 ? { index: completed, panic: length >= 12 } : null
}
