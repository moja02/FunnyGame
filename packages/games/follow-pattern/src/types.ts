export type PatternRuleType =
  | 'FORWARD'
  | 'REVERSE'
  | 'AUDIO_ONLY'
  | 'SKIP_COLOR'
  | 'SWAP_POSITIONS'
  | 'REVERSE_SKIP_COLOR'
  | 'AUDIO_ONLY_REVERSE'
  | 'SWAP_AND_REVERSE';

export interface PatternButtonDef {
  id: number;
  label: string;
  colorName: string;
  shapeSymbol: string;
  bgClass: string;
  activeBgClass: string;
  borderClass: string;
  glowClass: string;
  textColorClass: string;
  frequencyHz: number;
}

export interface PatternStep {
  buttonId: number;
  isDistraction?: boolean;
}

export interface FollowPatternQuestionPayload {
  stage: number;
  sequenceLength: number;
  buttonCount: number;
  buttons: PatternButtonDef[];
  gridPositions: number[];
  shownSequence: PatternStep[];
  expectedSequence: number[];
  ruleType: PatternRuleType;
  ruleTextAr: string;
  skipColorButtonId?: number;
  swappedPairs?: [number, number][];
  flashDurationMs: number;
  flashPauseMs: number;
  timeLimitMs: number;
  introCardAr?: string;
  guidanceTextAr: string;
  manualTimerStart?: boolean;
}

export interface FollowPatternAnswerInput {
  pressedButtonIds: number[];
  totalInputMs: number;
  hintUsed: boolean;
  isComplete: boolean;
}
