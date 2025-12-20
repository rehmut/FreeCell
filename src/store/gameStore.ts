import { create } from 'zustand';
import type { GameState, Card } from '../logic/types';
import {
    initializeGame,
    canMoveToFoundation,
    canMoveToTableau,
    canMoveToFreeCell,
    checkWinCondition,
    getMaxMovableCards,
    isValidTableauStack,
    hasAvailableMoves
} from '../logic/solitaire';

interface GameStats {
    gamesPlayed: number;
    gamesWon: number;
}

const STATS_STORAGE_KEY = 'freecell_stats';
const defaultStats: GameStats = { gamesPlayed: 0, gamesWon: 0 };

const loadStats = (): GameStats => {
    if (typeof window === 'undefined') return defaultStats;
    try {
        const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
        if (!raw) return defaultStats;
        const parsed = JSON.parse(raw) as Partial<GameStats>;
        return {
            gamesPlayed: typeof parsed.gamesPlayed === 'number' ? parsed.gamesPlayed : 0,
            gamesWon: typeof parsed.gamesWon === 'number' ? parsed.gamesWon : 0
        };
    } catch {
        return defaultStats;
    }
};

const saveStats = (stats: GameStats) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
};

const bumpGamesPlayed = (stats: GameStats): GameStats => ({
    ...stats,
    gamesPlayed: stats.gamesPlayed + 1
});

const bumpGamesWon = (stats: GameStats): GameStats => ({
    ...stats,
    gamesWon: stats.gamesWon + 1
});

interface GameStore extends GameState {
    stats: GameStats;
    resetGame: () => void;
    dealSameCards: () => void;
    drawCard: () => void; // No-op in FreeCell
    moveCardToFoundation: (card: Card, fromPileType: 'tableau' | 'freecell', fromPileIndex?: number) => void;
    moveCardToTableau: (card: Card, toPileIndex: number, fromPileType: 'tableau' | 'freecell' | 'foundation', fromPileIndex?: number) => void;
    moveCardToFreeCell: (card: Card, toFreeCellIndex: number, fromPileType: 'tableau' | 'freecell', fromPileIndex?: number) => void;
    attemptMoveToFoundation: (cardId: string) => void;
    autoStack: () => void;
}

const applyMoveResult = (
    state: GameStore,
    newTableau: Card[][],
    newFreeCells: (Card | null)[],
    newFoundations: GameState['foundations'],
    newMoves: number
) => {
    const isWon = checkWinCondition(newFoundations);
    const isStuck = !isWon && !hasAvailableMoves(newTableau, newFreeCells, newFoundations);
    let stats = state.stats;

    if (isWon && !state.isWon) {
        stats = bumpGamesWon(stats);
        saveStats(stats);
    }

    return {
        tableau: newTableau,
        freeCells: newFreeCells,
        foundations: newFoundations,
        moves: newMoves,
        isWon,
        isStuck,
        stats
    };
};

const initialStats = bumpGamesPlayed(loadStats());
saveStats(initialStats);

export const useGameStore = create<GameStore>()((set) => ({
    ...initializeGame(),
    stats: initialStats,

    resetGame: () => set((state) => {
        const nextStats = bumpGamesPlayed(state.stats);
        saveStats(nextStats);
        return {
            ...initializeGame(),
            stats: nextStats
        };
    }),

    dealSameCards: () => set((state) => {
        const nextStats = bumpGamesPlayed(state.stats);
        saveStats(nextStats);
        return {
            ...initializeGame(state.dealOrder),
            stats: nextStats
        };
    }),

    drawCard: () => { }, // No-op

    moveCardToFoundation: (card, fromPileType, fromPileIndex) => set((state) => {
        const { foundations, tableau, freeCells } = state;
        const targetPile = foundations[card.suit];

        if (!canMoveToFoundation(card, targetPile)) return state;

        // Remove from source
        let newTableau = tableau.map(pile => [...pile]);
        let newFreeCells = [...freeCells];

        if (fromPileType === 'tableau' && typeof fromPileIndex === 'number') {
            const sourcePile = newTableau[fromPileIndex];
            if (!sourcePile.length || sourcePile[sourcePile.length - 1].id !== card.id) return state;
            newTableau[fromPileIndex] = sourcePile.slice(0, -1);
            // No need to flip face up as all are face up
        } else if (fromPileType === 'freecell' && typeof fromPileIndex === 'number') {
            if (newFreeCells[fromPileIndex]?.id !== card.id) return state;
            newFreeCells[fromPileIndex] = null;
        } else {
            return state;
        }

        const newFoundations = {
            ...foundations,
            [card.suit]: [...targetPile, card]
        };

        return applyMoveResult(state, newTableau, newFreeCells, newFoundations, state.moves + 1);
    }),

    moveCardToTableau: (card, toPileIndex, fromPileType, fromPileIndex) => set((state) => {
        const { tableau, freeCells, foundations } = state;
        const targetPile = tableau[toPileIndex];

        if (!canMoveToTableau(card, targetPile)) return state;

        let newTableau = tableau.map(pile => [...pile]);
        let newFreeCells = [...freeCells];
        let newFoundations = { ...foundations };
        let cardsToMove: Card[] = [card];

        // Remove from source
        if (fromPileType === 'tableau' && typeof fromPileIndex === 'number') {
            if (fromPileIndex === toPileIndex) return state;
            const sourcePile = newTableau[fromPileIndex];
            const cardIndex = sourcePile.findIndex(c => c.id === card.id);
            if (cardIndex === -1) return state;

            cardsToMove = sourcePile.slice(cardIndex);
            if (!isValidTableauStack(cardsToMove)) return state;
            const maxMovable = getMaxMovableCards(newTableau, newFreeCells, fromPileIndex, toPileIndex);
            if (cardsToMove.length > maxMovable) return state;
            newTableau[fromPileIndex] = sourcePile.slice(0, cardIndex);
        } else if (fromPileType === 'freecell' && typeof fromPileIndex === 'number') {
            if (newFreeCells[fromPileIndex]?.id !== card.id) return state;
            newFreeCells[fromPileIndex] = null;
        } else if (fromPileType === 'foundation') {
            const foundationPile = newFoundations[card.suit];
            if (!foundationPile.length || foundationPile[foundationPile.length - 1].id !== card.id) return state;
            newFoundations[card.suit] = foundationPile.slice(0, -1);
        } else {
            return state;
        }

        // Add to target
        newTableau[toPileIndex] = [...newTableau[toPileIndex], ...cardsToMove];

        return applyMoveResult(state, newTableau, newFreeCells, newFoundations, state.moves + 1);
    }),

    moveCardToFreeCell: (card, toFreeCellIndex, fromPileType, fromPileIndex) => set((state) => {
        const { tableau, freeCells } = state;

        if (!canMoveToFreeCell(freeCells, toFreeCellIndex)) return state;

        let newTableau = tableau.map(pile => [...pile]);
        let newFreeCells = [...freeCells];

        // Remove from source
        if (fromPileType === 'tableau' && typeof fromPileIndex === 'number') {
            const sourcePile = newTableau[fromPileIndex];
            if (!sourcePile.length || sourcePile[sourcePile.length - 1].id !== card.id) return state;
            newTableau[fromPileIndex] = sourcePile.slice(0, -1);
        } else if (fromPileType === 'freecell' && typeof fromPileIndex === 'number') {
            if (newFreeCells[fromPileIndex]?.id !== card.id) return state;
            newFreeCells[fromPileIndex] = null;
        } else {
            return state;
        }

        // Add to target
        newFreeCells[toFreeCellIndex] = card;

        return applyMoveResult(state, newTableau, newFreeCells, state.foundations, state.moves + 1);
    }),

    attemptMoveToFoundation: (cardId: string) => set((state) => {
        const { tableau, freeCells, foundations } = state;

        // Find the card
        let card: Card | undefined;
        let fromPileType: 'tableau' | 'freecell' | undefined;
        let fromPileIndex: number | undefined;

        // search tableau
        for (let i = 0; i < tableau.length; i++) {
            const found = tableau[i].find(c => c.id === cardId);
            if (found) {
                card = found;
                fromPileType = 'tableau';
                fromPileIndex = i;
                // Verify it's the top card (last in array)
                if (tableau[i][tableau[i].length - 1].id !== cardId) return state;
                break;
            }
        }

        // search freecells
        if (!card) {
            const index = freeCells.findIndex(c => c?.id === cardId);
            if (index !== -1) {
                card = freeCells[index]!;
                fromPileType = 'freecell';
                fromPileIndex = index;
            }
        }

        if (!card || !fromPileType || fromPileIndex === undefined) return state;

        // Check if it can move to foundation
        const currentFoundation = foundations[card.suit];
        if (canMoveToFoundation(card, currentFoundation)) {
            // Re-use logic from moveCardToFoundation but we need to call the state updater logic directly or reuse the function.
            // Since we are inside set(), we can just call our own helper or duplicate the logic.
            // Duplicating logic here for simplicity within the set callback context, 
            // OR ideally we delegate to moveCardToFoundation but we are inside the state transition.

            // Let's just Apply state change directly:

            let newTableau = [...tableau];
            let newFreeCells = [...freeCells];

            if (fromPileType === 'tableau') {
                newTableau[fromPileIndex] = newTableau[fromPileIndex].slice(0, -1);
            } else {
                newFreeCells[fromPileIndex] = null;
            }

            const newFoundations = {
                ...foundations,
                [card.suit]: [...currentFoundation, card]
            };

            return applyMoveResult(state, newTableau, newFreeCells, newFoundations, state.moves + 1);
        }

        return state;
    }),

    autoStack: () => set((state) => {
        if (state.isWon) return state;

        let newTableau = state.tableau.map(pile => [...pile]);
        let newFreeCells = [...state.freeCells];
        let newFoundations = { ...state.foundations };
        let newMoves = state.moves;

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

            newFoundations = {
                ...newFoundations,
                [card.suit]: [...targetPile, card]
            };
            newMoves += 1;
            return true;
        };

        let moved = true;
        while (moved) {
            moved = false;

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

        if (newMoves === state.moves) return state;

        return applyMoveResult(state, newTableau, newFreeCells, newFoundations, newMoves);
    })
}));
