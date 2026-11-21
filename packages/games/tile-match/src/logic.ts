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
  TileMatchQuestionPayload,
  TileMatchAnswerInput
} from './types.js';
import {
  generateTileMatchQuestion,
  getStageRules
} from './generator.js';
import { INTRO_CARDS } from './content.js';

/**
 * Calculates score according to Section 7 of the specification:
 * pts = Base * v * k * m(s)
 * - Base = 50 per triple (100 if includes mystery/frozen)
 * - v = 1.0 + 0.5 * (T_remaining / T_stage)
 * - k = 1 (combo 0-1), 1.5 (combo 2), 2 (combo 3), 3 (combo 4+)
 * - m(s) = 1 + 0.08 * (s - 1)
 */
export function calculateTileMatchScore(
  stage: number,
  basePointsTotal: number,
  remainingMs: number,
  timeLimitMs: number,
  maxCombo: number
): number {
  const ratio = Math.max(0, Math.min(1.0, remainingMs / timeLimitMs));
  const v = 1.0 + 0.5 * ratio;
  const k = maxCombo >= 4 ? 3 : maxCombo >= 3 ? 2 : maxCombo >= 2 ? 1.5 : 1;
  const m = 1 + 0.08 * (stage - 1);

  return Math.round(basePointsTotal * v * k * m + 1e-9);
}

export class TileMatchLogic
  implements GameLogic<TileMatchQuestionPayload, TileMatchAnswerInput> {
  id = 'tile_match';
  ability: Ability = 'logic';
  basePoints = 50;
  questionsPerStage = 1;
  manualTimerStart = true;

  stageConfig(stage: number): StageConfig {
    let tier: Tier = 'warmup';
    if (stage > 55) tier = 'endless';
    else if (stage >= 41) tier = 'legend';
    else if (stage >= 16) tier = 'expert';
    else if (stage >= 5) tier = 'hard';

    const rules = getStageRules(stage);

    return {
      stage,
      tier,
      timeLimitMs: rules.timeLimitSec * 1000,
      isBoss: rules.isBoss,
      params: {
        isBreathing: rules.isBreathing,
        cardCount: rules.cardCount,
        typeCount: rules.typeCount,
        layerCount: rules.layerCount,
        dockCapacity: rules.dockCapacity,
        hasMystery: rules.hasMystery,
        hasFrozen: rules.hasFrozen
      }
    };
  }

  generate(
    rng: Rng,
    cfg: StageConfig,
    index: number
  ): Question<TileMatchQuestionPayload> {
    const stage = cfg.stage;
    const payload = generateTileMatchQuestion(rng, stage, index);

    // Show intro modal card ONLY at the very beginning of the run (Stage 1, index 0)
    if (index === 0 && stage === 1 && INTRO_CARDS[1]) {
      payload.introCardAr = INTRO_CARDS[1];
    } else {
      payload.introCardAr = undefined;
    }

    return {
      index,
      stage,
      timeLimitMs: payload.timeLimitMs,
      payload
    };
  }

  evaluate(
    _question: Question<TileMatchQuestionPayload>,
    answer: TileMatchAnswerInput | null
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
    _question: Question<TileMatchQuestionPayload>,
    answer: TileMatchAnswerInput | null,
    _combo: number
  ): number {
    if (!answer || !answer.isSuccess) {
      return 0;
    }
    return answer.totalPoints || 50;
  }
}

export const tileMatchLogic = new TileMatchLogic();
