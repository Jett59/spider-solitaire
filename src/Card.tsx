import type { Card } from "./GameState";

export default function CardDisplay({card}: {card: Card}) {
    if (card === "?") {
        return <div className="playing-card playing-card--back" aria-label="Face-down card">
            <div className="playing-card__back-pattern" aria-hidden="true" />
        </div>
    }

    const rank = card.slice(1);
    const isRed = card[0] === "h" || card[0] === "d";
    const suitUnicode = {
        "h": "♥",
        "d": "♦",
        "c": "♣",
        "s": "♠"
    }[card[0]];

    return <div
        className={`playing-card ${isRed ? "playing-card--red" : "playing-card--black"}`}
        aria-label={`${rank} of ${suitUnicode}`}
    >
        <div className="playing-card__corner">
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
