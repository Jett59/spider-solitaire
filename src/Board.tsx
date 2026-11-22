import { useGameState } from "./GameState"
import Stack from "./Stack";
import "./GameTable.css";

export default function Board() {
    const { stacks } = useGameState();

    return <section className="game-board" aria-labelledby="tableau-heading">
        <div className="game-board__rail">
            <h2 id="tableau-heading">Tableau</h2>
            <span className="game-board__rule" aria-hidden="true" />
            <span aria-hidden="true">10 columns</span>
        </div>
        <div className="game-board__scroll">
            <ol className="game-board__felt" aria-label="Tableau columns">
                {stacks.map((stack, index) => (
                    <Stack key={index} stack={stack} columnNumber={index + 1} />
                ))}
            </ol>
        </div>
    </section>
}
