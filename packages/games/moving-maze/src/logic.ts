import type {
  GameLogic,
  StageConfig,
  Question,
  Verdict,
  Rng,
  Ability,
  Tier
} from '@funnygame/game-core';
import type {
  MovingMazeQuestionPayload,
  MovingMazeAnswerInput
} from './types.js';
import {
  generateMovingMazeQuestion,
  getStageRules
} from './maze-generator.js';
import { INTRO_CARDS } from './content.js';

/**
 * Calculates score according to Section 6 of the Moving Maze specification:
 * pts = (500 + 10 * M_left) * v * k * m(s)
 * - Base = 500 + 10 * M_left
 * - v = 1.0 + 0.5 * (T_remaining / T_q)
 * - k = 1 (streak 0-4), 2 (streak 5-9), 3 (streak 10+)
 * - m(s) = 1 + 0.10 * (s - 1) for s <= 25, else 3.4 + 0.15 * (s - 25)
 */
export function calculateMovingMazeScore(
  stage: number,
  movesLeft: number,
  remainingMs: number,
  timeLimitMs: number,
  currentStreak: number
): number {
  const base = 500 + 10 * Math.max(0, movesLeft);
  const ratio = Math.max(0, Math.min(1.0, remainingMs / timeLimitMs));
  const v = 1.0 + 0.5 * ratio;
  const k = currentStreak >= 10 ? 3 : currentStreak >= 5 ? 2 : 1;
  const m = stage <= 25 ? 1 + 0.10 * (stage - 1) : 3.4 + 0.15 * (stage - 25);

  return Math.round(base * v * k * m + 1e-9);
}

export class MovingMazeLogic
  implements GameLogic<MovingMazeQuestionPayload, MovingMazeAnswerInput> {
  id = 'moving_maze';
  ability: Ability = 'logic';
  basePoints = 500;
  questionsPerStage = 1;
  manualTimerStart = true;

  stageConfig(stage: number): StageConfig {
    let tier: Tier = 'warmup';
    if (stage > 70) tier = 'endless';
    else if (stage >= 46) tier = 'legend';
    else if (stage >= 26) tier = 'expert';
    else if (stage >= 11) tier = 'hard';

    const rules = getStageRules(stage);

    return {
      stage,
      tier,
      timeLimitMs: 40000,
      isBoss: rules.isBoss,
      params: {
        isBreathing: rules.isBreathing,
        gridSize: rules.gridSize,
        wallShiftIntervalSec: rules.wallShiftIntervalSec,
        hasSilentShift: rules.hasSilentShift,
        hasFogOfWar: rules.hasFogOfWar,
        trapCount: rules.trapCount,
        keyCount: rules.keyCount
      }
    };
  }

  generate(
    rng: Rng,
    cfg: StageConfig,
    index: number
  ): Question<MovingMazeQuestionPayload> {
    const stage = cfg.stage;
    const payload = generateMovingMazeQuestion(rng, stage, index);

    // Show intro modal card ONLY at the very beginning of the run (Stage 1, index 0)
    if (index === 0 && stage === 1 && INTRO_CARDS[1]) {
      payload.introCardAr = INTRO_CARDS[1];
    }

    return {
      index,
      stage,
      timeLimitMs: payload.timeLimitMs,
      payload
    };
  }

  evaluate(
    _question: Question<MovingMazeQuestionPayload>,
    answer: MovingMazeAnswerInput | null
  ): Verdict {
    if (!answer || !answer.isSuccess) {
      return {
        correct: false,
        heartCost: 1,
        breaksCombo: true
      };
    }

    return {
      correct: true,
      heartCost: 0,
      breaksCombo: false
    };
  }

  calculatePoints(
    _question: Question<MovingMazeQuestionPayload>,
    answer: MovingMazeAnswerInput | null,
    _reactionTimeMs: number,
    _currentCombo: number
  ): number {
    if (!answer || !answer.isSuccess) return 0;
    return answer.totalPoints;
  }
}

export const movingMazeLogic = new MovingMazeLogic();
