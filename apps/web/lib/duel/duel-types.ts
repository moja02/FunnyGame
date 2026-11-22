import type {
  MatchSize,
  PlayerSide,
  DuelRoundResult,
  DuelMatchSummary,
} from '@funnygame/game-core';

export type DuelMode = 'online' | 'local';

export type DuelStatus =
  | 'WAITING_FOR_OPPONENT'
  | 'DRAFTING'
  | 'PLAYING_ROUND'
  | 'ROUND_RESULT'
  | 'COMPLETED';

export interface DuelPlayer {
  id: string;
  nickname: string;
  avatar: string;
  cityName?: string;
  isHost: boolean;
}

export interface DuelDraftState {
  startingPlayer: PlayerSide;
  currentTurn: PlayerSide;
  turnIndex: number;
  turnExpiresAt: number;
  pickOrder: PlayerSide[];
  pickedGames: Array<{
    gameId: string;
    pickedBy: PlayerSide;
    roundOrder: number;
  }>;
}

export interface DuelRoomState {
  roomId: string; // e.g. LY-A8F2
  mode: DuelMode;
  matchSize: MatchSize;
  status: DuelStatus;
  host: DuelPlayer;
  guest: DuelPlayer | null;
  draft: DuelDraftState;
  currentRoundIndex: number; // 0 to matchSize - 1
  rounds: DuelRoundResult[];
  summary: DuelMatchSummary | null;
  createdAt: number;
  updatedAt: number;
}
