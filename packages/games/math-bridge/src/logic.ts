import type {
  GameLogic,
  StageConfig,
  Question,
  Verdict,
  Rng,
  Ability,
  Tier
} from '@funnygame/game-core';
import type { MathBridgeQuestionPayload, MathBridgeAnswerInput } from './types.js';
import {
  generateMathBridgeQuestion,
  calculateTimeLimit
} from './math-engine.js';
import { INTRO_CARDS } from './content.js';

/**
 * Calculates score according to Section 6 of the specification
 */
export function calculateMathBridgeScore(
  base: number,
  stage: number,
  remainingMs: number,
  timeLimitMs: number,
  currentStreak: number
): number {
  const ratio = Math.max(0, Math.min(1.0, remainingMs / timeLimitMs));
  const v = 1.0 + 0.5 * ratio;
  const k = currentStreak >= 10 ? 3 : currentStreak >= 5 ? 2 : 1;
  const m = stage <= 25 ? 1 + 0.10 * (stage - 1) : 3.4 + 0.15 * (stage - 25);

  return Math.round(base * v * k * m);
}

export class MathBridgeLogic
  implements GameLogic<MathBridgeQuestionPayload, MathBridgeAnswerInput> {
  id = 'math_bridge';
  ability: Ability = 'math';
  basePoints = 150;
  questionsPerStage = 5;

  stageConfig(stage: number): StageConfig {
    let tier: Tier = 'warmup';
    if (stage > 70) tier = 'endless';
    else if (stage >= 46) tier = 'legend';
    else if (stage >= 26) tier = 'expert';
    else if (stage >= 11) tier = 'hard';

    const isBoss = stage % 5 === 0;
    const isBreathing = (stage - 1) % 5 === 0 && stage > 1;

    // Representative pattern for time limit estimation
    const pattern = isBoss ? 'double_op' : 'single_op';
    const tq = calculateTimeLimit(stage, pattern, isBreathing, stage >= 20);

    return {
      stage,
      tier,
      timeLimitMs: Math.round(tq * 1000),
      isBoss,
      params: {
        isBreathing
      }
    };
  }

  generate(
    rng: Rng,
    cfg: StageConfig,
    index: number
  ): Question<MathBridgeQuestionPayload> {
    const stage = cfg.stage;

    const payload = generateMathBridgeQuestion(rng, stage, index);

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
    question: Question<MathBridgeQuestionPayload>,
    answer: MathBridgeAnswerInput | null
  ): Verdict {
    if (!answer) {
      return {
        correct: false,
        heartCost: 1,
        breaksCombo: true
      };
    }

    const payload = question.payload;
    const isCorrect =
      answer.choiceIndex === payload.correctChoiceIndex ||
      answer.choiceValue === payload.correctChoiceValue;

    if (isCorrect) {
      return {
        correct: true,
        heartCost: 0,
        breaksCombo: false
      };
    }

    return {
      correct: false,
      heartCost: 1,
      breaksCombo: true
    };
  }

  calculatePoints(
    question: Question<MathBridgeQuestionPayload>,
    answer: MathBridgeAnswerInput | null,
    reactionTimeMs: number,
    currentCombo: number
  ): number {
    if (!answer) return 0;
    const payload = question.payload;
    const remMs = Math.max(0, question.timeLimitMs - reactionTimeMs);

    return calculateMathBridgeScore(
      payload.basePoints,
      payload.stage,
      remMs,
      question.timeLimitMs,
      currentCombo
    );
  }
}

export const mathBridgeLogic = new MathBridgeLogic();
