import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import type { Card, Game } from '../gameRules'
import { stockSize } from '../gameRules'
import type { Solvability } from '../endgameSearch'
import { chooseFinale, type Battle, type Point } from './timeline'
import { nearestHomes } from '../spider/spiderHomes'
import { columnLocations, homeLocations } from '../spider/homeLayout'
import type { Location } from '../spider/spiderHomes'
import type { ShowRequest } from './GameShow'

const rect = (element: Element): Point => {
  const r = element.getBoundingClientRect()
  return { x: r.x, y: r.y, width: r.width, height: r.height }
}
function homeRects(): Point[] { return Array.from(document.querySelectorAll('[data-home-index]'), rect) }
const fallback = (): Point => ({ x: innerWidth / 2 - 35, y: innerHeight / 3, width: 70, height: 98 })

export function useGameShows(game: Game) {
  const { stacks, remainingCards, completeRuns } = game
  const [queue, setQueue] = useState<ShowRequest[]>([])
  const [cardsGone, setCardsGone] = useState(false)
  const [settled, setSettled] = useState(completeRuns.length)
  const [slots, setSlots] = useState(() => completeRuns.map((_, index) => index))
  const assigned = useRef(slots)
  const capturedColumns = useRef<Location[]>([])
  const capturedHomes = useRef<Location[]>([])
  const [outcome, setOutcome] = useState<'won' | 'lost' | null>(null)
  const lastCount = useRef(completeRuns.length)
  const serial = useRef(0)
  const snapshot = useRef<{ card: Card; position: Point }[]>([])
  const [finale] = useState(chooseFinale)
  const capture = useCallback((columns: number[] = []) => {
    capturedColumns.current = columnLocations()
    capturedHomes.current = homeLocations()
    const cards = Array.from(document.querySelectorAll<HTMLElement>('button[data-card]'))
    cards.sort((a, b) => {
      const priority = (el: HTMLElement) => { const i = columns.indexOf(Number(el.dataset.column)); return i < 0 ? 100 : i }
      return priority(a) - priority(b)
    })
    snapshot.current = cards.map(el => ({ card: el.dataset.card as Card, position: rect(el) }))
  }, [])
  useEffect(() => {
    const before = lastCount.current
    lastCount.current = completeRuns.length
    const frame = requestAnimationFrame(() => {
      setOutcome(completeRuns.length === 8 ? 'won' : null)
      if (completeRuns.length < before) {
        setQueue([]); setCardsGone(false); setSettled(completeRuns.length)
        assigned.current = assigned.current.slice(0, completeRuns.length)
        setSlots(assigned.current)
      } else if (completeRuns.length > before) {
        const origins = [...snapshot.current], homes = homeRects()
        const battles = completeRuns.slice(before).map((cards, index): ShowRequest => {
          const column = game.completeRunColumns?.[before + index] ?? -1
          const point = capturedColumns.current[column] ?? { x: innerWidth / 2, y: innerHeight / 2 }
          const available = Array.from({ length: 8 }, (_, i) => i).filter(i => !assigned.current.includes(i))
          const centers = capturedHomes.current.length ? capturedHomes.current : homes.map(home => ({ x: home.x + home.width / 2, y: home.y + home.height / 2 }))
          const slot = nearestHomes(point, centers, available)[0] ?? available[0]
          assigned.current = [...assigned.current, slot]
          const battle: Battle = { slot, cards, gather: point, home: homes[slot] ?? fallback(), origins: cards.map(card => {
            const found = origins.findIndex(origin => origin.card === card)
            return found < 0 ? fallback() : origins.splice(found, 1)[0].position
          }) }
          return { id: ++serial.current, kind: 'battle', battle }
        })
        setSlots(assigned.current)
        if (completeRuns.length === 8) battles.push({ id: ++serial.current, kind: finale })
        setQueue(current => [...current, ...battles])
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [completeRuns, finale, game.completeRunColumns])
  useEffect(() => {
    if (completeRuns.length === 8 || stockSize({ started: true, stacks, remainingCards, completeRuns }) !== 0) return
    const worker = new Worker(new URL('../endgame.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<Solvability>) => {
      if (event.data !== 'unsolvable') return
      setOutcome('lost')
      setQueue(current => [...current, { id: ++serial.current, kind: 'spiders', remaining: Array.from({ length: 8 }, (_, i) => i).filter(i => !assigned.current.includes(i)), homes: homeRects() }])
    }
    worker.postMessage({ started: true, stacks, remainingCards, completeRuns })
    return () => worker.terminate()
  }, [stacks, remainingCards, completeRuns])
  const finish = useCallback(() => {
    const active = queue[0]
    if (active?.kind === 'battle') setSettled(count => count + 1)
    if (active && ['fireworks', 'butterflies', 'painting'].includes(active.kind)) setCardsGone(true)
    setQueue(current => current.slice(1))
  }, [queue])
  const cancel = useCallback(() => { setQueue([]); setOutcome(null); setCardsGone(false) }, [])
  const homeRuns = useMemo(() => {
    const result: (Card[] | undefined)[] = Array(8).fill(undefined)
    completeRuns.slice(0, settled).forEach((run, index) => { result[slots[index]] = run })
    return result
  }, [completeRuns, settled, slots])
  const remaining = useMemo(() => Array.from({ length: 8 }, (_, i) => i).filter(i => !slots.includes(i)), [slots])
  return { active: queue[0], cardsGone, homeRuns, remaining, outcome, capture, finish, cancel }
}
