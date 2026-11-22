export interface ButterflyPair { cards: [number, number]; start: number }

/** Six pairs per home; the eight remaining Aces pair across adjacent homes. */
export const butterflyPairs: ButterflyPair[] = [
  ...Array.from({ length: 48 }, (_, pair): ButterflyPair => {
    const home = pair % 8, layer = Math.floor(pair / 8)
    return { cards: [layer * 16 + home, layer * 16 + 8 + home], start: layer * .65 + home * .08 }
  }),
  ...Array.from({ length: 4 }, (_, pair): ButterflyPair => ({ cards: [96 + pair * 2, 97 + pair * 2], start: 4.7 + pair * .18 })),
]
export const PAINT_INTERVAL = .13
export const PAINT_FLIGHT = 3.2
export const PAINT_DURATION = 103 * PAINT_INTERVAL + PAINT_FLIGHT
