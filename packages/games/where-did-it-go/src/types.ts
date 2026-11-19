export type GridDimension = 3 | 4 | 5 | 6;

export interface CardItem {
  id: number;
  icon: string;
  label?: string;
}

export interface SwapMove {
  fromIndex: number;
  toIndex: number;
}

export interface WhereDidItGoTarget {
  icon: string;
  finalCellIndex: number;
  orderIndex: number;
}

export interface WhereDidItGoQuestionPayload {
  stage: number;
  gridDimension: GridDimension;
  totalCards: number;
  initialCards: CardItem[];
  finalPositions: number[]; // maps current cell index -> card id
  swaps: SwapMove[];
  targets: WhereDidItGoTarget[];
  isOrdered: boolean;
  allowedMistakes: number;
  isMidFlipSwap: boolean;
  previewDurationMs: number;
  searchTimeLimitMs: number;
  timeLimitMs: number;
  manualTimerStart: boolean;
  introCardAr?: string;
  guidanceTextAr: string;
}

export interface WhereDidItGoAnswerInput {
  flippedCellIndices: number[];
  totalSearchMs: number;
  mistakesMade: number;
  hintUsed: boolean;
  isComplete: boolean;
}
