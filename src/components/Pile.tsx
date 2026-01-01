import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Card as CardType, PileType } from '../logic/types';
import { isValidTableauStack } from '../logic/solitaire';
import { Card } from './Card';
import styles from './Pile.module.css';

interface PileProps {
    id: string;
    cards: CardType[];
    type: PileType;
    onCardClick?: (card: CardType) => void;
    onCardDoubleClick?: (card: CardType) => void;
    onCardSingleTap?: (card: CardType) => void;
}

export const Pile: React.FC<PileProps> = ({ id, cards, type, onCardClick, onCardDoubleClick, onCardSingleTap }) => {
    const { setNodeRef } = useDroppable({
        id: id,
        data: { type, pileId: id },
    });

    const isTableau = type === 'tableau';
    const stackCount = Math.max(cards.length, 1);
    const tableauStyle = isTableau
        ? ({ '--stack-count': stackCount } as React.CSSProperties)
        : undefined;

    return (
        <div
            ref={setNodeRef}
            className={`${styles.pile} ${isTableau ? styles.tableauPile : ''}`}
            style={tableauStyle}
        >
            {cards.length === 0 && <div className={styles.emptyPlaceholder} />}

            {cards.map((card, index) => {
                // For tableau, we render all cards with offset
                // For others, we only really need to see the top one, but rendering all stacked is fine
                const style: React.CSSProperties = isTableau ? {
                    position: 'absolute',
                    top: `calc(${index} * var(--stack-offset))`,
                } : {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                };

                // Only the top card (last in array) is draggable in most piles
                // In tableau, any face-up card is draggable (and cards on top of it move with it)
                // For simplicity in this version, let's just make the top card draggable
                // TODO: Implement multi-card drag for tableau

                const isTopCard = index === cards.length - 1;
                const isDraggable = isTableau
                    ? card.faceUp && isValidTableauStack(cards.slice(index))
                    : card.faceUp && isTopCard;

                return (
                    <Card
                        key={card.id}
                        card={card}
                        isDraggable={isDraggable}
                        style={style}
                        onClick={() => onCardClick?.(card)}
                        onDoubleClick={() => onCardDoubleClick?.(card)}
                        onSingleTap={() => onCardSingleTap?.(card)}
                    />
                );
            })}
        </div>
    );
};
