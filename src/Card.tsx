import type { Card } from "./GameState";

export default function CardDisplay({card}: {card: Card}) {
    if (card === "?") {
        return <div className="playing-card playing-card--back" role="img" aria-label="Face-down card">
            <div className="playing-card__back-pattern" aria-hidden="true" />
        </div>
    }

    const rank = card.slice(1);
    const rankName = {
        "1": "Ace",
        "J": "Jack",
        "Q": "Queen",
        "K": "King",
    }[rank] ?? rank;
    const isRed = card[0] === "h" || card[0] === "d";
    const suitUnicode = {
        "h": "♥",
        "d": "♦",
        "c": "♣",
        "s": "♠"
    }[card[0]];
    const suitName = {
        "h": "hearts",
        "d": "diamonds",
        "c": "clubs",
        "s": "spades",
    }[card[0]];

    return <div
        className={`playing-card ${isRed ? "playing-card--red" : "playing-card--black"}`}
        role="img"
        aria-label={`${rankName} of ${suitName}`}
    >
        <div className="playing-card__corner" aria-hidden="true">
            <span className="playing-card__rank">{rank}</span>
            <span className="playing-card__suit">{suitUnicode}</span>
        </div>
        <div className="playing-card__pip" aria-hidden="true">{suitUnicode}</div>
        <div className="playing-card__corner playing-card__corner--bottom" aria-hidden="true">
            <span className="playing-card__rank">{rank}</span>
            <span className="playing-card__suit">{suitUnicode}</span>
        </div>
    </div>
}
