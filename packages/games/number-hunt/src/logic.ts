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
  NumberHuntQuestionPayload,
  NumberHuntAnswerInput
} from './types.js';
import {
  generateNumberHuntQuestion,
  getStageRules,
  calculateTimeLimit
} from './solver.js';
import { INTRO_CARDS } from './content.js';

/**
 * Calculates score according to Section 6 of the specification
 */
export function calculateNumberHuntScore(
  hintUsed: boolean,
  stage: number,
  remainingMs: number,
  timeLimitMs: number,
  currentStreak: number
): number {
  const base = hintUsed ? 400 : 500;
  const ratio = Math.max(0, Math.min(1.0, remainingMs / timeLimitMs));
  const v = 1.0 + 0.5 * ratio;
  const k = currentStreak >= 10 ? 3 : currentStreak >= 5 ? 2 : 1;
  const m = stage <= 25 ? 1 + 0.10 * (stage - 1) : 3.4 + 0.15 * (stage - 25);

  return Math.round(base * v * k * m);
}

export class NumberHuntLogic
  implements GameLogic<NumberHuntQuestionPayload, NumberHuntAnswerInput> {
  id = 'number_hunt';
  ability: Ability = 'math';
  basePoints = 400;
  questionsPerStage = 1; // Each solved problem advances to the next stage

  stageConfig(stage: number): StageConfig {
    let tier: Tier = 'warmup';
    if (stage > 70) tier = 'endless';
    else if (stage >= 46) tier = 'legend';
    else if (stage >= 26) tier = 'expert';
    else if (stage >= 12) tier = 'hard';

    const rules = getStageRules(stage);
    const tq = calculateTimeLimit(stage, rules);

    return {
      stage,
      tier,
      timeLimitMs: Math.round(tq * 1000),
      isBoss: rules.isBoss,
      params: {
        isBreathing: rules.isBreathing
      }
    };
  }

  generate(
    rng: Rng,
    cfg: StageConfig,
    index: number
  ): Question<NumberHuntQuestionPayload> {
    const stage = cfg.stage;
    const payload = generateNumberHuntQuestion(rng, stage, index);

    // Show intro rule card ONLY at the very beginning of the run (Stage 1, index 0)
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
    question: Question<NumberHuntQuestionPayload>,
    answer: NumberHuntAnswerInput | null
  ): Verdict {
    if (!answer) {
      return {
        correct: false,
        heartCost: 1,
        breaksCombo: true
      };
    }

    const { target, requireAllNumbers, initialCards, goldenLockCardId, forbiddenOps } =
      question.payload;

    // 1. Target match check
    const diff = Math.abs(answer.finalCardValue - target);
    if (diff > 0.001) {
      return {
        correct: false,
        heartCost: 1,
        breaksCombo: true
      };
    }

    // 2. Forbidden ops check
    for (const step of answer.steps) {
      if (forbiddenOps.includes(step.op)) {
        return {
          correct: false,
          heartCost: 1,
          breaksCombo: true
        };
      }
    }

    // 3. Require all numbers check
    if (requireAllNumbers) {
      const requiredSteps = initialCards.length - 1;
      if (answer.steps.length < requiredSteps) {
        return {
          correct: false,
          heartCost: 1,
          breaksCombo: true
        };
      }
    }

    // 4. Golden lock check (must be used in final step)
    if (goldenLockCardId && answer.steps.length > 0) {
      const lastStep = answer.steps[answer.steps.length - 1]!;
      const goldenCard = initialCards.find((c) => c.id === goldenLockCardId);
      const usedInFinal =
        lastStep.cardAId === goldenLockCardId ||
        lastStep.cardBId === goldenLockCardId ||
        (goldenCard && (lastStep.cardAValue === goldenCard.value || lastStep.cardBValue === goldenCard.value));

      if (!usedInFinal) {
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
    question: Question<NumberHuntQuestionPayload>,
    answer: NumberHuntAnswerInput | null,
    reactionTimeMs: number,
    currentStreak: number
  ): number {
    if (!answer) return 0;
    const remMs = Math.max(0, question.timeLimitMs - reactionTimeMs);
    return calculateNumberHuntScore(
      answer.hintUsed,
      question.stage,
      remMs,
      question.timeLimitMs,
      currentStreak
    );
  }
}

export const numberHuntLogic = new NumberHuntLogic();
