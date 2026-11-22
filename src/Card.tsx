import { cardName, type Card } from './gameRules'
interface Props {
  card: Card
  label?: string
  selected?: boolean
  onClick?: () => void
  column?: number
  depth?: number
}
export default function CardDisplay({ card, label, selected, onClick, column, depth }: Props) {
  if (card === '?') return <div className="playing-card playing-card--back" role="img" aria-label="Face-down card">
    <div className="playing-card__back-pattern" aria-hidden="true" />
  </div>
  const rank = card.slice(1) === '1' ? 'A' : card.slice(1)
  const suit = { h: '♥', d: '♦', c: '♣', s: '♠' }[card[0]]
  const content = <>
    <span className="playing-card__corner" aria-hidden="true"><span className="playing-card__rank">{rank}</span><span className="playing-card__suit">{suit}</span></span>
    <span className="playing-card__pip" aria-hidden="true">{suit}</span>
    <span className="playing-card__corner playing-card__corner--bottom" aria-hidden="true"><span className="playing-card__rank">{rank}</span><span className="playing-card__suit">{suit}</span></span>
  </>
  const className = `playing-card ${'hd'.includes(card[0]) ? 'playing-card--red' : 'playing-card--black'}`
  return onClick ? <button type="button" className={className} aria-label={label ?? cardName(card)} aria-pressed={selected}
    data-column={column} data-depth={depth} data-card={card} onClick={onClick}>{content}</button>
    : <div className={className} data-card={card} role="img" aria-label={cardName(card)}>{content}</div>
}
