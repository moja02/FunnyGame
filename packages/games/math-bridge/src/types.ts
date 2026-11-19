export type MathBridgePattern =
  | 'single_op'
  | 'double_op'
  | 'parentheses'
  | 'missing_num'
  | 'negative_res'
  | 'triple_exponents'
  | 'square_roots'
  | 'modulo'
  | 'linked_eq';

export interface MathBridgeQuestionPayload {
  pattern: MathBridgePattern;
  stage: number;
  isBoss: boolean;
  isBreathing: boolean;
  introCardAr?: string;
  guidanceTextAr: string;
  equationText: string;
  linkedEquationText?: string;
  hideFirstEquationAfterMs?: number;
  choices: string[];
  correctChoiceIndex: 0 | 1 | 2 | 3;
  correctChoiceValue: string;
  cost: number;
  timeLimitMs: number;
  basePoints: 150 | 225;
}

export interface MathBridgeAnswerInput {
  choiceIndex: number;
  choiceValue: string;
  hintUsed?: boolean;
}
