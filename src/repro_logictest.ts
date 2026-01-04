
// Mock types and functions for reproduction
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
    id: string;
    suit: Suit;
    rank: Rank;
    faceUp: boolean;
}

const getRankValue = (rank: Rank): number => {
    switch (rank) {
        case 'A': return 1;
        case 'J': return 11;
        case 'Q': return 12;
        case 'K': return 13;
        default: return parseInt(rank);
    }
};

const canMoveToFoundation = (card: Card, foundationPile: Card[]): boolean => {
    if (foundationPile.length === 0) {
        return card.rank === 'A';
    }
    const topCard = foundationPile[foundationPile.length - 1];
    return card.suit === topCard.suit && getRankValue(card.rank) === getRankValue(topCard.rank) + 1;
};

// Simulation State
interface GameState {
    tableau: Card[][];
    freeCells: (Card | null)[];
    foundations: { [key in Suit]: Card[] };
    moves: number;
    isWon: boolean;
}

const createCard = (rank: Rank, suit: Suit): Card => ({
    id: `${rank}-${suit}`,
    rank,
    suit,
    faceUp: true
});

// Mock Logic being tested
function autoStackLogic(state: GameState): GameState {
    if (state.isWon) return state;

    let newTableau = state.tableau.map(pile => [...pile]);
    let newFreeCells = [...state.freeCells];
    let newFoundations = { ...state.foundations };
    let newMoves = state.moves;

    const moveCard = (card: Card, fromPile: 'tableau' | 'freecell', fromIndex: number) => {
        const targetPile = newFoundations[card.suit];
        // console.log(`Attempting to move ${card.id} to foundation. Target pile length: ${targetPile.length}`);

        if (!canMoveToFoundation(card, targetPile)) return false;

        if (fromPile === 'tableau') {
            const sourcePile = newTableau[fromIndex];
            if (!sourcePile.length || sourcePile[sourcePile.length - 1].id !== card.id) return false;
            newTableau[fromIndex] = sourcePile.slice(0, -1);
        } else {
            if (newFreeCells[fromIndex]?.id !== card.id) return false;
            newFreeCells[fromIndex] = null;
        }

        // Logic under suspicion:
        newFoundations = {
            ...newFoundations,
            [card.suit]: [...targetPile, card]
        };
        newMoves += 1;
        console.log(`Moved ${card.id} to foundation.`);
        return true;
    };

    let moved = true;
    let iterations = 0;
    while (moved && iterations < 100) { // Safety break
        moved = false;
        iterations++;
        // console.log(`Iteration ${iterations}`);

        for (let i = 0; i < newFreeCells.length; i++) {
            const card = newFreeCells[i];
            if (card && moveCard(card, 'freecell', i)) moved = true;
        }

        for (let i = 0; i < newTableau.length; i++) {
            const pile = newTableau[i];
            if (!pile.length) continue;
            const card = pile[pile.length - 1];
            if (moveCard(card, 'tableau', i)) moved = true;
        }
    }

    return {
        ...state,
        tableau: newTableau,
        freeCells: newFreeCells,
        foundations: newFoundations,
        moves: newMoves
    };
}

// TEST CASE 1: Chain reaction
// Setup: Foundations have Aces. Tableau has 2s. 
// Expect: All 2s move to foundations.

const runTest = () => {
    const initialState: GameState = {
        tableau: [
            [createCard('2', 'hearts')],
            [createCard('2', 'diamonds')],
            [createCard('3', 'hearts')], // Blocked by nothing (at top)
        ],
        freeCells: [null, null, null, null],
        foundations: {
            hearts: [createCard('A', 'hearts')],
            diamonds: [createCard('A', 'diamonds')],
            clubs: [],
            spades: []
        },
        moves: 0,
        isWon: false
    };

    console.log("Initial Hearts Foundation:", initialState.foundations.hearts.map(c => c.id));

    // We expect 2-hearts to move, then 3-hearts to move.

    const resultingState = autoStackLogic(initialState);

    console.log("Resulting Hearts Foundation:", resultingState.foundations.hearts.map(c => c.id));
    console.log("Resulting Diamonds Foundation:", resultingState.foundations.diamonds.map(c => c.id));

    if (resultingState.foundations.hearts.length !== 3) {
        console.error("FAIL: Hearts foundation missing cards!");
    } else {
        console.log("PASS: Hearts foundation has correct count.");
    }
};

runTest();
