import { cardName, type Card } from './gameRules'
import CardView from './Card'
export default function StackView({ stack, column, selectedDepth, moving, onChoose }: {
  stack: Card[], column: number, selectedDepth: number, moving: boolean, onChoose: (column: number, depth: number) => void
}) {
  return <li className="card-stack" aria-labelledby={`column-${column + 1}-heading`}>
    <h3 className="visually-hidden" id={`column-${column + 1}-heading`}>Column {column + 1}, {stack.length === 0 ? 'empty' : `${stack.length} ${stack.length === 1 ? 'card' : 'cards'}`}</h3>
    {stack.length === 0 && <button className="card-stack__empty" data-column={column} data-depth={0}
      aria-label={`Empty column ${column + 1}${moving ? ', move here' : ''}`} onClick={() => onChoose(column, 0)}>Empty</button>}
    {stack.length > 0 && <ol className="card-stack__cards" aria-label={`Cards in column ${column + 1}, ordered from bottom to top`}>{[...stack].reverse().map((card, index) => {
      const depth = stack.length - index
      return <li className={`card-stack__card ${card === '?' ? 'card-stack__card--back' : ''} ${depth <= selectedDepth ? 'card-stack__card--selected' : ''}`} key={depth}>
        <CardView card={card} column={column} depth={depth} selected={depth <= selectedDepth}
          label={`${cardName(card)}, column ${column + 1}, ${depth === 1 ? 'top card' : `${depth} cards to top`}${moving && depth === 1 ? ', move here' : ''}`}
          onClick={() => onChoose(column, depth)} />
      </li>
    })}</ol>}
  </li>
}
