import { beforeEach, describe, expect, it } from 'vitest';
import type { Card, Suit } from '../logic/types';
import { useGameStore } from './gameStore';

const makeCard = (id: string, rank: Card['rank'], suit: Suit): Card => ({
    id,
    rank,
    suit,
    faceUp: true
});

const allCardIds = (state: ReturnType<typeof useGameStore.getState>): string[] => {
    const tableau = state.tableau.flat().map(card => card.id);
    const freeCells = state.freeCells.filter((card): card is Card => card !== null).map(card => card.id);
    const foundations = Object.values(state.foundations).flat().map(card => card.id);
    return [...tableau, ...freeCells, ...foundations].sort();
};

const seedBaselineState = () => {
    const baseTableau: Card[][] = [
        [
            makeCard('t0-7h', '7', 'hearts'),
            makeCard('t0-6c', '6', 'clubs'),
            makeCard('t0-9s', '9', 'spades')
        ],
        [makeCard('t1-ks', 'K', 'spades')],
        [makeCard('t2-qs', 'Q', 'spades')],
        [makeCard('t3-jc', 'J', 'clubs')],
        [makeCard('t4-10c', '10', 'clubs')],
        [makeCard('t5-9c', '9', 'clubs')],
        [makeCard('t6-8s', '8', 'spades')],
        [makeCard('t7-5s', '5', 'spades')]
    ];

    useGameStore.setState({
        tableau: baseTableau,
        freeCells: [null, null, null, null],
        foundations: {
            hearts: [],
            diamonds: [],
            clubs: [],
            spades: []
        },
        moves: 0,
        isWon: false,
        isStuck: false,
        moveHistory: []
    });
};

describe('autoMoveCard regression guard', () => {
    beforeEach(() => {
        seedBaselineState();
    });

    it('does not move a middle tableau card to foundation by removing the wrong source card', () => {
        useGameStore.setState((state) => ({
            foundations: {
                ...state.foundations,
                clubs: [makeCard('f-5c', '5', 'clubs')]
            }
        }));
        const before = useGameStore.getState();
        const beforeIds = allCardIds(before);

        useGameStore.getState().autoMoveCard('t0-6c');
        const after = useGameStore.getState();

        expect(after.moves).toBe(before.moves);
        expect(after.tableau[0].map(card => card.id)).toEqual(before.tableau[0].map(card => card.id));
        expect(after.foundations.clubs.map(card => card.id)).toEqual(before.foundations.clubs.map(card => card.id));
        expect(allCardIds(after)).toEqual(beforeIds);
    });

    it('does not move a middle tableau card to freecell by removing the wrong source card', () => {
        useGameStore.setState({
            freeCells: [null, makeCard('fc-kd', 'K', 'diamonds'), makeCard('fc-qh', 'Q', 'hearts'), makeCard('fc-jd', 'J', 'diamonds')]
        });
        const before = useGameStore.getState();
        const beforeIds = allCardIds(before);

        useGameStore.getState().autoMoveCard('t0-6c');
        const after = useGameStore.getState();

        expect(after.moves).toBe(before.moves);
        expect(after.tableau[0].map(card => card.id)).toEqual(before.tableau[0].map(card => card.id));
        expect(after.freeCells.map(card => card?.id ?? null)).toEqual(before.freeCells.map(card => card?.id ?? null));
        expect(allCardIds(after)).toEqual(beforeIds);
    });
});
