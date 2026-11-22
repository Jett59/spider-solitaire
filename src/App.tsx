import spiderIcon from './assets/spider.svg'
import './App.css'
import Board from './Board'
import { useGameState } from './GameState'

function App() {
  const { start, started } = useGameState();

  return (
    <div>
      <div>
        <img src={spiderIcon} className="logo" alt="A round purple spider sitting on its web" />
      </div>
      <h1>Spider Solitaire!</h1>
      <div>
        <button onClick={() => start(1)} disabled={started}>Start with 1 suit</button>
        <button onClick={() => start(2)} disabled={started}>Start with 2 suits</button>
        <button onClick={() => start(4)} disabled={started}>Start with 4 suits</button>
      </div>
      {started && <Board />}
    </div>
  )
}

export default App
