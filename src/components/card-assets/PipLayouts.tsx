import React from 'react';
import type { Suit } from '../../logic/types';

interface PipLayoutProps {
    suit: Suit;
    rank: string;
    color: string;
}

const suitSymbols: { [key: string]: string } = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
};

export const PipLayout: React.FC<PipLayoutProps> = ({ suit, rank, color }) => {
    const symbol = suitSymbols[suit];
    const r = parseInt(rank);

    // Grid positions (percentage based)
    const col1 = '20%';
    const col2 = '50%';
    const col3 = '80%';

    const row1 = '15%';

    const row3 = '50%'; // Mid

    const row5 = '85%';

    const pips: { x: string, y: string, inverted?: boolean }[] = [];

    // Logic for standard pip placement
    if (r === 2) {
        pips.push({ x: col2, y: row1 });
        pips.push({ x: col2, y: row5, inverted: true });
    }

    if (r === 3) {
        pips.push({ x: col2, y: row1 });
        pips.push({ x: col2, y: row3 });
        pips.push({ x: col2, y: row5, inverted: true });
    }

    if (r === 4) {
        pips.push({ x: col1, y: row1 });
        pips.push({ x: col3, y: row1 });
        pips.push({ x: col1, y: row5, inverted: true });
        pips.push({ x: col3, y: row5, inverted: true });
    }

    if (r === 5) {
        pips.push({ x: col1, y: row1 });
        pips.push({ x: col3, y: row1 });
        pips.push({ x: col2, y: row3 });
        pips.push({ x: col1, y: row5, inverted: true });
        pips.push({ x: col3, y: row5, inverted: true });
    }

    if (r === 6) {
        pips.push({ x: col1, y: row1 });
        pips.push({ x: col3, y: row1 });
        pips.push({ x: col1, y: row3 });
        pips.push({ x: col3, y: row3 });
        pips.push({ x: col1, y: row5, inverted: true });
        pips.push({ x: col3, y: row5, inverted: true });
    }

    if (r === 7) {
        pips.push({ x: col1, y: row1 });
        pips.push({ x: col3, y: row1 });
        pips.push({ x: col1, y: row3 });
        pips.push({ x: col3, y: row3 });
        pips.push({ x: col1, y: row5, inverted: true });
        pips.push({ x: col3, y: row5, inverted: true });
        pips.push({ x: col2, y: '32.5%' }); // Special mid-top
    }

    if (r === 8) {
        pips.push({ x: col1, y: row1 });
        pips.push({ x: col3, y: row1 });
        pips.push({ x: col1, y: row3 });
        pips.push({ x: col3, y: row3 });
        pips.push({ x: col1, y: row5, inverted: true });
        pips.push({ x: col3, y: row5, inverted: true });
        pips.push({ x: col2, y: '32.5%' }); // Special mid-top
        pips.push({ x: col2, y: '67.5%', inverted: true }); // Special mid-bot
    }

    if (r === 9) {
        pips.push({ x: col1, y: row1 });
        pips.push({ x: col3, y: row1 });
        pips.push({ x: col1, y: '38%' }); // Mid-upper
        pips.push({ x: col3, y: '38%' });
        pips.push({ x: col2, y: row3 }); // Center
        pips.push({ x: col1, y: '62%', inverted: true }); // Mid-lower
        pips.push({ x: col3, y: '62%', inverted: true });
        pips.push({ x: col1, y: row5, inverted: true });
        pips.push({ x: col3, y: row5, inverted: true });
    }

    if (r === 10) {
        pips.push({ x: col1, y: row1 });
        pips.push({ x: col3, y: row1 });
        pips.push({ x: col1, y: '38%' }); // Mid-upper
        pips.push({ x: col3, y: '38%' });
        pips.push({ x: col2, y: '25%' }); // Top center
        pips.push({ x: col2, y: '75%', inverted: true }); // Bot center
        pips.push({ x: col1, y: '62%', inverted: true }); // Mid-lower
        pips.push({ x: col3, y: '62%', inverted: true });
        pips.push({ x: col1, y: row5, inverted: true });
        pips.push({ x: col3, y: row5, inverted: true });
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', color: color }}>
            {pips.map((pip, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: pip.x,
                        top: pip.y,
                        transform: `translate(-50%, -50%) ${pip.inverted ? 'rotate(180deg)' : ''}`,
                        fontSize: '22px', // Slightly larger
                        lineHeight: 1,
                    }}
                >
                    {symbol}
                </div>
            ))}
        </div>
    );
};
