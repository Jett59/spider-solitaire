import { useGameState } from "./GameState"
import Stack from "./Stack";
import "./GameTable.css";

export default function Board() {
    const { stacks } = useGameState();

    return <div className="game-board">
        <div className="game-board__rail" aria-hidden="true">
            <span>Tableau</span>
            <span className="game-board__rule" />
            <span>10 columns</span>
        </div>
        <div className="game-board__scroll">
            <div className="game-board__felt">
                {stacks.map((stack, index) => (
                    <Stack key={index} stack={stack} columnNumber={index + 1} />
                ))}
            </div>
        </div>
    </div>
}
