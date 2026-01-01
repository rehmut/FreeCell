import React from 'react';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { useGameStore } from '../store/gameStore';
import { Pile } from './Pile';
import { Card } from './Card';
import type { Card as CardType } from '../logic/types';
import styles from './GameBoard.module.css';

type WinBurstCard = {
    id: string;
    imageUrl: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    spin: number;
    duration: number;
    delay: number;
};

export const GameBoard: React.FC = () => {
    const {
        freeCells, foundations, tableau, moves, startTime, isWon, isStuck, stats, moveHistory, deviceLabel,
        moveCardToFoundation, moveCardToTableau, moveCardToFreeCell, resetGame, dealSameCards,
        attemptMoveToFoundation, autoStack, autoMoveCard, undoMove
    } = useGameStore();

    const [activeCard, setActiveCard] = React.useState<CardType | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
    const [isStatsOpen, setIsStatsOpen] = React.useState(false);
    const [winBurst, setWinBurst] = React.useState<WinBurstCard[]>([]);

    React.useEffect(() => {
        if (!startTime) return;
        const tick = () => {
            setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
        };
        tick();
        const interval = window.setInterval(tick, 1000);
        return () => window.clearInterval(interval);
    }, [startTime]);

    React.useEffect(() => {
        if (!isWon) {
            setWinBurst([]);
            return;
        }
        const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
        const cards = Object.values(foundations).flat();
        const nextBurst = cards.map((card, index) => ({
            id: `${card.id}-${index}`,
            imageUrl: `/svg-cards/${card.rank}_of_${card.suit}.svg`,
            startX: randomBetween(-45, 45),
            startY: randomBetween(-30, 30),
            endX: randomBetween(-12, 12),
            endY: randomBetween(-12, 12),
            spin: randomBetween(-40, 40),
            duration: randomBetween(2.4, 3.6),
            delay: randomBetween(0, 1.6)
        }));
        setWinBurst(nextBurst);
    }, [isWon, foundations]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const winRate = stats.gamesPlayed
        ? Math.round((stats.gamesWon / stats.gamesPlayed) * 1000) / 10
        : 0;

    const sensors = useSensors(
        useSensor(MouseSensor),
        useSensor(TouchSensor)
    );

    const handleDragStart = (event: any) => {
        setActiveCard(event.active.data.current as CardType);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveCard(null);

        if (!over) return;

        const card = active.data.current as CardType;
        const overId = over.id as string;

        let fromPileType: 'tableau' | 'freecell' | 'foundation' = 'tableau'; // Default
        let fromPileIndex: number | undefined;

        // Check freeCells
        const freeCellIndex = freeCells.findIndex(c => c?.id === card.id);
        if (freeCellIndex !== -1) {
            fromPileType = 'freecell';
            fromPileIndex = freeCellIndex;
        }

        // Check tableau
        tableau.forEach((pile, index) => {
            if (pile.find(c => c.id === card.id)) {
                fromPileType = 'tableau';
                fromPileIndex = index;
            }
        });

        // Check foundations
        Object.entries(foundations).forEach(([, pile]) => {
            if (pile.find(c => c.id === card.id)) {
                fromPileType = 'foundation';
            }
        });

        // Handle drop
        if (overId.startsWith('foundation-')) {
            moveCardToFoundation(card, fromPileType as any, fromPileIndex);
        } else if (overId.startsWith('tableau-')) {
            const toPileIndex = parseInt(overId.split('-')[1]);
            moveCardToTableau(card, toPileIndex, fromPileType, fromPileIndex);
        } else if (overId.startsWith('freecell-')) {
            const toFreeCellIndex = parseInt(overId.split('-')[1]);
            moveCardToFreeCell(card, toFreeCellIndex, fromPileType as any, fromPileIndex);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className={styles.board}>
                <div className={styles.header}>
                    <div className={styles.brand}>
                        <div className={styles.title}>FreeCell</div>
                        <div className={styles.meta}>
                            <div className={styles.stat}>Moves: {moves}</div>
                            <div className={styles.stat}>Time: {formatTime(elapsedSeconds)}</div>
                        </div>
                    </div>
                    <div className={styles.actions}>
                        <button className={`${styles.button} ${styles.secondaryButton}`} onClick={() => setIsStatsOpen(true)}>
                            Stats
                        </button>
                        <button className={`${styles.button} ${styles.secondaryButton}`} onClick={autoStack}>
                            Auto Finish
                        </button>
                        <button className={`${styles.button} ${styles.primaryButton}`} onClick={resetGame}>
                            New Game
                        </button>
                    </div>
                </div>

                <div className={styles.topArea}>
                    <div className={styles.section}>
                        <div className={styles.sectionLabel}>Foundations</div>
                        <div className={styles.foundations}>
                            {Object.entries(foundations).map(([suit, cards]) => (
                                <Pile
                                    key={`foundation-${suit}`}
                                    id={`foundation-${suit}`}
                                    cards={cards}
                                    type="foundation"
                                // Foundations usually don't need double click to move anywhere, but maybe move back? 
                                // For now, no action.
                                />
                            ))}
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionLabel}>Free Cells</div>
                        <div className={styles.pilesArea}>
                            {freeCells.map((card, index) => (
                                <Pile
                                    key={`freecell-${index}`}
                                    id={`freecell-${index}`}
                                    cards={card ? [card] : []}
                                    type="freecell"
                                    onCardDoubleClick={(c) => attemptMoveToFoundation(c.id)}
                                    onCardSingleTap={(c) => autoMoveCard(c.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className={styles.tableauArea}>
                    {tableau.map((cards, index) => (
                        <Pile
                            key={`tableau-${index}`}
                            id={`tableau-${index}`}
                            cards={cards}
                            type="tableau"
                            onCardDoubleClick={(c) => attemptMoveToFoundation(c.id)}
                            onCardSingleTap={(c) => autoMoveCard(c.id)}
                        />
                    ))}
                </div>

                <button
                    className={`${styles.button} ${styles.secondaryButton} ${styles.undoButton}`}
                    onClick={undoMove}
                    disabled={!moveHistory.length}
                >
                    Undo
                </button>
            </div>

            <DragOverlay>
                {activeCard ? <Card card={activeCard} /> : null}
            </DragOverlay>

            {isWon && (
                <div className={styles.winOverlay}>
                    {winBurst.length > 0 && (
                        <div className={styles.winCelebration}>
                            {winBurst.map((card) => (
                                <div
                                    key={card.id}
                                    className={styles.winFlyingCard}
                                    style={{
                                        '--start-x': `${card.startX}vw`,
                                        '--start-y': `${card.startY}vh`,
                                        '--end-x': `${card.endX}vw`,
                                        '--end-y': `${card.endY}vh`,
                                        '--spin': `${card.spin}deg`,
                                        '--duration': `${card.duration}s`,
                                        '--delay': `${card.delay}s`,
                                        backgroundImage: `url(${card.imageUrl})`
                                    } as React.CSSProperties}
                                />
                            ))}
                        </div>
                    )}
                    <div className={styles.winCard}>
                        <div className={styles.winTitle}>You win</div>
                        <div className={styles.winText}>
                            Completed in {moves} moves.
                        </div>
                        <button className={`${styles.button} ${styles.primaryButton}`} onClick={resetGame}>
                            Deal Again
                        </button>
                    </div>
                </div>
            )}

            {!isWon && isStuck && (
                <div className={styles.winOverlay}>
                    <div className={styles.winCard}>
                        <div className={styles.winTitle}>No moves left</div>
                        <div className={styles.winText}>
                            This deal is blocked. Try again?
                        </div>
                        <div className={styles.modalActions}>
                            <button className={`${styles.button} ${styles.secondaryButton}`} onClick={dealSameCards}>
                                Deal Same Cards
                            </button>
                            <button className={`${styles.button} ${styles.primaryButton}`} onClick={resetGame}>
                                New Game
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isStatsOpen && (
                <div className={styles.winOverlay} onClick={() => setIsStatsOpen(false)}>
                    <div className={styles.statsCard} onClick={(event) => event.stopPropagation()}>
                        <div className={styles.winTitle}>Statistics</div>
                        <div className={styles.statsRow}>
                            <span>Device</span>
                            <span>{deviceLabel}</span>
                        </div>
                        <div className={styles.statsRow}>
                            <span>Games Played</span>
                            <span>{stats.gamesPlayed}</span>
                        </div>
                        <div className={styles.statsRow}>
                            <span>Games Won</span>
                            <span>{stats.gamesWon}</span>
                        </div>
                        <div className={styles.statsRow}>
                            <span>Win Rate</span>
                            <span>{winRate}%</span>
                        </div>
                        <div className={styles.modalActions}>
                            <button className={`${styles.button} ${styles.secondaryButton}`} onClick={() => setIsStatsOpen(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DndContext>
    );
};
