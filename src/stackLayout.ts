/** Preserve readable exposed ranks; exceptionally long columns scroll inside the table. */
export function stackSpacing(availableHeight: number, cardHeight: number, faceUp: number, faceDown: number) {
  const back = 8
  const gaps = Math.max(0, faceUp - 1)
  const face = gaps ? Math.max(22, Math.min(36, (availableHeight - cardHeight - faceDown * back) / gaps)) : 36
  return { face, back }
}
