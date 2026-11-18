export type QuestionPattern = 'S' | 'C' | 'K' | 'L' | 'H';

export type OperationCategory =
  | 'A1' // Addition/Subtraction <= 20 (c = 1.0)
  | 'A2' // Addition/Subtraction <= 99 (c = 1.5)
  | 'A3' // Addition/Subtraction <= 999 or 9999 (c = 2.5)
  | 'M1' // Multiplication table 2-9 x 2-9 (c = 1.5)
  | 'D1' // Exact table division (c = 1.5)
  | 'M2' // 2-digit x 1-digit (c = 2.5)
  | 'D2' // 2-digit ÷ 1-digit exact (c = 2.0)
  | 'D3' // 3-digit ÷ 1-digit exact (c = 3.0)
  | 'M3' // 2-digit x (10, 11, 12, 15, 20, 25) (c = 3.0)
  | 'P2'; // Priority operations e.g. 7 + 6 × 8 (c = sum + 0.5)

export interface ChainStep {
  op: '+' | '−' | '×' | '÷';
  operand: number;
  text: string; // e.g. "+ 38", "× 4", "− 127"
  cost: number;
}

export interface MathExpression {
  text: string;
  result: number;
  cost: number;
  operationCount: number;
}

export interface CalcPressureQuestionPayload {
  pattern: QuestionPattern;
  subPattern?: 'C' | 'K'; // for H pattern
  stage: number;
  introCardAr?: string;
  guidanceTextAr: string;

  // R State Tracking
  initialR0?: number;
  previousR: number | null;
  newR: number | null;
  hideR: boolean;
  rhoDurationMs?: number;

  // Expression Displays
  singleExpr?: string;
  accumulatedStep?: ChainStep;
  chainSteps?: ChainStep[];
  lExprA?: string;
  lExprB?: string;
  lResultA?: number;
  lResultB?: number;

  // 3 Choices (Strictly sorted ascending: [top, middle, bottom])
  choices: [number, number, number];
  correctAnswer: number;
  correctChoiceIndex: 0 | 1 | 2;

  // Scoring & Timing
  costTotal: number;
  operationCount: number; // n
  timeLimitMs: number; // T_q in ms
  basePoints: number; // 50 * n
}

export type CalcPressureAnswerInput = number | { choiceIndex: number; value?: number };
