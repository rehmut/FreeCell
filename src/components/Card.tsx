import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Card as CardType } from '../logic/types';
import styles from './Card.module.css';

interface CardProps {
    card: CardType;
    isDraggable?: boolean;
    onClick?: () => void;
    onDoubleClick?: () => void;
    onSingleTap?: () => void;
    style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ card, isDraggable = false, onClick, onDoubleClick, onSingleTap, style }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: card.id,
        data: card,
        disabled: !isDraggable,
    });
    const lastTapRef = React.useRef<number>(0);
    const singleTapTimerRef = React.useRef<number | null>(null);
    const pointerDownRef = React.useRef<{ x: number; y: number } | null>(null);

    const transformStyle = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
        transition: 'none', // Disable transition during drag to prevent 'tracing' lag
    } : {};

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        // Track all pointer types (mouse, touch, pen) for tap detection
        pointerDownRef.current = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        if (isDragging) {
            pointerDownRef.current = null;
            return;
        }

        // Check if pointer moved significantly (likely a drag, not a tap)
        if (pointerDownRef.current) {
            const dx = Math.abs(event.clientX - pointerDownRef.current.x);
            const dy = Math.abs(event.clientY - pointerDownRef.current.y);
            const DRAG_THRESHOLD = 10;

            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
                pointerDownRef.current = null;
                if (singleTapTimerRef.current) {
                    window.clearTimeout(singleTapTimerRef.current);
                    singleTapTimerRef.current = null;
                }
                return;
            }
        }
        pointerDownRef.current = null;

        const now = Date.now();
        const DOUBLE_TAP_THRESHOLD = 200;

        if (now - lastTapRef.current < DOUBLE_TAP_THRESHOLD) {
            // This is a double-tap
            console.log('🔵 DOUBLE TAP detected');
            if (singleTapTimerRef.current) {
                window.clearTimeout(singleTapTimerRef.current);
                singleTapTimerRef.current = null;
            }
            lastTapRef.current = 0;
            onDoubleClick?.();
        } else {
            // Might be a single tap - wait to see if another tap comes
            lastTapRef.current = now;

            if (singleTapTimerRef.current) {
                window.clearTimeout(singleTapTimerRef.current);
            }

            singleTapTimerRef.current = window.setTimeout(() => {
                // Confirmed single tap
                console.log('🟢 SINGLE TAP detected');
                onSingleTap?.();
                singleTapTimerRef.current = null;
            }, DOUBLE_TAP_THRESHOLD);
        }
    };

    // Cleanup timer on unmount
    React.useEffect(() => {
        return () => {
            if (singleTapTimerRef.current) {
                window.clearTimeout(singleTapTimerRef.current);
            }
        };
    }, []);

    if (!card.faceUp) {
        return (
            <div
                className={`${styles.card} ${styles.faceDown} ${isDraggable ? styles.draggable : styles.static}`}
                style={{ ...style }}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                onPointerDown={handlePointerDown}
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
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
        />
    );
};
