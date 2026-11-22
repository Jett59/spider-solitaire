import type { Card } from "./GameState";

export default function CardDisplay({card}: {card: Card}) {
    // TODO: add proper display
    return <div className="card">{card}</div>;
}