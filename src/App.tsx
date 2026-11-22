import { useState } from 'react'
import spiderIcon from './assets/spider.svg'
import './App.css'
import Board from './Board'

function App() {
  return (
    <>
      <div>
        <img src={spiderIcon} className="logo" alt="A round purple spider sitting on its web" />
      </div>
      <h1>Spider Solitaire!</h1>
      <Board />
    </>
  )
}

export default App
