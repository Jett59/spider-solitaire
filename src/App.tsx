import { lazy, Suspense, useState } from 'react'
import './App.css'
import Board from './Board'
import { useGameState } from './gameContext'

const AnimationReview = lazy(() => import('./animation/AnimationReview'))

const SpiderPreview = lazy(() => import('./spider/SpiderPreview'))

function App() {
  const [review, setReview] = useState(false)
  const { start, started, end } = useGameState()

  if (review) return <Suspense fallback={<p>Loading animations…</p>}><AnimationReview onClose={() => setReview(false)} /></Suspense>

  if (started) {
    return <main className="game-screen">
      <header className="game-header">
        <h1>Spider Solitaire</h1>
        <button onClick={() => setReview(true)}>Review animations</button>
        <button onClick={end}>Back to web</button>
      </header>
      <Board />
    </main>
  }

  return <>
    <Suspense fallback={<p className="scene-loading">Spinning a little silk…</p>}>
      <SpiderPreview />
    </Suspense>
    <nav className="start-options" aria-label="New game">
      <button onClick={() => setReview(true)}>Review animations</button>
      <span>New game</span>
      {[1, 2, 4].map(suits => <button key={suits} onClick={() => start(suits)}
        aria-label={`Start with ${suits} ${suits === 1 ? 'suit' : 'suits'}`}>
        {suits} {suits === 1 ? 'suit' : 'suits'}
      </button>)}
    </nav>
  </>
}

export default App
