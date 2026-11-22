import type { Card } from "./GameState";
import CardView from "./Card";

export default function StackView({ stack, columnNumber }: { stack: Card[], columnNumber: number }) {
    const reversedStack = [...stack].reverse();
    const headingId = `column-${columnNumber}-heading`;
    const cardCount = stack.length === 1 ? "1 card" : `${stack.length} cards`;
    const heading = stack.length === 0
        ? `Column ${columnNumber}, empty`
        : `Column ${columnNumber}, ${cardCount}`;
    
    return <li className="card-stack" aria-labelledby={headingId}>
        <h3 className="visually-hidden" id={headingId}>{heading}</h3>
        {reversedStack.length === 0
            ? <div className="card-stack__empty" aria-hidden="true" />
            : <ol
                className="card-stack__cards"
                aria-label={`Cards in column ${columnNumber}, ordered from bottom to top`}
            >
                {reversedStack.map((card, index) => (
                    <li className="card-stack__card" key={index}>
                        <CardView card={card} />
                    </li>
                ))}
            </ol>
        }
    </li>
}
