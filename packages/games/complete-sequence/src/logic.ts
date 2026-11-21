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
  CompleteSequencePayload,
  CompleteSequenceAnswerInput
} from './types.js';
import {
  generateCompleteSequenceQuestion,
  getStageRules
} from './generator.js';
import { INTRO_CARDS } from './content.js';

export function calculateCompleteSequenceScore(
  stage: number,
  remainingMs: number,
  timeLimitMs: number,
  currentStreak: number,
  isCompound: boolean
): number {
  const base = isCompound ? 225 : 150;
  const ratio = Math.max(0, Math.min(1.0, remainingMs / timeLimitMs));
  const v = 1.0 + 0.5 * ratio;
  const k = currentStreak >= 10 ? 3 : currentStreak >= 5 ? 2 : 1;
  const m = stage <= 25 ? 1 + 0.10 * (stage - 1) : 3.4 + 0.15 * (stage - 25);

  return Math.round(base * v * k * m + 1e-9);
}

export class CompleteSequenceLogic
  implements GameLogic<CompleteSequencePayload, CompleteSequenceAnswerInput> {
  id = 'complete_sequence';
  ability: Ability = 'logic';
  basePoints = 150;
  questionsPerStage = 5;

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
      timeLimitMs: rules.timeLimitSec * 1000,
      isBoss: rules.isBoss,
      params: {
        categoryAr: rules.categoryAr,
        isBreathing: rules.isBreathing,
        cSeq: rules.cSeq,
        extraTimeSec: rules.extraTimeSec,
        isCompound: rules.isCompound
      }
    };
  }

  generate(
    rng: Rng,
    cfg: StageConfig,
    index: number
  ): Question<CompleteSequencePayload> {
    const stage = cfg.stage;
    const payload = generateCompleteSequenceQuestion(rng, stage, index);

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
    _question: Question<CompleteSequencePayload>,
    answer: CompleteSequenceAnswerInput | null
  ): Verdict {
    if (!answer || !answer.isCorrect) {
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
    question: Question<CompleteSequencePayload>,
    answer: CompleteSequenceAnswerInput | null,
    combo: number
  ): number {
    if (!answer || !answer.isCorrect) {
      return 0;
    }
    if (answer.totalPoints > 0) {
      return answer.totalPoints;
    }
    return calculateCompleteSequenceScore(
      question.stage,
      Math.max(0, question.timeLimitMs - answer.durationMs),
      question.timeLimitMs,
      combo,
      question.payload.isCompound
    );
  }
}

export const completeSequenceLogic = new CompleteSequenceLogic();
