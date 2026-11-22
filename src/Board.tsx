import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useGameState } from './gameContext'
import { cardName, selectionProblem } from './gameRules'
import { playGameSound } from './gameAudio'
import Stack from './Stack'
import CompletedRuns from './CompletedRuns'
import './GameTable.css'

export default function Board() {
  const { stacks, completeRuns, deckSize, move, deal } = useGameState()
  const [selection, setSelection] = useState<{ column: number, depth: number } | null>(null)
  const [feedback, setFeedback] = useState({ text: 'Choose a face-up card to move.', error: false, id: 0 })
  const [sound, setSound] = useState(true)
  const [shortcuts, setShortcuts] = useState(true)
  const board = useRef<HTMLElement>(null)
  const dealButton = useRef<HTMLButtonElement>(null)
  const completedCount = useRef(completeRuns.length)
  useEffect(() => { board.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    if (completeRuns.length > completedCount.current && sound) playGameSound('hiss')
    completedCount.current = completeRuns.length
  }, [completeRuns.length, sound])
  function report(text: string, error = false) {
    setFeedback(previous => ({ text, error, id: previous.id + 1 }))
    if (error && sound) playGameSound('failure')
  }
  function focusColumn(column: number) {
    requestAnimationFrame(() => {
      const buttons = board.current?.querySelectorAll<HTMLButtonElement>(`button[data-column="${column}"]`)
      buttons?.[buttons.length - 1]?.focus()
    })
  }
  function cancel() {
    if (selection) focusColumn(selection.column)
    setSelection(null)
    report('Move cancelled. Choose a face-up card.')
  }
  function choose(column: number, depth: number) {
    if (selection && selection.column !== column) {
      if (depth > 1) { report('Choose the top card of the destination column.', true); return }
      const problem = move(selection.column, selection.depth, column)
      if (problem) { report(problem, true); return }
      setSelection(null)
      report(`Moved ${selection.depth} ${selection.depth === 1 ? 'card' : 'cards'} to column ${column + 1}.`)
      focusColumn(column)
      return
    }
    if (selection?.column === column && selection.depth === depth) { cancel(); return }
    const problem = selectionProblem(stacks, column, depth)
    if (problem) { report(problem, true); return }
    setSelection({ column, depth })
    report(`${cardName(stacks[column][depth - 1])}${depth > 1 ? ` and ${depth - 1} ${depth === 2 ? 'card' : 'cards'}` : ''} selected. Choose another column’s top card or an empty column.`)
  }
  function dealRow() {
    const problem = deal()
    if (problem) { report(problem, true); return }
    setSelection(null)
    report('Dealt one card to each column.')
  }
  function keyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return
    const target = event.target as HTMLElement
    if (event.key === 'Escape' && selection) { event.preventDefault(); cancel(); return }
    if (shortcuts && event.key.toLowerCase() === 'd') { event.preventDefault(); dealButton.current?.click(); return }
    if (shortcuts && /^[0-9]$/.test(event.key)) {
      event.preventDefault()
      const column = (Number(event.key) + 9) % 10
      focusColumn(column)
      choose(column, stacks[column].length ? 1 : 0)
      return
    }
    if (!target.matches('button[data-column]')) return
    const column = Number(target.dataset.column)
    const depth = Number(target.dataset.depth)
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); focusColumn((column + (event.key === 'ArrowRight' ? 1 : 9)) % 10)
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      board.current?.querySelector<HTMLButtonElement>(`button[data-column="${column}"][data-depth="${depth + (event.key === 'ArrowUp' ? 1 : -1)}"]`)?.focus()
    }
  }
  return <section className="game-board" ref={board} tabIndex={-1} onKeyDown={keyDown} aria-labelledby="tableau-heading" aria-describedby="game-instructions">
    <div className="game-board__rail"><h2 id="tableau-heading">Tableau</h2><span className="game-board__rule" aria-hidden="true" /><span aria-hidden="true">10 columns</span></div>
    <div className="game-controls">
      <button ref={dealButton} onClick={dealRow} aria-keyshortcuts={shortcuts ? 'D' : undefined} aria-disabled={deckSize === 0}>Deal{shortcuts ? ' (D)' : ''} · {deckSize / 10} left</button>
      <button onClick={cancel} disabled={!selection} aria-keyshortcuts="Escape">Cancel move (Esc)</button>
      <button onClick={() => setSound(!sound)} aria-pressed={sound}>Sound {sound ? 'on' : 'off'}</button>
      <button onClick={() => setShortcuts(!shortcuts)} aria-pressed={shortcuts}>Shortcuts {shortcuts ? 'on' : 'off'}</button>
    </div>
    <p id="game-instructions" className="game-instructions">Choose a card, then another column’s top card. Move groups in descending order of the same suit. Tab or arrows to navigate; Enter or Space to choose.{shortcuts && ' 1–9 and 0 choose column tops; D deals.'} Complete a King-to-Ace run to chase away a spider.</p>
    <div className={`game-feedback ${feedback.error ? 'game-feedback--error' : ''}`}>
      <div role="alert" aria-atomic="true">{feedback.error && <span key={feedback.id}>⚠ {feedback.text}</span>}</div>
      <div role="status" aria-atomic="true">{!feedback.error && <span key={feedback.id}>{feedback.text}</span>}</div>
    </div>
    <p className={completeRuns.length === 8 ? 'game-victory' : 'sr-only'} role="status" aria-atomic="true">
      {completeRuns.length === 8 ? 'You won! All eight stacks complete. Every spider has fled.' : completeRuns.length > 0 ? `${completeRuns.length} of 8 stacks complete. A spider hisses and runs away!` : ''}
    </p>
    <div className="game-board__scroll"><ol className="game-board__felt" aria-label="Tableau columns">
      {stacks.map((stack, column) => <Stack key={column} stack={stack} column={column} moving={!!selection}
        selectedDepth={selection?.column === column ? selection.depth : 0} onChoose={choose} />)}
    </ol></div>
    <CompletedRuns runs={completeRuns} stacks={stacks} />
  </section>
}
