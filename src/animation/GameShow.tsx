import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { playGameSound, type GameSound } from '../gameAudio'
import { battleShow, spiderParty } from './threeShows'
import { finaleShow } from './finales'
import { BATTLE_DURATION, type Battle, type Point, type Show } from './timeline'
import './GameShow.css'

export interface ShowRequest {
  id: number
  kind: Show
  battle?: Battle
  remaining?: number[]
  homes?: Point[]
}
interface Props { request: ShowRequest; sound: boolean; onDone: () => void; onUndo: () => void; canUndo: boolean }
class ShowBoundary extends Component<{ children: ReactNode; onDone: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <button className="show-skip" onClick={this.props.onDone}>Continue game</button> : this.props.children }
}
function ShowCanvas({ request, sound, onDone }: Pick<Props, 'request' | 'sound' | 'onDone'>) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const soundEnabled = useRef(sound)
  const stops = useRef<(() => void)[]>([])
  const done = useRef(onDone)
  useEffect(() => { soundEnabled.current = sound; if (!sound) stops.current.forEach(stop => stop()) }, [sound])
  useEffect(() => { done.current = onDone }, [onDone])
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    if (motion.matches) { const timer = setTimeout(() => done.current(), 150); return () => clearTimeout(timer) }
    let stopped = false, frameId = 0, time = 0, previous = performance.now()
    const cues = new Set<string>(), sounds: (() => void)[] = []
    const cue = (key: string, kind: GameSound, duration?: number) => {
      if (cues.has(key)) return
      cues.add(key)
      if (soundEnabled.current) sounds.push(playGameSound(kind, duration))
      stops.current = sounds
    }
    const finale = request.kind !== 'battle' && request.kind !== 'spiders'
    if (finale) {
      document.querySelectorAll('.completion-slot__run').forEach(pile => pile.getAnimations().forEach(animation => animation.finish()))
      document.querySelector('.completed-runs')?.scrollIntoView({ block: 'end', behavior: 'auto' })
    }
    const homes = Array.from(document.querySelectorAll('.completion-slot--filled .completion-slot__run .playing-card'), element => {
      const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, card: element.getAttribute('data-card') as import('../gameRules').Card }
    })
    let show: ReturnType<typeof battleShow>
    try {
      show = request.kind === 'battle' ? battleShow(canvas.current!, request.battle!, cue)
        : request.kind === 'spiders' ? spiderParty(canvas.current!, request.remaining!, request.homes!, cue)
        : finaleShow(canvas.current!, request.kind, cue, homes)
    } catch {
      const timer = setTimeout(() => done.current(), 0)
      return () => clearTimeout(timer)
    }
    const duration = request.kind === 'battle' ? BATTLE_DURATION : show.duration ?? 11
    function frame(now: number) {
      if (stopped) return
      const delta = Math.min((now - previous) / 1000, .05); previous = now
      if (!document.hidden) {
        time += delta
        try { show.frame(time) } catch { done.current(); return }
      }
      if (time >= duration && request.kind !== 'spiders') { done.current(); return }
      frameId = requestAnimationFrame(frame)
    }
    const stopForPreference = () => { if (motion.matches) done.current() }
    // A resize invalidates the captured screen-space targets; settle safely.
    const resize = () => done.current()
    motion.addEventListener('change', stopForPreference)
    window.addEventListener('resize', resize)
    frameId = requestAnimationFrame(frame)
    return () => { stopped = true; cancelAnimationFrame(frameId); motion.removeEventListener('change', stopForPreference); window.removeEventListener('resize', resize); sounds.forEach(stop => stop()); show.dispose() }
  }, [request])
  return <canvas ref={canvas} className="game-show__canvas" aria-hidden="true" />
}
export default function GameShow(props: Props) {
  const [muted, setMuted] = useState(false)
  const { request, onDone, onUndo, canUndo } = props
  const battle = request.kind === 'battle'
  const message = battle ? 'The completed stack gathers, rises and flings cards at the spider. It fights back, then hisses and flees.'
    : request.kind === 'spiders' ? 'The spiders won! No solution remains. The surviving spiders stream silk and work together to weave one great web.'
    : request.kind === 'butterflies' ? 'You won! Cards pair into butterflies and flutter away.'
    : request.kind === 'painting' ? 'You won! Bouncing cards paint the table.' : 'You won! Cards flick off the solved stacks, roll into little rockets and burst into fireworks.'
  return <div className={`game-show ${battle ? 'game-show--battle' : 'game-show--finale'}`} data-show={request.kind} role="dialog" aria-modal="true" aria-label={battle ? 'Completed stack animation' : request.kind === 'spiders' ? 'Spiders win' : 'You win'} aria-describedby="game-show-description"
    onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onDone() }
      if (event.key === 'Tab') {
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
        const first = buttons[0], last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }}>
    <ShowBoundary onDone={onDone}><ShowCanvas request={request} sound={props.sound && !muted} onDone={onDone} /></ShowBoundary>
    <p id="game-show-description" className={battle ? 'sr-only' : 'game-show__title'} role="status">{message}</p>
    <div className="game-show__controls">
      <button autoFocus onClick={onDone}>{battle ? 'Skip animation' : 'Finish animation'} (Esc)</button>
      {canUndo && <button onClick={onUndo}>Undo last action</button>}
      <button disabled={!props.sound} aria-label="Animation sound" aria-pressed={props.sound && !muted} onClick={() => setMuted(!muted)}>Sound {props.sound && !muted ? 'on' : 'off'}</button>
    </div>
  </div>
}
