import { useState } from 'react'
import spiderIcon from './assets/spider.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <img src={spiderIcon} className="logo" alt="A round purple spider sitting on its web" />
      </div>
      <h1>Spider Solitaire!</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </>
  )
}

export default App
