import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Card as CardType } from '../logic/types';
import styles from './Card.module.css';

interface CardProps {
    card: CardType;
    isDraggable?: boolean;
    onClick?: () => void;
    onDoubleClick?: () => void;
    style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ card, isDraggable = false, onClick, onDoubleClick, style }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: card.id,
        data: card,
        disabled: !isDraggable,
    });
    const lastTapRef = React.useRef<number>(0);
    const doubleTapWindow = 320;

    const transformStyle = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
        transition: 'none', // Disable transition during drag to prevent 'tracing' lag
    } : {};

    if (!card.faceUp) {
        const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
            if (isDragging) return;
            if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
            const now = Date.now();
            if (now - lastTapRef.current < doubleTapWindow) {
                lastTapRef.current = 0;
                onDoubleClick?.();
                return;
            }
            lastTapRef.current = now;
        };
        return (
            <div
                className={`${styles.card} ${styles.faceDown} ${isDraggable ? styles.draggable : styles.static}`}
                style={{ ...style }}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                onPointerUp={handlePointerUp}
            />
        );
    }

    // Map rank and suit to SVG filename format: {rank}_of_{suit}.svg
    const rankMapped = card.rank;
    const imageUrl = `/svg-cards/${rankMapped}_of_${card.suit}.svg`;

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`${styles.card} ${isDraggable ? styles.draggable : styles.static}`}
            style={{
                ...style,
                ...transformStyle,
                opacity: isDragging ? 0.5 : 1,
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat'
            }}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onPointerUp={(event) => {
                if (isDragging) return;
                if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
                const now = Date.now();
                if (now - lastTapRef.current < doubleTapWindow) {
                    lastTapRef.current = 0;
                    onDoubleClick?.();
                    return;
                }
                lastTapRef.current = now;
            }}
        />
    );
};
