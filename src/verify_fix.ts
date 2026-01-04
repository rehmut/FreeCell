
// Verification script for the Auto Finish Fix
// This script mirrors the logic in gameStore.ts to verify correctness under stress.

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

interface GameState {
    tableau: Card[][];
    freeCells: (Card | null)[];
    foundations: { [key in Suit]: Card[] };
    moves: number;
}

const createCard = (rank: Rank, suit: Suit): Card => ({
    id: `${rank}-${suit}`,
    rank,
    suit,
    faceUp: true
});

// The FIXED logic from gameStore.ts
function autoStackFixed(state: GameState): GameState {
    // Deep copy foundations (The Fixed Part)
    let newFoundations = {
        hearts: [...state.foundations.hearts],
        diamonds: [...state.foundations.diamonds],
        clubs: [...state.foundations.clubs],
        spades: [...state.foundations.spades]
    };

    let newTableau = state.tableau.map(pile => [...pile]);
    let newFreeCells = [...state.freeCells];
    let newMoves = state.moves;

    const countCards = () => {
        const tableauCount = newTableau.reduce((sum, pile) => sum + pile.length, 0);
        const freeCellCount = newFreeCells.filter(c => c !== null).length;
        const foundationCount = Object.values(newFoundations).reduce((sum, pile) => sum + pile.length, 0);
        return { total: tableauCount + freeCellCount + foundationCount };
    };

    const initialCount = countCards();
    console.log('Test Start Total:', initialCount.total);

    const moveCard = (card: Card, fromPile: 'tableau' | 'freecell', fromIndex: number) => {
        const targetPile = newFoundations[card.suit];
        if (!canMoveToFoundation(card, targetPile)) return false;

        if (fromPile === 'tableau') {
            const sourcePile = newTableau[fromIndex];
            if (!sourcePile.length || sourcePile[sourcePile.length - 1].id !== card.id) return false;
            newTableau[fromIndex] = sourcePile.slice(0, -1);
        } else {
            if (newFreeCells[fromIndex]?.id !== card.id) return false;
            newFreeCells[fromIndex] = null;
        }

        // The Fix: updating the deep copy
        newFoundations = {
            ...newFoundations,
            [card.suit]: [...targetPile, card]
        };
        newMoves += 1;
        return true;
    };

    let moved = true;
    let iteration = 0;
    while (moved && iteration < 1000) {
        moved = false;
        iteration++;

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

    const finalCount = countCards();
    console.log('Test End Total:', finalCount.total);

    if (initialCount.total !== finalCount.total) {
        throw new Error(`CRITICAL FAIL: Cards lost! Started with ${initialCount.total}, ended with ${finalCount.total}`);
    }

    return {
        ...state,
        tableau: newTableau,
        freeCells: newFreeCells,
        foundations: newFoundations,
        moves: newMoves
    };
}

// TEST: Complex Chain
// Ace -> 2 -> 3 -> 4 for all suits distributed across tableau
const runStressTest = () => {
    const foundations = {
        hearts: [], diamonds: [], clubs: [], spades: []
    };

    // Setup a tableau that requires many iterations to clear
    // T1: 2H (blocked by 3C)
    // T2: AH
    // T3: 3H (blocked by 4D)
    // ...
    // Simplified chain: A -> 2 -> 3 -> 4 in mixed piles

    const tableau: Card[][] = [
        [createCard('2', 'hearts')],
        [createCard('A', 'hearts')],
        [createCard('3', 'hearts')],
        [createCard('4', 'hearts')]
    ];

    // Add dummy cards to other piles to simulate noise
    const otherTableau = Array.from({ length: 4 }, () => [createCard('K', 'spades')]); // Just fillers

    const state: GameState = {
        tableau: [...tableau, ...otherTableau],
        freeCells: [null, null, null, null],
        foundations,
        moves: 0
    };

    try {
        const result = autoStackFixed(state);
        // Verify final state
        if (result.foundations.hearts.length !== 4) {
            console.error('FAIL: Not all hearts moved to foundation', result.foundations.hearts.map(c => c.rank));
        } else {
            console.log('PASS: Logic verified. Foundations correct.');
        }
    } catch (e) {
        console.error(e);
    }
};

runStressTest();
