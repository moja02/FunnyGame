export type GameMode = 'pvp' | 'bot'; // Player vs Player or Player vs Bot
export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface PlayerStats {
  score: number;
  stoppedTime: number | null; // in seconds, e.g. 5.042
  timeDiff: number | null;    // in seconds, e.g. +0.042
  isReady: boolean;
  hasStopped: boolean;
}

export type GameState = 
  | 'idle'          // Showing target, waiting to start round
  | 'countdown'     // 3, 2, 1...
  | 'running'       // Timer counting
  | 'round_ended'   // Showing round results
  | 'match_ended';  // Match finished (someone reached target points)

export interface RoundResult {
  roundNumber: number;
  targetTime: number;
  p1Time: number;
  p2Time: number;
  p1Diff: number;
  p2Diff: number;
  winner: 'p1' | 'p2' | 'tie';
}
