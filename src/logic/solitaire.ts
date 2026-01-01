import type { Card, GameState, Suit } from './types';
import { createDeck, shuffleDeck, getCardColor, getRankValue } from './deck';

const getDeckForDeal = (dealOrder?: string[]): Card[] => {
    const baseDeck = createDeck();
    if (!dealOrder) return shuffleDeck(baseDeck);
    if (dealOrder.length !== baseDeck.length) return shuffleDeck(baseDeck);

    const deckMap = new Map(baseDeck.map(card => [card.id, card]));
    const ordered: Card[] = [];

    for (const id of dealOrder) {
        const card = deckMap.get(id);
        if (!card) return shuffleDeck(baseDeck);
        ordered.push(card);
    }

    return ordered;
};

export const initializeGame = (dealOrder?: string[]): GameState => {
    const maxAttempts = dealOrder ? 1 : 40;
    let attempts = 0;
    let tableau: Card[][] = [];
    let freeCells: (Card | null)[] = [];
    let foundations = {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
    };
    let currentDealOrder: string[] = [];
    let isStuck = false;

    do {
        const deck = getDeckForDeal(dealOrder);
        currentDealOrder = deck.map(card => card.id);
        tableau = Array.from({ length: 8 }, () => []);
        freeCells = [null, null, null, null];

        // Deal all cards to tableau (FreeCell style)
        // 4 columns of 7 cards, 4 columns of 6 cards
        let col = 0;
        while (deck.length > 0) {
            const card = deck.pop();
            if (card) {
                card.faceUp = true; // All cards face up in FreeCell
                tableau[col].push(card);
                col = (col + 1) % 8;
            }
        }

        foundations = {
            hearts: [],
            diamonds: [],
            clubs: [],
            spades: [],
        };

        isStuck = !hasAvailableMoves(tableau, freeCells, foundations);
        attempts += 1;
    } while (!dealOrder && isStuck && attempts < maxAttempts);

    return {
        stock: [], // Empty for FreeCell
        waste: [], // Empty for FreeCell
        foundations,
        tableau,
        freeCells,
        score: 0,
        moves: 0,
        startTime: Date.now(),
        isWon: false,
        isStuck,
        dealOrder: currentDealOrder
    };
};

export const canMoveToFoundation = (card: Card, foundationPile: Card[]): boolean => {
    if (foundationPile.length === 0) {
        return card.rank === 'A';
    }
    const topCard = foundationPile[foundationPile.length - 1];
    return card.suit === topCard.suit && getRankValue(card.rank) === getRankValue(topCard.rank) + 1;
};

export const canMoveToTableau = (card: Card, tableauPile: Card[]): boolean => {
    if (tableauPile.length === 0) {
        return true; // Any card can move to an empty tableau column in FreeCell
    }
    const topCard = tableauPile[tableauPile.length - 1];
    return getCardColor(card.suit) !== getCardColor(topCard.suit) &&
        getRankValue(card.rank) === getRankValue(topCard.rank) - 1;
};

export const canMoveToFreeCell = (freeCells: (Card | null)[], index: number): boolean => {
    return freeCells[index] === null;
};

export const isValidTableauStack = (cards: Card[]): boolean => {
    if (cards.length === 0) return false;
    for (let i = 0; i < cards.length - 1; i++) {
        const current = cards[i];
        const next = cards[i + 1];
        const isAlternating = getCardColor(current.suit) !== getCardColor(next.suit);
        const isDescending = getRankValue(current.rank) === getRankValue(next.rank) + 1;
        if (!isAlternating || !isDescending) return false;
    }
    return true;
};

export const getMaxMovableCards = (
    tableau: Card[][],
    freeCells: (Card | null)[],
    fromPileIndex: number,
    toPileIndex: number
): number => {
    const emptyFreeCells = freeCells.filter(card => card === null).length;
    const emptyTableau = tableau.filter((pile, index) => pile.length === 0 && index !== fromPileIndex).length;
    const isTargetEmpty = tableau[toPileIndex].length === 0;
    const usableEmptyTableau = isTargetEmpty ? Math.max(0, emptyTableau - 1) : emptyTableau;
    return (emptyFreeCells + 1) * (2 ** usableEmptyTableau);
};

export const hasAvailableMoves = (
    tableau: Card[][],
    freeCells: (Card | null)[],
    foundations: { [key in Suit]: Card[] }
): boolean => {
    for (const pile of tableau) {
        if (!pile.length) continue;
        const card = pile[pile.length - 1];
        if (canMoveToFoundation(card, foundations[card.suit])) return true;
    }

    for (const card of freeCells) {
        if (card && canMoveToFoundation(card, foundations[card.suit])) return true;
    }

    const emptyFreeCells = freeCells.filter(card => card === null).length;
    if (emptyFreeCells > 0) {
        if (tableau.some(pile => pile.length > 0)) return true;
        if (freeCells.some(card => card !== null)) return true;
    }

    for (const card of freeCells) {
        if (!card) continue;
        for (const pile of tableau) {
            if (canMoveToTableau(card, pile)) return true;
        }
    }

    for (const pile of Object.values(foundations)) {
        if (!pile.length) continue;
        const card = pile[pile.length - 1];
        for (const targetPile of tableau) {
            if (canMoveToTableau(card, targetPile)) return true;
        }
    }

    for (let fromIndex = 0; fromIndex < tableau.length; fromIndex++) {
        const sourcePile = tableau[fromIndex];
        if (!sourcePile.length) continue;

        for (let startIndex = 0; startIndex < sourcePile.length; startIndex++) {
            const stack = sourcePile.slice(startIndex);
            if (!isValidTableauStack(stack)) continue;

            for (let toIndex = 0; toIndex < tableau.length; toIndex++) {
                if (toIndex === fromIndex) continue;
                if (!canMoveToTableau(stack[0], tableau[toIndex])) continue;

                const maxMovable = getMaxMovableCards(tableau, freeCells, fromIndex, toIndex);
                if (stack.length <= maxMovable) return true;
            }
        }
    }

    return false;
};

export const checkWinCondition = (foundations: { [key in Suit]: Card[] }): boolean => {
    return Object.values(foundations).every(pile => pile.length === 13);
};

export interface AutoMoveDestination {
    type: 'foundation' | 'tableau' | 'freecell' | null;
    index?: number;
    cardsToMove: Card[];
}

export const findAutoMoveDestination = (
    card: Card,
    cardIndex: number,
    sourcePile: Card[],
    sourcePileType: 'tableau' | 'freecell',
    tableau: Card[][],
    freeCells: (Card | null)[],
    foundations: { [key in Suit]: Card[] },
    sourcePileIndex?: number
): AutoMoveDestination => {
    // Determine cards to move
    let cardsToMove: Card[] = [card];

    if (sourcePileType === 'tableau' && cardIndex < sourcePile.length - 1) {
        // Card is in middle of tableau pile - check if cards below form valid stack
        const potentialStack = sourcePile.slice(cardIndex);
        if (isValidTableauStack(potentialStack)) {
            cardsToMove = potentialStack;
        }
        // If not a valid stack, only move the single card (which will likely fail)
    }

    // Priority 1 - Foundation (only for single cards)
    if (cardsToMove.length === 1) {
        if (canMoveToFoundation(card, foundations[card.suit])) {
            return { type: 'foundation', cardsToMove };
        }
    }

    // Priority 2 - Tableau
    for (let i = 0; i < tableau.length; i++) {
        // Skip source pile if moving from tableau
        if (sourcePileType === 'tableau' && sourcePileIndex === i) {
            continue;
        }

        const targetPile = tableau[i];

        // Check if top card of stack can move to this pile
        if (canMoveToTableau(cardsToMove[0], targetPile)) {
            // For tableau-to-tableau, verify we can move the stack
            if (sourcePileType === 'tableau' && sourcePileIndex !== undefined) {
                const maxMovable = getMaxMovableCards(tableau, freeCells, sourcePileIndex, i);
                if (cardsToMove.length <= maxMovable) {
                    return { type: 'tableau', index: i, cardsToMove };
                }
            } else {
                // From freecell - always single card, so can move
                return { type: 'tableau', index: i, cardsToMove };
            }
        }
    }

    // Priority 3 - Free Cell (only for single cards)
    if (cardsToMove.length === 1) {
        for (let i = 0; i < freeCells.length; i++) {
            if (canMoveToFreeCell(freeCells, i)) {
                return { type: 'freecell', index: i, cardsToMove };
            }
        }
    }

    // No valid move found
    return { type: null, cardsToMove: [] };
};
