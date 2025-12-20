export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type Color = 'red' | 'black';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type PileType = 'stock' | 'waste' | 'foundation' | 'tableau' | 'freecell';

export interface GameState {
  stock: Card[]; // Unused in FreeCell but kept for compatibility/simplicity
  waste: Card[]; // Unused in FreeCell
  foundations: { [key in Suit]: Card[] };
  tableau: Card[][];
  freeCells: (Card | null)[]; // Array of 4 cells, null if empty
  score: number;
  moves: number;
  startTime: number | null;
  isWon: boolean;
  isStuck: boolean;
  dealOrder: string[];
}
