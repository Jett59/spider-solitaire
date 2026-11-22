import { lazy, Suspense } from 'react'
import './App.css'
import Board from './Board'
import { useGameState } from './GameState'

const SpiderPreview = lazy(() => import('./spider/SpiderPreview'))

function App() {
  const { start, started, end } = useGameState()

  if (started) {
    return <main className="game-screen">
      <header className="game-header">
        <h1>Spider Solitaire</h1>
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
      <span>New game</span>
      {[1, 2, 4].map(suits => <button key={suits} onClick={() => start(suits)}
        aria-label={`Start with ${suits} ${suits === 1 ? 'suit' : 'suits'}`}>
        {suits} {suits === 1 ? 'suit' : 'suits'}
      </button>)}
    </nav>
  </>
}

export default App
