import type { Card } from '../gameRules'
export function cardArtwork(card: Card, bitten = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 160; canvas.height = 224
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fffaf0'
  ctx.beginPath(); ctx.roundRect(1, 1, 158, 222, 12); ctx.fill()
  ctx.strokeStyle = '#baa8c8'; ctx.lineWidth = 2; ctx.stroke()
  const suit = { s: '♠', h: '♥', c: '♣', d: '♦' }[card[0]] ?? '♠'
  const rank = card.slice(1) === '1' ? 'A' : card.slice(1)
  ctx.fillStyle = 'hd'.includes(card[0]) ? '#ad243b' : '#252039'
  ctx.font = 'bold 28px Georgia'; ctx.fillText(rank + suit, 10, 34)
  ctx.save(); ctx.translate(150, 214); ctx.rotate(Math.PI); ctx.fillText(rank + suit, 0, 24); ctx.restore()
  ctx.font = '80px Georgia'; ctx.textAlign = 'center'; ctx.fillText(suit, 80, 140)
  if (bitten) {
    ctx.globalCompositeOperation = 'destination-out'
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(50 + i * 18, 3, 14, 0, Math.PI * 2); ctx.fill() }
  }
  return canvas
}
