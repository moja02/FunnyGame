export type NumberHuntOperator = '+' | '−' | '×' | '÷';

export interface RationalNumber {
  /** Numerator */
  n: number;
  /** Denominator (always > 0) */
  d: number;
}

export interface NumberCard {
  id: string;
  value: number;
  displayValue: string;
  rational: RationalNumber;
  isGoldenLocked?: boolean;
  isHidden?: boolean;
  sourceCardIds?: string[];
}

export interface MergeStep {
  cardAId: string;
  cardAValue: number;
  op: NumberHuntOperator;
  cardBId: string;
  cardBValue: number;
  resultId: string;
  resultValue: number;
  tMs?: number;
}

export interface NumberHuntQuestionPayload {
  stage: number;
  target: number;
  targetDisplay: string;
  initialCards: NumberCard[];
  forbiddenOps: NumberHuntOperator[];
  requireAllNumbers: boolean;
  goldenLockCardId?: string;
  hideCardAfterMs?: number;
  hiddenCardIndex?: number;
  solutionSteps: MergeStep[];
  timeLimitMs: number;
  introCardAr?: string;
  guidanceTextAr: string;
}

export interface NumberHuntAnswerInput {
  steps: MergeStep[];
  finalCardValue: number;
  hintUsed: boolean;
  remainingMs: number;
}
