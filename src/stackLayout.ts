/** Homes yield their space before cards shrink; exposed strips always scale with cards. */
export function fitTable(availableHeight: number, cardHeight: number, cardCount: number, homesHeight: number) {
  const spacing = cardHeight / 1.42 * 0.34
  const stackHeight = cardHeight + Math.max(0, cardCount - 1) * spacing
  // Extremely long columns remain scrollable rather than becoming illegible.
  const scale = Math.max(0.6, Math.min(1, Math.max(0, availableHeight) / stackHeight))
  const visibleHomes = Math.max(0, Math.min(homesHeight, availableHeight - stackHeight * scale))
  // Leave room to play, but do not stretch empty felt to fill a tall monitor.
  const comfortableTableHeight = Math.max(cardHeight * 4, stackHeight + cardHeight * 0.4)
  const height = Math.min(Math.max(0, availableHeight), comfortableTableHeight + homesHeight)
  return { scale, hiddenHomes: homesHeight - visibleHomes, height }
}
