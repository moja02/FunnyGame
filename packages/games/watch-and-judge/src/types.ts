export type ChangeCategory = 'MAJOR' | 'MINOR' | 'SWAP' | 'NO_CHANGE' | 'DOUBLE';

export type ChangeType =
  | 'VANISH'
  | 'COLOR_SHIFT_MAJOR'
  | 'COLOR_SHIFT_MINOR'
  | 'ROTATION'
  | 'SIZE_CHANGE'
  | 'SWAP'
  | 'NO_CHANGE'
  | 'DOUBLE_CHANGE';

export interface SceneItem {
  id: number;
  shape: string;
  colorName: string;
  textColorClass: string;
  colorHex: string;
  rotationDeg: number;
  scale: number;
}

export interface WatchAndJudgeRound {
  roundIndex: number; // 0, 1, 2
  sceneA: (SceneItem | null)[]; // array of length 25
  sceneB: (SceneItem | null)[]; // array of length 25
  distractorScene?: (SceneItem | null)[]; // array of length 25 (stages 51+)
  transitionType: 'STANDARD' | 'COLOR_FLASH' | 'DISTRACTOR';
  changeCategory: ChangeCategory;
  changeType: ChangeType;
  validTargetIndices: number[]; // which cell indices count as correct tap
  isNoChange: boolean;
  isDoubleChange: boolean;
  viewDurationMs: number;
  decisionTimeLimitMs: number;
  basePoints: 150 | 225;
}

export interface WatchAndJudgeQuestionPayload {
  stage: number;
  itemCount: number;
  hasNoChangeButton: boolean;
  rounds: WatchAndJudgeRound[];
  timeLimitMs: number;
  manualTimerStart: boolean;
  introCardAr?: string;
  guidanceTextAr: string;
}

export interface RoundAnswerRecord {
  roundIndex: number;
  clickedCellIndex: number | null;
  clickedNoChange: boolean;
  secondClickedCellIndex?: number | null;
  decisionMs: number;
  isCorrect: boolean;
  earnedPoints: number;
}

export interface WatchAndJudgeAnswerInput {
  rounds: RoundAnswerRecord[];
  totalPoints: number;
  correctRoundsCount: number;
  isComplete: boolean;
}
