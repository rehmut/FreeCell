import type { Card, Rank, Suit } from './types';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const getCardColor = (suit: Suit): 'red' | 'black' => {
    return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
};

export const getRankValue = (rank: Rank): number => {
    switch (rank) {
        case 'A': return 1;
        case 'J': return 11;
        case 'Q': return 12;
        case 'K': return 13;
        default: return parseInt(rank);
    }
};

export const createDeck = (): Card[] => {
    const deck: Card[] = [];
    SUITS.forEach(suit => {
        RANKS.forEach(rank => {
            deck.push({
                id: `${rank}-${suit}`,
                suit,
                rank,
                faceUp: false,
            });
        });
    });
    return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
};
