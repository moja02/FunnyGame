export interface TileCard {
  id: number;
  typeId: number;
  icon: string;
  x: number; // Layout X coordinate (0 - 320)
  y: number; // Layout Y coordinate (0 - 320)
  layer: number; // Z-Index depth (0 = bottom, 1, 2, ...)
  width: number;
  height: number;
  isMystery?: boolean; // '?' mystery card until moved to dock
  isFrozen?: boolean; // Ice-locked until a triple clear occurs
}

export interface StageRules {
  cardCount: number;
  typeCount: number;
  layerCount: number;
  dockCapacity: number;
  hasMystery: boolean;
  hasFrozen: boolean;
  isBoss: boolean;
  isBreathing: boolean;
  autoShuffleIntervalSec: number;
  timeLimitSec: number;
}

export interface TileMatchQuestionPayload {
  stage: number;
  timeLimitMs: number;
  cards: TileCard[];
  dockCapacity: number;
  hasMystery: boolean;
  hasFrozen: boolean;
  isBreathing: boolean;
  isBoss: boolean;
  autoShuffleIntervalSec: number;
  introCardAr?: string;
  guidanceTextAr: string;
}

export interface TileMatchAnswerInput {
  isSuccess: boolean;
  triplesCleared: number;
  durationMs: number;
  powerUpsUsed: {
    undo: number;
    magnet: number;
    shuffle: number;
  };
  totalPoints: number;
}
