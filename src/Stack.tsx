import type { Card } from "./GameState";
import CardView from "./Card";

export default function StackView({ stack, columnNumber }: { stack: Card[], columnNumber: number }) {
    const reversedStack = [...stack].reverse();
    
    return <div className="card-stack" aria-label={`Column ${columnNumber}, ${stack.length} cards`}>
        {reversedStack.length === 0 && <div className="card-stack__empty" aria-label="Empty column" />}
        {reversedStack.map((card, index) => (
            <div className="card-stack__card" key={index}>
                <CardView card={card} />
            </div>
        ))}
    </div>
}
