import { lazy, Suspense, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import './App.css'
import Board from './Board'
import { useGameState } from './gameContext'

const AnimationReview = lazy(() => import('./animation/AnimationReview'))

const SpiderPreview = lazy(() => import('./spider/SpiderPreview'))

function App() {
  const [review, setReview] = useState(false)
  const [residentsReady, setResidentsReady] = useState(true)
  const { start, started } = useGameState()
  const entering = useRef(false)

  function enterGame(suits: number) {
    if (entering.current) return
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      start(suits)
      return
    }
    entering.current = true
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setResidentsReady(false)
        start(suits)
      })
    })
    // A hidden tab or interrupted snapshot may skip the animation; the game
    // still starts normally and must never leave navigation locked.
    void transition.ready.catch(() => {})
    void transition.finished.catch(() => {}).finally(() => {
      entering.current = false
      setResidentsReady(true)
    })
  }

  if (review) return <Suspense fallback={<p>Loading animations…</p>}><AnimationReview onClose={() => setReview(false)} /></Suspense>

  if (started) {
    return <main className="game-screen">
      <Board residentsReady={residentsReady} onReview={() => setReview(true)} />
    </main>
  }

  return <>
    <Suspense fallback={<p className="scene-loading">Spinning a little silk…</p>}>
      <SpiderPreview />
    </Suspense>
    <nav className="start-options" aria-label="New game">
      <button onClick={() => setReview(true)}>Review animations</button>
      <span>New game</span>
      {[1, 2, 4].map(suits => <button key={suits} onClick={() => enterGame(suits)}
        aria-label={`Start with ${suits} ${suits === 1 ? 'suit' : 'suits'}`}>
        {suits} {suits === 1 ? 'suit' : 'suits'}
      </button>)}
    </nav>
  </>
}

export default App
