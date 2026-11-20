export interface GridCoord {
  r: number;
  c: number;
}

export interface KeyItem {
  id: number; // 1, 2, 3
  r: number;
  c: number;
}

export interface DynamicWallDef {
  type: 'H' | 'V'; // H: horizontal between (r, c) and (r+1, c); V: vertical between (r, c) and (r, c+1)
  r: number;
  c: number;
  isOpenInitially: boolean;
}

export interface MovingMazeQuestionPayload {
  stage: number;
  gridSize: number; // 6 to 11
  startPos: GridCoord;
  exitPos: GridCoord;
  hWalls: boolean[][]; // [gridSize - 1][gridSize] - true if wall exists
  vWalls: boolean[][]; // [gridSize][gridSize - 1] - true if wall exists
  dynamicWalls: DynamicWallDef[];
  traps: GridCoord[];
  keys: KeyItem[];
  hasSilentShift: boolean; // stages 14+
  hasFogOfWar: boolean; // stages 26+
  visionRadius: number; // 3, or 2 in 65+
  wallShiftIntervalSec: number; // 5.0s down to 2.0s
  initialShortestPathLength: number; // P_shortest
  allowedMoves: number; // M_allowed
  timeLimitMs: number; // T_q
  manualTimerStart: boolean;
  introCardAr?: string;
  guidanceTextAr: string;
}

export interface MovingMazeAnswerInput {
  isSuccess: boolean;
  movesUsed: number;
  movesLeft: number;
  durationMs: number;
  collectedKeysCount: number;
  trapsTriggeredCount: number;
  totalPoints: number;
}
