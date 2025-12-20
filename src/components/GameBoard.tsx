import React from 'react';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { useGameStore } from '../store/gameStore';
import { Pile } from './Pile';
import { Card } from './Card';
import type { Card as CardType } from '../logic/types';
import styles from './GameBoard.module.css';

export const GameBoard: React.FC = () => {
    const {
        freeCells, foundations, tableau, moves, startTime, isWon, isStuck, stats, moveHistory, deviceLabel,
        moveCardToFoundation, moveCardToTableau, moveCardToFreeCell, resetGame, dealSameCards,
        attemptMoveToFoundation, autoStack, undoMove
    } = useGameStore();

    const [activeCard, setActiveCard] = React.useState<CardType | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
    const [isStatsOpen, setIsStatsOpen] = React.useState(false);

    React.useEffect(() => {
        if (!startTime) return;
        const tick = () => {
            setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
        };
        tick();
        const interval = window.setInterval(tick, 1000);
        return () => window.clearInterval(interval);
    }, [startTime]);

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
                        <div className={styles.sectionLabel}>Free Cells</div>
                        <div className={styles.pilesArea}>
                            {freeCells.map((card, index) => (
                                <Pile
                                    key={`freecell-${index}`}
                                    id={`freecell-${index}`}
                                    cards={card ? [card] : []}
                                    type="freecell"
                                    onCardDoubleClick={(c) => attemptMoveToFoundation(c.id)}
                                />
                            ))}
                        </div>
                    </div>

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
                </div>

                <div className={styles.tableauArea}>
                    {tableau.map((cards, index) => (
                        <Pile
                            key={`tableau-${index}`}
                            id={`tableau-${index}`}
                            cards={cards}
                            type="tableau"
                            onCardDoubleClick={(c) => attemptMoveToFoundation(c.id)}
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
