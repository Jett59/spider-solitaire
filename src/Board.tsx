import { lazy, Suspense, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useGameState } from './gameContext'
import { cardName, selectionProblem } from './gameRules'
import { playGameSound } from './gameAudio'
import { SilkTitle } from './spider/SilkTitle'
import { stackSpacing } from './stackLayout'
import Stack from './Stack'
import CompletedRuns from './CompletedRuns'
import './GameTable.css'
import './animation/GameShow.css'
import { useGameShows } from './animation/useGameShows'
const GameShow = lazy(() => import('./animation/GameShow'))

export default function Board({ onReview }: { onReview?: () => void }) {
  const game = useGameState()
  const { stacks, completeRuns, deckSize, move, deal, canUndo, undo, end } = game
  const shows = useGameShows(game)
  const [selection, setSelection] = useState<{ column: number, depth: number } | null>(null)
  const [feedback, setFeedback] = useState({ text: 'Choose a face-up card to move.', error: false, id: 0 })
  const [sound, setSound] = useState(true)
  const [shortcuts, setShortcuts] = useState(true)
  const board = useRef<HTMLElement>(null)
  const dealButton = useRef<HTMLButtonElement>(null)
  useEffect(() => { board.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    const element = board.current!
    const area = element.querySelector<HTMLElement>('.game-board__scroll')!
    const fit = () => {
      const card = element.querySelector<HTMLElement>('.card-stack .playing-card, .card-stack__empty')
      if (!card) return
      const height = card.getBoundingClientRect().height
      const rail = element.querySelector<HTMLElement>('.game-board__rail')!
      const homes = element.querySelector<HTMLElement>('.completed-runs')!
      const available = element.parentElement!.clientHeight - rail.offsetHeight - homes.offsetHeight - 16
      element.querySelectorAll<HTMLElement>('.card-stack').forEach((column, index) => {
        const cards = stacks[index]
        const down = cards.filter(card => card === '?').length
        const spacing = stackSpacing(available, height, cards.length - down, down)
        column.style.setProperty('--stack-overlap', `${spacing.face}px`)
        column.style.setProperty('--back-overlap', `${spacing.back}px`)
      })
    }
    const observer = new ResizeObserver(fit)
    observer.observe(area)
    observer.observe(element.parentElement!)
    observer.observe(element.querySelector('.completed-runs')!)
    fit()
    return () => observer.disconnect()
  }, [stacks])
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
    if (shows.active || shows.outcome) return
    if (selection && selection.column !== column) {
      if (depth > 1) { report('Choose the top card of the destination column.', true); return }
      shows.capture([column, selection.column])
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
    if (shows.active || shows.outcome) return
    shows.capture()
    const problem = deal()
    if (problem) { report(problem, true); return }
    setSelection(null)
    report('Dealt one card to each column.')
  }
  function undoLastTurn() {
    if (!canUndo) return
    shows.cancel()
    undo()
    setSelection(null)
    report('Last action undone. Cards and completed stacks restored.')
    requestAnimationFrame(() => board.current?.querySelector<HTMLButtonElement>('[aria-label="Undo last action"]')?.focus())
  }
  function keyDown(event: KeyboardEvent<HTMLElement>) {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (!event.repeat) undoLastTurn()
      return
    }
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
  function finishShow() {
    shows.finish()
    requestAnimationFrame(() => board.current?.focus({ preventScroll: true }))
  }
  return <section className="game-board" ref={board} tabIndex={-1} onKeyDown={keyDown} aria-labelledby="tableau-heading" aria-describedby="game-instructions">
    <div className="game-board__rail">
      <SilkTitle compact id="tableau-heading" />
      <span className="game-board__rule" aria-hidden="true" />
      <div className="game-controls" role="group" aria-label="Game controls">
        <button ref={dealButton} onClick={dealRow} aria-label="Deal cards" aria-describedby="deal-description"
          title={`Deal cards${shortcuts ? ' (D)' : ''} · ${deckSize / 10} deals left`}
          aria-keyshortcuts={shortcuts ? 'D' : undefined} aria-disabled={deckSize === 0}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5H3v16h13v-2" /><rect x="7" y="2" width="14" height="15" rx="2" /><path d="M14 6v7m-3-3 3 3 3-3" /></svg>
        </button>
        <button onClick={undoLastTurn} aria-disabled={!canUndo} aria-label="Undo last action" aria-describedby="undo-description"
          title="Undo last action (Ctrl/Cmd+Z)" aria-keyshortcuts="Control+Z Meta+Z">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12" transform="translate(0 -2)" /></svg>
        </button>
        <button onClick={cancel} disabled={!selection} aria-label="Cancel move" aria-describedby="cancel-description"
          title="Cancel move (Esc)" aria-keyshortcuts="Escape">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" /></svg>
        </button>
        <button onClick={() => setSound(!sound)} aria-label="Sound effects" aria-describedby="sound-description"
          title={`Sound ${sound ? 'on' : 'off'}`} aria-pressed={sound}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4 6 8H2v8h4l5 4Z" />{sound ? <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /> : <path d="m16 9 6 6m0-6-6 6" />}</svg>
        </button>
        <button onClick={() => setShortcuts(!shortcuts)} aria-label="Keyboard shortcuts" aria-describedby="shortcuts-description"
          title={`Keyboard shortcuts ${shortcuts ? 'on' : 'off'}`} aria-pressed={shortcuts}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 15h10" />{!shortcuts && <path d="m3 3 18 18" />}</svg>
        </button>
        {onReview && <button onClick={onReview} aria-label="Review animations" title="Review animations">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m10 8 6 4-6 4Z" /></svg>
        </button>}
        <button onClick={end} aria-label="Back to web" title="Back to web">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7" /></svg>
        </button>
      </div>
    </div>
    <div className="sr-only">
      <span id="deal-description">Deal one card to each column. {deckSize / 10} deals remaining. Fill empty columns before dealing.{shortcuts && ' Shortcut: D.'}</span>
      <span id="undo-description">Undo the most recent move or deal, including revealed cards and completed stacks. Shortcut: Control+Z or Command+Z. {canUndo ? 'Undo is available.' : 'Nothing to undo.'}</span>
      <span id="cancel-description">Cancel the selected move. Shortcut: Escape.</span>
      <span id="sound-description">Turn failure sounds and spider hisses on or off. Sound is {sound ? 'on' : 'off'}.</span>
      <span id="shortcuts-description">Turn letter and number shortcuts on or off. Shortcuts are {shortcuts ? 'on' : 'off'}. D deals; 1–9 and 0 choose column tops. Tab, arrows, Enter, Space and Escape remain available.</span>
    </div>
    <p id="game-instructions" className="sr-only">Choose a card, then another column’s top card. Move groups in descending order of the same suit. Tab or arrows to navigate; Enter or Space to choose.{shortcuts && ' 1–9 and 0 choose column tops; D deals.'} Complete a King-to-Ace run to chase away a spider.</p>
    <div className={feedback.error ? 'game-feedback game-feedback--error' : 'sr-only'}>
      <div role="alert" aria-atomic="true">{feedback.error && <span key={feedback.id}>⚠ {feedback.text}</span>}</div>
      <div role="status" aria-atomic="true">{!feedback.error && <span key={feedback.id}>{feedback.text}</span>}</div>
    </div>
    {shows.outcome && !shows.active && <div className="game-outcome" role="status">
      <p>{shows.outcome === 'won' ? 'You won! All eight spiders have fled.' : 'The spiders won! No solution remains for this position.'}</p>
      {canUndo && <button onClick={undoLastTurn}>Undo last action</button>}
      <button onClick={end}>New game</button>
    </div>}
    <p className="sr-only" role="status" aria-atomic="true">
      {completeRuns.length === 8 ? 'You won! All eight stacks complete. Every spider has fled.' : completeRuns.length > 0 ? `${completeRuns.length} of 8 stacks complete.` : ''}
    </p>
    <div className="game-board__scroll"><ol className="game-board__felt" aria-label="Tableau columns">
      {stacks.map((stack, column) => <Stack key={column} stack={stack} column={column} moving={!!selection}
        selectedDepth={selection?.column === column ? selection.depth : 0} onChoose={choose} />)}
    </ol></div>
    <CompletedRuns cardsGone={shows.cardsGone} runs={shows.homeRuns} stacks={stacks}
      escaped={shows.outcome === 'lost' && shows.active?.kind !== 'battle'}
      hiddenResidents={shows.active?.kind === 'battle' ? [shows.active.battle!.slot] : shows.outcome === 'lost' ? shows.remaining : []} />
    {shows.active && <Suspense fallback={<button onClick={finishShow}>Skip animation</button>}>
      <GameShow key={shows.active.id} request={shows.active} sound={sound} onDone={finishShow} onUndo={undoLastTurn} canUndo={canUndo} />
    </Suspense>}
  </section>
}
