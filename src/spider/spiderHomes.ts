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


export interface Location { x: number; y: number }

/** All equally near occupied homes, allowing a subpixel tolerance for layout rounding. */
export function nearestHomes(point: Location, homes: Location[], occupied: number[]): number[] {
  const distances = occupied.map(index => ({ index, distance: Math.hypot(homes[index].x - point.x, homes[index].y - point.y) }))
  const nearest = Math.min(...distances.map(home => home.distance))
  return distances.filter(home => home.distance <= nearest + .5).map(home => home.index)
}

export function threatenedHomes(stacks: Card[][], columns: Location[], homes: Location[], occupied: number[]): { index: number; panic: boolean }[] {
  const threats = new Map<number, boolean>()
  stacks.forEach((stack, column) => {
    const length = longestRun([stack])
    if (length < 9 || !columns[column]) return
    for (const index of nearestHomes(columns[column], homes, occupied)) {
      threats.set(index, (threats.get(index) ?? false) || length >= 12)
    }
  })
  return Array.from(threats, ([index, panic]) => ({ index, panic }))
}
