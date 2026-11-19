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
  FollowPatternQuestionPayload,
  FollowPatternAnswerInput
} from './types.js';
import {
  generateFollowPatternQuestion,
  getStagePatternRules,
  calculateInputTimeLimit
} from './pattern-engine.js';
import { INTRO_CARDS } from './content.js';

/**
 * Calculates score according to Section 6 of the Follow the Pattern specification:
 * pts = (50 * L_expected) * v * k * m(s)
 * - Base = 50 * L_expected
 * - v = 1.0 + 0.5 * (T_remaining / T_q)
 * - k = 1 (streak 0-4), 2 (streak 5-9), 3 (streak 10+)
 * - m(s) = 1 + 0.10 * (s - 1) for s <= 25, else 3.4 + 0.15 * (s - 25)
 */
export function calculateFollowPatternScore(
  stage: number,
  expectedLength: number,
  remainingMs: number,
  timeLimitMs: number,
  currentStreak: number
): number {
  const base = 50 * expectedLength;
  const ratio = Math.max(0, Math.min(1.0, remainingMs / timeLimitMs));
  const v = 1.0 + 0.5 * ratio;
  const k = currentStreak >= 10 ? 3 : currentStreak >= 5 ? 2 : 1;
  const m = stage <= 25 ? 1 + 0.10 * (stage - 1) : 3.4 + 0.15 * (stage - 25);

  return Math.round(base * v * k * m);
}

export class FollowPatternLogic
  implements GameLogic<FollowPatternQuestionPayload, FollowPatternAnswerInput> {
  id = 'follow_pattern';
  ability: Ability = 'memory';
  basePoints = 150;
  questionsPerStage = 1; // 1 sequence per stage
  manualTimerStart = true;

  stageConfig(stage: number): StageConfig {
    let tier: Tier = 'warmup';
    if (stage > 70) tier = 'endless';
    else if (stage >= 46) tier = 'legend';
    else if (stage >= 26) tier = 'expert';
    else if (stage >= 11) tier = 'hard';

    const rules = getStagePatternRules(stage);
    const tq = calculateInputTimeLimit(stage, rules.sequenceLength, rules.ruleType);

    return {
      stage,
      tier,
      timeLimitMs: Math.round(tq * 1000),
      isBoss: rules.isBoss,
      params: {
        isBreathing: rules.isBreathing,
        buttonCount: rules.buttonCount,
        ruleType: rules.ruleType
      }
    };
  }

  generate(
    rng: Rng,
    cfg: StageConfig,
    index: number
  ): Question<FollowPatternQuestionPayload> {
    const stage = cfg.stage;
    const payload = generateFollowPatternQuestion(rng, stage, index);

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
    question: Question<FollowPatternQuestionPayload>,
    answer: FollowPatternAnswerInput | null
  ): Verdict {
    if (!answer || !answer.isComplete || !Array.isArray(answer.pressedButtonIds)) {
      return {
        correct: false,
        heartCost: 1,
        breaksCombo: true
      };
    }

    const expected = question.payload.expectedSequence;
    const pressed = answer.pressedButtonIds;

    if (pressed.length !== expected.length) {
      return {
        correct: false,
        heartCost: 1,
        breaksCombo: true
      };
    }

    for (let i = 0; i < expected.length; i++) {
      if (pressed[i] !== expected[i]) {
        return {
          correct: false,
          heartCost: 1,
          breaksCombo: true
        };
      }
    }

    return {
      correct: true,
      heartCost: 0,
      breaksCombo: false
    };
  }

  calculatePoints(
    question: Question<FollowPatternQuestionPayload>,
    answer: FollowPatternAnswerInput | null,
    reactionTimeMs: number,
    currentCombo: number
  ): number {
    if (!answer || !answer.isComplete) return 0;
    const payload = question.payload;
    const expectedLength = payload.expectedSequence.length;

    // Use totalInputMs from answer if provided, otherwise fallback to reactionTimeMs
    const inputMs = answer.totalInputMs > 0 ? answer.totalInputMs : reactionTimeMs;
    const remMs = Math.max(0, question.timeLimitMs - inputMs);

    return calculateFollowPatternScore(
      payload.stage,
      expectedLength,
      remMs,
      question.timeLimitMs,
      currentCombo
    );
  }
}

export const followPatternLogic = new FollowPatternLogic();
