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
  WhereDidItGoQuestionPayload,
  WhereDidItGoAnswerInput
} from './types.js';
import {
  generateWhereDidItGoQuestion,
  getStageRules,
  calculateSearchTimeLimit
} from './grid-engine.js';
import { INTRO_CARDS } from './content.js';

/**
 * Calculates score according to Section 6 of the Where Did It Go specification:
 * pts = Base * v * k * m(s)
 * - Base = targetCount * (100 + bonus), where bonus is +25 if preview <= 1.2s, +50 if preview <= 0.8s
 * - v = 1.0 + 0.5 * (T_remaining / T_q)
 * - k = 1 (streak 0-4), 2 (streak 5-9), 3 (streak 10+)
 * - m(s) = 1 + 0.10 * (s - 1) for s <= 25, else 3.4 + 0.15 * (s - 25)
 */
export function calculateWhereDidItGoScore(
  stage: number,
  targetCount: number,
  previewDurationSec: number,
  remainingMs: number,
  timeLimitMs: number,
  currentStreak: number
): number {
  let bonus = 0;
  if (previewDurationSec <= 0.8) {
    bonus = 50;
  } else if (previewDurationSec <= 1.2) {
    bonus = 25;
  }
  const base = targetCount * (100 + bonus);
  const ratio = Math.max(0, Math.min(1.0, remainingMs / timeLimitMs));
  const v = 1.0 + 0.5 * ratio;
  const k = currentStreak >= 10 ? 3 : currentStreak >= 5 ? 2 : 1;
  const m = stage <= 25 ? 1 + 0.10 * (stage - 1) : 3.4 + 0.15 * (stage - 25);

  return Math.round(base * v * k * m);
}

export class WhereDidItGoLogic
  implements GameLogic<WhereDidItGoQuestionPayload, WhereDidItGoAnswerInput> {
  id = 'where_did_it_go';
  ability: Ability = 'memory';
  basePoints = 100;
  questionsPerStage = 1;
  manualTimerStart = true;

  stageConfig(stage: number): StageConfig {
    let tier: Tier = 'warmup';
    if (stage > 70) tier = 'endless';
    else if (stage >= 46) tier = 'legend';
    else if (stage >= 26) tier = 'expert';
    else if (stage >= 11) tier = 'hard';

    const rules = getStageRules(stage);
    const searchSec = calculateSearchTimeLimit(
      stage,
      rules.targetCount,
      rules.isBreathing,
      rules.swapCount
    );

    return {
      stage,
      tier,
      timeLimitMs: Math.round(searchSec * 1000),
      isBoss: rules.isBoss,
      params: {
        isBreathing: rules.isBreathing,
        gridDimension: rules.gridDimension,
        targetCount: rules.targetCount,
        swapCount: rules.swapCount
      }
    };
  }

  generate(
    rng: Rng,
    cfg: StageConfig,
    index: number
  ): Question<WhereDidItGoQuestionPayload> {
    const stage = cfg.stage;
    const payload = generateWhereDidItGoQuestion(rng, stage, index);

    // Intro card ONLY on question 0 at the very start of the match (Stage 1)
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
    question: Question<WhereDidItGoQuestionPayload>,
    answer: WhereDidItGoAnswerInput | null
  ): Verdict {
    if (!answer || !answer.isComplete || !Array.isArray(answer.flippedCellIndices)) {
      return {
        correct: false,
        heartCost: 1,
        breaksCombo: true
      };
    }

    const expectedCells = question.payload.targets.map((t) => t.finalCellIndex);
    const flipped = answer.flippedCellIndices;

    if (flipped.length !== expectedCells.length) {
      return {
        correct: false,
        heartCost: 1,
        breaksCombo: true
      };
    }

    if (question.payload.isOrdered) {
      for (let i = 0; i < expectedCells.length; i++) {
        if (flipped[i] !== expectedCells[i]) {
          return {
            correct: false,
            heartCost: 1,
            breaksCombo: true
          };
        }
      }
    } else {
      // Unordered
      const expectedSet = new Set(expectedCells);
      for (const cell of flipped) {
        if (!expectedSet.has(cell)) {
          return {
            correct: false,
            heartCost: 1,
            breaksCombo: true
          };
        }
      }
    }

    return {
      correct: true,
      heartCost: 0,
      breaksCombo: false
    };
  }

  calculatePoints(
    question: Question<WhereDidItGoQuestionPayload>,
    answer: WhereDidItGoAnswerInput | null,
    reactionTimeMs: number,
    currentCombo: number
  ): number {
    if (!answer || !answer.isComplete) return 0;
    const payload = question.payload;
    const searchMs = answer.totalSearchMs > 0 ? answer.totalSearchMs : reactionTimeMs;
    const remMs = Math.max(0, question.timeLimitMs - searchMs);
    const previewSec = payload.previewDurationMs / 1000;

    return calculateWhereDidItGoScore(
      payload.stage,
      payload.targets.length,
      previewSec,
      remMs,
      question.timeLimitMs,
      currentCombo
    );
  }
}

export const whereDidItGoLogic = new WhereDidItGoLogic();
