export type ShapeType =
  | 'circle'
  | 'triangle'
  | 'square'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'diamond';

export type ShapeColor =
  | 'emerald'
  | 'cyan'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'indigo';

export interface ShapeData {
  shape: ShapeType;
  color: ShapeColor;
  rotationDeg: number; // 0, 45, 90, 135, 180, 225, 270, 315
  dots?: number; // 1, 2, 3 internal dots
}

export interface SequenceItem {
  id: number;
  type: 'number' | 'shape';
  numValue?: number;
  shapeValue?: ShapeData;
  isMissing: boolean;
}

export interface SequenceChoice {
  id: number;
  type: 'number' | 'shape';
  numValue?: number;
  shapeValue?: ShapeData;
  text?: string;
  isCorrect: boolean;
}

export interface CompleteSequencePayload {
  stage: number;
  index: number;
  sequenceType: 'number' | 'shape' | 'dual' | 'compound';
  categoryAr: string;
  items: SequenceItem[];
  missingIndex: number;
  choices: SequenceChoice[];
  correctChoiceIndex: number;
  ruleHintAr: string;
  ruleSummaryAr: string;
  timeLimitMs: number;
  introCardAr?: string;
  isBoss: boolean;
  isBreathing: boolean;
  isCompound: boolean;
}

export interface CompleteSequenceAnswerInput {
  choiceIndex: number;
  isCorrect: boolean;
  durationMs: number;
  hintUsed: boolean;
  totalPoints: number;
}

export interface StageRules {
  categoryAr: string;
  isBoss: boolean;
  isBreathing: boolean;
  cSeq: number;
  extraTimeSec: number;
  timeLimitSec: number;
  isCompound: boolean;
}
