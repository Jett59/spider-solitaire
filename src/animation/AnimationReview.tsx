import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { battleShow, spiderParty, type ThreeShow } from './threeShows'
import { finaleShow } from './finales'
import { BATTLE_DURATION, type Show, type Point } from './timeline'
import { playGameSound } from '../gameAudio'
import type { Card } from '../gameRules'
import './AnimationReview.css'

const SpiderPreview = lazy(() => import('../spider/SpiderPreview'))
const animations: { kind: Show | 'resident'; name: string }[] = [
  { kind: 'battle', name: 'Stack complete' }, { kind: 'spiders', name: 'Spiders win' },
  { kind: 'fireworks', name: 'Fireworks' }, { kind: 'butterflies', name: 'Butterflies' },
  { kind: 'painting', name: 'Painting' }, { kind: 'resident', name: 'Spider behaviours' },
]

function Playback({ kind }: { kind: Show }) {
  const canvas = useRef<HTMLDivElement>(null)
  const clock = useRef({ time: 0, playing: true, speed: 1, sound: false, seeking: false })
  const seek = useRef<(time: number) => void>(() => {})
  const [time, setTime] = useState(0), [duration, setDuration] = useState(1)
  const [playing, setPlaying] = useState(true), [speed, setSpeed] = useState(1), [sound, setSound] = useState(false)
  const [residents, setResidents] = useState(8), [revision, setRevision] = useState(0)
  useEffect(() => {
    const surface = document.createElement('canvas')
    canvas.current!.append(surface)
    const state = clock.current
    state.time = 0; state.playing = true
    const cues = new Set<string>(), stops: (() => void)[] = []
    const cue: Parameters<typeof finaleShow>[2] = (key, effect, length) => {
      if (cues.has(key)) return
      cues.add(key)
      if (state.sound && !state.seeking) stops.push(playGameSound(effect, length))
    }
    const width = innerWidth, height = innerHeight
    const cardWidth = Math.min(85, width / 11)
    const homes: Point[] = Array.from({ length: 8 }, (_, i) => ({
      x: width * (.1 + i * .1) - cardWidth / 2, y: height * .72,
      width: cardWidth, height: cardWidth * 1.4, card: 'sK',
    }))
    const cards = ['1','2','3','4','5','6','7','8','9','10','J','Q','K'].map(rank => `s${rank}` as Card)
    const show: ThreeShow = kind === 'battle' ? battleShow(surface, {
      slot: 3, cards, home: homes[3], gather: { x: width * .5, y: height * .32 },
      origins: cards.map((card, i) => ({ x: width * .5 - cardWidth / 2, y: height * .22 + (12 - i) * 10, width: cardWidth, height: cardWidth * 1.4, card })),
    }, cue) : kind === 'spiders' ? spiderParty(surface, Array.from({ length: residents }, (_, i) => i), homes, cue)
      : finaleShow(surface, kind, cue, homes)
    const end = show.duration ?? BATTLE_DURATION
    setDuration(end); setTime(0); setPlaying(true)
    const stopSounds = () => { stops.splice(0).forEach(stop => stop()) }
    seek.current = target => {
      stopSounds(); state.time = target; state.seeking = true
      show.frame(target); state.seeking = false; setTime(target)
      if (target === 0) cues.clear()
    }
    let previous = performance.now(), frame = 0, reported = 0
    function tick(now: number) {
      const delta = Math.max(0, Math.min(.05, (now - previous) / 1000)); previous = now
      if (state.playing && !document.hidden) {
        state.time = Math.min(end, state.time + delta * state.speed)
        show.frame(state.time)
        if (now - reported > 80) { setTime(state.time); reported = now }
        if (state.time >= end) { state.playing = false; setPlaying(false); setTime(end) }
      } else stopSounds()
      if (!state.sound) stopSounds()
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const resize = () => setRevision(value => value + 1)
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(frame); stopSounds(); show.dispose(); surface.remove(); window.removeEventListener('resize', resize) }
  }, [kind, residents, revision])
  return <>
    <div key={`${kind}-${residents}-${revision}`} ref={canvas} className="animation-review__canvas" aria-label={`${animations.find(item => item.kind === kind)?.name} preview`} />
    <div className="animation-review__playback">
      <label className="animation-review__timeline">Timeline <input type="range" min="0" max={duration} step=".05" value={time}
        aria-valuetext={`${time.toFixed(1)} of ${duration.toFixed(1)} seconds`} onChange={event => {
          clock.current.playing = false; setPlaying(false); seek.current(Number(event.target.value))
        }} /><output>{time.toFixed(1)} / {duration.toFixed(1)} s</output></label>
      <div className="animation-review__buttons">
        <button onClick={() => { if (time >= duration) seek.current(0); clock.current.playing = !playing; setPlaying(!playing) }}>{playing ? 'Pause' : 'Play'}</button>
        <button onClick={() => { seek.current(0); clock.current.playing = true; setPlaying(true) }}>Replay</button>
        <label>Speed <select value={speed} onChange={event => { const value = Number(event.target.value); clock.current.speed = value; setSpeed(value) }}>
          {[.25,.5,1,2,4,8].map(value => <option key={value} value={value}>{value}×</option>)}
        </select></label>
        <button aria-pressed={sound} onClick={() => { clock.current.sound = !sound; setSound(!sound) }}>Sound {sound ? 'on' : 'off'}</button>
        {kind === 'spiders' && <label>Spiders <select value={residents} onChange={event => setResidents(Number(event.target.value))}>
          {Array.from({length:8}, (_,i) => <option key={i} value={i+1}>{i+1}</option>)}
        </select></label>}
        <button onClick={() => setRevision(value => value + 1)}>New variation</button>
      </div>
    </div>
  </>
}

export default function AnimationReview({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<Show | 'resident'>('spiders')
  return <section className="animation-review" aria-label="Animation review">
    <header className="animation-review__header"><h1>Animation review</h1><button onClick={onClose}>Back to game</button>
      <nav aria-label="Animations">{animations.map(item => <button key={item.kind} aria-pressed={kind === item.kind} onClick={() => setKind(item.kind)}>{item.name}</button>)}</nav>
    </header>
    {kind === 'resident' ? <Suspense fallback={<p>Loading spider…</p>}><SpiderPreview /></Suspense> : <Playback key={kind} kind={kind} />}
  </section>
}
