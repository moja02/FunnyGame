export interface PuzzleChoice {
  id: number;
  text: string;
  isCorrect: boolean;
  isTrap: boolean;
}

export interface StageRules {
  categoryAr: string;
  isBoss: boolean;
  isBreathing: boolean;
  cLogic: number;
  extraTimeSec: number;
  timeLimitSec: number;
}

export interface SmartTrapQuestionPayload {
  stage: number;
  index: number;
  puzzleId: string;
  categoryAr: string;
  promptAr: string;
  choices: PuzzleChoice[];
  correctChoiceIndex: number;
  trapChoiceIndex: number;
  explanationAr: string;
  timeLimitMs: number;
  introCardAr?: string;
  isBoss: boolean;
  isBreathing: boolean;
}

export interface SmartTrapAnswerInput {
  choiceIndex: number;
  isCorrect: boolean;
  durationMs: number;
  hintUsed: boolean;
  totalPoints: number;
}
