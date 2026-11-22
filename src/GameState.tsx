import { useState, useContext, createContext, type ReactNode } from "react";

// Card format is `[suit][rank]`, where suit is one of s, h, d, c and rank is 1-10, J, Q, K.
// The '?' card is used to represent a face-down card.
export type Card = `${'s' | 'h' | 'd' | 'c'}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'J' | 'Q' | 'K'}` | '?';

export function isCard(card: string): card is Card {
    if (card === '?') {
        return true;
    }
    const suit = card[0];
    const rank = card.slice(1);
    return ['s', 'h', 'd', 'c'].includes(suit) && ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].includes(rank);
}

export function nextHighestCard(card: Card): Card | null {
    if (card === '?') {
        return '?';
    }
    const suit = card[0];
    const rank = card.slice(1);
    switch (rank) {
        case '1':
            return `${suit}2` as Card;
        case '2':
            return `${suit}3` as Card;
        case '3':
            return `${suit}4` as Card;
        case '4':
            return `${suit}5` as Card;
        case '5':
            return `${suit}6` as Card;
        case '6':
            return `${suit}7` as Card;
        case '7':
            return `${suit}8` as Card;
        case '8':
            return `${suit}9` as Card;
        case '9':
            return `${suit}10` as Card;
        case '10':
            return `${suit}J` as Card;
        case 'J':
            return `${suit}Q` as Card;
        case 'Q':
            return `${suit}K` as Card;
        case 'K':
            return null;
        default:
            return null;
    }
}

// Returns whether `card1` has a higher rank than `card2`. If either card is '?', returns false.
export function isHigherRank(card1: Card, card2: Card): boolean {
    if (card1 === '?' || card2 === '?') {
        return false;
    }
    const rank1 = card1.slice(1);
    const rank2 = card2.slice(1);
    // If they are both numbers, compare them as numbers
    if (!isNaN(Number(rank1)) && !isNaN(Number(rank2))) {
        return Number(rank1) > Number(rank2);
    }
    // If one is a number and the other is a face card, the face card is higher
    if (!isNaN(Number(rank1)) && isNaN(Number(rank2))) {
        return false;
    }
    if (isNaN(Number(rank1)) && !isNaN(Number(rank2))) {
        return true;
    }
    // If they are both face cards, compare them as strings
    const faceCardOrder = ['J', 'Q', 'K'];
    return faceCardOrder.indexOf(rank1) > faceCardOrder.indexOf(rank2);
}

export interface GameStateContext {
    // Top-to-bottom stacks of cards, so the first element is the top card.
    stacks: Array<Array<Card>>;
    completeRuns: Array<Array<Card>>;
    deck: Array<Card>;
    canMove: (fromStack: number, depth: number, toStack: number) => boolean;
    move: (fromStack: number, depth: number, toStack: number) => boolean;
    deal: () => void;
    start: (suits: number) => boolean;
}

const GameStateContext = createContext<GameStateContext>({
    stacks: [],
    completeRuns: [],
    deck: [],
    canMove: () => false,
    move: () => false,
    deal: () => { },
    start: () => false
});

const INITIAL_STACK_SIZES: number[] = [6, 6, 6, 6, 5, 5, 5, 5, 5, 5];

export function GameStateProvider({ children }: { children: ReactNode }) {
    const [stacks, setStacks] = useState<Array<Array<Card>>>([]);
    const [completeRuns, setCompleteRuns] = useState<Array<Array<Card>>>([]);

    // This includes the cards from the actual deck, as well as cards which are hidden in the stacks.
    const [remainingCards, setRemainingCards] = useState<Array<Card>>([]);
    const deckSize = remainingCards.length -
        stacks.flat().filter(card => card === '?').length;

const draw: (deck?: Array<Card>, update?: (newDeck: Array<Card>) => void) => Card | null = (deck?: Array<Card>, update?: (newDeck: Array<Card>) => void) => {
        const actualDeck = deck ?? remainingCards;
        const actualUpdate = deck ? update : setRemainingCards;
        if (actualDeck.length === 0) {
            return null;
        }
        const card = actualDeck[0];
        actualUpdate?.(actualDeck.slice(1));
        return card;
};

    const canMove: (fromStack: number, depth: number, toStack: number) => boolean = (fromStack: number, depth: number, toStack: number) => {
        if (fromStack < 0 || fromStack >= stacks.length || toStack < 0 || toStack >= stacks.length) {
            return false;
        }
        const movingCards = stacks[fromStack].slice(0, depth);
        // They must be the same suit and in a run
        for (let i = 0; i < movingCards.length - 1; i++) {
            const card1 = movingCards[i];
            const card2 = movingCards[i + 1];
            if (card1 === '?' || card2 === '?') {
                return false;
            }
            if (card2 !== nextHighestCard(card1)) {
                return false;
            }
        }
        // The destination stack must be empty or the top card must have a higher rank than the bottom card of the moving cards
        // The top card should never be '?'
        if (stacks[toStack].length > 0) {
            const topCard = stacks[toStack][0];
            const bottomCard = movingCards[movingCards.length - 1];
            if (topCard === '?' || bottomCard === '?') {
                return false;
            }
            if (!isHigherRank(topCard, bottomCard)) {
                return false;
            }
        }
        return true;
    }

const move: (fromStack: number, depth: number, toStack: number) => boolean = (fromStack: number, depth: number, toStack: number) => {
    if (!canMove(fromStack, depth, toStack)) {
        return false;
    }
    const movingCards = stacks[fromStack].slice(0, depth);
    const newStacks = [...stacks];
    newStacks[fromStack] = newStacks[fromStack].slice(depth);
    newStacks[toStack] = [...movingCards, ...newStacks[toStack]];
// If the source stack has a hidden card, draw one from `remainingCards` and replace the '?'.
if (newStacks[fromStack].length > 0 && newStacks[fromStack][0] === '?') {
    newStacks[fromStack][0] = draw() ?? '?';
}
// If the destination stack has a complete run, move it to `completeRuns`.
if (newStacks[toStack].length >= 13) {
    const top13 = newStacks[toStack].slice(0, 13);
    let isCompleteRun = true;
    // The top cards should be an ace of some suit
    if (top13[0] === '?' || top13[0].slice(1) !== '1') {
        isCompleteRun = false;
    }
    // Then the next are just increasing rank of the same suit
    for (let i = 0; i < top13.length - 1; i++) {
        const card1 = top13[i];
        const card2 = top13[i + 1];
        if (card1 === '?' || card2 === '?') {
            isCompleteRun = false;
            break;
        }
        if (card2 !== nextHighestCard(card1)) {
            isCompleteRun = false;
            break;
        }
    }
    if (isCompleteRun) {
        setCompleteRuns([...completeRuns, top13]);
        newStacks[toStack] = newStacks[toStack].slice(13);
    }
}

    setStacks(newStacks);
    return true;
}

const deal: () => void = () => {
    for (let i = 0; i < stacks.length; i++) {
        if (remainingCards.length === 0) {
            break;
        }
        const card = draw();
        if (card) {
            setStacks(prevStacks => {
                const newStacks = [...prevStacks];
                newStacks[i] = [card, ...newStacks[i]];
                return newStacks;
            });
        }
    }
}

    const start: (suits: number) => boolean = (suits: number) => {
        // Suits must divide 4
        if (suits > 4 || suits < 1 || suits === 3) {
            return false;
        }

        // First initialize the deck
        const suitNames = ['s', 'h', 'd', 'c'].slice(0, suits);
        const repetitions = 8 / suits;
        let deck: Card[] = [];
        for (const suit of suitNames) {
            for (const rank of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K']) {
                for (let i = 0; i < repetitions; i++) {
                    deck.push(`${suit}${rank}` as Card);
                }
            }
        }
        // Shuffle the deck
        deck = deck.sort(() => Math.random() - 0.5);

        // Then set up the initial stacks
        let stacks: Array<Array<Card>> = [];
        for (const size of INITIAL_STACK_SIZES) {
            const topCard = draw(deck, newDeck => deck = newDeck);
            if (!topCard) {
                return false;
            }
            let stack = Array(size-1).fill('?' as Card);
            stacks.push([topCard, ...stack]);
        }
        
        setRemainingCards(deck);
        setStacks(stacks);
        return true;
    };

    return <GameStateContext.Provider value={{
        stacks,
        completeRuns,
        deck: Array(deckSize).fill('?' as Card),
        canMove,
        move,
        deal,
        start
    }}>
        {children}
    </GameStateContext.Provider>
}

export const useGameState: () => GameStateContext = () => useContext(GameStateContext);
